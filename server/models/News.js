import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    titleHi: { type: String, default: "", trim: true },
    summary: { type: String, default: "", trim: true },
    description: { type: String, required: true, trim: true },
    content: { type: String, default: "", trim: true },
    category: { type: String, default: "General", index: true },
    location: { type: String, default: "Fazilnagar", trim: true },
    source: { type: String, default: "Town Bureau", trim: true },
    image: { type: String, default: "" },
    video: { type: String, default: "" },
    audio: { type: String, default: "" },
    mediaUrl: { type: String, default: "" },
    mediaType: {
      type: String,
      enum: ["image", "video", "none", ""],
      default: "",
    },
    mediaMeta: {
      originalName: { type: String, default: "" },
      mimeType: { type: String, default: "" },
      size: { type: Number, default: 0 },
    },
    audioMeta: {
      originalName: { type: String, default: "" },
      mimeType: { type: String, default: "" },
      size: { type: Number, default: 0 },
      duration: { type: Number, default: 0 },
    },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "draft"],
      default: "pending",
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

newsSchema.index({ isPublished: 1, isFeatured: -1, publishedAt: -1 });
newsSchema.index({ status: 1, createdAt: -1 });
newsSchema.index({ isPublished: 1, category: 1, publishedAt: -1 });

const News = mongoose.model("News", newsSchema);
export default News;