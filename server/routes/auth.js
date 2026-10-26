import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import AuthOtp from "../models/AuthOtp.js";
import RevokedToken from "../models/RevokedToken.js";
import verifyToken from "../middleware/auth.js";
import {
  validateLoginInput,
  validateRegisterInput,
  validateGoogleAuthInput,
  validateOtpInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
} from "../middleware/validator.js";
import {
  authLimiter,
  otpRequestLimiter,
  otpVerifyLimiter,
  passwordResetLimiter,
  checkAccountLockout,
  recordFailedLogin,
  recordSuccessfulLogin,
} from "../middleware/rateLimiter.js";
import { normalizePhone } from "../utils/submissionUtils.js";
import { sendRegistrationOtpEmail, sendPasswordResetOtpEmail } from "../utils/emailService.js";
import { verifyGoogleIdToken } from "../utils/googleAuth.js";
import { logSecurityEvent, SecurityEventType } from "../utils/securityLogger.js";

const router = express.Router();

// Strict security cache headers: Never cache authentication tokens, login responses, or credentials
router.use((req, res, next) => {
  res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vary", "Authorization");
  next();
});

// Helper to set secure auth cookie
const setAuthCookie = (res, token) => {
  res.cookie("fazilnagar_auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// Helper to generate a clean, available username
const generateUniqueUsername = async (baseSeed) => {
  let clean = (baseSeed || "citizen")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 15);
  if (clean.length < 3) clean = `citizen_${clean}`;

  let candidate = clean;
  let counter = 1;
  while (await User.exists({ username: candidate })) {
    const suffix = counter < 10 ? `_${counter}` : String(counter);
    candidate = `${clean.slice(0, 20 - suffix.length)}${suffix}`;
    counter++;
    if (counter > 999) {
      candidate = `user_${Date.now().toString(36).slice(-6)}`;
      break;
    }
  }
  return candidate;
};

// ==========================================
// PHASE 3: EMAIL + PASSWORD REGISTRATION WITH OTP
// ==========================================

// @route   POST /api/auth/register
// @desc    Initiate registration by validating details, storing pending record & dispatching OTP
// @access  Public
router.post("/register", otpRequestLimiter, validateRegisterInput, async (req, res) => {
  try {
    const { name, email, password, username, phone } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists with this email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email." });
    }

    // Validate and check username uniqueness
    let cleanUsername = undefined;
    if (username && typeof username === "string" && username.trim()) {
      cleanUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
        return res.status(400).json({
          message: "Username must be 3-20 characters long and contain only lowercase letters, numbers, and underscores.",
        });
      }
      const existingUserByUsername = await User.findOne({ username: cleanUsername });
      if (existingUserByUsername) {
        return res.status(400).json({ message: "This username is already taken. Please choose another." });
      }
    }

    // Validate and check phone uniqueness
    let cleanPhone = "";
    if (phone && String(phone).trim()) {
      cleanPhone = normalizePhone(phone);
      if (cleanPhone.length < 10) {
        return res.status(400).json({ message: "Please enter a valid 10-digit mobile number." });
      }
      const existingUserByPhone = await User.findOne({ phone: cleanPhone });
      if (existingUserByPhone) {
        return res.status(400).json({ message: "This mobile number is already registered with another account." });
      }
    }

    // Hash the proposed password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate cryptographically secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(rawOtp, 10);

    // Invalidate any previously requested registration OTP for this email
    await AuthOtp.deleteMany({ email: normalizedEmail, purpose: "registration" });

    // Store pending registration with hashed OTP, 10 minute expiry, and 60s cooldown
    await AuthOtp.create({
      email: normalizedEmail,
      otpHash,
      purpose: "registration",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      resendCooldownUntil: new Date(Date.now() + 60 * 1000), // 60 seconds
      attempts: 0,
      maxAttempts: 5,
      pendingRegistration: {
        name: name.trim(),
        username: cleanUsername,
        phone: cleanPhone,
        passwordHash,
      },
    });

    // Send the OTP email via configured SMTP
    await sendRegistrationOtpEmail(normalizedEmail, rawOtp);

    // Never issue a session or token before OTP verification is complete
    res.status(200).json({
      success: true,
      requiresVerification: true,
      message: "Verification code sent to your email. Please enter the 6-digit code to activate your account.",
      email: normalizedEmail,
    });
  } catch (err) {
    console.error("Register Initiate Error:", err);
    res.status(500).json({
      message: err.message || "Server error while processing registration.",
    });
  }
});

// @route   POST /api/auth/register/verify
// @desc    Verify registration OTP and create citizen user record
// @access  Public
router.post("/register/verify", otpVerifyLimiter, validateOtpInput, async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const otpDoc = await AuthOtp.findOne({ email: normalizedEmail, purpose: "registration" });

    if (!otpDoc || !otpDoc.pendingRegistration) {
      return res.status(400).json({
        message: "No pending registration found for this email. Please register again.",
      });
    }

    // Check expiration
    if (new Date() > otpDoc.expiresAt) {
      await AuthOtp.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({
        message: "Verification code has expired (10-minute limit). Please request a new code.",
      });
    }

    // Check maximum attempts limit
    if (otpDoc.attempts >= otpDoc.maxAttempts) {
      await AuthOtp.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({
        message: "Maximum verification attempts exceeded. Please start registration again.",
      });
    }

    // Compare supplied OTP with stored hash
    const isMatch = await bcrypt.compare(otp, otpDoc.otpHash);
    if (!isMatch) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      const remaining = Math.max(0, otpDoc.maxAttempts - otpDoc.attempts);
      return res.status(400).json({
        message: `Invalid verification code. ${remaining} attempt(s) remaining.`,
      });
    }

    // Ensure account was not created during the verification window
    const existingCheck = await User.findOne({ email: normalizedEmail });
    if (existingCheck) {
      await AuthOtp.deleteMany({ email: normalizedEmail, purpose: "registration" });
      return res.status(400).json({ message: "An account with this email already exists." });
    }

    const { name, username, phone, passwordHash } = otpDoc.pendingRegistration;

    // Check username collision before creating
    if (username) {
      const existingUserByUsername = await User.findOne({ username });
      if (existingUserByUsername) {
        return res.status(400).json({ message: "This username is already taken. Please choose another." });
      }
    }

    // Check phone collision before creating
    if (phone) {
      const existingUserByPhone = await User.findOne({ phone });
      if (existingUserByPhone) {
        return res.status(400).json({ message: "This mobile number is already registered with another account." });
      }
    }

    // Create the active, verified user
    const newUser = await User.create({
      name,
      email: normalizedEmail,
      password: passwordHash,
      phone: phone || "",
      username: username || undefined,
      role: "user",
      status: "active",
      isEmailVerified: true,
      authProvider: "local",
      lastLogin: new Date(),
    });

    // Invalidate pending OTP record immediately
    await AuthOtp.deleteMany({ email: normalizedEmail, purpose: "registration" });

    // Issue JWT token
    const token = jwt.sign(
      { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role || "user", authTime: Date.now() },
      process.env.JWT_SECRET || "fallback_secret_key",
      { expiresIn: "7d" }
    );

    setAuthCookie(res, token);

    res.status(201).json({
      message: "Account verified and registered successfully.",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        username: newUser.username || "",
        phone: newUser.phone || "",
        role: newUser.role || "user",
        status: newUser.status,
      },
    });
  } catch (err) {
    console.error("Register Verify Error:", err);
    if (err.code === 11000) {
      if (err.keyPattern?.username || String(err.message).includes("username")) {
        return res.status(400).json({ message: "This username is already taken. Please choose another." });
      }
      if (err.keyPattern?.phone || String(err.message).includes("phone")) {
        return res.status(400).json({ message: "This mobile number is already registered with another account." });
      }
      return res.status(400).json({ message: "User already exists with this email." });
    }
    res.status(500).json({ message: "Server error while verifying registration code." });
  }
});

// @route   POST /api/auth/register/resend
// @desc    Resend registration verification OTP with cooldown check
// @access  Public
router.post("/register/resend", otpRequestLimiter, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "A valid email address is required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otpDoc = await AuthOtp.findOne({ email: normalizedEmail, purpose: "registration" });

    if (!otpDoc || !otpDoc.pendingRegistration) {
      return res.status(400).json({ message: "No pending registration found for this email. Please register first." });
    }

    // Enforce 60-second cooldown
    const now = Date.now();
    if (otpDoc.resendCooldownUntil && otpDoc.resendCooldownUntil.getTime() > now) {
      const waitSeconds = Math.ceil((otpDoc.resendCooldownUntil.getTime() - now) / 1000);
      return res.status(429).json({
        message: `Please wait ${waitSeconds} seconds before requesting a new code.`,
        retryAfterSeconds: waitSeconds,
      });
    }

    // Generate new OTP & hash
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(rawOtp, 10);

    otpDoc.otpHash = otpHash;
    otpDoc.attempts = 0;
    otpDoc.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Reset 10 minutes
    otpDoc.resendCooldownUntil = new Date(Date.now() + 60 * 1000); // 60s cooldown
    await otpDoc.save();

    await sendRegistrationOtpEmail(normalizedEmail, rawOtp);

    res.status(200).json({
      success: true,
      message: "A new verification code has been sent to your email.",
    });
  } catch (err) {
    console.error("Register Resend Error:", err);
    res.status(500).json({ message: "Server error while resending verification code." });
  }
});

// ==========================================
// PHASE 2: GOOGLE SIGN-IN / OAUTH 2.0
// ==========================================

// @route   POST /api/auth/google
// @desc    Authenticate or register citizen via Google Identity Services ID Token
// @access  Public
router.post("/google", authLimiter, validateGoogleAuthInput, async (req, res) => {
  try {
    const { credential } = req.body;

    // Verify Google ID Token with Google's official verification library
    const googleProfile = await verifyGoogleIdToken(credential);
    const { sub, email, name, picture } = googleProfile;

    const normalizedEmail = email.trim().toLowerCase();

    // Look for existing user account
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      // 1. Check account suspension or inactivation
      if (user.status === "inactive" || user.status === "suspended") {
        return res.status(403).json({
          message: "Your account has been deactivated or suspended. Please contact portal administration.",
        });
      }

      // 2. Security: Never allow Google login to automatically claim an admin account unless linked
      if (user.role === "admin" && user.googleId !== sub) {
        return res.status(403).json({
          message: "Administrator accounts cannot be accessed via Google sign-in without prior administrator verification. Please log in with password.",
        });
      }

      // 3. Subject identifier check: if user already has a linked Google ID, ensure it matches
      if (user.googleId && user.googleId !== sub) {
        return res.status(400).json({
          message: "Google account identifier mismatch for this email address.",
        });
      }

      // 4. Safely link Google ID to existing account
      let modified = false;
      if (!user.googleId) {
        user.googleId = sub;
        modified = true;
      }
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        modified = true;
      }
      if (!user.avatar && picture) {
        user.avatar = picture;
        modified = true;
      }
      user.lastLogin = new Date();
      await user.save();
    } else {
      // Create new Google user (ALWAYS "user" role, never admin)
      const uniqueUsername = await generateUniqueUsername(name || email.split("@")[0]);

      user = await User.create({
        name: name || email.split("@")[0],
        email: normalizedEmail,
        googleId: sub,
        authProvider: "google",
        isEmailVerified: true,
        role: "user",
        status: "active",
        avatar: picture || "",
        username: uniqueUsername,
        lastLogin: new Date(),
      });
    }

    // Issue JWT Token
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role || "user", authTime: Date.now() },
      process.env.JWT_SECRET || "fallback_secret_key",
      { expiresIn: "7d" }
    );

    setAuthCookie(res, token);

    res.status(200).json({
      message: "Signed in successfully with Google.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username || "",
        avatar: user.avatar || "",
        phone: user.phone || "",
        role: user.role || "user",
        status: user.status || "active",
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    console.error("Google Auth Error:", err.message);
    res.status(400).json({
      message: err.message || "Google authentication failed.",
    });
  }
});

// ==========================================
// PHASE 4: FORGOT PASSWORD WITH OTP
// ==========================================

// @route   POST /api/auth/forgot-password
// @desc    Request a 6-digit OTP for password reset (generic response to prevent enumeration)
// @access  Public
router.post("/forgot-password", passwordResetLimiter, validateForgotPasswordInput, async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // Generic response message to prevent account enumeration
    const genericResponse = {
      success: true,
      message: "If an eligible account is registered with this email, a 6-digit password reset code has been sent.",
    };

    const user = await User.findOne({ email: normalizedEmail });

    // If user does not exist or is suspended/inactive, safely return generic response
    if (!user || user.status === "inactive" || user.status === "suspended") {
      return res.status(200).json(genericResponse);
    }

    // Check resend cooldown on existing password reset OTP
    const existingOtp = await AuthOtp.findOne({ email: normalizedEmail, purpose: "password_reset" });
    const now = Date.now();
    if (existingOtp && existingOtp.resendCooldownUntil && existingOtp.resendCooldownUntil.getTime() > now) {
      // Cooldown active, don't spam emails, return generic response
      return res.status(200).json(genericResponse);
    }

    // Generate 6-digit OTP & bcrypt hash
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(rawOtp, 10);

    // Invalidate previous reset OTPs
    await AuthOtp.deleteMany({ email: normalizedEmail, purpose: "password_reset" });

    // Store new hashed OTP with 10-minute expiry and 60-second cooldown
    await AuthOtp.create({
      email: normalizedEmail,
      otpHash,
      purpose: "password_reset",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      resendCooldownUntil: new Date(Date.now() + 60 * 1000), // 60 seconds
      attempts: 0,
      maxAttempts: 5,
    });

    // Send email
    await sendPasswordResetOtpEmail(normalizedEmail, rawOtp);

    return res.status(200).json(genericResponse);
  } catch (err) {
    console.error("Forgot Password Error:", err.message || err);
    res.status(500).json({ message: err.message || "Server error processing password reset request." });
  }
});

// @route   POST /api/auth/forgot-password/verify
// @desc    Verify password reset OTP and establish short-lived reset authorization token
// @access  Public
router.post("/forgot-password/verify", otpVerifyLimiter, validateOtpInput, async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const otpDoc = await AuthOtp.findOne({ email: normalizedEmail, purpose: "password_reset" });

    if (!otpDoc) {
      return res.status(400).json({
        message: "Invalid or expired password reset request. Please request a new code.",
      });
    }

    // Check expiry
    if (new Date() > otpDoc.expiresAt) {
      await AuthOtp.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({
        message: "Password reset code has expired (10-minute limit). Please request a new code.",
      });
    }

    // Check maximum attempts limit
    if (otpDoc.attempts >= otpDoc.maxAttempts) {
      await AuthOtp.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({
        message: "Maximum verification attempts exceeded. Please request a new code.",
      });
    }

    // Compare supplied OTP with stored hash
    const isMatch = await bcrypt.compare(otp, otpDoc.otpHash);
    if (!isMatch) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      const remaining = Math.max(0, otpDoc.maxAttempts - otpDoc.attempts);
      return res.status(400).json({
        message: `Invalid verification code. ${remaining} attempt(s) remaining.`,
      });
    }

    // Generate single-use, cryptographically secure reset authorization token
    const resetToken = crypto.randomBytes(32).toString("hex");

    otpDoc.resetToken = resetToken;
    otpDoc.resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes to submit new password
    otpDoc.isVerified = true;
    await otpDoc.save();

    res.status(200).json({
      success: true,
      message: "Code verified successfully. Please enter your new password.",
      resetToken,
    });
  } catch (err) {
    console.error("Verify Password Reset Code Error:", err);
    res.status(500).json({ message: "Server error while verifying password reset code." });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Update password after valid OTP verification, invalidating OTP and revoking older sessions
// @access  Public
router.post("/reset-password", passwordResetLimiter, validateResetPasswordInput, async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    // Verify reset authorization record
    const otpDoc = await AuthOtp.findOne({
      email: normalizedEmail,
      purpose: "password_reset",
      resetToken,
      isVerified: true,
      used: false,
    });

    if (!otpDoc || !otpDoc.resetTokenExpiresAt || new Date() > otpDoc.resetTokenExpiresAt) {
      return res.status(400).json({
        message: "Invalid, expired, or already used reset authorization. Please request a new code.",
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "User account not found." });
    }

    if (user.status === "inactive" || user.status === "suspended") {
      return res.status(403).json({ message: "Account is inactive or suspended." });
    }

    // Hash the new password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Invalidate reset record immediately to prevent replay
    await AuthOtp.deleteMany({ email: normalizedEmail, purpose: "password_reset" });

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in with your new password.",
    });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Server error updating password." });
  }
});

// ==========================================
// EXISTING STANDARD AUTH: LOGIN, LOGOUT, ME
// ==========================================

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post("/login", authLimiter, validateLoginInput, async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    // Check account-level lockout to prevent brute-force against specific target accounts
    const lockout = checkAccountLockout(normalizedEmail);
    if (lockout.locked) {
      logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
        req,
        email: normalizedEmail,
        details: `Account temporarily locked due to consecutive failed attempts (${lockout.waitSeconds}s remaining).`,
        severity: "WARN",
      });
      return res.status(429).json({
        message: `Too many failed login attempts for this account. Please wait ${lockout.waitSeconds} seconds before trying again.`,
        retryAfterSeconds: lockout.waitSeconds,
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      recordFailedLogin(normalizedEmail);
      logSecurityEvent(SecurityEventType.AUTH_FAILURE, {
        req,
        email: normalizedEmail,
        details: "Login failure: account not found.",
        severity: "WARN",
      });
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Check account status
    if (user.status === "inactive" || user.status === "suspended") {
      logSecurityEvent(SecurityEventType.FORBIDDEN_ACCESS, {
        req,
        email: normalizedEmail,
        details: `Login blocked: account is ${user.status}.`,
        severity: "WARN",
      });
      return res.status(403).json({
        message: "Your account has been deactivated or suspended. Please contact portal administration.",
      });
    }

    // If account was created with Google only and has no password
    if (!user.password && user.googleId) {
      return res.status(400).json({
        message: "This account was registered using Google. Please click 'Continue with Google' to sign in.",
      });
    }

    // Compare password hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      recordFailedLogin(normalizedEmail);
      logSecurityEvent(SecurityEventType.AUTH_FAILURE, {
        req,
        email: normalizedEmail,
        details: "Login failure: incorrect password.",
        severity: "WARN",
      });
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Clear failed login tracker on success
    recordSuccessfulLogin(normalizedEmail);

    // Update lastLogin timestamp
    user.lastLogin = new Date();
    await user.save();

    // Create JWT Token
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role || "user", authTime: Date.now() },
      process.env.JWT_SECRET || "fallback_secret_key",
      { expiresIn: "7d" }
    );

    setAuthCookie(res, token);

    logSecurityEvent(SecurityEventType.AUTH_SUCCESS, {
      req,
      userId: user._id,
      email: user.email,
      details: "Citizen logged in successfully with password.",
      severity: "INFO",
    });

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username || "",
        avatar: user.avatar || "",
        phone: user.phone || "",
        role: user.role || "user",
        status: user.status || "active",
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
});

// @route   POST /api/auth/logout
// @desc    Invalidate token session on server
router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token && token !== "undefined" && token !== "null") {
        let userId = null;
        try {
          const secretKey = process.env.JWT_SECRET || "fallback_secret_key";
          const decoded = jwt.verify(token, secretKey);
          userId = decoded.id;
        } catch {
          // Token may already be expired or malformed
        }

        await RevokedToken.findOneAndUpdate(
          { token },
          { token, userId, revokedAt: new Date() },
          { upsert: true, new: true }
        );
      }
    }

    res.clearCookie("fazilnagar_auth_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully. Authentication token invalidated.",
    });
  } catch (err) {
    console.error("Logout Error:", err);
    res.status(500).json({ message: "Server error during logout." });
  }
});

// @route   GET /api/auth/me
// @desc    Get current authenticated user profile
// @access  Private
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    if (user.status === "inactive" || user.status === "suspended") {
      return res.status(403).json({ message: "Account is inactive or suspended." });
    }
    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username || "",
        avatar: user.avatar || "",
        phone: user.phone || "",
        role: user.role || "user",
        status: user.status || "active",
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    console.error("Get Me Error:", err);
    res.status(500).json({ message: "Server error fetching user profile." });
  }
});

export default router;