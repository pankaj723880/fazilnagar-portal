import mongoose from "mongoose";

const authOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: ["registration", "password_reset"],
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index to auto-delete expired documents
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    resendCooldownUntil: {
      type: Date,
      default: Date.now,
    },
    pendingRegistration: {
      name: { type: String, trim: true },
      username: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      passwordHash: { type: String },
    },
    resetToken: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },
    resetTokenExpiresAt: {
      type: Date,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

authOtpSchema.index({ email: 1, purpose: 1 });

const AuthOtp = mongoose.model("AuthOtp", authOtpSchema);

export default AuthOtp;
