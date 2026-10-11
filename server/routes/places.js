import express from "express";
import Place from "../models/Place.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @route   GET /api/places
// @desc    Get published, verified town directory places
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { category, search, locality, sort = "name" } = req.query;

    const query = {
      isPublished: true,
      townBoundaryStatus: "confirmed",
    };

    if (category && category !== "all" && category !== "All" && category !== "All Places") {
      query.$or = [{ category }, { subcategory: category }];
    }

    if (locality && locality !== "all") {
      query.locality = locality;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: regex },
        { alternateNames: { $in: [regex] } },
        { category: regex },
        { subcategory: regex },
        { addressFull: regex },
        { streetOrLandmark: regex },
        { locality: regex },
      ];
    }

    let sortOption = { name: 1 };
    if (sort === "newest") sortOption = { createdAt: -1 };
    if (sort === "category") sortOption = { category: 1, name: 1 };

    let places = await Place.find(query).sort(sortOption);

    // If database is empty or seeding, fallback gracefully to places.json
    if (!places || places.length === 0) {
      try {
        const raw = fs.readFileSync(path.join(__dirname, "../data/places.json"), "utf8");
        let localPlaces = JSON.parse(raw);
        if (category && category !== "all" && category !== "All" && category !== "All Places") {
          localPlaces = localPlaces.filter(p => p.category === category || p.subcategory === category);
        }
        if (search && search.trim()) {
          const s = search.trim().toLowerCase();
          localPlaces = localPlaces.filter(p =>
            p.name.toLowerCase().includes(s) ||
            p.category.toLowerCase().includes(s) ||
            p.addressFull.toLowerCase().includes(s) ||
            p.streetOrLandmark.toLowerCase().includes(s)
          );
        }
        return res.status(200).json(localPlaces);
      } catch (jsonErr) {
        console.error("JSON fallback error:", jsonErr);
      }
    }

    res.status(200).json(places);
  } catch (err) {
    console.error("Fetch Places Error, serving from places.json:", err);
    try {
      const raw = fs.readFileSync(path.join(__dirname, "../data/places.json"), "utf8");
      const localPlaces = JSON.parse(raw);
      return res.status(200).json(localPlaces);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch directory places." });
    }
  }
});

// @route   GET /api/places/stats/summary
// @desc    Get directory verification metrics and statistics
// @access  Public
router.get("/stats/summary", async (req, res) => {
  try {
    const total = await Place.countDocuments();
    const published = await Place.countDocuments({ isPublished: true });
    const inReview = await Place.countDocuments({ isPublished: false });
    const verified = await Place.countDocuments({ verificationStatus: "verified" });
    const needsBoundary = await Place.countDocuments({
      verificationStatus: "needs_boundary_verification",
    });
    const needsAddress = await Place.countDocuments({
      verificationStatus: "needs_address_verification",
    });

    const categoryCounts = await Place.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      total,
      published,
      inReview,
      verified,
      needsBoundary,
      needsAddress,
      categoryCounts,
    });
  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ message: "Failed to load directory stats." });
  }
});

// @route   GET /api/places/admin
// @desc    Get review queue & all moderation records
// @access  Public (or protected by admin role)
router.get("/admin", async (req, res) => {
  try {
    const { status, boundary } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.verificationStatus = status;
    }
    if (boundary && boundary !== "all") {
      filter.townBoundaryStatus = boundary;
    }

    const places = await Place.find(filter).sort({ updatedAt: -1 });
    res.status(200).json(places);
  } catch (err) {
    console.error("Admin Places Error:", err);
    res.status(500).json({ message: "Failed to fetch administration queue." });
  }
});

// @route   GET /api/places/export/csv
// @desc    Download CSV export of places
// @access  Public
router.get("/export/csv", (req, res) => {
  try {
    const csvPath = path.join(__dirname, "../data/places.csv");
    if (fs.existsSync(csvPath)) {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=fazilnagar_directory.csv");
      return fs.createReadStream(csvPath).pipe(res);
    }
    res.status(404).json({ message: "CSV export file not found." });
  } catch (err) {
    console.error("CSV Export Error:", err);
    res.status(500).json({ message: "Failed to stream CSV export." });
  }
});

// @route   GET /api/places/export/json
// @desc    Download JSON export of places
// @access  Public
router.get("/export/json", async (req, res) => {
  try {
    const places = await Place.find().sort({ name: 1 });
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=fazilnagar_directory.json");
    res.status(200).send(JSON.stringify(places, null, 2));
  } catch (err) {
    console.error("JSON Export Error:", err);
    res.status(500).json({ message: "Failed to export JSON directory." });
  }
});

// @route   GET /api/places/:id
// @desc    Get single place details by ID or slug
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let place = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      place = await Place.findById(id);
    } else {
      place = await Place.findOne({ slug: id });
    }

    if (!place) {
      return res.status(404).json({ message: "Establishment not found." });
    }

    res.status(200).json(place);
  } catch (err) {
    console.error("Single Place Error:", err);
    res.status(500).json({ message: "Error fetching place details." });
  }
});

// @route   POST /api/places
// @desc    Submit a new place candidate into review queue
// @access  Public
router.post("/", async (req, res) => {
  try {
    const {
      name,
      alternateNames,
      category,
      subcategory,
      description,
      addressFull,
      locality,
      streetOrLandmark,
      latitude,
      longitude,
      phone,
      website,
      openingHours,
      services,
      sourceUrls,
    } = req.body;

    if (!name || !category || !addressFull) {
      return res.status(400).json({ message: "Name, category, and full address are required." });
    }

    const newPlace = await Place.create({
      name,
      alternateNames: alternateNames || [],
      category,
      subcategory: subcategory || "",
      description: description || "",
      addressFull,
      locality: locality || "Fazilnagar Town",
      streetOrLandmark: streetOrLandmark || "",
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      phone: phone || "",
      website: website || "",
      openingHours: openingHours || "",
      services: services || [],
      sourceUrls: sourceUrls || ["Citizen Submission"],
      verificationStatus: "discovered",
      townBoundaryStatus: "unverified",
      isPublished: false,
      reviewNotes: "New candidate submitted via community portal; pending moderator verification.",
    });

    res.status(201).json({
      message: "Place candidate submitted successfully to verification queue.",
      place: newPlace,
    });
  } catch (err) {
    console.error("Submit Place Error:", err);
    res.status(500).json({ message: "Failed to submit establishment candidate." });
  }
});

// @route   PUT /api/places/:id
// @desc    Moderator update: verify, approve, edit boundary status
// @access  Public / Admin
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, lastVerifiedAt: new Date() };

    // If publishing, ensure boundary is confirmed
    if (updateData.isPublished === true) {
      updateData.townBoundaryStatus = "confirmed";
      updateData.verificationStatus = "verified";
    }

    const updated = await Place.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ message: "Establishment not found." });
    }

    res.status(200).json({
      message: "Place updated successfully.",
      place: updated,
    });
  } catch (err) {
    console.error("Update Place Error:", err);
    res.status(500).json({ message: "Failed to update establishment." });
  }
});

// @route   DELETE /api/places/:id
// @desc    Delete place
// @access  Public / Admin
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Place.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Establishment not found." });
    }
    res.status(200).json({ message: "Place removed from directory." });
  } catch (err) {
    console.error("Delete Place Error:", err);
    res.status(500).json({ message: "Failed to remove establishment." });
  }
});

export default router;
