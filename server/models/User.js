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
      required: true,
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
      unique: true,
      sparse: true,
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
  },
  { timestamps: true }
);

userSchema.index({ name: 1 });
userSchema.index({ findByEmail: 1, email: 1 });

const User = mongoose.model("User", userSchema);

export default User;