import express from "express";
import mongoose from "mongoose";
import JobListing from "../models/JobListing.js";
import JobApplication from "../models/JobApplication.js";
import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import Message from "../models/Message.js";
import Block from "../models/Block.js";
import User from "../models/User.js";
import Report from "../models/Report.js";
import Notification from "../models/Notification.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { writeLimiter, searchLimiter } from "../middleware/rateLimiter.js";
import { getIO } from "../socket.js";

const router = express.Router();

// Helper: Safely broadcast a new message via Socket.IO
function broadcastNewMessage(conversationId, message, recipientIds, updatedConv) {
  try {
    const io = getIO();
    if (!io) return;
    io.to(`conv:${conversationId}`).emit("new_message", message);
    for (const rid of recipientIds) {
      io.to(`user:${rid}`).emit("conversation_updated", {
        conversationId,
        lastMessage: updatedConv.lastMessage,
        lastMessageAt: updatedConv.lastMessageAt,
      });
    }
  } catch (err) {
    console.warn("[Jobs Socket] Broadcast warning:", err.message);
  }
}

// Helper: Get or create direct conversation between two users
async function getOrCreateDirectConversation(senderId, recipientId) {
  const senderIdStr = senderId.toString();
  const recipientIdStr = recipientId.toString();

  // Check if direct conversation already exists between these two users
  const senderMemberships = await ConversationMember.find({
    user: senderId,
    status: { $in: ["active", "pending_approval"] },
  }).distinct("conversation");

  if (senderMemberships.length > 0) {
    const commonMembership = await ConversationMember.findOne({
      conversation: { $in: senderMemberships },
      user: recipientId,
      status: { $in: ["active", "pending_approval"] },
    });

    if (commonMembership) {
      const conv = await Conversation.findOne({
        _id: commonMembership.conversation,
        type: "direct",
      });
      if (conv) {
        return conv;
      }
    }
  }

  // Create new direct conversation
  const recipient = await User.findById(recipientId).select("whoCanMessage status");
  const initialStatus = recipient?.whoCanMessage === "requests" ? "pending" : "active";

  const newConv = await Conversation.create({
    type: "direct",
    status: initialStatus,
    initiator: senderId,
    lastMessage: {
      text: "",
      sender: senderId,
      createdAt: new Date(),
      type: "text",
    },
    lastMessageAt: new Date(),
  });

  await ConversationMember.create([
    {
      conversation: newConv._id,
      user: senderId,
      role: "admin",
      status: "active",
    },
    {
      conversation: newConv._id,
      user: recipientId,
      role: "member",
      status: initialStatus === "pending" ? "pending_approval" : "active",
    },
  ]);

  return newConv;
}

// -------------------------------------------------------------
// GET /api/jobs/categories - Category counts summary
// -------------------------------------------------------------
router.get("/categories", async (req, res) => {
  try {
    const jobStats = await JobListing.aggregate([
      { $match: { type: "job", status: "open" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const seekerStats = await JobListing.aggregate([
      { $match: { type: "job_seeker", status: "looking_for_work" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const totalOpenJobs = await JobListing.countDocuments({ type: "job", status: "open" });
    const totalSeekers = await JobListing.countDocuments({ type: "job_seeker", status: "looking_for_work" });

    res.json({
      success: true,
      totalOpenJobs,
      totalSeekers,
      jobCategories: jobStats,
      seekerCategories: seekerStats,
    });
  } catch (err) {
    console.error("Jobs categories error:", err);
    res.status(500).json({ success: false, message: "Failed to load job categories." });
  }
});

// -------------------------------------------------------------
// GET /api/jobs - List listings with search, filters & pagination
// -------------------------------------------------------------
router.get("/", searchLimiter, async (req, res) => {
  try {
    const {
      type = "job",
      category,
      employmentType,
      location,
      fresherOnly,
      minSalary,
      maxSalary,
      search,
      sort = "recent",
      page = 1,
      limit = 12,
      includeClosed,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const query = {
      type: type === "job_seeker" ? "job_seeker" : "job",
    };

    // Status filter: default to open/looking_for_work unless explicitly including closed
    if (includeClosed !== "true") {
      if (query.type === "job") {
        query.status = "open";
      } else {
        query.status = "looking_for_work";
      }
    }

    if (category && category !== "All") {
      query.category = category.trim();
    }

    if (employmentType && employmentType !== "All") {
      if (query.type === "job") {
        query.employmentType = employmentType.trim();
      } else {
        query.employmentPreference = { $in: [employmentType.trim(), "Any"] };
      }
    }

    if (location && location.trim()) {
      const locRegex = new RegExp(location.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      if (query.type === "job") {
        query.location = locRegex;
      } else {
        query.preferredLocation = locRegex;
      }
    }

    if (fresherOnly === "true") {
      if (query.type === "job") {
        query.isFresherFriendly = true;
      } else {
        query.experienceLevel = { $regex: /fresher/i };
      }
    }

    if (minSalary && !isNaN(minSalary)) {
      query.salaryMin = { $gte: Number(minSalary) };
    }
    if (maxSalary && !isNaN(maxSalary)) {
      query.salaryMax = { $lte: Number(maxSalary) };
    }

    // Text search or regex keyword search
    if (search && search.trim()) {
      const sanitizedSearch = search.trim();
      query.$or = [
        { title: { $regex: sanitizedSearch, $options: "i" } },
        { company: { $regex: sanitizedSearch, $options: "i" } },
        { desiredRole: { $regex: sanitizedSearch, $options: "i" } },
        { skills: { $regex: sanitizedSearch, $options: "i" } },
        { description: { $regex: sanitizedSearch, $options: "i" } },
        { location: { $regex: sanitizedSearch, $options: "i" } },
        { preferredLocation: { $regex: sanitizedSearch, $options: "i" } },
        { displayName: { $regex: sanitizedSearch, $options: "i" } },
      ];
    }

    // Sorting
    let sortOptions = { createdAt: -1 };
    if (sort === "salary_desc") {
      sortOptions = { salaryMin: -1, createdAt: -1 };
    } else if (sort === "salary_asc") {
      sortOptions = { salaryMin: 1, createdAt: -1 };
    } else if (sort === "views") {
      sortOptions = { views: -1, createdAt: -1 };
    }

    const [listings, total] = await Promise.all([
      JobListing.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate("owner", "_id name username avatar area")
        .lean(),
      JobListing.countDocuments(query),
    ]);

    // Sanitize job-seeker responses: never leak phone unless showPhone is true
    const sanitizedListings = listings.map((item) => {
      if (item.type === "job_seeker") {
        if (!item.showPhone) {
          item.phone = "";
        }
      }
      return item;
    });

    res.json({
      success: true,
      listings: sanitizedListings,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    console.error("List jobs error:", err);
    res.status(500).json({ success: false, message: "Failed to load listings." });
  }
});

// -------------------------------------------------------------
// GET /api/jobs/my - User dashboard: listings & applications
// -------------------------------------------------------------
router.get("/my", verifyToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const [myListings, myApplications, receivedApplications] = await Promise.all([
      JobListing.find({ owner: currentUserId })
        .sort({ createdAt: -1 })
        .lean(),
      JobApplication.find({ applicant: currentUserId })
        .sort({ createdAt: -1 })
        .populate("listing", "title company category employmentType salaryText location status type")
        .populate("employer", "_id name username avatar")
        .lean(),
      JobApplication.find({ employer: currentUserId })
        .sort({ createdAt: -1 })
        .populate("applicant", "_id name username avatar area phone")
        .populate("listing", "title company type")
        .lean(),
    ]);

    res.json({
      success: true,
      myListings,
      myApplications,
      receivedApplications,
    });
  } catch (err) {
    console.error("My listings error:", err);
    res.status(500).json({ success: false, message: "Failed to load your listings and applications." });
  }
});

// -------------------------------------------------------------
// GET /api/jobs/:id - Single listing details
// -------------------------------------------------------------
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID." });
    }

    // Atomically increment view count
    const listing = await JobListing.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate("owner", "_id name username avatar area createdAt")
      .lean();

    if (!listing) {
      return res.status(404).json({ success: false, message: "Job listing not found." });
    }

    // Hide phone for job seekers unless allowed
    if (listing.type === "job_seeker" && !listing.showPhone) {
      listing.phone = "";
    }

    res.json({ success: true, listing });
  } catch (err) {
    console.error("Get job detail error:", err);
    res.status(500).json({ success: false, message: "Failed to load job listing." });
  }
});

// -------------------------------------------------------------
// GET /api/jobs/:id/application-status - Check if user applied
// -------------------------------------------------------------
router.get("/:id/application-status", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID." });
    }

    const application = await JobApplication.findOne({
      listing: id,
      applicant: currentUserId,
    }).lean();

    res.json({
      success: true,
      hasApplied: !!application,
      application: application || null,
    });
  } catch (err) {
    console.error("Check application status error:", err);
    res.status(500).json({ success: false, message: "Failed to check application status." });
  }
});

// -------------------------------------------------------------
// POST /api/jobs - Create listing (Vacancy or Candidate Profile)
// -------------------------------------------------------------
router.post("/", verifyToken, writeLimiter, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const {
      type = "job",
      title,
      company,
      category,
      employmentType = "Full-time",
      salaryMin = 0,
      salaryMax = 0,
      salaryPeriod = "month",
      salaryText,
      isNegotiable = false,
      location,
      experience = "Fresher friendly",
      isFresherFriendly = false,
      qualifications,
      skills,
      responsibilities,
      workingHours,
      openings = 1,
      description,
      deadline,
      companyLogo,

      // Job Seeker
      displayName,
      desiredRole,
      education,
      experienceLevel = "Fresher",
      preferredLocation,
      expectedSalary,
      employmentPreference = "Full-time",
      availability = "Immediately",
      languages,
      bio,
      showPhone = false,
      phone,
      avatar,
    } = req.body;

    if (!["job", "job_seeker"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid listing type." });
    }

    const parsedSkills = Array.isArray(skills)
      ? skills.map((s) => String(s).trim()).filter(Boolean)
      : typeof skills === "string"
      ? skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const parsedLanguages = Array.isArray(languages)
      ? languages.map((l) => String(l).trim()).filter(Boolean)
      : typeof languages === "string"
      ? languages
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean)
      : ["Hindi"];

    // Validation per type
    if (type === "job") {
      if (!title || title.trim().length < 3) {
        return res.status(400).json({ success: false, message: "Job title is required (min 3 characters)." });
      }
      if (!company || company.trim().length < 2) {
        return res.status(400).json({ success: false, message: "Company or Employer name is required." });
      }
      if (!category || category.trim().length < 2) {
        return res.status(400).json({ success: false, message: "Job category is required." });
      }
      if (!description || description.trim().length < 15) {
        return res.status(400).json({ success: false, message: "Please provide a detailed job description (min 15 characters)." });
      }

      // Format human-friendly salary string if not explicitly given
      let computedSalaryText = salaryText ? salaryText.trim() : "";
      if (!computedSalaryText) {
        const min = Number(salaryMin) || 0;
        const max = Number(salaryMax) || 0;
        if (min > 0 && max > 0) {
          computedSalaryText = `₹${min.toLocaleString("en-IN")} - ₹${max.toLocaleString("en-IN")} / ${salaryPeriod}`;
        } else if (min > 0) {
          computedSalaryText = `From ₹${min.toLocaleString("en-IN")} / ${salaryPeriod}`;
        } else if (isNegotiable) {
          computedSalaryText = "Negotiable / As per skill";
        } else {
          computedSalaryText = "Disclosed on call / interview";
        }
      }

      const newListing = await JobListing.create({
        type: "job",
        owner: currentUserId,
        status: "open",
        title: title.trim().slice(0, 140),
        company: company.trim().slice(0, 140),
        category: category.trim().slice(0, 60),
        employmentType,
        salaryMin: Math.max(0, Number(salaryMin) || 0),
        salaryMax: Math.max(0, Number(salaryMax) || 0),
        salaryPeriod,
        salaryText: computedSalaryText,
        isNegotiable: Boolean(isNegotiable),
        location: (location || "Fazilnagar Town").trim().slice(0, 140),
        experience: experience.trim().slice(0, 80),
        isFresherFriendly: Boolean(isFresherFriendly) || /fresher/i.test(experience),
        qualifications: (qualifications || "").trim().slice(0, 500),
        skills: parsedSkills.slice(0, 20),
        responsibilities: (responsibilities || "").trim().slice(0, 3000),
        workingHours: (workingHours || "").trim().slice(0, 100),
        openings: Math.max(1, parseInt(openings, 10) || 1),
        description: description.trim().slice(0, 8000),
        deadline: deadline ? new Date(deadline) : null,
        companyLogo: (companyLogo || "").trim(),
      });

      return res.status(201).json({
        success: true,
        message: "Job vacancy published successfully!",
        listing: newListing,
      });
    }

    // Type === 'job_seeker'
    if (!desiredRole || desiredRole.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Desired role / Job sought is required." });
    }
    const finalDisplayName = (displayName || req.user.name || "Fazilnagar Citizen").trim().slice(0, 100);
    const finalBio = (bio || description || "").trim();

    if (!finalBio || finalBio.length < 15) {
      return res.status(400).json({ success: false, message: "Please provide a brief introduction about your skills and experience (min 15 characters)." });
    }

    const newSeekerListing = await JobListing.create({
      type: "job_seeker",
      owner: currentUserId,
      status: "looking_for_work",
      displayName: finalDisplayName,
      desiredRole: desiredRole.trim().slice(0, 140),
      category: (category || "Other").trim().slice(0, 60),
      education: (education || "").trim().slice(0, 300),
      experienceLevel: (experienceLevel || "Fresher").trim().slice(0, 80),
      preferredLocation: (preferredLocation || "Fazilnagar Town").trim().slice(0, 140),
      expectedSalary: (expectedSalary || "Negotiable").trim().slice(0, 100),
      employmentPreference,
      availability: (availability || "Immediately").trim().slice(0, 60),
      languages: parsedLanguages.slice(0, 10),
      skills: parsedSkills.slice(0, 20),
      bio: finalBio.slice(0, 4000),
      description: finalBio.slice(0, 4000),
      showPhone: Boolean(showPhone),
      phone: showPhone ? (phone || "").trim().slice(0, 20) : "",
      avatar: (avatar || "").trim(),
    });

    res.status(201).json({
      success: true,
      message: "Job seeker profile published successfully!",
      listing: newSeekerListing,
    });
  } catch (err) {
    console.error("Create job listing error:", err);
    res.status(500).json({ success: false, message: "Failed to publish listing: " + err.message });
  }
});

// -------------------------------------------------------------
// PUT /api/jobs/:id - Update own listing
// -------------------------------------------------------------
router.put("/:id", verifyToken, writeLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID." });
    }

    const listing = await JobListing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }

    if (listing.owner.toString() !== currentUserId && !isAdmin) {
      return res.status(403).json({ success: false, message: "You are not authorized to update this listing." });
    }

    const updates = req.body;
    const allowedJobFields = [
      "title",
      "company",
      "category",
      "employmentType",
      "salaryMin",
      "salaryMax",
      "salaryPeriod",
      "salaryText",
      "isNegotiable",
      "location",
      "experience",
      "isFresherFriendly",
      "qualifications",
      "skills",
      "responsibilities",
      "workingHours",
      "openings",
      "description",
      "deadline",
      "companyLogo",
      "status",
    ];

    const allowedSeekerFields = [
      "displayName",
      "desiredRole",
      "category",
      "education",
      "experienceLevel",
      "preferredLocation",
      "expectedSalary",
      "employmentPreference",
      "availability",
      "languages",
      "skills",
      "bio",
      "description",
      "showPhone",
      "phone",
      "avatar",
      "status",
    ];

    const allowedFields = listing.type === "job" ? allowedJobFields : allowedSeekerFields;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === "skills" || field === "languages") {
          listing[field] = Array.isArray(updates[field])
            ? updates[field].map((s) => String(s).trim()).filter(Boolean)
            : typeof updates[field] === "string"
            ? updates[field]
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : listing[field];
        } else {
          listing[field] = updates[field];
        }
      }
    }

    if (listing.type === "job_seeker" && !listing.showPhone) {
      listing.phone = "";
    }

    await listing.save();

    res.json({
      success: true,
      message: "Listing updated successfully!",
      listing,
    });
  } catch (err) {
    console.error("Update listing error:", err);
    res.status(500).json({ success: false, message: "Failed to update listing." });
  }
});

// -------------------------------------------------------------
// PATCH /api/jobs/:id/status - Change listing status
// -------------------------------------------------------------
router.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID." });
    }

    const listing = await JobListing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }

    if (listing.owner.toString() !== currentUserId && !isAdmin) {
      return res.status(403).json({ success: false, message: "You are not authorized to change this listing status." });
    }

    const validStatuses = [
      "open",
      "filled",
      "paused",
      "expired",
      "looking_for_work",
      "hired",
      "inactive",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value." });
    }

    listing.status = status;
    await listing.save();

    res.json({
      success: true,
      message: `Listing status updated to ${status}.`,
      status: listing.status,
    });
  } catch (err) {
    console.error("Status update error:", err);
    res.status(500).json({ success: false, message: "Failed to update status." });
  }
});

// -------------------------------------------------------------
// DELETE /api/jobs/:id - Delete own listing
// -------------------------------------------------------------
router.delete("/:id", verifyToken, writeLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID." });
    }

    const listing = await JobListing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }

    if (listing.owner.toString() !== currentUserId && !isAdmin) {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this listing." });
    }

    await JobListing.findByIdAndDelete(id);
    // Remove or archive related applications
    await JobApplication.deleteMany({ listing: id });

    res.json({ success: true, message: "Listing and related applications deleted successfully." });
  } catch (err) {
    console.error("Delete job error:", err);
    res.status(500).json({ success: false, message: "Failed to delete listing." });
  }
});

// -------------------------------------------------------------
// POST /api/jobs/:id/apply - Apply Now (Real Chat Message + App record)
// Critical Requirement 5
// -------------------------------------------------------------
router.post("/:id/apply", verifyToken, writeLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const applicantId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid job vacancy ID." });
    }

    const listing = await JobListing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Job vacancy not found." });
    }

    if (listing.type !== "job") {
      return res.status(400).json({ success: false, message: "Applications can only be submitted to job vacancies." });
    }

    if (listing.status !== "open") {
      return res.status(400).json({
        success: false,
        message: `This vacancy is no longer accepting applications (Status: ${listing.status}).`,
      });
    }

    // Check application deadline
    if (listing.deadline && new Date(listing.deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "The application deadline for this position has passed.",
      });
    }

    // Prevent self-application
    if (listing.owner.toString() === applicantId) {
      return res.status(400).json({
        success: false,
        message: "You cannot apply to your own job listing.",
      });
    }

    // Check if user is blocked by or has blocked the employer
    const isBlocked = await Block.exists({
      $or: [
        { blocker: applicantId, blocked: listing.owner },
        { blocker: listing.owner, blocked: applicantId },
      ],
    });

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Unable to contact employer due to privacy or block restrictions.",
      });
    }

    // Check for duplicate application
    const existingApplication = await JobApplication.findOne({
      listing: id,
      applicant: applicantId,
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        alreadyApplied: true,
        message: "You have already applied for this vacancy.",
        conversationId: existingApplication.conversation,
      });
    }

    // Find or create direct conversation between applicant and employer
    const conversation = await getOrCreateDirectConversation(applicantId, listing.owner);

    // Contextual application message as specified in requirement 5
    const applicationMessageText = `Hello, I am interested in applying for ${listing.title} at ${listing.company}. Please share more details about the role and the application process.`;

    // Persist real Message document in existing chat system
    const messageDoc = await Message.create({
      conversation: conversation._id,
      sender: applicantId,
      body: applicationMessageText,
      type: "text",
    });

    // Update conversation lastMessage
    conversation.lastMessage = {
      text: applicationMessageText,
      sender: applicantId,
      createdAt: new Date(),
      type: "text",
    };
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Increment recipient unreadCount in ConversationMember
    await ConversationMember.findOneAndUpdate(
      { conversation: conversation._id, user: listing.owner },
      { $inc: { unreadCount: 1 } }
    );

    // Broadcast new message in real time to both socket rooms
    broadcastNewMessage(
      conversation._id,
      messageDoc,
      [listing.owner.toString()],
      conversation
    );

    // Create JobApplication record
    const application = await JobApplication.create({
      listing: listing._id,
      applicant: applicantId,
      employer: listing.owner,
      conversation: conversation._id,
      message: applicationMessageText,
      status: "applied",
    });

    // Increment applications count on listing
    listing.applicationsCount = (listing.applicationsCount || 0) + 1;
    await listing.save();

    // Send in-app notification to the employer
    try {
      const applicantUser = await User.findById(applicantId).select("name");
      await Notification.create({
        recipient: listing.owner,
        title: "New Job Application",
        message: `${applicantUser?.name || "A candidate"} applied for "${listing.title}". Click to chat.`,
        link: `/messages?conv=${conversation._id}`,
        type: "system",
        severity: "info",
      });
    } catch (notifErr) {
      console.warn("[Jobs Apply] Notification warning:", notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: "Application sent successfully! Employer has received your message.",
      conversationId: conversation._id,
      application,
    });
  } catch (err) {
    console.error("Apply to job error:", err);
    res.status(500).json({ success: false, message: "Failed to submit application: " + err.message });
  }
});

// -------------------------------------------------------------
// POST /api/jobs/:id/contact - Contact Candidate (Real Chat Message)
// Critical Requirement 5
// -------------------------------------------------------------
router.post("/:id/contact", verifyToken, writeLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const employerId = req.user.id;
    const { customMessage, jobTitle, companyName } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid candidate profile ID." });
    }

    const listing = await JobListing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Candidate profile not found." });
    }

    if (listing.type !== "job_seeker") {
      return res.status(400).json({ success: false, message: "Target profile must be a job seeker." });
    }

    if (listing.owner.toString() === employerId) {
      return res.status(400).json({ success: false, message: "You cannot contact your own candidate profile." });
    }

    // Check block status
    const isBlocked = await Block.exists({
      $or: [
        { blocker: employerId, blocked: listing.owner },
        { blocker: listing.owner, blocked: employerId },
      ],
    });

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Unable to contact candidate due to user privacy or block settings.",
      });
    }

    // Find or create direct conversation
    const conversation = await getOrCreateDirectConversation(employerId, listing.owner);

    // Predefined contextual message as required
    const candidateName = listing.displayName || "there";
    const opportunityRole = jobTitle || listing.desiredRole || "an open role";
    const employerOrg = companyName || "our organization";

    const inviteMessageText =
      customMessage && customMessage.trim()
        ? customMessage.trim()
        : `Hello ${candidateName}, I saw your profile on Fazilnagar Jobs. I have an opportunity for ${opportunityRole} at ${employerOrg}. Are you interested in discussing this opportunity?`;

    // Persist real message
    const messageDoc = await Message.create({
      conversation: conversation._id,
      sender: employerId,
      body: inviteMessageText,
      type: "text",
    });

    // Update conversation
    conversation.lastMessage = {
      text: inviteMessageText,
      sender: employerId,
      createdAt: new Date(),
      type: "text",
    };
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Increment candidate unreadCount
    await ConversationMember.findOneAndUpdate(
      { conversation: conversation._id, user: listing.owner },
      { $inc: { unreadCount: 1 } }
    );

    // Real-time broadcast
    broadcastNewMessage(
      conversation._id,
      messageDoc,
      [listing.owner.toString()],
      conversation
    );

    // Increment inquiries count
    listing.inquiriesCount = (listing.inquiriesCount || 0) + 1;
    await listing.save();

    // Notify candidate
    try {
      const employerUser = await User.findById(employerId).select("name");
      await Notification.create({
        recipient: listing.owner,
        title: "New Job Opportunity Inquiry",
        message: `${employerUser?.name || "An employer"} messaged you about a job opportunity on Fazilnagar Jobs.`,
        link: `/messages?conv=${conversation._id}`,
        type: "system",
        severity: "info",
      });
    } catch (notifErr) {
      console.warn("[Jobs Contact] Notification warning:", notifErr.message);
    }

    res.json({
      success: true,
      message: "Message sent to candidate successfully!",
      conversationId: conversation._id,
    });
  } catch (err) {
    console.error("Contact candidate error:", err);
    res.status(500).json({ success: false, message: "Failed to send message to candidate: " + err.message });
  }
});

// -------------------------------------------------------------
// POST /api/jobs/:id/report - Report suspicious job or profile
// Requirement 10
// -------------------------------------------------------------
router.post("/:id/report", verifyToken, writeLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const reporterId = req.user.id;
    const { reason = "other", details = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID." });
    }

    const listing = await JobListing.findById(id);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }

    const validReasons = [
      "spam",
      "harassment",
      "inappropriate",
      "fraud",
      "fake_job",
      "recruitment_fee",
      "other",
    ];

    const reportReason = validReasons.includes(reason) ? reason : "other";

    await Report.create({
      reporter: reporterId,
      targetUser: listing.owner,
      targetJobListing: listing._id,
      reason: reportReason,
      details: (details || "").trim().slice(0, 1000),
      status: "pending",
    });

    listing.reportsCount = (listing.reportsCount || 0) + 1;
    if (listing.reportsCount >= 3) {
      listing.isReported = true;
    }
    await listing.save();

    res.json({
      success: true,
      message: "Report submitted. Our moderation desk will review this listing to protect the community.",
    });
  } catch (err) {
    console.error("Report job listing error:", err);
    res.status(500).json({ success: false, message: "Failed to submit report." });
  }
});

export default router;
