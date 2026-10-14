import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // Specific user recipient (null means broadcast to all users)
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    // For guest citizen submitters identified by phone
    recipientPhone: {
      type: String,
      default: null,
      index: true,
    },
    // Reference ID of submission if applicable (e.g. FZ-SUB-XYZ)
    referenceId: {
      type: String,
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "broadcast_news",
        "broadcast_story",
        "broadcast_place",
        "submission_approved",
        "submission_rejected",
        "submission_received",
        "system",
      ],
      default: "system",
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      default: "/",
    },
    icon: {
      type: String,
      default: "",
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // List of user IDs or client Anon IDs who have read/acknowledged this notification
    readBy: [
      {
        type: String,
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// TTL index to automatically purge notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
