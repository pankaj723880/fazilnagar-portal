import mongoose from "mongoose";

const revokedTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: Date.now,
      expires: 604800, // 7 days in seconds (TTL index removes document automatically)
    },
  },
  { timestamps: true }
);

const RevokedToken = mongoose.model("RevokedToken", revokedTokenSchema);

export default RevokedToken;
