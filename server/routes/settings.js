import SiteSettings, {
  DEFAULT_NAV_ITEMS,
  DEFAULT_TRUST_BADGES,
  DEFAULT_ACTION_BUTTONS,
  DEFAULT_SERVICE_CARDS,
} from "../models/SiteSettings.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { logAdminAction } from "../models/AuditLog.js";

const router = express.Router();

const DEFAULT_SLIDES = [];

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
        enableAutoplay: false,
        slides: [],
      },
      stats: DEFAULT_STATS,
    });
  } else {
    let changed = false;
    if (!settings.heroSettings) {
      settings.heroSettings = {
        animationSpeed: 5000,
        animationDirection: "left",
        enableAutoplay: false,
        slides: [],
      };
      changed = true;
    }
    // Clean up any invalid temporary blob/data URLs if any crept into heroSettings
    if (Array.isArray(settings.heroSettings.slides) && settings.heroSettings.slides.length > 0) {
      const initialCount = settings.heroSettings.slides.length;
      settings.heroSettings.slides = settings.heroSettings.slides.filter(
        (s) =>
          s &&
          s.imageUrl &&
          !s.imageUrl.startsWith("blob:") &&
          !s.imageUrl.startsWith("data:")
      );
      if (settings.heroSettings.slides.length !== initialCount) {
        changed = true;
      }
    }
    if (!settings.stats || settings.stats.length === 0) {
      settings.stats = DEFAULT_STATS;
      changed = true;
    }
    if (!settings.navigation?.navItems || settings.navigation.navItems.length === 0) {
      settings.navigation = {
        ...(settings.navigation?.toObject ? settings.navigation.toObject() : settings.navigation || {}),
        navItems: DEFAULT_NAV_ITEMS,
      };
      changed = true;
    }
    if (!settings.heroContent?.trustBadges || settings.heroContent.trustBadges.length === 0) {
      settings.heroContent = {
        ...(settings.heroContent?.toObject ? settings.heroContent.toObject() : settings.heroContent || {}),
        trustBadges: DEFAULT_TRUST_BADGES,
      };
      changed = true;
    }
    if (!settings.heroContent?.actionButtons || settings.heroContent.actionButtons.length === 0) {
      settings.heroContent = {
        ...(settings.heroContent?.toObject ? settings.heroContent.toObject() : settings.heroContent || {}),
        actionButtons: DEFAULT_ACTION_BUTTONS,
      };
      changed = true;
    }
    if (!settings.homepageSections?.publicServices?.cards || settings.homepageSections.publicServices.cards.length === 0) {
      settings.homepageSections = {
        ...(settings.homepageSections?.toObject ? settings.homepageSections.toObject() : settings.homepageSections || {}),
        publicServices: {
          ...(settings.homepageSections?.publicServices?.toObject ? settings.homepageSections.publicServices.toObject() : settings.homepageSections?.publicServices || {}),
          cards: DEFAULT_SERVICE_CARDS,
        },
      };
      changed = true;
    }
    if (changed) {
      await settings.save();
    }
  }
  return settings;
}

// @route   GET /api/settings
// @desc    Retrieve public website settings and layout configuration
// @access  Public
router.get("/", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    const settings = await getOrCreateSettings();
    res.status(200).json({
      success: true,
      settings,
      updatedAt: settings.updatedAt ? new Date(settings.updatedAt).getTime() : Date.now(),
    });
  } catch (err) {
    console.error("[Settings] Fetch error:", err);
    res.status(500).json({ success: false, message: "Failed to load website settings." });
  }
});

// @route   GET /api/settings/live-version
// @desc    Lightweight endpoint to poll for settings updates without payload
// @access  Public
router.get("/live-version", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    const settings = await SiteSettings.findOne({ key: "primary_settings" }, { updatedAt: 1, _id: 1 }).lean();
    res.status(200).json({
      success: true,
      updatedAt: settings?.updatedAt ? new Date(settings.updatedAt).getTime() : 0,
      timestamp: Date.now(),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Live version check failed." });
  }
});

// @route   PUT /api/settings
// @desc    Update website settings, layout, hero banners, and contact information
// @access  Private (Admin)
router.put("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const updateData = req.body;

    // Apply allowed modifications — use !== undefined to allow falsy values like ""
    if (updateData.siteName !== undefined) settings.siteName = (updateData.siteName || "").trim();
    if (updateData.shortName !== undefined) settings.shortName = (updateData.shortName || "").trim();
    if (updateData.tagline !== undefined) settings.tagline = (updateData.tagline || "").trim();
    if (updateData.taglineHindi !== undefined) {
      settings.taglineHindi = (updateData.taglineHindi || "").trim();
    } else if (updateData.taglineHi !== undefined) {
      settings.taglineHindi = (updateData.taglineHi || "").trim();
    }
    if (updateData.logoUrl !== undefined) settings.logoUrl = (updateData.logoUrl || "").trim();
    if (updateData.faviconUrl !== undefined) settings.faviconUrl = (updateData.faviconUrl || "").trim();

    const safeObj = (doc) => (doc && typeof doc.toObject === "function" ? doc.toObject() : doc || {});

    if (updateData.announcement && typeof updateData.announcement === "object") {
      settings.announcement = {
        ...safeObj(settings.announcement),
        ...updateData.announcement,
      };
    }

    if (updateData.contact && typeof updateData.contact === "object") {
      settings.contact = {
        ...safeObj(settings.contact),
        ...updateData.contact,
      };
    }

    if (updateData.socialLinks && typeof updateData.socialLinks === "object") {
      settings.socialLinks = {
        ...safeObj(settings.socialLinks),
        ...updateData.socialLinks,
      };
    }

    if (updateData.seo && typeof updateData.seo === "object") {
      settings.seo = {
        ...safeObj(settings.seo),
        ...updateData.seo,
      };
    }
    if (updateData.seoSettings && typeof updateData.seoSettings === "object") {
      settings.seo = {
        ...safeObj(settings.seo),
        metaTitle: updateData.seoSettings.metaTitle !== undefined ? updateData.seoSettings.metaTitle : settings.seo?.metaTitle,
        metaDescription: updateData.seoSettings.metaDescription !== undefined ? updateData.seoSettings.metaDescription : settings.seo?.metaDescription,
        ogImageUrl: updateData.seoSettings.ogImage !== undefined ? updateData.seoSettings.ogImage : (updateData.seoSettings.ogImageUrl !== undefined ? updateData.seoSettings.ogImageUrl : settings.seo?.ogImageUrl),
      };
    }

    if (updateData.sections && typeof updateData.sections === "object") {
      settings.sections = {
        ...safeObj(settings.sections),
        ...updateData.sections,
      };
    }

    if (updateData.heroSettings && typeof updateData.heroSettings === "object") {
      const existingHero = safeObj(settings.heroSettings);
      settings.heroSettings = {
        ...existingHero,
        ...updateData.heroSettings,
        slides: Array.isArray(updateData.heroSettings.slides)
          ? updateData.heroSettings.slides
          : (existingHero.slides || []),
      };
    }

    if (Array.isArray(updateData.stats)) {
      settings.stats = updateData.stats;
    }

    if (updateData.footer && typeof updateData.footer === "object") {
      settings.footer = {
        ...safeObj(settings.footer),
        ...updateData.footer,
      };
    }
    if (updateData.footerText !== undefined) {
      settings.footer = {
        ...safeObj(settings.footer),
        disclaimer: updateData.footerText.trim(),
      };
    }
    if (updateData.copyright !== undefined) {
      settings.footer = {
        ...safeObj(settings.footer),
        copyrightText: updateData.copyright.trim(),
      };
    }

    if (updateData.topAlertBar && typeof updateData.topAlertBar === "object") {
      settings.topAlertBar = {
        ...safeObj(settings.topAlertBar),
        ...updateData.topAlertBar,
      };
    }

    if (updateData.navigation && typeof updateData.navigation === "object") {
      const existingNav = safeObj(settings.navigation);
      settings.navigation = {
        ...existingNav,
        ...updateData.navigation,
        navItems: Array.isArray(updateData.navigation.navItems)
          ? updateData.navigation.navItems
          : (existingNav.navItems || []),
      };
    }

    if (updateData.heroContent && typeof updateData.heroContent === "object") {
      const existingHC = safeObj(settings.heroContent);
      settings.heroContent = {
        ...existingHC,
        ...updateData.heroContent,
        trustBadges: Array.isArray(updateData.heroContent.trustBadges)
          ? updateData.heroContent.trustBadges
          : (existingHC.trustBadges || []),
        actionButtons: Array.isArray(updateData.heroContent.actionButtons)
          ? updateData.heroContent.actionButtons
          : (existingHC.actionButtons || []),
      };
    }

    if (updateData.homepageSections && typeof updateData.homepageSections === "object") {
      const existingSections = safeObj(settings.homepageSections);
      settings.homepageSections = {
        ...existingSections,
        ...updateData.homepageSections,
        explore: {
          ...safeObj(existingSections.explore),
          ...(updateData.homepageSections.explore || {}),
        },
        publicServices: {
          ...safeObj(existingSections.publicServices),
          ...(updateData.homepageSections.publicServices || {}),
          cards: Array.isArray(updateData.homepageSections.publicServices?.cards)
            ? updateData.homepageSections.publicServices.cards
            : (existingSections.publicServices?.cards || []),
        },
        map: {
          ...safeObj(existingSections.map),
          ...(updateData.homepageSections.map || {}),
        },
        events: {
          ...safeObj(existingSections.events),
          ...(updateData.homepageSections.events || {}),
        },
        heritage: {
          ...safeObj(existingSections.heritage),
          ...(updateData.homepageSections.heritage || {}),
        },
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
    if (!imageUrl || !imageUrl.trim()) {
      return res.status(400).json({ success: false, message: "Image URL is required for hero slide." });
    }

    const cleanUrl = imageUrl.trim();
    if (cleanUrl.startsWith("blob:") || cleanUrl.startsWith("data:")) {
      return res.status(400).json({
        success: false,
        message: "Local temporary blob or data URLs cannot be saved. Please provide a permanent web image URL.",
      });
    }

    const settings = await getOrCreateSettings();
    const newSlide = {
      title: title || "",
      subtitle: subtitle || "",
      caption: caption || "",
      imageUrl: cleanUrl,
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
      changesSummary: `Added hero slide "${title || cleanUrl}"`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: "Hero slide added successfully.",
      slides: settings.heroSettings.slides,
    });
  } catch (err) {
    console.error("[Settings] Add slide error:", err);
    res.status(500).json({ success: false, message: "Failed to add hero slide." });
  }
});

// @route   PUT /api/settings/hero-slides/reorder
// @desc    Reorder hero carousel slides atomically
// @access  Private (Admin)
router.put("/hero-slides/reorder", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { slideIds, slides } = req.body;
    const settings = await getOrCreateSettings();

    if (Array.isArray(slideIds) && slideIds.length > 0) {
      const slideMap = new Map();
      settings.heroSettings.slides.forEach((s) => slideMap.set(String(s._id), s));
      const reordered = [];
      slideIds.forEach((id, idx) => {
        const found = slideMap.get(String(id));
        if (found) {
          found.displayOrder = idx + 1;
          reordered.push(found);
          slideMap.delete(String(id));
        }
      });
      slideMap.forEach((s) => reordered.push(s));
      settings.heroSettings.slides = reordered;
    } else if (Array.isArray(slides) && slides.length > 0) {
      settings.heroSettings.slides = slides.map((s, idx) => ({
        ...s,
        displayOrder: idx + 1,
      }));
    }

    await settings.save();

    res.status(200).json({
      success: true,
      message: "Hero slides reordered successfully.",
      slides: settings.heroSettings.slides,
    });
  } catch (err) {
    console.error("[Settings] Reorder slides error:", err);
    res.status(500).json({ success: false, message: "Failed to reorder hero slides." });
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
      return res.status(404).json({ success: false, message: "Hero slide not found." });
    }

    const { title, subtitle, caption, imageUrl, linkUrl, buttonText, isActive, displayOrder } = req.body;
    if (title !== undefined) slide.title = title;
    if (subtitle !== undefined) slide.subtitle = subtitle;
    if (caption !== undefined) slide.caption = caption;
    if (imageUrl) {
      const cleanUrl = imageUrl.trim();
      if (cleanUrl.startsWith("blob:") || cleanUrl.startsWith("data:")) {
        return res.status(400).json({
          success: false,
          message: "Local temporary blob or data URLs cannot be saved. Please provide a permanent web image URL.",
        });
      }
      slide.imageUrl = cleanUrl;
    }
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
