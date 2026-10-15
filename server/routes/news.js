import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import News from "../models/News.js";
import Like from "../models/Like.js";
import Comment from "../models/Comment.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { uploadMediaToDrive } from "./googleDrive.js";
import { createBroadcastNotification, createSubmissionNotification } from "../utils/notify.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed MIME types for story photos and video clips
const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

const ALLOWED_VIDEO_MIMES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
];

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
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || "").toLowerCase();
    if (ALLOWED_IMAGE_MIMES.includes(mime) || ALLOWED_VIDEO_MIMES.includes(mime)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file format. Please upload a valid image (JPG, PNG, WebP, GIF, SVG) or video (MP4, WebM, MOV)."));
    }
  },
});

// Helper to reliably normalize stored media URLs across hosts, origins, and environments
export function normalizeMediaUrl(rawUrl, req) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("blob:")) return "";
  if (trimmed.startsWith("data:")) return trimmed;

  const configuredBase = (process.env.BACKEND_URL || "").replace(/\/+$/, "");
  let hostBase = "";
  if (req && req.get) {
    const protocol =
      req.protocol === "https" || req.secure || req.headers["x-forwarded-proto"] === "https"
        ? "https"
        : "http";
    const host = req.get("host") || "localhost:5000";
    hostBase = `${protocol}://${host}`;
  }
  const effectiveBase = configuredBase || hostBase || "https://fazilnagar-portal.onrender.com";

  // Rewrite legacy hardcoded localhost / loopback URLs to the active reachable backend base
  if (trimmed.includes("localhost:") || trimmed.includes("127.0.0.1:")) {
    const uploadsIdx = trimmed.indexOf("/uploads/");
    if (uploadsIdx !== -1) {
      return `${effectiveBase}${trimmed.substring(uploadsIdx)}`;
    }
    const driveIdx = trimmed.indexOf("/api/google-drive/");
    if (driveIdx !== -1) {
      return `${effectiveBase}${trimmed.substring(driveIdx)}`;
    }
  }

  if (trimmed.startsWith("/")) {
    return `${effectiveBase}${trimmed}`;
  }

  return trimmed;
}

// Helper to reliably detect media types and ensure proper image/video assignment
export function formatNewsMedia(item, req) {
  if (!item) return { image: "", video: "", mediaUrl: "", mediaType: "none" };

  let image = normalizeMediaUrl(item.image, req);
  let video = normalizeMediaUrl(item.video, req);
  let mediaUrl = normalizeMediaUrl(item.mediaUrl, req);
  let mediaType = (item.mediaType || "none").toLowerCase();

  const isVideoExt = (url) => /\.(mp4|webm|mov|ogg|avi|m4v)($|\?)/i.test(url);
  const isImageExt = (url) => /\.(png|jpe?g|webp|gif|svg|bmp)($|\?)/i.test(url);

  // If item.video is actually an image (e.g. video-123.png)
  if (video && isImageExt(video)) {
    if (!image) image = video;
    video = "";
    mediaType = "image";
  }

  // If item.image is actually a video (e.g. image-123.mp4)
  if (image && isVideoExt(image)) {
    if (!video) video = image;
    image = "";
    mediaType = "video";
  }

  if (!mediaUrl) {
    mediaUrl = video || image || "";
  }

  if (!mediaType || mediaType === "none") {
    if (video) mediaType = "video";
    else if (image) mediaType = "image";
    else if (mediaUrl) mediaType = isVideoExt(mediaUrl) ? "video" : "image";
    else mediaType = "none";
  }

  // Ensure image is populated if mediaType is image and vice versa
  if (mediaType === "image" && !image && mediaUrl) {
    image = mediaUrl;
  }
  if (mediaType === "video" && !video && mediaUrl) {
    video = mediaUrl;
  }

  return { image, video, mediaUrl, mediaType };
}

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

    // Filter: Return all published and approved stories, and live citizen reports (exclude only drafts & rejected)
    const query = {
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

    // Attach like status for the verified authenticated user (guests cannot like)
    const storyIds = stories.map((s) => s._id);
    let userLikedSet = new Set();

    if (storyIds.length > 0 && user?.id) {
      const userLikes = await Like.find({ newsId: { $in: storyIds }, userId: user.id })
        .select("newsId")
        .lean();
      userLikedSet = new Set(userLikes.map((l) => String(l.newsId)));
    }

    // Map stories with accurate likeCount, commentCount, normalized media URLs and mediaType
    const enrichedStories = stories.map((s) => {
      const media = formatNewsMedia(s, req);
      return {
        ...s,
        ...media,
        likeCount: s.likeCount ?? s.likes ?? 0,
        commentCount: s.commentCount ?? 0,
        isLiked: userLikedSet.has(String(s._id)),
      };
    });

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
// @access  Private (Authenticated Users Only)
router.post("/:id/like", verifyToken, async (req, res) => {
  try {
    const newsId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(newsId)) {
      return res.status(400).json({ message: "Invalid news story ID." });
    }

    const userId = req.user.id || req.user._id;
    const ip = req.ip || req.connection?.remoteAddress || "";

    const story = await News.findById(newsId);
    if (!story) {
      return res.status(404).json({ message: "News story not found." });
    }

    const existingLike = await Like.findOne({ newsId, userId });

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
          userId,
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
// COMMENTS ENDPOINTS (PERSISTENT IN MONGODB WITH UNLIMITED BRANCHING)
// ====================================================================

// @route   GET /api/news/:id/comments
// @desc    Get all comments and nested replies for a news story
// @access  Public
router.get("/:id/comments", async (req, res) => {
  try {
    const newsId = req.params.id;
    const rawComments = await Comment.find({ newsId, status: "visible" })
      .sort({ createdAt: 1 })
      .lean();

    // Flatten any legacy embedded replies so every item is a unified node
    const comments = [];
    for (const c of rawComments) {
      comments.push({
        _id: c._id,
        newsId: c.newsId,
        parentId: c.parentId || null,
        replyToAuthorName: c.replyToAuthorName || null,
        userId: c.userId || null,
        anonId: c.anonId || null,
        authorName: c.authorName,
        text: c.text,
        likes: c.likes || 0,
        likedBy: c.likedBy || [],
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      });

      // Legacy embedded replies support
      if (Array.isArray(c.replies) && c.replies.length > 0) {
        for (const r of c.replies) {
          comments.push({
            _id: r._id,
            newsId: c.newsId,
            parentId: c._id,
            replyToAuthorName: c.authorName,
            userId: r.userId || null,
            anonId: r.anonId || null,
            authorName: r.authorName,
            text: r.text,
            likes: r.likes || 0,
            likedBy: r.likedBy || [],
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          });
        }
      }
    }

    res.status(200).json({
      comments,
      total: comments.length,
    });
  } catch (err) {
    console.error("Fetch Comments Error:", err);
    res.status(500).json({ message: "Failed to fetch comments." });
  }
});

// @route   POST /api/news/:id/comments
// @desc    Submit a new comment or reply to any comment/reply at unlimited depth
// @access  Private (Authenticated Users Only)
router.post("/:id/comments", verifyToken, async (req, res) => {
  try {
    const newsId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(newsId)) {
      return res.status(400).json({ message: "Invalid news story ID." });
    }

    const { text, parentId, replyToAuthorName } = req.body;
    const userId = req.user.id || req.user._id;

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

    // If replying to a parent comment or reply, verify parent
    let verifiedParentId = null;
    let targetReplyAuthor = replyToAuthorName || null;
    if (parentId) {
      const parentComment = await Comment.findOne({ _id: parentId, newsId, status: "visible" });
      if (!parentComment) {
        // Fallback: check if parentId was a legacy embedded reply
        const legacyParent = await Comment.findOne({ newsId, "replies._id": parentId });
        if (legacyParent) {
          verifiedParentId = legacyParent._id;
          const legacyReply = legacyParent.replies.id(parentId);
          if (legacyReply && !targetReplyAuthor) {
            targetReplyAuthor = legacyReply.authorName;
          }
        }
      } else {
        verifiedParentId = parentComment._id;
        if (!targetReplyAuthor) {
          targetReplyAuthor = parentComment.authorName;
        }
      }
    }

    // Determine author name from verified user identity
    const finalAuthorName = sanitizeText(
      req.user.name || "Fazilnagar Resident"
    ).slice(0, 60);
    const sanitizedText = sanitizeText(text);

    const newComment = await Comment.create({
      newsId,
      parentId: verifiedParentId,
      replyToAuthorName: targetReplyAuthor,
      userId,
      authorName: finalAuthorName,
      text: sanitizedText,
      status: "visible",
      likes: 0,
      likedBy: [],
      replies: [],
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

// @route   POST /api/news/:id/comments/:commentId/replies
// @desc    Add a reply to an existing comment (supports legacy route)
// @access  Private (Authenticated Users Only)
router.post("/:id/comments/:commentId/replies", verifyToken, async (req, res) => {
  try {
    const { id: newsId, commentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(newsId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid ID parameters." });
    }

    const { text } = req.body;
    const userId = req.user.id || req.user._id;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: "Reply text cannot be empty." });
    }

    if (text.trim().length > 500) {
      return res.status(400).json({ message: "Reply is too long (maximum 500 characters)." });
    }

    const parentComment = await Comment.findOne({ _id: commentId, newsId });
    if (!parentComment) {
      return res.status(404).json({ message: "Parent comment not found." });
    }

    const finalAuthorName = sanitizeText(
      req.user.name || "Fazilnagar Resident"
    ).slice(0, 60);
    const sanitizedText = sanitizeText(text);

    const newReply = await Comment.create({
      newsId,
      parentId: parentComment._id,
      replyToAuthorName: parentComment.authorName,
      userId,
      authorName: finalAuthorName,
      text: sanitizedText,
      status: "visible",
      likes: 0,
      likedBy: [],
    });

    const updatedStory = await News.findByIdAndUpdate(
      newsId,
      { $inc: { commentCount: 1 } },
      { new: true }
    );

    res.status(201).json({
      reply: newReply,
      comment: newReply,
      commentCount: updatedStory?.commentCount || 1,
    });
  } catch (err) {
    console.error("Add Reply Error:", err);
    res.status(500).json({ message: "Failed to post reply." });
  }
});

// @route   POST /api/news/:id/comments/:commentId/like
// @desc    Toggle like state for any comment or reply node
// @access  Private (Authenticated Users Only)
router.post("/:id/comments/:commentId/like", verifyToken, async (req, res) => {
  try {
    const { id: newsId, commentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(newsId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid ID parameters." });
    }
    const identifier = String(req.user.id || req.user._id);

    let comment = await Comment.findOne({ _id: commentId, newsId });
    if (!comment) {
      // Check legacy embedded reply
      const parentWithReply = await Comment.findOne({ newsId, "replies._id": commentId });
      if (parentWithReply) {
        const reply = parentWithReply.replies.id(commentId);
        if (reply) {
          const alreadyLiked = reply.likedBy?.includes(identifier);
          if (alreadyLiked) {
            reply.likedBy = reply.likedBy.filter((id) => id !== identifier);
            reply.likes = Math.max(0, (reply.likes || 1) - 1);
          } else {
            if (!reply.likedBy) reply.likedBy = [];
            reply.likedBy.push(identifier);
            reply.likes = (reply.likes || 0) + 1;
          }
          await parentWithReply.save();
          return res.status(200).json({
            liked: !alreadyLiked,
            likes: reply.likes,
            commentId: reply._id,
          });
        }
      }
      return res.status(404).json({ message: "Comment not found." });
    }

    const alreadyLiked = comment.likedBy?.includes(identifier);
    if (alreadyLiked) {
      comment.likedBy = comment.likedBy.filter((id) => id !== identifier);
      comment.likes = Math.max(0, (comment.likes || 1) - 1);
    } else {
      if (!comment.likedBy) comment.likedBy = [];
      comment.likedBy.push(identifier);
      comment.likes = (comment.likes || 0) + 1;
    }

    await comment.save();

    res.status(200).json({
      liked: !alreadyLiked,
      likes: comment.likes,
      commentId: comment._id,
    });
  } catch (err) {
    console.error("Comment Like Toggle Error:", err);
    res.status(500).json({ message: "Failed to toggle comment like." });
  }
});

// @route   POST /api/news/:id/comments/:commentId/replies/:replyId/like
// @desc    Toggle like state for a reply (supports legacy route)
// @access  Private (Authenticated Users Only)
router.post("/:id/comments/:commentId/replies/:replyId/like", verifyToken, async (req, res) => {
  try {
    const { id: newsId, replyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(newsId) || !mongoose.Types.ObjectId.isValid(replyId)) {
      return res.status(400).json({ message: "Invalid ID parameters." });
    }
    const identifier = String(req.user.id || req.user._id);

    let comment = await Comment.findOne({ _id: replyId, newsId });
    if (!comment) {
      const parentWithReply = await Comment.findOne({ newsId, "replies._id": replyId });
      if (parentWithReply) {
        const reply = parentWithReply.replies.id(replyId);
        if (reply) {
          const alreadyLiked = reply.likedBy?.includes(identifier);
          if (alreadyLiked) {
            reply.likedBy = reply.likedBy.filter((id) => id !== identifier);
            reply.likes = Math.max(0, (reply.likes || 1) - 1);
          } else {
            if (!reply.likedBy) reply.likedBy = [];
            reply.likedBy.push(identifier);
            reply.likes = (reply.likes || 0) + 1;
          }
          await parentWithReply.save();
          return res.status(200).json({
            liked: !alreadyLiked,
            likes: reply.likes,
            replyId: reply._id,
          });
        }
      }
      return res.status(404).json({ message: "Reply not found." });
    }

    const alreadyLiked = comment.likedBy?.includes(identifier);
    if (alreadyLiked) {
      comment.likedBy = comment.likedBy.filter((id) => id !== identifier);
      comment.likes = Math.max(0, (comment.likes || 1) - 1);
    } else {
      if (!comment.likedBy) comment.likedBy = [];
      comment.likedBy.push(identifier);
      comment.likes = (comment.likes || 0) + 1;
    }
    await comment.save();

    res.status(200).json({
      liked: !alreadyLiked,
      likes: comment.likes,
      replyId: comment._id,
    });
  } catch (err) {
    console.error("Reply Like Toggle Error:", err);
    res.status(500).json({ message: "Failed to toggle reply like." });
  }
});

// @route   DELETE /api/news/:id/comments/:commentId
// @desc    Delete a comment or reply with cascading branch deletion
// @access  Private (Comment Author, Story Creator, or Admin)
router.delete("/:id/comments/:commentId", verifyToken, async (req, res) => {
  try {
    const { id: newsId, commentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(newsId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid ID parameters." });
    }
    const user = req.user;

    let [comment, story] = await Promise.all([
      Comment.findById(commentId),
      News.findById(newsId),
    ]);

    // Check if it's a legacy embedded reply
    if (!comment) {
      const parentWithReply = await Comment.findOne({ newsId, "replies._id": commentId });
      if (parentWithReply) {
        const reply = parentWithReply.replies.id(commentId);
        if (reply) {
          const isAdmin = user?.role === "admin" || user?.email === "pankaj723880@gmail.com";
          const isReplyAuthor = user?.id && reply.userId && String(reply.userId) === String(user.id);
          const isStoryAuthor = user?.id && story?.author && String(story.author) === String(user.id);

          if (!isAdmin && !isReplyAuthor && !isStoryAuthor) {
            return res.status(403).json({
              message: "You are not authorized to delete this reply. Only the author, story creator, or admin can delete it.",
            });
          }

          reply.deleteOne();
          await parentWithReply.save();
          const updatedStory = await News.findByIdAndUpdate(
            newsId,
            [{ $set: { commentCount: { $max: [0, { $subtract: ["$commentCount", 1] }] } } }],
            { new: true }
          );
          return res.status(200).json({
            success: true,
            deletedIds: [commentId],
            commentCount: updatedStory?.commentCount || 0,
          });
        }
      }
      return res.status(404).json({ message: "Comment not found." });
    }

    // Check authorization:
    const isAdmin = user?.role === "admin" || user?.email === "pankaj723880@gmail.com";
    const isCommentAuthor = user?.id && comment.userId && String(comment.userId) === String(user.id);
    const isStoryAuthor = user?.id && story?.author && String(story.author) === String(user.id);

    if (!isAdmin && !isCommentAuthor && !isStoryAuthor) {
      return res.status(403).json({
        message: "You are not authorized to delete this comment. Only the commenter, story author, or admin can delete it.",
      });
    }

    // Recursive cascade deletion: collect all descendant reply IDs (unlimited branch)
    const idsToDelete = [comment._id];
    let currentLevel = [comment._id];
    while (currentLevel.length > 0) {
      const children = await Comment.find({ newsId, parentId: { $in: currentLevel } }, "_id").lean();
      if (children.length === 0) break;
      const nextLevel = children.map((c) => c._id);
      idsToDelete.push(...nextLevel);
      currentLevel = nextLevel;
    }

    const legacyRepliesCount = comment.replies?.length || 0;
    const totalCountToDelete = idsToDelete.length + legacyRepliesCount;

    await Comment.deleteMany({ _id: { $in: idsToDelete } });

    // Decrement commentCount atomically on story
    const updatedStory = await News.findByIdAndUpdate(
      newsId,
      [
        {
          $set: {
            commentCount: { $max: [0, { $subtract: ["$commentCount", totalCountToDelete] }] },
          },
        },
      ],
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Comment and any replies deleted successfully.",
      deletedIds: idsToDelete.map(String),
      commentCount: updatedStory?.commentCount || 0,
    });
  } catch (err) {
    console.error("Delete Comment Error:", err);
    res.status(500).json({ message: "Server error deleting comment." });
  }
});

// @route   DELETE /api/news/:id/comments/:commentId/replies/:replyId
// @desc    Delete a reply (supports legacy route)
// @access  Private (Reply Author, Story Creator, or Admin)
router.delete("/:id/comments/:commentId/replies/:replyId", verifyToken, async (req, res) => {
  // Delegate directly to the recursive delete route using replyId
  req.params.commentId = req.params.replyId;
  try {
    const { id: newsId, replyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(newsId) || !mongoose.Types.ObjectId.isValid(replyId)) {
      return res.status(400).json({ message: "Invalid ID parameters." });
    }
    const user = req.user;

    let [comment, story] = await Promise.all([
      Comment.findById(replyId),
      News.findById(newsId),
    ]);

    if (!comment) {
      const parentWithReply = await Comment.findOne({ newsId, "replies._id": replyId });
      if (parentWithReply) {
        const reply = parentWithReply.replies.id(replyId);
        if (reply) {
          const isAdmin = user?.role === "admin" || user?.email === "pankaj723880@gmail.com";
          const isReplyAuthor = user?.id && reply.userId && String(reply.userId) === String(user.id);
          const isStoryAuthor = user?.id && story?.author && String(story.author) === String(user.id);

          if (!isAdmin && !isReplyAuthor && !isStoryAuthor) {
            return res.status(403).json({
              message: "You are not authorized to delete this reply. Only the author, story creator, or admin can delete it.",
            });
          }

          reply.deleteOne();
          await parentWithReply.save();
          const updatedStory = await News.findByIdAndUpdate(
            newsId,
            [{ $set: { commentCount: { $max: [0, { $subtract: ["$commentCount", 1] }] } } }],
            { new: true }
          );
          return res.status(200).json({
            success: true,
            deletedIds: [replyId],
            commentCount: updatedStory?.commentCount || 0,
          });
        }
      }
      return res.status(404).json({ message: "Reply not found." });
    }

    const isAdmin = user?.role === "admin" || user?.email === "pankaj723880@gmail.com";
    const isReplyAuthor = user?.id && comment.userId && String(comment.userId) === String(user.id);
    const isStoryAuthor = user?.id && story?.author && String(story.author) === String(user.id);

    if (!isAdmin && !isReplyAuthor && !isStoryAuthor) {
      return res.status(403).json({
        message: "You are not authorized to delete this reply. Only the author, story creator, or admin can delete it.",
      });
    }

    const idsToDelete = [comment._id];
    let currentLevel = [comment._id];
    while (currentLevel.length > 0) {
      const children = await Comment.find({ newsId, parentId: { $in: currentLevel } }, "_id").lean();
      if (children.length === 0) break;
      const nextLevel = children.map((c) => c._id);
      idsToDelete.push(...nextLevel);
      currentLevel = nextLevel;
    }

    await Comment.deleteMany({ _id: { $in: idsToDelete } });

    const updatedStory = await News.findByIdAndUpdate(
      newsId,
      [
        {
          $set: {
            commentCount: { $max: [0, { $subtract: ["$commentCount", idsToDelete.length] }] },
          },
        },
      ],
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Reply deleted successfully.",
      deletedIds: idsToDelete.map(String),
      commentCount: updatedStory?.commentCount || 0,
    });
  } catch (err) {
    console.error("Delete Reply Error:", err);
    res.status(500).json({ message: "Server error deleting reply." });
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

    const normalizedNews = news.map((item) => {
      const obj = item.toObject();
      const media = formatNewsMedia(obj, req);
      return { ...obj, ...media };
    });

    res.status(200).json(normalizedNews);
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

    const normalizedStories = allStories.map((item) => {
      const obj = item.toObject();
      const media = formatNewsMedia(obj, req);
      return { ...obj, ...media };
    });

    res.status(200).json(normalizedStories);
  } catch (err) {
    console.error("Admin News Fetch Error:", err);
    res.status(500).json({ message: "Failed to fetch administrator news registry." });
  }
});

// @route   POST /api/news
// @desc    Post news with optional image/video files (Requires authenticated user)
// @access  Private (Authenticated Users Only)
router.post(
  "/",
  verifyToken,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "media", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  async (req, res) => {
    let createdLocalFiles = [];
    try {
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
        videoUrl: providedVideoUrl,
        mediaUrl: providedMediaUrl,
        mediaType: providedMediaType,
        isFeatured,
        isPublished,
        status,
      } = req.body;

      if (!title || (!description && !summary)) {
        return res.status(400).json({ message: "Headline and story description/summary are required." });
      }

      // Check for and reject invalid blob URLs
      let imagePath = (providedImageUrl || "").trim();
      let videoPath = (providedVideoUrl || "").trim();
      let mediaUrl = (providedMediaUrl || "").trim();

      if (imagePath.startsWith("blob:")) imagePath = "";
      if (videoPath.startsWith("blob:")) videoPath = "";
      if (mediaUrl.startsWith("blob:")) mediaUrl = "";

      let mediaType = (providedMediaType || "none").toLowerCase();
      let mediaMeta = null;

      // Identify uploaded file from fields (image, video, media, file)
      const rawImageFile = req.files?.image?.[0];
      const rawVideoFile = req.files?.video?.[0];
      const genericMediaFile = req.files?.media?.[0] || req.files?.file?.[0];

      let imageFile = rawImageFile;
      let videoFile = rawVideoFile;

      // Smart detection based on actual MIME type or file extension
      const isVideoFile = (f) => {
        if (!f) return false;
        const mime = (f.mimetype || "").toLowerCase();
        const ext = path.extname(f.originalname || f.filename || "").toLowerCase();
        return ALLOWED_VIDEO_MIMES.includes(mime) || [".mp4", ".webm", ".mov", ".ogg", ".avi"].includes(ext);
      };

      const isImageFile = (f) => {
        if (!f) return false;
        const mime = (f.mimetype || "").toLowerCase();
        const ext = path.extname(f.originalname || f.filename || "").toLowerCase();
        return ALLOWED_IMAGE_MIMES.includes(mime) || [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext);
      };

      if (rawVideoFile && isImageFile(rawVideoFile) && !imageFile) {
        imageFile = rawVideoFile;
        videoFile = null;
      } else if (rawImageFile && isVideoFile(rawImageFile) && !videoFile) {
        videoFile = rawImageFile;
        imageFile = null;
      }

      if (genericMediaFile) {
        createdLocalFiles.push(genericMediaFile.path);
        if (isVideoFile(genericMediaFile)) {
          videoFile = genericMediaFile;
        } else if (isImageFile(genericMediaFile)) {
          imageFile = genericMediaFile;
        }
      }

      if (rawImageFile) createdLocalFiles.push(rawImageFile.path);
      if (rawVideoFile) createdLocalFiles.push(rawVideoFile.path);

      if (imageFile) {
        const fileBuffer = fs.readFileSync(imageFile.path);
        const mime = (imageFile.mimetype || "image/jpeg").toLowerCase();
        mediaMeta = {
          originalName: imageFile.originalname || "image.jpg",
          mimeType: mime,
          size: imageFile.size,
        };
        mediaType = "image";

        try {
          const { mediaDoc } = await uploadMediaToDrive({
            buffer: fileBuffer,
            originalName: imageFile.originalname || "news_image.jpg",
            mimeType: mime,
            user: req.user,
          });
          imagePath = mediaDoc.deliveryUrl;
          // Unlink local temp file because it's safely stored in Google Drive
          try { fs.unlinkSync(imageFile.path); } catch (_) {}
          createdLocalFiles = createdLocalFiles.filter((p) => p !== imageFile.path);
        } catch (driveErr) {
          console.warn("[News] Drive upload fallback to local storage:", driveErr.message);
          // Keep local file in uploadsDir and store relative path
          imagePath = `/uploads/${imageFile.filename}`;
        }
      } else if (imagePath && imagePath.startsWith("data:image/")) {
        mediaType = "image";
        try {
          const matches = imagePath.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mime = matches[1];
            const buffer = Buffer.from(matches[2], "base64");
            const { mediaDoc } = await uploadMediaToDrive({
              buffer,
              originalName: "news_image.jpg",
              mimeType: mime,
              user: req.user,
            });
            imagePath = mediaDoc.deliveryUrl;
          }
        } catch (driveErr) {
          console.warn("[News] Base64 Drive upload fallback:", driveErr.message);
        }
      }

      if (videoFile) {
        const fileBuffer = fs.readFileSync(videoFile.path);
        const mime = (videoFile.mimetype || "video/mp4").toLowerCase();
        mediaMeta = {
          originalName: videoFile.originalname || "video.mp4",
          mimeType: mime,
          size: videoFile.size,
        };
        mediaType = "video";

        try {
          const { mediaDoc } = await uploadMediaToDrive({
            buffer: fileBuffer,
            originalName: videoFile.originalname || "news_video.mp4",
            mimeType: mime,
            user: req.user,
          });
          videoPath = mediaDoc.deliveryUrl;
          try { fs.unlinkSync(videoFile.path); } catch (_) {}
          createdLocalFiles = createdLocalFiles.filter((p) => p !== videoFile.path);
        } catch (driveErr) {
          console.warn("[News] Video Drive upload fallback to local storage:", driveErr.message);
          videoPath = `/uploads/${videoFile.filename}`;
        }
      }

      // Consolidate final mediaUrl and mediaType
      if (videoPath) {
        mediaUrl = videoPath;
        mediaType = "video";
      } else if (imagePath) {
        mediaUrl = imagePath;
        mediaType = "image";
      } else if (mediaUrl) {
        if (!mediaType || mediaType === "none") {
          mediaType = /\.(mp4|webm|mov|ogg)($|\?)/i.test(mediaUrl) ? "video" : "image";
        }
      }

      const isAuthorAdmin = req.user?.role === "admin";
      let initialStatus = "approved";
      let initialPublished = true;

      if (status === "draft") {
        initialStatus = "draft";
        initialPublished = false;
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
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        mediaMeta: mediaMeta,
        author: req.user?.id,
        status: initialStatus,
        isPublished: initialPublished,
        isFeatured: isAuthorAdmin ? isFeatured === "true" || isFeatured === true : false,
        publishedAt: new Date(),
      });

      if (initialPublished) {
        createBroadcastNotification({
          type: "broadcast_news",
          title: `📰 ${news.title}`,
          message: news.summary || "New story published in Fazilnagar.",
          link: `/news?storyId=${news._id}`,
          data: { newsId: news._id },
        }).catch(() => {});
      }

      const resp = news.toObject();
      resp.image = normalizeMediaUrl(resp.image, req);
      resp.video = normalizeMediaUrl(resp.video, req);
      resp.mediaUrl = normalizeMediaUrl(resp.mediaUrl || resp.video || resp.image, req);
      resp.mediaType = resp.mediaType || (resp.video ? "video" : resp.image ? "image" : "none");

      res.status(201).json({
        ...resp,
        moderationMessage: initialPublished
          ? "Story published live to Fazilnagar News Feed."
          : "Story saved as draft.",
      });
    } catch (err) {
      console.error("Create News Error:", err);
      for (const filePath of createdLocalFiles) {
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (_) {}
      }
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
    { name: "media", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]),
  async (req, res) => {
    let createdLocalFiles = [];
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
        videoUrl: providedVideoUrl,
        mediaUrl: providedMediaUrl,
        mediaType: providedMediaType,
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

      // Check for provided media strings without saving blob URLs
      if (providedImageUrl && !providedImageUrl.startsWith("blob:")) {
        if (providedImageUrl.startsWith("data:image/")) {
          try {
            const matches = providedImageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              const mime = matches[1];
              const buffer = Buffer.from(matches[2], "base64");
              const { mediaDoc } = await uploadMediaToDrive({
                buffer,
                originalName: "news_image.jpg",
                mimeType: mime,
                user: req.user,
              });
              article.image = mediaDoc.deliveryUrl;
            }
          } catch (driveErr) {
            console.warn("[News] Base64 Drive upload fallback:", driveErr.message);
            article.image = providedImageUrl.trim();
          }
        } else {
          article.image = providedImageUrl.trim();
        }
      }

      if (providedVideoUrl && !providedVideoUrl.startsWith("blob:")) {
        article.video = providedVideoUrl.trim();
      }

      if (providedMediaUrl && !providedMediaUrl.startsWith("blob:")) {
        article.mediaUrl = providedMediaUrl.trim();
      }

      if (providedMediaType) {
        article.mediaType = providedMediaType.toLowerCase();
      }

      // Handle newly uploaded files
      const rawImageFile = req.files?.image?.[0];
      const rawVideoFile = req.files?.video?.[0];
      const genericMediaFile = req.files?.media?.[0] || req.files?.file?.[0];

      let imageFile = rawImageFile;
      let videoFile = rawVideoFile;

      // Smart detection based on actual MIME type or file extension
      const isVideoFile = (f) => {
        if (!f) return false;
        const mime = (f.mimetype || "").toLowerCase();
        const ext = path.extname(f.originalname || f.filename || "").toLowerCase();
        return ALLOWED_VIDEO_MIMES.includes(mime) || [".mp4", ".webm", ".mov", ".ogg", ".avi"].includes(ext);
      };

      const isImageFile = (f) => {
        if (!f) return false;
        const mime = (f.mimetype || "").toLowerCase();
        const ext = path.extname(f.originalname || f.filename || "").toLowerCase();
        return ALLOWED_IMAGE_MIMES.includes(mime) || [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext);
      };

      if (rawVideoFile && isImageFile(rawVideoFile) && !imageFile) {
        imageFile = rawVideoFile;
        videoFile = null;
      } else if (rawImageFile && isVideoFile(rawImageFile) && !videoFile) {
        videoFile = rawImageFile;
        imageFile = null;
      }

      if (genericMediaFile) {
        createdLocalFiles.push(genericMediaFile.path);
        if (isVideoFile(genericMediaFile)) {
          videoFile = genericMediaFile;
        } else if (isImageFile(genericMediaFile)) {
          imageFile = genericMediaFile;
        }
      }

      if (rawImageFile) createdLocalFiles.push(rawImageFile.path);
      if (rawVideoFile) createdLocalFiles.push(rawVideoFile.path);

      if (imageFile) {
        const fileBuffer = fs.readFileSync(imageFile.path);
        const mime = (imageFile.mimetype || "image/jpeg").toLowerCase();
        article.mediaMeta = {
          originalName: imageFile.originalname || "image.jpg",
          mimeType: mime,
          size: imageFile.size,
        };

        try {
          const { mediaDoc } = await uploadMediaToDrive({
            buffer: fileBuffer,
            originalName: imageFile.originalname || "news_image.jpg",
            mimeType: mime,
            user: req.user,
          });
          article.image = mediaDoc.deliveryUrl;
          article.mediaUrl = mediaDoc.deliveryUrl;
          article.mediaType = "image";
          try { fs.unlinkSync(imageFile.path); } catch (_) {}
          createdLocalFiles = createdLocalFiles.filter((p) => p !== imageFile.path);
        } catch (driveErr) {
          console.warn("[News] Drive upload fallback:", driveErr.message);
          article.image = `/uploads/${imageFile.filename}`;
          article.mediaUrl = `/uploads/${imageFile.filename}`;
          article.mediaType = "image";
        }
      }

      if (videoFile) {
        const fileBuffer = fs.readFileSync(videoFile.path);
        const mime = (videoFile.mimetype || "video/mp4").toLowerCase();
        article.mediaMeta = {
          originalName: videoFile.originalname || "video.mp4",
          mimeType: mime,
          size: videoFile.size,
        };

        try {
          const { mediaDoc } = await uploadMediaToDrive({
            buffer: fileBuffer,
            originalName: videoFile.originalname || "news_video.mp4",
            mimeType: mime,
            user: req.user,
          });
          article.video = mediaDoc.deliveryUrl;
          article.mediaUrl = mediaDoc.deliveryUrl;
          article.mediaType = "video";
          try { fs.unlinkSync(videoFile.path); } catch (_) {}
          createdLocalFiles = createdLocalFiles.filter((p) => p !== videoFile.path);
        } catch (driveErr) {
          console.warn("[News] Video Drive upload fallback:", driveErr.message);
          article.video = `/uploads/${videoFile.filename}`;
          article.mediaUrl = `/uploads/${videoFile.filename}`;
          article.mediaType = "video";
        }
      }

      if (!article.mediaUrl) {
        article.mediaUrl = article.video || article.image || "";
      }
      if (!article.mediaType || article.mediaType === "none") {
        article.mediaType = article.video ? "video" : article.image ? "image" : "none";
      }

      if (isFeatured !== undefined) {
        article.isFeatured = isFeatured === "true" || isFeatured === true;
      }

      if (isPublished !== undefined) {
        article.isPublished = isPublished === "true" || isPublished === true;
        if (article.isPublished && article.status === "draft") {
          article.status = "approved";
        } else if (!article.isPublished && article.status === "approved") {
          article.status = "draft";
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

      const resp = article.toObject();
      resp.image = normalizeMediaUrl(resp.image, req);
      resp.video = normalizeMediaUrl(resp.video, req);
      resp.mediaUrl = normalizeMediaUrl(resp.mediaUrl || resp.video || resp.image, req);
      resp.mediaType = resp.mediaType || (resp.video ? "video" : resp.image ? "image" : "none");

      res.status(200).json({ message: "News story updated successfully.", article: resp });
    } catch (err) {
      console.error("Update News Error:", err);
      for (const filePath of createdLocalFiles) {
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (_) {}
      }
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
      req.body.isPublished !== undefined
        ? Boolean(req.body.isPublished)
        : !(article.isPublished && article.status === "approved");

    article.isPublished = nextPublished;
    if (nextPublished) {
      article.status = "approved";
      if (!article.publishedAt) {
        article.publishedAt = new Date();
      }
    } else {
      article.status = "draft";
    }

    await article.save();
    res.status(200).json({
      message: `News story ${article.isPublished ? "published" : "unpublished"}.`,
      isPublished: article.isPublished,
      status: article.status,
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

    if (status === "approved") {
      if (article.author) {
        createSubmissionNotification({
          recipient: article.author,
          type: "submission_approved",
          title: "Story Approved! 🎉",
          message: `Your story "${article.title}" has been approved and published to the news feed!`,
          link: `/news?storyId=${article._id}`,
          data: { newsId: article._id },
        }).catch(() => {});
      }
      createBroadcastNotification({
        type: "broadcast_news",
        title: `📰 ${article.title}`,
        message: article.summary || "New breaking story published in Fazilnagar.",
        link: `/news?storyId=${article._id}`,
        data: { newsId: article._id },
      }).catch(() => {});
    } else if (status === "rejected") {
      if (article.author) {
        createSubmissionNotification({
          recipient: article.author,
          type: "submission_rejected",
          title: "Story Moderation Update",
          message: `Your story "${article.title}" was not approved for publication.`,
          link: "/news",
          data: { newsId: article._id },
        }).catch(() => {});
      }
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

    const obj = article.toObject();
    const media = formatNewsMedia(obj, req);

    res.status(200).json({ ...obj, ...media });
  } catch (err) {
    console.error("Fetch Single News Error:", err);
    res.status(400).json({ message: "Invalid article ID or server error." });
  }
});

export default router;