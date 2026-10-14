import express from "express";
import Event from "../models/Event.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { logAdminAction } from "../models/AuditLog.js";
import { createBroadcastNotification } from "../utils/notify.js";

const router = express.Router();

const DEFAULT_EVENTS = [
  {
    title: "Pawapuri Mahavira Nirvana Mahotsav & Annual Mela",
    titleHindi: "पावापुरी महावीर निर्वाण महोत्सव एवं वार्षिक मेला",
    category: "Mela & Fair",
    summary: "Annual religious fair and commemorative festival celebrating the sacred Jain tirthankar heritage of ancient Pawa.",
    description: "Devotees from across India assemble at the sacred Pawapuri Digambar & Shwetambar Jain Mandir complex in Fazilnagar to celebrate Diwali Nirvana Mahotsav with prabhat pheri, laddu offering, and cultural assemblies.",
    venue: "Pawapuri Jain Tirth Complex, Fazilnagar",
    address: "Pawapuri Dham, Main Road, Fazilnagar, Kushinagar",
    latitude: 26.6827,
    longitude: 84.0498,
    startDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days in future
    endDate: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
    timeString: "06:00 AM – 10:00 PM Daily",
    organizer: "Shri Digambar Jain Teerth Kshetra Committee, Pawapuri (Fazilnagar)",
    organizerContact: "+91 94520 89540",
    bannerImage: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80",
    isFeatured: true,
    status: "published",
    isPublished: true,
  },
  {
    title: "Shri Ram Navami Mahotsav & Grand Maha Aarti",
    titleHindi: "श्री राम जन्मोत्सव एवं नगर महाआरती",
    category: "Aarti & Puja",
    summary: "Traditional civic Maha Aarti and procession through the main market corridor of Fazilnagar.",
    description: "Civic celebration with collective Vedic chanting, deepotsav, and traditional devotional songs at the town square temple followed by prasadam distribution for all residents and visitors.",
    venue: "Shiv Mandir & Market Square, Fazilnagar",
    address: "Fazilnagar Crossing, Main Road Corridor",
    latitude: 26.6815,
    longitude: 84.0482,
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    timeString: "06:30 PM Onwards",
    organizer: "Fazilnagar Dharmik Seva Samiti",
    organizerContact: "+91 5564 222102",
    bannerImage: "https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?auto=format&fit=crop&w=1200&q=80",
    isFeatured: true,
    status: "published",
    isPublished: true,
  },
];

async function seedDefaultEventsIfEmpty() {
  const count = await Event.countDocuments();
  if (count === 0) {
    await Event.insertMany(DEFAULT_EVENTS);
  }
}

// @route   GET /api/events
// @desc    Get published upcoming & recent events for the public portal
// @access  Public
router.get("/", async (req, res) => {
  try {
    await seedDefaultEventsIfEmpty();
    const { category, search, timeFilter } = req.query;
    const filter = { isPublished: true, status: "published" };

    if (category && category !== "All") {
      filter.category = category;
    }
    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), "i");
      filter.$or = [{ title: reg }, { titleHindi: reg }, { description: reg }, { venue: reg }];
    }
    if (timeFilter === "upcoming") {
      filter.startDate = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    }

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    const events = await Event.find(filter).sort({ startDate: 1, createdAt: -1 });
    res.status(200).json({ success: true, count: events.length, events });
  } catch (err) {
    console.error("[Events] Fetch error:", err);
    res.status(500).json({ message: "Failed to fetch community events." });
  }
});

// @route   GET /api/events/admin
// @desc    Admin list of all events (drafts, published, archived)
// @access  Private (Admin)
router.get("/admin", verifyToken, requireAdmin, async (req, res) => {
  try {
    await seedDefaultEventsIfEmpty();
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    const events = await Event.find().sort({ startDate: -1, createdAt: -1 });
    res.status(200).json({ success: true, count: events.length, events });
  } catch (err) {
    console.error("[Events] Admin fetch error:", err);
    res.status(500).json({ message: "Failed to fetch events registry." });
  }
});

// @route   POST /api/events
// @desc    Create a new event or religious festival notice
// @access  Private (Admin)
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      titleHindi,
      category,
      summary,
      description,
      venue,
      address,
      latitude,
      longitude,
      startDate,
      endDate,
      timeString,
      organizer,
      organizerContact,
      bannerImage,
      galleryImages,
      isFeatured,
      isPublished,
      status,
    } = req.body;

    if (!title || !description || !venue || !startDate) {
      return res.status(400).json({ message: "Title, description, venue, and start date are required." });
    }

    const newEvent = await Event.create({
      title: title.trim(),
      titleHindi: (titleHindi || "").trim(),
      category: category || "Religious Festival",
      summary: (summary || description.slice(0, 200)).trim(),
      description: description.trim(),
      venue: venue.trim(),
      address: (address || "Fazilnagar, Kushinagar, UP").trim(),
      latitude: !isNaN(parseFloat(latitude)) ? parseFloat(latitude) : 26.6827,
      longitude: !isNaN(parseFloat(longitude)) ? parseFloat(longitude) : 84.0498,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      timeString: (timeString || "Morning / Evening").trim(),
      organizer: (organizer || "Town Organizing Committee").trim(),
      organizerContact: (organizerContact || "").trim(),
      bannerImage: (bannerImage || "").trim(),
      galleryImages: Array.isArray(galleryImages) ? galleryImages : [],
      isFeatured: isFeatured === true,
      status: status || "published",
      isPublished: isPublished !== false,
    });

    // Notify town if published
    if (newEvent.isPublished) {
      createBroadcastNotification({
        type: "broadcast_news",
        title: `🎪 New Event: ${newEvent.title}`,
        message: `${newEvent.title} on ${new Date(newEvent.startDate).toLocaleDateString()} at ${newEvent.venue}.`,
        link: "/news",
        data: { eventId: newEvent._id },
      }).catch(() => {});
    }

    await logAdminAction({
      adminUser: req.user.id,
      adminEmail: req.user.email,
      action: "CREATE",
      entityType: "Event",
      entityId: newEvent._id,
      entityTitle: newEvent.title,
      changesSummary: `Created event "${newEvent.title}" (${newEvent.category})`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: "Event published successfully.", event: newEvent });
  } catch (err) {
    console.error("[Events] Create error:", err);
    res.status(500).json({ message: "Failed to create event." });
  }
});

// @route   PUT /api/events/:id
// @desc    Update an event entry
// @access  Private (Admin)
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const {
      title,
      titleHindi,
      category,
      summary,
      description,
      venue,
      address,
      latitude,
      longitude,
      startDate,
      endDate,
      timeString,
      organizer,
      organizerContact,
      bannerImage,
      galleryImages,
      isFeatured,
      isPublished,
      status,
    } = req.body;

    if (title) event.title = title.trim();
    if (titleHindi !== undefined) event.titleHindi = titleHindi.trim();
    if (category) event.category = category;
    if (summary !== undefined) event.summary = summary.trim();
    if (description) event.description = description.trim();
    if (venue) event.venue = venue.trim();
    if (address !== undefined) event.address = address.trim();
    if (latitude !== undefined) event.latitude = parseFloat(latitude);
    if (longitude !== undefined) event.longitude = parseFloat(longitude);
    if (startDate) event.startDate = new Date(startDate);
    if (endDate !== undefined) event.endDate = endDate ? new Date(endDate) : null;
    if (timeString !== undefined) event.timeString = timeString.trim();
    if (organizer !== undefined) event.organizer = organizer.trim();
    if (organizerContact !== undefined) event.organizerContact = organizerContact.trim();
    if (bannerImage !== undefined) event.bannerImage = bannerImage.trim();
    if (galleryImages !== undefined && Array.isArray(galleryImages)) event.galleryImages = galleryImages;
    if (isFeatured !== undefined) event.isFeatured = isFeatured;
    if (isPublished !== undefined) event.isPublished = isPublished;
    if (status !== undefined) event.status = status;

    await event.save();

    await logAdminAction({
      adminUser: req.user.id,
      adminEmail: req.user.email,
      action: "UPDATE",
      entityType: "Event",
      entityId: event._id,
      entityTitle: event.title,
      changesSummary: `Updated event "${event.title}"`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: "Event updated successfully.", event });
  } catch (err) {
    console.error("[Events] Update error:", err);
    res.status(500).json({ message: "Failed to update event." });
  }
});

// @route   PATCH /api/events/:id/publish
// @desc    Toggle event publication status
// @access  Private (Admin)
router.patch("/:id/publish", verifyToken, requireAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    event.isPublished = req.body.isPublished !== undefined ? req.body.isPublished : !event.isPublished;
    event.status = event.isPublished ? "published" : "draft";
    await event.save();

    res.status(200).json({
      success: true,
      message: `Event ${event.isPublished ? "published" : "unpublished"}.`,
      isPublished: event.isPublished,
      event,
    });
  } catch (err) {
    console.error("[Events] Publish toggle error:", err);
    res.status(500).json({ message: "Failed to toggle event publication." });
  }
});

// @route   DELETE /api/events/:id
// @desc    Delete an event
// @access  Private (Admin)
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    await logAdminAction({
      adminUser: req.user.id,
      adminEmail: req.user.email,
      action: "DELETE",
      entityType: "Event",
      entityId: req.params.id,
      entityTitle: event.title,
      changesSummary: `Deleted event "${event.title}"`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: "Event deleted successfully." });
  } catch (err) {
    console.error("[Events] Delete error:", err);
    res.status(500).json({ message: "Failed to delete event." });
  }
});

export default router;
