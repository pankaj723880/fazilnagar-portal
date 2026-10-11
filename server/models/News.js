import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    titleHi: { type: String },
    description: { type: String, required: true },
    category: { type: String, default: "General" },
    image: { type: String, default: "" },
    video: { type: String, default: "" },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const News = mongoose.model("News", newsSchema);
export default News;