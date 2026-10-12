import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    newsId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "News",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    anonId: {
      type: String,
      default: null,
      index: true,
      trim: true,
    },
    userIp: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Prevent duplicate likes from the same registered user on the same story
likeSchema.index(
  { newsId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } }
);

// Prevent duplicate likes from the same anonymous client ID on the same story
likeSchema.index(
  { newsId: 1, anonId: 1 },
  { unique: true, partialFilterExpression: { anonId: { $type: "string" } } }
);

const Like = mongoose.model("Like", likeSchema);
export default Like;
