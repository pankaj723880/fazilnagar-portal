import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

process.env.NODE_ENV = "test";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";

import authRoutes from "../routes/auth.js";
import User from "../models/User.js";
import AuthOtp from "../models/AuthOtp.js";
import { getTestSentEmails, clearTestSentEmails } from "../utils/emailService.js";
import verifyToken from "../middleware/auth.js";

const TEST_PORT = 5098;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";
const API_BASE = `http://127.0.0.1:${TEST_PORT}/api/auth`;

describe("Fazilnagar Town Portal: Complete Auth Phases 2, 3, 4, 5, 6 Test Suite", () => {
  let server;
  const createdUserIds = [];

  const rand = Math.floor(Math.random() * 89999 + 10000);
  const regEmail = `citizen_reg_${rand}@fazilnagar.test`;
  const regPassword = "InitialPassword123";
  const regUsername = `reg_${rand}`;
  const regPhone = `98765${rand}`;

  const googleEmail = `google_citizen_${rand}@fazilnagar.test`;
  const googleSub = `sub_google_${rand}`;

  const adminEmail = `admin_test_${rand}@fazilnagar.test`;
  const adminPassword = "AdminSecurePassword2026";

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    const app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
    // Protected test endpoint
    app.get("/api/test-protected", verifyToken, (req, res) => {
      res.json({ success: true, user: req.user });
    });

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(TEST_PORT, resolve);
    });

    clearTestSentEmails();
  });

  after(async () => {
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await AuthOtp.deleteMany({
      email: {
        $in: [
          regEmail,
          googleEmail,
          adminEmail,
          `nonexistent_${rand}@fazilnagar.test`,
          `cooldown_${rand}@fazilnagar.test`,
        ],
      },
    });
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  // ========================================================
  // PHASE 3: EMAIL + PASSWORD REGISTRATION WITH OTP TESTS
  // ========================================================
  describe("Phase 3 — Registration With Email OTP Flow", () => {
    it("1. Initiates registration: dispatches OTP, does not create active user or issue JWT", async () => {
      clearTestSentEmails();

      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ramesh Kumar",
          email: regEmail,
          password: regPassword,
          username: regUsername,
          phone: regPhone,
        }),
      });

      const data = await res.json();
      assert.equal(res.status, 200, `Failed initiate: ${JSON.stringify(data)}`);
      assert.equal(data.requiresVerification, true);
      assert.equal(data.email, regEmail);
      assert.equal(data.token, undefined, "JWT token must NOT be issued on initiate");

      // Verify user does not exist in User collection yet
      const dbUser = await User.findOne({ email: regEmail });
      assert.equal(dbUser, null, "User record must NOT be activated prior to OTP verification");

      // Verify OTP document was stored hashed with purpose registration
      const otpDoc = await AuthOtp.findOne({ email: regEmail, purpose: "registration" });
      assert.ok(otpDoc, "AuthOtp document must exist");
      assert.equal(otpDoc.purpose, "registration");
      assert.ok(otpDoc.otpHash, "OTP must be stored as a hash");
      assert.notEqual(otpDoc.otpHash, "123456", "Raw OTP must not be stored in database");

      // Verify email was dispatched
      const sent = getTestSentEmails();
      assert.equal(sent.length, 1);
      assert.equal(sent[0].to, regEmail);
      assert.equal(sent[0].purpose, "registration");
      assert.match(sent[0].otp, /^\d{6}$/, "Generated OTP must be 6 digits");
    });

    it("2. Blocks login for unverified registration", async () => {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
        }),
      });

      const data = await res.json();
      assert.equal(res.status, 400);
      assert.match(data.message, /invalid email or password/i);
    });

    it("3. Enforces 60-second cooldown on registration OTP resend", async () => {
      const res = await fetch(`${API_BASE}/register/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail }),
      });

      const data = await res.json();
      assert.equal(res.status, 429);
      assert.match(data.message, /wait \d+ seconds/i);
    });

    it("4. Rejects invalid OTP with remaining attempt counter", async () => {
      const res = await fetch(`${API_BASE}/register/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          otp: "000000", // Wrong code
        }),
      });

      const data = await res.json();
      assert.equal(res.status, 400);
      assert.match(data.message, /invalid verification code/i);

      const otpDoc = await AuthOtp.findOne({ email: regEmail, purpose: "registration" });
      assert.equal(otpDoc.attempts, 1);
    });

    it("5. Successfully verifies valid OTP, creates citizen account, and issues JWT", async () => {
      const sent = getTestSentEmails();
      const validOtp = sent[sent.length - 1].otp;

      const res = await fetch(`${API_BASE}/register/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          otp: validOtp,
        }),
      });

      const data = await res.json();
      assert.equal(res.status, 201, `Verification failed: ${JSON.stringify(data)}`);
      assert.ok(data.token, "JWT token must be issued on successful OTP verification");
      assert.equal(data.user.email, regEmail);
      assert.equal(data.user.username, regUsername);
      assert.equal(data.user.role, "user");

      createdUserIds.push(data.user.id);

      // Verify user document in DB
      const dbUser = await User.findById(data.user.id);
      assert.ok(dbUser);
      assert.equal(dbUser.isEmailVerified, true);
      assert.equal(dbUser.authProvider, "local");
      assert.equal(dbUser.status, "active");

      // Verify OTP document was cleaned up
      const remainingOtp = await AuthOtp.findOne({ email: regEmail, purpose: "registration" });
      assert.equal(remainingOtp, null, "AuthOtp must be deleted upon successful registration");
    });

    it("6. Prevents duplicate registration with already registered email", async () => {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Imposter User",
          email: regEmail,
          password: "password123",
        }),
      });

      const data = await res.json();
      assert.equal(res.status, 400);
      assert.match(data.message, /already exists/i);
    });
  });

  // ========================================================
  // PHASE 2: GOOGLE SIGN-IN / OAUTH 2.0 TESTS
  // ========================================================
  describe("Phase 2 — Google Sign-In & Safe Account Linking", () => {
    it("1. Successfully registers and logs in a new Google citizen user", async () => {
      const testToken = `test-google-token:${googleSub}:${googleEmail}:Google Citizen:verified:test-google-client-id`;

      const res = await fetch(`${API_BASE}/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: testToken }),
      });

      const data = await res.json();
      assert.equal(res.status, 200, `Failed Google login: ${JSON.stringify(data)}`);
      assert.ok(data.token, "JWT token must be issued");
      assert.equal(data.user.email, googleEmail);
      assert.equal(data.user.role, "user", "Google user must be assigned user role");

      createdUserIds.push(data.user.id);

      const dbUser = await User.findById(data.user.id);
      assert.ok(dbUser);
      assert.equal(dbUser.googleId, googleSub);
      assert.equal(dbUser.authProvider, "google");
      assert.equal(dbUser.isEmailVerified, true);
    });

    it("2. Logs in existing Google user on repeat sign-in", async () => {
      const testToken = `test-google-token:${googleSub}:${googleEmail}:Google Citizen:verified:test-google-client-id`;

      const res = await fetch(`${API_BASE}/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: testToken }),
      });

      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.user.email, googleEmail);
    });

    it("3. Safely links existing verified local user when signing in with matching Google account", async () => {
      // First create local account
      const linkEmail = `link_citizen_${rand}@fazilnagar.test`;
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash("Password123", salt);
      const localUser = await User.create({
        name: "Local Citizen",
        email: linkEmail,
        password: hash,
        isEmailVerified: true,
        authProvider: "local",
        status: "active",
      });
      createdUserIds.push(localUser._id.toString());

      const linkGoogleSub = `sub_link_${rand}`;
      const testToken = `test-google-token:${linkGoogleSub}:${linkEmail}:Local Citizen:verified:test-google-client-id`;

      const res = await fetch(`${API_BASE}/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: testToken }),
      });

      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.user.id, localUser._id.toString(), "Must link to the existing account rather than create duplicate");

      const updated = await User.findById(localUser._id);
      assert.equal(updated.googleId, linkGoogleSub);
    });

    it("4. Rejects Google sign-in with subject ID mismatch for established account", async () => {
      // Different sub for googleEmail
      const imposterSub = `imposter_sub_${rand}`;
      const testToken = `test-google-token:${imposterSub}:${googleEmail}:Imposter:verified:test-google-client-id`;

      const res = await fetch(`${API_BASE}/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: testToken }),
      });

      const data = await res.json();
      assert.equal(res.status, 400);
      assert.match(data.message, /identifier mismatch/i);
    });

    it("5. Security: Never grants admin access automatically through Google login", async () => {
      // Create admin with password
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(adminPassword, salt);
      const adminDoc = await User.create({
        name: "Security Admin",
        email: adminEmail,
        password: hash,
        role: "admin",
        isEmailVerified: true,
        status: "active",
      });
      createdUserIds.push(adminDoc._id.toString());

      const testToken = `test-google-token:admin_sub_${rand}:${adminEmail}:Admin Attempt:verified:test-google-client-id`;

      const res = await fetch(`${API_BASE}/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: testToken }),
      });

      const data = await res.json();
      assert.equal(res.status, 403, "Unlinked admin account must NOT be claimed via Google");
      assert.match(data.message, /administrator/i);
    });

    it("6. Rejects Google ID token when Google email is unverified", async () => {
      const testToken = `test-google-token:sub_unver:${rand}_unver@example.com:Unverified:unverified:test-google-client-id`;

      const res = await fetch(`${API_BASE}/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: testToken }),
      });

      const data = await res.json();
      assert.equal(res.status, 400);
      assert.match(data.message, /not verified/i);
    });
  });

  // ========================================================
  // PHASE 4: FORGOT PASSWORD WITH OTP & RECOVERY TESTS
  // ========================================================
  describe("Phase 4 — Forgot Password With OTP & Recovery", () => {
    let capturedResetToken = null;
    const newPassword = "NewSecretPassword2026!";

    it("1. Responds with generic message for non-existent email (prevents enumeration)", async () => {
      clearTestSentEmails();
      const nonExistent = `nonexistent_${rand}@fazilnagar.test`;

      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nonExistent }),
      });

      const data = await res.json();
      assert.equal(res.status, 200);
      assert.match(data.message, /If an eligible account is registered/i);

      const sent = getTestSentEmails();
      assert.equal(sent.length, 0, "No email sent for non-existent account");
    });

    it("2. Generates reset OTP for eligible registered account with generic response", async () => {
      clearTestSentEmails();

      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail }),
      });

      const data = await res.json();
      assert.equal(res.status, 200);
      assert.match(data.message, /If an eligible account is registered/i);

      // Verify email was sent with reset code
      const sent = getTestSentEmails();
      assert.equal(sent.length, 1);
      assert.equal(sent[0].to, regEmail);
      assert.equal(sent[0].purpose, "password_reset");
      assert.match(sent[0].otp, /^\d{6}$/);

      // Verify stored OTP in AuthOtp has purpose password_reset
      const otpDoc = await AuthOtp.findOne({ email: regEmail, purpose: "password_reset" });
      assert.ok(otpDoc);
      assert.equal(otpDoc.purpose, "password_reset");
    });

    it("3. Rejects invalid password reset OTP and tracks attempt count", async () => {
      const res = await fetch(`${API_BASE}/forgot-password/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          otp: "111111", // Wrong OTP
        }),
      });

      const data = await res.json();
      assert.equal(res.status, 400);
      assert.match(data.message, /invalid verification code/i);

      const otpDoc = await AuthOtp.findOne({ email: regEmail, purpose: "password_reset" });
      assert.equal(otpDoc.attempts, 1);
    });

    it("4. Validates correct reset OTP and returns single-use reset authorization token", async () => {
      const sent = getTestSentEmails();
      const validOtp = sent[sent.length - 1].otp;

      const res = await fetch(`${API_BASE}/forgot-password/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          otp: validOtp,
        }),
      });

      const data = await res.json();
      assert.equal(res.status, 200, `Reset verify failed: ${JSON.stringify(data)}`);
      assert.ok(data.resetToken, "Must return reset authorization token");
      capturedResetToken = data.resetToken;

      const otpDoc = await AuthOtp.findOne({ email: regEmail, purpose: "password_reset" });
      assert.equal(otpDoc.isVerified, true);
      assert.equal(otpDoc.resetToken, capturedResetToken);
    });

    it("5. Rejects reset when passwords do not match or resetToken is invalid", async () => {
      // Mismatch
      const res1 = await fetch(`${API_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          resetToken: capturedResetToken,
          newPassword: newPassword,
          confirmPassword: "WrongConfirmation",
        }),
      });
      assert.equal(res1.status, 400);

      // Wrong resetToken
      const res2 = await fetch(`${API_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          resetToken: "fake_token_123",
          newPassword: newPassword,
          confirmPassword: newPassword,
        }),
      });
      assert.equal(res2.status, 400);
    });

    it("6. Updates password, sets passwordChangedAt, and invalidates reset authorization", async () => {
      // Obtain an active token with the OLD password first to test session revocation later
      const loginOldRes = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
        }),
      });
      const oldLoginData = await loginOldRes.json();
      const preResetToken = oldLoginData.token;
      assert.ok(preResetToken, "Old session token must exist");

      // Verify old session token works right before reset
      const preTest = await fetch(`http://127.0.0.1:${TEST_PORT}/api/test-protected`, {
        headers: { Authorization: `Bearer ${preResetToken}` },
      });
      assert.equal(preTest.status, 200);

      // Submit valid password reset
      const res = await fetch(`${API_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          resetToken: capturedResetToken,
          newPassword: newPassword,
          confirmPassword: newPassword,
        }),
      });

      const data = await res.json();
      assert.equal(res.status, 200);
      assert.match(data.message, /password reset successfully/i);

      // AuthOtp reset document must be immediately destroyed to prevent replay
      const remainingOtp = await AuthOtp.findOne({ email: regEmail, purpose: "password_reset" });
      assert.equal(remainingOtp, null, "Reset authorization must be permanently cleared");

      // Replay must fail
      const replayRes = await fetch(`${API_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          resetToken: capturedResetToken,
          newPassword: "AnotherPassword123",
          confirmPassword: "AnotherPassword123",
        }),
      });
      assert.equal(replayRes.status, 400, "Reset token replay must be rejected");

      // Login with old password must fail
      const oldLoginFail = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
        }),
      });
      assert.equal(oldLoginFail.status, 400);

      // Login with new password must succeed
      const newLoginSuccess = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          password: newPassword,
        }),
      });
      assert.equal(newLoginSuccess.status, 200);

      // Check session revocation on the pre-reset session token
      // Wait 1.1s so token iat is strictly older than user.passwordChangedAt
      const postTest = await fetch(`http://127.0.0.1:${TEST_PORT}/api/test-protected`, {
        headers: { Authorization: `Bearer ${preResetToken}` },
      });
      assert.equal(postTest.status, 401, "Sessions created before password reset must be revoked");
    });
  });
});
