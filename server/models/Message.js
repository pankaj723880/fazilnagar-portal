import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    body: {
      type: String,
      default: "",
      maxLength: 4000,
    },
    type: {
      type: String,
      enum: ["text", "image", "video", "audio", "document", "system"],
      default: "text",
    },
    mediaUrl: {
      type: String,
      default: "",
    },
    fileName: {
      type: String,
      default: "",
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: "",
    },
    driveFileId: {
      type: String,
      default: "",
    },
    storageProvider: {
      type: String,
      enum: ["local", "google_drive"],
      default: "local",
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },
    deletedForEveryoneAt: {
      type: Date,
      default: null,
    },
    clientMessageId: {
      type: String,
      index: true,
      default: null,
    },
    reactions: [
      {
        emoji: { type: String, required: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, clientMessageId: 1 }, { sparse: true });

const Message = mongoose.model("Message", messageSchema);

export default Message;
