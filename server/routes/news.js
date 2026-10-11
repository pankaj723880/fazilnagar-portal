import express from "express";
import multer from "multer";
import path from "path";
import News from "../models/News.js";
import verifyToken from "../middleware/auth.js";

import fs from "fs";
import { fileURLToPath } from "url";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage setup for image and video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// @route   POST /api/news
// @desc    Post news with optional image/video files
// @access  Private
router.post(
  "/",
  verifyToken,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { title, titleHi, description, category } = req.body;

      if (!title || !description) {
        return res.status(400).json({ message: "Title and description are required." });
      }

      let imagePath = "";
      let videoPath = "";

      const host = req.get("host") || "localhost:5000";
      const protocol = req.protocol === "https" || req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const baseUrl = `${protocol}://${host}`;

      if (req.files?.image?.[0]) {
        imagePath = `${baseUrl}/uploads/${req.files.image[0].filename}`;
      }

      if (req.files?.video?.[0]) {
        videoPath = `${baseUrl}/uploads/${req.files.video[0].filename}`;
      }

      // If posted by an admin, approve immediately; otherwise set to pending for review
      const isAuthorAdmin = req.user?.role === "admin";
      const initialStatus = isAuthorAdmin ? "approved" : "pending";

      const news = await News.create({
        title,
        titleHi: titleHi || "",
        description,
        category: category || "General",
        image: imagePath,
        video: videoPath,
        author: req.user?.id,
        status: initialStatus,
      });

      res.status(201).json({
        ...news.toObject(),
        moderationMessage: isAuthorAdmin
          ? "News published directly by administrator."
          : "News submitted successfully and is pending admin review.",
      });
    } catch (err) {
      console.error("Create News Error:", err);
      res.status(500).json({ message: "Failed to publish news article." });
    }
  }
);

// @route   GET /api/news
// @desc    Get news articles. Citizens get approved articles; Admins can filter by status
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { status, all } = req.query;
    let query = {};

    if (all === "true" || status === "all") {
      // Return all regardless of status
      query = {};
    } else if (status) {
      query = { status };
    } else {
      // By default, only public/approved news (or legacy items without status)
      query = { status: { $in: ["approved", null] } };
    }

    const news = await News.find(query).populate("author", "name email role").sort({ createdAt: -1 });
    res.status(200).json(news);
  } catch (err) {
    console.error("Fetch All News Error:", err);
    res.status(500).json({ message: "Error fetching news articles." });
  }
});

// @route   PATCH /api/news/:id/status
// @desc    Admin moderation endpoint to approve or reject a news item
// @access  Private (Admin)
router.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin privileges required." });
    }

    const { status } = req.body;
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const article = await News.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!article) {
      return res.status(404).json({ message: "News article not found." });
    }

    res.status(200).json({ message: `News status updated to ${status}.`, article });
  } catch (err) {
    console.error("News Status Update Error:", err);
    res.status(500).json({ message: "Server error updating news status." });
  }
});

// @route   DELETE /api/news/:id
// @desc    Delete a news article
// @access  Private (Admin or Author)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const article = await News.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: "News article not found." });
    }

    // Only admin or the author can delete
    if (req.user.role !== "admin" && String(article.author) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to delete this article." });
    }

    await News.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "News article deleted successfully." });
  } catch (err) {
    console.error("Delete News Error:", err);
    res.status(500).json({ message: "Failed to delete article." });
  }
});

// @route   GET /api/news/:id
// @desc    Get a single news article by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const article = await News.findById(req.params.id).populate("author", "name email");
    if (!article) {
      return res.status(404).json({ message: "Article not found." });
    }
    res.status(200).json(article);
  } catch (err) {
    console.error("Fetch Single News Error:", err);
    res.status(400).json({ message: "Invalid article ID or server error." });
  }
});

export default router;