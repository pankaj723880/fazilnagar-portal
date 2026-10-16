import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import RevokedToken from "../models/RevokedToken.js";
import verifyToken from "../middleware/auth.js";
import { validateLoginInput, validateRegisterInput } from "../middleware/validator.js";
import { normalizePhone } from "../utils/submissionUtils.js";

const router = express.Router();

// Helper to set secure auth cookie
const setAuthCookie = (res, token) => {
  res.cookie("fazilnagar_auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
router.post("/register", validateRegisterInput, async (req, res) => {
  try {
    const { name, email, password, username, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill in all required fields." });
    }

    // Check if user already exists with email
    const normalizedEmail = email.trim().toLowerCase();
    const existingEmail = await User.findOne({ email: normalizedEmail });

    if (existingEmail) {
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

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save new user
    const userData = {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: cleanPhone,
      status: "active",
      lastLogin: new Date(),
    };
    if (cleanUsername) {
      userData.username = cleanUsername;
    }

    const newUser = await User.create(userData);

    // Create JWT Token
    const token = jwt.sign(
      { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role || "user" },
      process.env.JWT_SECRET || "fallback_secret_key",
      { expiresIn: "7d" }
    );

    setAuthCookie(res, token);

    res.status(201).json({
      message: "User registered successfully.",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        username: newUser.username || "",
        phone: newUser.phone,
        role: newUser.role || "user",
        status: newUser.status,
      },
    });
  } catch (err) {
    console.error("Register Error:", err);
    if (err.code === 11000) {
      if (err.keyPattern?.username || String(err.message).includes("username")) {
        return res.status(400).json({ message: "This username is already taken. Please choose another." });
      }
      if (err.keyPattern?.phone || String(err.message).includes("phone")) {
        return res.status(400).json({ message: "This mobile number is already registered with another account." });
      }
      return res.status(400).json({ message: "User already exists with this email." });
    }
    res.status(500).json({
      message: "Server error during registration.",
      error: err.message || "Unknown error",
    });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post("/login", validateLoginInput, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide both email and password." });
    }

    // Check for user existence
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Check account status
    if (user.status === "inactive" || user.status === "suspended") {
      return res.status(403).json({
        message: "Your account has been deactivated or suspended. Please contact portal administration.",
      });
    }

    // Compare password hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Update lastLogin timestamp
    user.lastLogin = new Date();
    await user.save();

    // Create JWT Token
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role || "user" },
      process.env.JWT_SECRET || "fallback_secret_key",
      { expiresIn: "7d" }
    );

    setAuthCookie(res, token);

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
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
// @access  Public / Authenticated
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
          // Token may already be expired or malformed, but still record in RevokedToken
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
      sameSite: "strict",
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