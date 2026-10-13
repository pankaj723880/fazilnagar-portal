import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill in all required fields." });
    }

    // Check if user already exists
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save new user
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: req.body.phone ? req.body.phone.trim() : "",
      status: "active",
      lastLogin: new Date(),
    });

    // Create JWT Token
    const token = jwt.sign(
      { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role || "user" },
      process.env.JWT_SECRET || "fallback_secret_key",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User registered successfully.",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role || "user",
        status: newUser.status,
      },
    });
  } catch (err) {
    console.error("Register Error:", err);
    if (err.code === 11000) {
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
router.post("/login", async (req, res) => {
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

export default router;