import mongoose from "mongoose";

const visitorSessionSchema = new mongoose.Schema(
  {
    visitorId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
      index: { expires: 120 }, // MongoDB TTL index: automatically drops expired documents
    },
  },
  { timestamps: true }
);

const VisitorSession = mongoose.model("VisitorSession", visitorSessionSchema);
export default VisitorSession;
