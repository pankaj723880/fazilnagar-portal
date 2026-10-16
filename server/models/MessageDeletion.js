import mongoose from "mongoose";

const messageDeletionSchema = new mongoose.Schema(
  {
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

messageDeletionSchema.index({ message: 1, user: 1 }, { unique: true });

const MessageDeletion = mongoose.model("MessageDeletion", messageDeletionSchema);

export default MessageDeletion;
