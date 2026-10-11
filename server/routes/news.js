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

      const news = await News.create({
        title,
        titleHi: titleHi || "",
        description,
        category: category || "General",
        image: imagePath,
        video: videoPath,
        author: req.user?.id,
      });

      res.status(201).json(news);
    } catch (err) {
      console.error("Create News Error:", err);
      res.status(500).json({ message: "Failed to publish news article." });
    }
  }
);

// @route   GET /api/news
// @desc    Get all news articles sorted by newest first
// @access  Public
router.get("/", async (req, res) => {
  try {
    const news = await News.find().populate("author", "name email").sort({ createdAt: -1 });
    res.status(200).json(news);
  } catch (err) {
    console.error("Fetch All News Error:", err);
    res.status(500).json({ message: "Error fetching news articles." });
  }
});

// @route   GET /api/news/:id
// @desc    Get a single news article by ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const article = await News.findById(req.params.id);
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