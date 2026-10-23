import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },
    googleId: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
      index: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    // Town Messaging & Profile Fields (Phase 1)
    username: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9_]{3,20}$/, "Username must be 3-20 lowercase alphanumeric or underscore characters."],
    },
    avatar: {
      type: String,
      default: "",
    },
    area: {
      type: String,
      default: "",
      trim: true,
      maxLength: 60,
    },
    bio: {
      type: String,
      default: "",
      trim: true,
      maxLength: 250,
    },
    showEmail: {
      type: Boolean,
      default: false,
    },
    findByEmail: {
      type: Boolean,
      default: false,
    },
    whoCanMessage: {
      type: String,
      enum: ["everyone", "requests"],
      default: "everyone",
    },
    lastSeenVisible: {
      type: Boolean,
      default: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    // User Personal Appearance Preference (light/dark, never global)
    themePreference: {
      type: String,
      enum: ["light", "dark"],
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.index({ name: 1 });
userSchema.index({ role: 1, status: 1, createdAt: -1 });
userSchema.index({ findByEmail: 1, email: 1 });
userSchema.index(
  { username: 1 },
  { unique: true, partialFilterExpression: { username: { $type: "string", $gt: "" } } }
);
userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string", $gt: "" } } }
);

const User = mongoose.model("User", userSchema);

export default User;