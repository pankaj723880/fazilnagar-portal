import mongoose from "mongoose";

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
