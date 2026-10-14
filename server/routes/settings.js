import express from "express";
import SiteSettings from "../models/SiteSettings.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { logAdminAction } from "../models/AuditLog.js";

const router = express.Router();

const DEFAULT_SLIDES = [
  {
    title: "Official Civic & Digital Directory",
    subtitle: "Fazilnagar Nagar Panchayat, Kushinagar",
    caption: "Find verified schools, colleges, healthcare centres, public services, and live community news in Fazilnagar.",
    imageUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb18f15f7?auto=format&fit=crop&w=1600&q=80",
    linkUrl: "/directory",
    buttonText: "Browse Town Directory",
    isActive: true,
    displayOrder: 1,
  },
  {
    title: "Healthcare & 24/7 Emergency Medical Aid",
    subtitle: "Community Health Centre & Verified Clinics",
    caption: "Access Community Health Centre (CHC) Fazilnagar, 24x7 ambulance contacts, and verified medical stores.",
    imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=80",
    linkUrl: "/emergency",
    buttonText: "Emergency Healthcare Hub",
    isActive: true,
    displayOrder: 2,
  },
  {
    title: "Sacred Twin Heritage of Fazilnagar & Kushinagar",
    subtitle: "Historic Pawapuri Dham & Ancient Pilgrimage Trail",
    caption: "Explore the sacred historical convergence of Bhagwan Mahavira's nirvana land and Buddha's Mahaparinirvana trail.",
    imageUrl: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1600&q=80",
    linkUrl: "/tourism",
    buttonText: "Explore Twin Heritage",
    isActive: true,
    displayOrder: 3,
  },
];

const DEFAULT_STATS = [
  { id: "stat-schools", label: "Schools & Colleges", value: "9+", subtext: "Verified Institutions", icon: "GraduationCap", isActive: true, displayOrder: 1 },
  { id: "stat-hospitals", label: "Hospitals & Clinics", value: "10+", subtext: "24/7 Healthcare Facilities", icon: "Stethoscope", isActive: true, displayOrder: 2 },
  { id: "stat-places", label: "Mapped Civic Places", value: "19", subtext: "Canonical Ground Truth", icon: "MapPin", isActive: true, displayOrder: 3 },
  { id: "stat-wards", label: "Selectable Wards & Areas", value: "26", subtext: "Municipal Boundary Scope", icon: "Landmark", isActive: true, displayOrder: 4 },
];

/**
 * Ensures initial default settings exist in DB and returns them.
 */
async function getOrCreateSettings() {
  let settings = await SiteSettings.findOne({ key: "primary_settings" });
  if (!settings) {
    settings = await SiteSettings.create({
      key: "primary_settings",
      heroSettings: {
        animationSpeed: 5000,
        animationDirection: "left",
        enableAutoplay: true,
        slides: DEFAULT_SLIDES,
      },
      stats: DEFAULT_STATS,
    });
  } else if (!settings.heroSettings?.slides || settings.heroSettings.slides.length === 0) {
    settings.heroSettings.slides = DEFAULT_SLIDES;
    if (!settings.stats || settings.stats.length === 0) settings.stats = DEFAULT_STATS;
    await settings.save();
  }
  return settings;
}

// @route   GET /api/settings
// @desc    Retrieve public website settings and layout configuration
// @access  Public
router.get("/", async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.status(200).json({
      success: true,
      settings,
    });
  } catch (err) {
    console.error("[Settings] Fetch error:", err);
    res.status(500).json({ message: "Failed to load website settings." });
  }
});

// @route   PUT /api/settings
// @desc    Update website settings, layout, hero banners, and contact information
// @access  Private (Admin)
router.put("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const updateData = req.body;

    // Apply allowed modifications
    if (updateData.siteName) settings.siteName = updateData.siteName.trim();
    if (updateData.shortName) settings.shortName = updateData.shortName.trim();
    if (updateData.tagline !== undefined) settings.tagline = updateData.tagline.trim();
    if (updateData.taglineHindi !== undefined) settings.taglineHindi = updateData.taglineHindi.trim();
    if (updateData.logoUrl !== undefined) settings.logoUrl = updateData.logoUrl.trim();
    if (updateData.faviconUrl !== undefined) settings.faviconUrl = updateData.faviconUrl.trim();

    if (updateData.announcement && typeof updateData.announcement === "object") {
      settings.announcement = {
        ...settings.announcement.toObject(),
        ...updateData.announcement,
      };
    }

    if (updateData.contact && typeof updateData.contact === "object") {
      settings.contact = {
        ...settings.contact.toObject(),
        ...updateData.contact,
      };
    }

    if (updateData.socialLinks && typeof updateData.socialLinks === "object") {
      settings.socialLinks = {
        ...settings.socialLinks.toObject(),
        ...updateData.socialLinks,
      };
    }

    if (updateData.seo && typeof updateData.seo === "object") {
      settings.seo = {
        ...settings.seo.toObject(),
        ...updateData.seo,
      };
    }

    if (updateData.sections && typeof updateData.sections === "object") {
      settings.sections = {
        ...settings.sections.toObject(),
        ...updateData.sections,
      };
    }

    if (updateData.heroSettings && typeof updateData.heroSettings === "object") {
      settings.heroSettings = {
        ...settings.heroSettings.toObject(),
        ...updateData.heroSettings,
      };
    }

    if (Array.isArray(updateData.stats)) {
      settings.stats = updateData.stats;
    }

    if (updateData.footer && typeof updateData.footer === "object") {
      settings.footer = {
        ...settings.footer.toObject(),
        ...updateData.footer,
      };
    }

    await settings.save();

    await logAdminAction({
      adminUser: req.user.id,
      adminEmail: req.user.email,
      action: "SETTINGS_UPDATE",
      entityType: "SiteSettings",
      entityId: settings._id,
      entityTitle: settings.siteName,
      changesSummary: "Updated centralized website settings and homepage configuration",
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Website settings saved successfully.",
      settings,
    });
  } catch (err) {
    console.error("[Settings] Update error:", err);
    res.status(500).json({ message: "Failed to update website settings." });
  }
});

// @route   POST /api/settings/hero-slides
// @desc    Add a new hero carousel slide
// @access  Private (Admin)
router.post("/hero-slides", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { title, subtitle, caption, imageUrl, linkUrl, buttonText, isActive, displayOrder } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: "Image URL is required for hero slide." });
    }

    const settings = await getOrCreateSettings();
    const newSlide = {
      title: title || "",
      subtitle: subtitle || "",
      caption: caption || "",
      imageUrl: imageUrl.trim(),
      linkUrl: linkUrl || "/directory",
      buttonText: buttonText || "Explore",
      isActive: isActive !== false,
      displayOrder: displayOrder || settings.heroSettings.slides.length + 1,
    };

    settings.heroSettings.slides.push(newSlide);
    await settings.save();

    await logAdminAction({
      adminUser: req.user.id,
      adminEmail: req.user.email,
      action: "CREATE",
      entityType: "SiteSettings",
      entityId: settings._id,
      entityTitle: title || "Hero Slide",
      changesSummary: `Added hero slide "${title || imageUrl}"`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: "Hero slide added successfully.",
      slides: settings.heroSettings.slides,
    });
  } catch (err) {
    console.error("[Settings] Add slide error:", err);
    res.status(500).json({ message: "Failed to add hero slide." });
  }
});

// @route   PUT /api/settings/hero-slides/:id
// @desc    Update an existing hero slide
// @access  Private (Admin)
router.put("/hero-slides/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const slide = settings.heroSettings.slides.id(req.params.id);
    if (!slide) {
      return res.status(404).json({ message: "Hero slide not found." });
    }

    const { title, subtitle, caption, imageUrl, linkUrl, buttonText, isActive, displayOrder } = req.body;
    if (title !== undefined) slide.title = title;
    if (subtitle !== undefined) slide.subtitle = subtitle;
    if (caption !== undefined) slide.caption = caption;
    if (imageUrl) slide.imageUrl = imageUrl.trim();
    if (linkUrl !== undefined) slide.linkUrl = linkUrl;
    if (buttonText !== undefined) slide.buttonText = buttonText;
    if (isActive !== undefined) slide.isActive = isActive;
    if (displayOrder !== undefined) slide.displayOrder = displayOrder;

    await settings.save();

    await logAdminAction({
      adminUser: req.user.id,
      adminEmail: req.user.email,
      action: "UPDATE",
      entityType: "SiteSettings",
      entityId: slide._id,
      entityTitle: slide.title || "Hero Slide",
      changesSummary: `Updated hero slide "${slide.title}"`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Hero slide updated successfully.",
      slides: settings.heroSettings.slides,
    });
  } catch (err) {
    console.error("[Settings] Update slide error:", err);
    res.status(500).json({ message: "Failed to update hero slide." });
  }
});

// @route   DELETE /api/settings/hero-slides/:id
// @desc    Delete a hero slide
// @access  Private (Admin)
router.delete("/hero-slides/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    settings.heroSettings.slides = settings.heroSettings.slides.filter(
      (s) => String(s._id) !== String(req.params.id)
    );
    await settings.save();

    await logAdminAction({
      adminUser: req.user.id,
      adminEmail: req.user.email,
      action: "DELETE",
      entityType: "SiteSettings",
      entityId: req.params.id,
      entityTitle: "Hero Slide",
      changesSummary: `Deleted hero slide ${req.params.id}`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Hero slide removed successfully.",
      slides: settings.heroSettings.slides,
    });
  } catch (err) {
    console.error("[Settings] Delete slide error:", err);
    res.status(500).json({ message: "Failed to remove hero slide." });
  }
});

export default router;
