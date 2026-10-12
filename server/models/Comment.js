import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    anonId: {
      type: String,
      default: null,
      trim: true,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 500,
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: String, // can be userId or anonId
      },
    ],
  },
  { timestamps: true }
);

const commentSchema = new mongoose.Schema(
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
      trim: true,
    },
    authorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 500,
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: String, // userId or anonId string
      },
    ],
    replies: [replySchema],
    status: {
      type: String,
      enum: ["visible", "flagged", "deleted"],
      default: "visible",
      index: true,
    },
  },
  { timestamps: true }
);

commentSchema.index({ newsId: 1, createdAt: -1 });

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;
