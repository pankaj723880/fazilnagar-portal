import express from "express";
import Submission from "../models/Submission.js";
import Place from "../models/Place.js";
import News from "../models/News.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// @route   POST /api/submissions
// @desc    Citizen Corner public submission (suggest business, report error, submit event)
// @access  Public
router.post("/", async (req, res) => {
  try {
    const { type, title, category, phone, landmark, venue, eventDate, organizer, details, submittedBy } = req.body;

    if (!type || !title) {
      return res.status(400).json({ message: "Submission type and title are required." });
    }

    if (!["business", "correction", "event"].includes(type)) {
      return res.status(400).json({ message: "Invalid submission type." });
    }

    const submission = await Submission.create({
      type,
      title: title.trim(),
      category: category ? category.trim() : "",
      phone: phone ? phone.trim() : "",
      landmark: landmark ? landmark.trim() : "",
      venue: venue ? venue.trim() : "",
      eventDate: eventDate ? eventDate.trim() : "",
      organizer: organizer ? organizer.trim() : "",
      details: details ? details.trim() : "",
      submittedBy: submittedBy || { name: "Local Citizen" },
      status: "pending",
    });

    res.status(201).json({
      message: "Submission received successfully and queued for admin review.",
      submission,
    });
  } catch (err) {
    console.error("Create Submission Error:", err);
    res.status(500).json({ message: "Failed to process citizen submission." });
  }
});

// @route   GET /api/submissions
// @desc    Admin review list for all citizen submissions
// @access  Private (Admin)
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { type, status } = req.query;
    const query = {};

    if (type && type !== "all") query.type = type;
    if (status && status !== "all") query.status = status;

    const submissions = await Submission.find(query).sort({ createdAt: -1 });
    res.status(200).json(submissions);
  } catch (err) {
    console.error("Fetch Submissions Error:", err);
    res.status(500).json({ message: "Failed to fetch submissions." });
  }
});

// @route   PATCH /api/submissions/:id
// @desc    Admin approves or rejects a submission (optionally publishes to Place or News)
// @access  Private (Admin)
router.patch("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    submission.status = status;
    if (adminNotes !== undefined) submission.adminNotes = adminNotes;
    await submission.save();

    // Side-effects on approval
    let extraAction = null;
    if (status === "approved") {
      // 1. If it's a suggested business, create or verify it in the Place directory
      if (submission.type === "business") {
        try {
          const newPlace = await Place.create({
            name: submission.title,
            category: submission.category || "Commercial & Retail",
            subcategory: "Citizen Verified",
            phone: submission.phone || "",
            streetOrLandmark: submission.landmark || "Fazilnagar Town",
            addressFull: `${submission.landmark || "Main Road"}, Fazilnagar - 274401`,
            locality: "Fazilnagar Town",
            latitude: 26.6827, // Fazilnagar center fallback
            longitude: 84.0498,
            verificationStatus: "verified",
            isPublished: true,
            reviewNotes: `Approved from citizen suggestion ID: ${submission._id}`,
          });
          extraAction = { type: "place_created", placeId: newPlace._id };
        } catch (placeErr) {
          console.warn("Place auto-creation notice:", placeErr.message);
        }
      }

      // 2. If it's a town event, publish it to news/bulletins
      if (submission.type === "event") {
        try {
          const newNews = await News.create({
            title: submission.title,
            titleHi: `कार्यक्रम: ${submission.title}`,
            description: `${submission.details || "Town event"}\n\nVenue: ${submission.venue || "Fazilnagar"}\nDate: ${submission.eventDate || "Upcoming"}\nOrganizer: ${submission.organizer || "Community Organizer"}`,
            category: "Event",
            author: req.user.id,
            status: "approved",
          });
          extraAction = { type: "event_published", newsId: newNews._id };
        } catch (eventErr) {
          console.warn("Event auto-publish notice:", eventErr.message);
        }
      }
    }

    res.status(200).json({
      message: `Submission marked as ${status}.`,
      submission,
      extraAction,
    });
  } catch (err) {
    console.error("Update Submission Error:", err);
    res.status(500).json({ message: "Failed to update submission status." });
  }
});

// @route   DELETE /api/submissions/:id
// @desc    Admin deletes a submission
// @access  Private (Admin)
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const deleted = await Submission.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Submission not found." });
    }
    res.status(200).json({ message: "Submission deleted successfully." });
  } catch (err) {
    console.error("Delete Submission Error:", err);
    res.status(500).json({ message: "Failed to delete submission." });
  }
});

export default router;
