import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import News from "../models/News.js";
import Like from "../models/Like.js";
import Comment from "../models/Comment.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";

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
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Helper to sanitize comment text (prevents stored XSS)
function sanitizeText(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .trim();
}

// Helper to extract user identity if token is present (optional auth)
function getOptionalUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  if (!token || token === "undefined" || token === "null") return null;
  try {
    const secretKey = process.env.JWT_SECRET || "fallback_secret_key";
    return jwt.verify(token, secretKey);
  } catch (_) {
    return null;
  }
}

// ====================================================================
// REELS-STYLE NEWS FEED (PUBLIC)
// ====================================================================

// @route   GET /api/news/feed
// @desc    Mobile-first Reels / Shorts news feed with pagination, like statuses, and shareable link handling
// @access  Public (Strictly returns published/approved news; NO drafts)
router.get("/feed", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const targetStoryId = req.query.storyId || req.query.targetId;
    const anonId = req.headers["x-anon-id"] || req.query.anonId || null;
    const user = getOptionalUser(req);

    // Filter: ONLY published and approved news
    const query = {
      $or: [{ isPublished: true }, { status: "approved" }],
      status: { $nin: ["rejected", "draft"] },
    };

    if (category && category !== "All" && category !== "all") {
      query.category = { $regex: new RegExp(`^${category}$`, "i") };
    }

    const total = await News.countDocuments(query);
    let stories = await News.find(query)
      .populate("author", "name email")
      .sort({ isFeatured: -1, publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // If a specific storyId was shared and we are on page 1, ensure it appears first!
    if (page === 1 && targetStoryId) {
      const targetIndex = stories.findIndex((s) => String(s._id) === String(targetStoryId));
      if (targetIndex > 0) {
        // Move to the beginning
        const [targetStory] = stories.splice(targetIndex, 1);
        stories.unshift(targetStory);
      } else if (targetIndex === -1) {
        // Fetch the target story directly if it falls on another page
        const sharedStory = await News.findOne({
          _id: targetStoryId,
          ...query,
        }).populate("author", "name email").lean();
        if (sharedStory) {
          stories.unshift(sharedStory);
        }
      }
    }

    // Attach like status for the current user or client anonId
    const storyIds = stories.map((s) => s._id);
    let userLikedSet = new Set();

    if (storyIds.length > 0) {
      let likeQuery = null;
      if (user?.id) {
        likeQuery = { newsId: { $in: storyIds }, userId: user.id };
      } else if (anonId) {
        likeQuery = { newsId: { $in: storyIds }, anonId: String(anonId).trim() };
      }

      if (likeQuery) {
        const userLikes = await Like.find(likeQuery).select("newsId").lean();
        userLikedSet = new Set(userLikes.map((l) => String(l.newsId)));
      }
    }

    // Map stories with accurate likeCount, commentCount, and isLiked boolean
    const enrichedStories = stories.map((s) => ({
      ...s,
      likeCount: s.likeCount ?? s.likes ?? 0,
      commentCount: s.commentCount ?? 0,
      isLiked: userLikedSet.has(String(s._id)),
    }));

    res.status(200).json({
      stories: enrichedStories,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: skip + stories.length < total,
    });
  } catch (err) {
    console.error("News Feed Error:", err);
    res.status(500).json({ message: "Failed to fetch news feed." });
  }
});

// ====================================================================
// LIKE / UNLIKE ENDPOINTS (PERSISTENT IN MONGODB)
// ====================================================================

// @route   POST /api/news/:id/like
// @desc    Toggle like state for a news reel story
// @access  Public / Authenticated
router.post("/:id/like", async (req, res) => {
  try {
    const newsId = req.params.id;
    const user = getOptionalUser(req);
    const anonId = req.headers["x-anon-id"] || req.body.anonId || null;
    const ip = req.ip || req.connection?.remoteAddress || "";

    const story = await News.findById(newsId);
    if (!story) {
      return res.status(404).json({ message: "News story not found." });
    }

    if (!user?.id && !anonId) {
      return res.status(400).json({ message: "Identifier (user token or client ID) required to like." });
    }

    // Build query to find existing like
    const query = { newsId };
    if (user?.id) {
      query.userId = user.id;
    } else {
      query.anonId = String(anonId).trim();
    }

    const existingLike = await Like.findOne(query);

    if (existingLike) {
      // User is UNLIKING
      await Like.findByIdAndDelete(existingLike._id);

      // Decrement like count atomically (ensure never < 0)
      const updatedStory = await News.findByIdAndUpdate(
        newsId,
        [
          {
            $set: {
              likeCount: { $max: [0, { $subtract: ["$likeCount", 1] }] },
              likes: { $max: [0, { $subtract: ["$likes", 1] }] },
            },
          },
        ],
        { new: true }
      );

      return res.status(200).json({
        liked: false,
        likeCount: updatedStory?.likeCount || 0,
      });
    } else {
      // User is LIKING
      try {
        await Like.create({
          newsId,
          userId: user?.id || null,
          anonId: user?.id ? null : String(anonId).trim(),
          userIp: ip,
        });

        // Increment count atomically
        const updatedStory = await News.findByIdAndUpdate(
          newsId,
          { $inc: { likeCount: 1, likes: 1 } },
          { new: true }
        );

        return res.status(200).json({
          liked: true,
          likeCount: updatedStory?.likeCount || 1,
        });
      } catch (err) {
        if (err.code === 11000) {
          // Concurrency duplicate prevention
          const current = await News.findById(newsId).select("likeCount");
          return res.status(200).json({
            liked: true,
            likeCount: current?.likeCount || 1,
          });
        }
        throw err;
      }
    }
  } catch (err) {
    console.error("Like Toggle Error:", err);
    res.status(500).json({ message: "Server error updating like." });
  }
});

// ====================================================================
// COMMENTS ENDPOINTS (PERSISTENT IN MONGODB)
// ====================================================================

// @route   GET /api/news/:id/comments
// @desc    Get paginated comments for a news story
// @access  Public
router.get("/:id/comments", async (req, res) => {
  try {
    const newsId = req.params.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const query = { newsId, status: "visible" };
    const total = await Comment.countDocuments(query);
    const comments = await Comment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      comments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: skip + comments.length < total,
    });
  } catch (err) {
    console.error("Fetch Comments Error:", err);
    res.status(500).json({ message: "Failed to fetch comments." });
  }
});

// @route   POST /api/news/:id/comments
// @desc    Submit a new comment on a news story
// @access  Public (Citizen or Authenticated)
router.post("/:id/comments", async (req, res) => {
  try {
    const newsId = req.params.id;
    const { text, authorName } = req.body;
    const user = getOptionalUser(req);

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: "Comment text cannot be empty." });
    }

    if (text.trim().length > 500) {
      return res.status(400).json({ message: "Comment is too long (maximum 500 characters)." });
    }

    const story = await News.findById(newsId);
    if (!story) {
      return res.status(404).json({ message: "News story not found." });
    }

    // Determine author name
    const finalAuthorName = sanitizeText(
      user?.name || authorName || "Fazilnagar Resident"
    ).slice(0, 60);
    const sanitizedText = sanitizeText(text);

    const newComment = await Comment.create({
      newsId,
      userId: user?.id || null,
      authorName: finalAuthorName,
      text: sanitizedText,
      status: "visible",
    });

    // Atomically increment commentCount on the story
    const updatedStory = await News.findByIdAndUpdate(
      newsId,
      { $inc: { commentCount: 1 } },
      { new: true }
    );

    res.status(201).json({
      comment: newComment,
      commentCount: updatedStory?.commentCount || 1,
    });
  } catch (err) {
    console.error("Create Comment Error:", err);
    res.status(500).json({ message: "Failed to post comment." });
  }
});

// @route   DELETE /api/news/:id/comments/:commentId
// @desc    Delete a comment (User can delete own comment, Admin can delete any)
// @access  Private
router.delete("/:id/comments/:commentId", verifyToken, async (req, res) => {
  try {
    const { id: newsId, commentId } = req.params;
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    // Check authorization: Admin or the comment creator
    const isAdmin = req.user?.role === "admin";
    const isOwner = comment.userId && String(comment.userId) === String(req.user?.id);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Not authorized to delete this comment." });
    }

    await Comment.findByIdAndDelete(commentId);

    // Decrement commentCount atomically
    const updatedStory = await News.findByIdAndUpdate(
      newsId,
      [
        {
          $set: {
            commentCount: { $max: [0, { $subtract: ["$commentCount", 1] }] },
          },
        },
      ],
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully.",
      commentCount: updatedStory?.commentCount || 0,
    });
  } catch (err) {
    console.error("Delete Comment Error:", err);
    res.status(500).json({ message: "Server error deleting comment." });
  }
});

// ====================================================================
// STANDARD PUBLIC NEWS LIST (BACKWARD COMPATIBLE)
// ====================================================================

// @route   GET /api/news
// @desc    Get news articles. Citizens get approved articles; Admins can filter by status
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { status, all } = req.query;
    let query = {};

    if (all === "true" || status === "all") {
      query = {};
    } else if (status) {
      query = { status };
    } else {
      query = {
        $or: [{ status: "approved" }, { isPublished: true }],
        status: { $nin: ["rejected", "draft"] },
      };
    }

    const news = await News.find(query)
      .populate("author", "name email role")
      .sort({ isFeatured: -1, publishedAt: -1, createdAt: -1 });

    res.status(200).json(news);
  } catch (err) {
    console.error("Fetch All News Error:", err);
    res.status(500).json({ message: "Error fetching news articles." });
  }
});

// @route   GET /api/news/admin/all
// @desc    Get all news stories including drafts, pending, and scheduled for admin dashboard
// @access  Private (Admin)
router.get("/admin/all", verifyToken, requireAdmin, async (req, res) => {
  try {
    const allStories = await News.find()
      .populate("author", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json(allStories);
  } catch (err) {
    console.error("Admin News Fetch Error:", err);
    res.status(500).json({ message: "Failed to fetch administrator news registry." });
  }
});

// @route   POST /api/news
// @desc    Post news with optional image/video files (Admin publishes or drafts; Citizens submit to pending review)
// @access  Public / Private (Open to all visitors and citizens)
router.post(
  "/",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      req.user = getOptionalUser(req);
      const {
        title,
        titleHi,
        summary,
        description,
        content,
        category,
        location,
        source,
        imageUrl: providedImageUrl,
        isFeatured,
        isPublished,
        status,
      } = req.body;

      if (!title || (!description && !summary)) {
        return res.status(400).json({ message: "Headline and story description/summary are required." });
      }

      let imagePath = (providedImageUrl || "").trim();
      let videoPath = "";

      const host = req.get("host") || "localhost:5000";
      const protocol =
        req.protocol === "https" || req.secure || req.headers["x-forwarded-proto"] === "https"
          ? "https"
          : "http";
      const baseUrl = `${protocol}://${host}`;

      if (req.files?.image?.[0]) {
        imagePath = `${baseUrl}/uploads/${req.files.image[0].filename}`;
      }

      if (req.files?.video?.[0]) {
        videoPath = `${baseUrl}/uploads/${req.files.video[0].filename}`;
      }

      const isAuthorAdmin = req.user?.role === "admin";

      let initialStatus = "pending";
      let initialPublished = false;

      if (isAuthorAdmin) {
        if (status === "draft") {
          initialStatus = "draft";
          initialPublished = false;
        } else {
          initialStatus = "approved";
          initialPublished = isPublished === "true" || isPublished === true;
        }
      }

      const news = await News.create({
        title: title.trim(),
        titleHi: (titleHi || "").trim(),
        summary: (summary || description || "").trim().slice(0, 300),
        description: (description || summary || "").trim(),
        content: (content || description || summary || "").trim(),
        category: category || "General",
        location: (location || "Fazilnagar").trim(),
        source: (source || (isAuthorAdmin ? "Town Bureau" : "Citizen Reporter")).trim(),
        image: imagePath,
        video: videoPath,
        author: req.user?.id,
        status: initialStatus,
        isPublished: initialPublished,
        isFeatured: isAuthorAdmin ? isFeatured === "true" || isFeatured === true : false,
        publishedAt: new Date(),
      });

      res.status(201).json({
        ...news.toObject(),
        moderationMessage: isAuthorAdmin
          ? initialPublished
            ? "Story published live to Fazilnagar News Feed."
            : "Story saved as draft."
          : "News submitted successfully and is pending admin review.",
      });
    } catch (err) {
      console.error("Create News Error:", err);
      res.status(500).json({ message: "Failed to publish news article." });
    }
  }
);

// @route   PUT /api/news/:id
// @desc    Admin edit news article
// @access  Private (Admin)
router.put(
  "/:id",
  verifyToken,
  requireAdmin,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const article = await News.findById(req.params.id);
      if (!article) {
        return res.status(404).json({ message: "News article not found." });
      }

      const {
        title,
        titleHi,
        summary,
        description,
        content,
        category,
        location,
        source,
        imageUrl: providedImageUrl,
        isFeatured,
        isPublished,
        status,
      } = req.body;

      if (title) article.title = title.trim();
      if (titleHi !== undefined) article.titleHi = titleHi.trim();
      if (summary !== undefined) article.summary = summary.trim();
      if (description !== undefined) article.description = description.trim();
      if (content !== undefined) article.content = content.trim();
      if (category !== undefined) article.category = category.trim();
      if (location !== undefined) article.location = location.trim();
      if (source !== undefined) article.source = source.trim();

      const host = req.get("host") || "localhost:5000";
      const protocol =
        req.protocol === "https" || req.secure || req.headers["x-forwarded-proto"] === "https"
          ? "https"
          : "http";
      const baseUrl = `${protocol}://${host}`;

      if (req.files?.image?.[0]) {
        article.image = `${baseUrl}/uploads/${req.files.image[0].filename}`;
      } else if (providedImageUrl && providedImageUrl.trim() !== "") {
        article.image = providedImageUrl.trim();
      }

      if (req.files?.video?.[0]) {
        article.video = `${baseUrl}/uploads/${req.files.video[0].filename}`;
      }

      if (isFeatured !== undefined) {
        article.isFeatured = isFeatured === "true" || isFeatured === true;
      }

      if (isPublished !== undefined) {
        article.isPublished = isPublished === "true" || isPublished === true;
        if (article.isPublished && article.status === "draft") {
          article.status = "approved";
        }
      }

      if (status !== undefined) {
        article.status = status;
        if (status === "approved") {
          article.isPublished = true;
        } else if (status === "draft" || status === "rejected") {
          article.isPublished = false;
        }
      }

      await article.save();
      res.status(200).json({ message: "News story updated successfully.", article });
    } catch (err) {
      console.error("Update News Error:", err);
      res.status(500).json({ message: "Failed to update article." });
    }
  }
);

// @route   PATCH /api/news/:id/publish
// @desc    Toggle publication status of news item
// @access  Private (Admin)
router.patch("/:id/publish", verifyToken, requireAdmin, async (req, res) => {
  try {
    const article = await News.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: "News article not found." });
    }

    const nextPublished =
      req.body.isPublished !== undefined ? req.body.isPublished : !article.isPublished;

    article.isPublished = nextPublished;
    if (nextPublished) {
      article.status = "approved";
      article.publishedAt = new Date();
    }

    await article.save();
    res.status(200).json({
      message: `News story ${article.isPublished ? "published" : "unpublished"}.`,
      isPublished: article.isPublished,
      article,
    });
  } catch (err) {
    console.error("Publish News Error:", err);
    res.status(500).json({ message: "Failed to update publication status." });
  }
});

// @route   PATCH /api/news/:id/feature
// @desc    Toggle pin / featured status
// @access  Private (Admin)
router.patch("/:id/feature", verifyToken, requireAdmin, async (req, res) => {
  try {
    const article = await News.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: "News article not found." });
    }

    article.isFeatured =
      req.body.isFeatured !== undefined ? req.body.isFeatured : !article.isFeatured;

    await article.save();
    res.status(200).json({
      message: `News story ${article.isFeatured ? "featured" : "unfeatured"}.`,
      isFeatured: article.isFeatured,
      article,
    });
  } catch (err) {
    console.error("Feature News Error:", err);
    res.status(500).json({ message: "Failed to toggle featured status." });
  }
});

// @route   PATCH /api/news/:id/status
// @desc    Admin moderation endpoint to approve or reject a news item
// @access  Private (Admin)
router.patch("/:id/status", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected", "pending", "draft"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const update = { status };
    if (status === "approved") {
      update.isPublished = true;
      update.publishedAt = new Date();
    } else if (status === "rejected" || status === "draft") {
      update.isPublished = false;
    }

    const article = await News.findByIdAndUpdate(req.params.id, update, { new: true });

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

    if (req.user.role !== "admin" && String(article.author) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to delete this article." });
    }

    await News.findByIdAndDelete(req.params.id);
    await Like.deleteMany({ newsId: req.params.id });
    await Comment.deleteMany({ newsId: req.params.id });

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

    News.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();
    res.status(200).json(article);
  } catch (err) {
    console.error("Fetch Single News Error:", err);
    res.status(400).json({ message: "Invalid article ID or server error." });
  }
});

export default router;