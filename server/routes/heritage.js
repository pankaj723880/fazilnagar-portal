import express from "express";
import HeritageSite from "../models/HeritageSite.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { logAdminAction } from "../models/AuditLog.js";

const router = express.Router();

const DEFAULT_HERITAGE_SITES = [
  {
    name: "Pawapuri Jain Tirth Kshetra (पावापुरी तीर्थ)",
    nameHindi: "श्री दिगंबर एवं श्वेतांबर पावापुरी जैन मंदिर",
    slug: "pawapuri-jain-tirth-fazilnagar",
    category: "Jain Heritage",
    heritageZone: "fazilnagar",
    historicalSignificance: "Sacred Nirvana Sthal of 24th Tirthankar Bhagwan Mahavira according to archaeological and Jain scriptural tradition (ancient Pawa).",
    narrative: "Fazilnagar is identified with the ancient township of Pawa (Pawapuri), where Bhagwan Mahavira delivered his final divine discourse (Sarvodaya Upadesh) and attained Moksha (Nirvana) in 527 BCE. The sprawling tirth complex features exquisite marble architectures, peaceful meditation courtyards, dharamshala for pilgrims, and historic idol shrines.",
    distanceFromFazilnagarCenter: "0 km (Town Center, NH-27 Corridor)",
    locationAddress: "Pawapuri Mandir Campus, Fazilnagar - 274401",
    latitude: 26.6827,
    longitude: 84.0498,
    visitingHours: "05:30 AM – 08:30 PM",
    entryFee: "Free Admission for all pilgrims and visitors",
    primaryImage: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80",
    galleryImages: [
      {
        url: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80",
        caption: "Main Sanctum & Courtyard of Pawapuri Tirth, Fazilnagar",
        credit: "Fazilnagar Civic Heritage Documentation",
      },
    ],
    isTwinHeritageHighlight: true,
    isPublished: true,
    displayOrder: 1,
  },
  {
    name: "Historic Kakodha Ghat & Brick Archaeological Remains",
    nameHindi: "काकोधा घाट एवं प्राचीन कुकुत्था नदी अवशेष",
    slug: "kakodha-ghat-fazilnagar",
    category: "Historical Monument",
    heritageZone: "fazilnagar",
    historicalSignificance: "The revered river where Lord Buddha bathed and drank water on his holy journey from Pawa towards Kushinagar.",
    narrative: "Ancient Kukuttha river ghat where Gautam Buddha stopped to bathe and drink cool water before proceeding on his final journey to Kushinagar. Archaeological excavations unearthed brick structures and terracotta remains.",
    distanceFromFazilnagarCenter: "2 km (Town Environs)",
    locationAddress: "Kakodha Ghat, Fazilnagar, Kushinagar",
    latitude: 26.6912,
    longitude: 84.0534,
    visitingHours: "Open Daylight Hours",
    entryFee: "Free Admission",
    primaryImage: "/images/fazilnagar_kakodha.webp",
    galleryImages: [],
    isTwinHeritageHighlight: true,
    isPublished: true,
    displayOrder: 2,
  },
  {
    name: "Ancient Sathiaon Chetiya Mound & Archaeological Environs",
    nameHindi: "साथियावँ प्राचीन स्तूप टीला एवं पुरातात्विक क्षेत्र",
    slug: "sathiaon-ancient-mound",
    category: "Historical Monument",
    heritageZone: "fazilnagar",
    historicalSignificance: "Ancient Malla era habitation mound with historical terracottas and ring-wells linking early republican history of eastern UP.",
    narrative: "Located directly in the immediate vicinity of Fazilnagar, Sathiaon possesses ancient archaeological mounds dating back to the NBPW (Northern Black Polished Ware) and Kushan periods. Renowned historians associate it with Buddhist and Jain monastic settlements contemporary with Kushinagar's Malla republic.",
    distanceFromFazilnagarCenter: "2.5 km North-East",
    locationAddress: "Sathiaon Archaeological Sector, Fazilnagar, Kushinagar",
    latitude: 26.695,
    longitude: 84.062,
    visitingHours: "Open during daylight hours",
    entryFee: "Free Admission",
    primaryImage: "https://images.unsplash.com/photo-1590077428593-a55bb07c4665?auto=format&fit=crop&w=1200&q=80",
    isTwinHeritageHighlight: true,
    isPublished: true,
    displayOrder: 3,
  },
  {
    name: "Mahaparinirvana Temple & Nirvana Stupa (Kushinagar Twin Axis)",
    nameHindi: "महापरिनिर्वाण मंदिर एवं स्तूप (कुशीनगर)",
    slug: "mahaparinirvana-kushinagar",
    category: "Buddhist Heritage",
    heritageZone: "kushinagar",
    historicalSignificance: "The sacred sanctuary commemorating where Lord Gautam Buddha attained Mahaparinirvana in 483 BCE under the twin Sal trees.",
    narrative: "Fazilnagar and Kushinagar form a sacred twin heritage circuit separated by merely 18 km along the Buddhist corridor. Ancient records state that Lord Buddha partook his last meal at Pawa before walking to the Sal grove of Kushinagar to attain Mahaparinirvana.",
    distanceFromFazilnagarCenter: "18 km West (Direct Highway Corridor)",
    locationAddress: "Archaeological Park, Kushinagar - 274403",
    latitude: 26.7402,
    longitude: 83.8887,
    visitingHours: "06:00 AM – 06:00 PM",
    entryFee: "ASI Prescribed Entry (Rs. 25 Indian / Rs. 300 Foreign)",
    primaryImage: "/images/kushinagar_mahaparinirvana.webp",
    galleryImages: [],
    isTwinHeritageHighlight: true,
    isPublished: true,
    displayOrder: 4,
  },
  {
    name: "Ancient Ramabhar Stupa — Holy Cremation Mound",
    nameHindi: "रामाभार स्तूप (मुकुटबंधन चैत्य)",
    slug: "ramabhar-stupa-kushinagar",
    category: "Buddhist Heritage",
    heritageZone: "kushinagar",
    historicalSignificance: "A majestic 49-foot brick dome marking the exact site where the mortal remains of Buddha were cremated with supreme reverence by the Mallas.",
    narrative: "Located 1.5 km east of the Mahaparinirvana temple, Ramabhar marks the site of the holy cremation of Lord Buddha (Mukutbandhana Chaitya).",
    distanceFromFazilnagarCenter: "19 km West",
    locationAddress: "Ramabhar, Kushinagar - 274403",
    latitude: 26.735,
    longitude: 83.902,
    visitingHours: "06:00 AM – 06:00 PM",
    entryFee: "Free Admission",
    primaryImage: "/images/kushinagar_ramabhar.webp",
    galleryImages: [],
    isTwinHeritageHighlight: true,
    isPublished: true,
    displayOrder: 5,
  },
];

let hasCheckedHeritageSeed = false;
async function seedDefaultHeritageIfEmpty() {
  if (hasCheckedHeritageSeed) return;
  hasCheckedHeritageSeed = true;
  const count = await HeritageSite.countDocuments();
  if (count === 0) {
    for (const defaultSite of DEFAULT_HERITAGE_SITES) {
      await HeritageSite.create(defaultSite);
    }
  }
}

// @route   GET /api/heritage
// @desc    Get published heritage and tourism sites
// @access  Public
router.get("/", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    const sites = await HeritageSite.find({ isPublished: true }).sort({ displayOrder: 1, createdAt: -1 });
    res.status(200).json({ success: true, count: sites.length, sites });
  } catch (err) {
    console.error("[Heritage] Fetch error:", err);
    res.status(500).json({ message: "Failed to fetch heritage sites." });
  }
});

// @route   GET /api/heritage/admin
// @desc    Admin list of all heritage sites
// @access  Private (Admin)
router.get("/admin", verifyToken, requireAdmin, async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    const sites = await HeritageSite.find().sort({ displayOrder: 1, createdAt: -1 });
    res.status(200).json({ success: true, count: sites.length, sites });
  } catch (err) {
    console.error("[Heritage] Admin fetch error:", err);
    res.status(500).json({ message: "Failed to fetch heritage sites." });
  }
});

// @route   POST /api/heritage
// @desc    Create a new heritage site entry
// @access  Private (Admin)
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      nameHindi,
      slug,
      category,
      historicalSignificance,
      narrative,
      distanceFromFazilnagarCenter,
      locationAddress,
      latitude,
      longitude,
      visitingHours,
      entryFee,
      primaryImage,
      galleryImages,
      heritageZone,
      isTwinHeritageHighlight,
      isPublished,
      displayOrder,
    } = req.body;

    if (!name || !historicalSignificance || !narrative) {
      return res.status(400).json({ message: "Name, significance, and narrative are required." });
    }

    const calculatedSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).trim();

    const newSite = await HeritageSite.create({
      name: name.trim(),
      nameHindi: (nameHindi || "").trim(),
      slug: calculatedSlug,
      category: category || "Jain Heritage",
      heritageZone: heritageZone || (category === "Buddhist Heritage" ? "kushinagar" : "fazilnagar"),
      historicalSignificance: historicalSignificance.trim(),
      narrative: narrative.trim(),
      distanceFromFazilnagarCenter: (distanceFromFazilnagarCenter || "Within Fazilnagar").trim(),
      locationAddress: (locationAddress || "Fazilnagar, Kushinagar, UP").trim(),
      latitude: !isNaN(parseFloat(latitude)) ? parseFloat(latitude) : 26.6827,
      longitude: !isNaN(parseFloat(longitude)) ? parseFloat(longitude) : 84.0498,
      visitingHours: (visitingHours || "06:00 AM – 07:00 PM").trim(),
      entryFee: (entryFee || "Free Admission").trim(),
      primaryImage: (primaryImage || "").trim(),
      galleryImages: Array.isArray(galleryImages) ? galleryImages : [],
      isTwinHeritageHighlight: isTwinHeritageHighlight !== false,
      isPublished: isPublished !== false,
      displayOrder: displayOrder || 0,
    });

    await logAdminAction({
      adminUser: req.user.id,
      adminEmail: req.user.email,
      action: "CREATE",
      entityType: "HeritageSite",
      entityId: newSite._id,
      entityTitle: newSite.name,
      changesSummary: `Created heritage site "${newSite.name}"`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: "Heritage destination added successfully.", site: newSite });
  } catch (err) {
    console.error("[Heritage] Create error:", err);
    res.status(500).json({ message: err.message || "Failed to create heritage destination." });
  }
});

// @route   PUT /api/heritage/:id
// @desc    Update a heritage site entry
// @access  Private (Admin)
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const site = await HeritageSite.findById(req.params.id);
    if (!site) {
      return res.status(404).json({ message: "Heritage site not found." });
    }

    const {
      name,
      nameHindi,
      slug,
      category,
      heritageZone,
      historicalSignificance,
      narrative,
      distanceFromFazilnagarCenter,
      locationAddress,
      latitude,
      longitude,
      visitingHours,
      entryFee,
      primaryImage,
      galleryImages,
      isTwinHeritageHighlight,
      isPublished,
      displayOrder,
    } = req.body;

    if (name) site.name = name.trim();
    if (nameHindi !== undefined) site.nameHindi = nameHindi.trim();
    if (slug) site.slug = slug.trim();
    if (category) site.category = category;
    if (heritageZone) site.heritageZone = heritageZone;
    if (historicalSignificance) site.historicalSignificance = historicalSignificance.trim();
    if (narrative) site.narrative = narrative.trim();
    if (distanceFromFazilnagarCenter !== undefined) site.distanceFromFazilnagarCenter = distanceFromFazilnagarCenter.trim();
    if (locationAddress !== undefined) site.locationAddress = locationAddress.trim();
    if (latitude !== undefined) site.latitude = parseFloat(latitude);
    if (longitude !== undefined) site.longitude = parseFloat(longitude);
    if (visitingHours !== undefined) site.visitingHours = visitingHours.trim();
    if (entryFee !== undefined) site.entryFee = entryFee.trim();
    if (primaryImage !== undefined) site.primaryImage = primaryImage.trim();
    if (galleryImages !== undefined && Array.isArray(galleryImages)) site.galleryImages = galleryImages;
    if (isTwinHeritageHighlight !== undefined) site.isTwinHeritageHighlight = isTwinHeritageHighlight;
    if (isPublished !== undefined) site.isPublished = isPublished;
    if (displayOrder !== undefined) site.displayOrder = displayOrder;

    await site.save();

    await logAdminAction({
      adminUser: req.user.id,
      adminEmail: req.user.email,
      action: "UPDATE",
      entityType: "HeritageSite",
      entityId: site._id,
      entityTitle: site.name,
      changesSummary: `Updated heritage destination "${site.name}"`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: "Heritage site updated successfully.", site });
  } catch (err) {
    console.error("[Heritage] Update error:", err);
    res.status(500).json({ message: "Failed to update heritage site." });
  }
});

// @route   PATCH /api/heritage/:id/publish
// @desc    Toggle or update publication status of a heritage site
// @access  Private (Admin)
const handlePublishToggle = async (req, res) => {
  try {
    const site = await HeritageSite.findById(req.params.id);
    if (!site) {
      return res.status(404).json({ message: "Heritage site not found." });
    }

    site.isPublished = req.body.isPublished !== undefined ? req.body.isPublished : !site.isPublished;
    await site.save();

    await logAdminAction({
      adminUser: req.user.id,
      adminEmail: req.user.email,
      action: "UPDATE",
      entityType: "HeritageSite",
      entityId: site._id,
      entityTitle: site.name,
      changesSummary: `${site.isPublished ? "Published" : "Unpublished"} heritage site "${site.name}"`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `Heritage site ${site.isPublished ? "published" : "unpublished"} successfully.`,
      isPublished: site.isPublished,
      site,
    });
  } catch (err) {
    console.error("[Heritage] Publish toggle error:", err);
    res.status(500).json({ message: "Failed to toggle heritage site publication." });
  }
};

router.patch("/:id/publish", verifyToken, requireAdmin, handlePublishToggle);
router.post("/:id/publish", verifyToken, requireAdmin, handlePublishToggle);

// @route   DELETE /api/heritage/:id
// @desc    Delete a heritage site entry
// @access  Private (Admin)
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const site = await HeritageSite.findByIdAndDelete(req.params.id);
    if (!site) {
      return res.status(404).json({ message: "Heritage site not found." });
    }

    await logAdminAction({
      adminUser: req.user.id,
      adminEmail: req.user.email,
      action: "DELETE",
      entityType: "HeritageSite",
      entityId: req.params.id,
      entityTitle: site.name,
      changesSummary: `Deleted heritage site "${site.name}"`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: "Heritage site deleted successfully." });
  } catch (err) {
    console.error("[Heritage] Delete error:", err);
    res.status(500).json({ message: "Failed to delete heritage site." });
  }
});

export default router;
