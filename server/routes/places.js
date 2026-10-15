import express from "express";
import Place from "../models/Place.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { buildMapsUrl, normalizeCoordinates } from "../utils/coordinates.js";

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
      isArchived: { $ne: true },
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
        // Filter out archived
        localPlaces = localPlaces.filter(p => !p.isArchived && p.isPublished !== false);

        if (category && category !== "all" && category !== "All" && category !== "All Places") {
          localPlaces = localPlaces.filter(p => p.category === category || p.subcategory === category);
        }
        if (locality && locality !== "all") {
          localPlaces = localPlaces.filter(p => p.locality === locality);
        }
        if (search && search.trim()) {
          const s = search.trim().toLowerCase();
          localPlaces = localPlaces.filter(p =>
            p.name.toLowerCase().includes(s) ||
            p.category.toLowerCase().includes(s) ||
            p.addressFull.toLowerCase().includes(s) ||
            (p.streetOrLandmark && p.streetOrLandmark.toLowerCase().includes(s))
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
      let localPlaces = JSON.parse(raw);
      localPlaces = localPlaces.filter(p => !p.isArchived && p.isPublished !== false);
      return res.status(200).json(localPlaces);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch directory places." });
    }
  }
});

// @route   POST /api/places/sync (also GET /api/places/sync for browser trigger)
// @desc    Synchronize MongoDB places with canonical server/data/places.json
// @access  Public / Admin
router.all("/sync", verifyToken, requireAdmin, async (req, res) => {
  try {
    const raw = fs.readFileSync(path.join(__dirname, "../data/places.json"), "utf8");
    const places = JSON.parse(raw);
    let updatedCount = 0;
    for (const p of places) {
      await Place.findOneAndUpdate(
        { slug: p.slug },
        { ...p },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      updatedCount++;
    }
    res.status(200).json({
      message: `Successfully synchronized ${updatedCount} places into database.`,
      count: updatedCount,
    });
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ message: "Failed to synchronize places.", error: err.message });
  }
});

// @route   GET /api/places/stats/summary
// @desc    Get directory verification metrics and statistics
// @access  Public
router.get("/stats/summary", async (req, res) => {
  try {
    const total = await Place.countDocuments();
    const published = await Place.countDocuments({ isPublished: true, isArchived: { $ne: true } });
    const archived = await Place.countDocuments({ isArchived: true });
    const inReview = await Place.countDocuments({ isPublished: false, isArchived: { $ne: true } });
    const verified = await Place.countDocuments({ verificationStatus: "verified", isArchived: { $ne: true } });
    const needsBoundary = await Place.countDocuments({
      verificationStatus: "needs_boundary_verification",
      isArchived: { $ne: true },
    });
    const needsAddress = await Place.countDocuments({
      verificationStatus: "needs_address_verification",
      isArchived: { $ne: true },
    });

    const categoryCounts = await Place.aggregate([
      { $match: { isPublished: true, isArchived: { $ne: true } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      total,
      published,
      archived,
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
// @access  Admin
router.get("/admin", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, boundary, archived } = req.query;
    const filter = {};

    if (archived === "only") {
      filter.isArchived = true;
    } else if (archived !== "all") {
      filter.isArchived = { $ne: true };
    }

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

// @route   PATCH /api/places/:id/archive
// @desc    Archive place (hide from public map/directory)
// @access  Admin
router.patch("/:id/archive", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const place = await Place.findById(id);
    if (!place) {
      return res.status(404).json({ message: "Establishment not found." });
    }
    place.isArchived = true;
    place.isPublished = false;
    place.archiveReason = reason || "archived_by_admin";
    place.archivedAt = new Date();
    await place.save();
    res.status(200).json({ message: "Establishment archived successfully.", place });
  } catch (err) {
    console.error("Archive Place Error:", err);
    res.status(500).json({ message: "Failed to archive establishment." });
  }
});

// @route   PATCH /api/places/:id/restore
// @desc    Restore archived place to public directory
// @access  Admin
router.patch("/:id/restore", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const place = await Place.findById(id);
    if (!place) {
      return res.status(404).json({ message: "Establishment not found." });
    }
    place.isArchived = false;
    place.isPublished = true;
    place.archiveReason = "";
    place.archivedAt = null;
    await place.save();
    res.status(200).json({ message: "Establishment restored successfully.", place });
  } catch (err) {
    console.error("Restore Place Error:", err);
    res.status(500).json({ message: "Failed to restore establishment." });
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

// Helper to synchronize local places.json files
function syncJsonPlaces(mutator) {
  try {
    const paths = [
      path.join(__dirname, "../data/places.json"),
      path.resolve(__dirname, "../../client/src/data/places.json"),
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        let list = JSON.parse(fs.readFileSync(p, "utf8"));
        list = mutator(list);
        fs.writeFileSync(p, JSON.stringify(list, null, 2), "utf8");
      }
    }
  } catch (err) {
    console.warn("syncJsonPlaces warning:", err.message);
  }
}

// @route   POST /api/places
// @desc    Create an official place directly in directory
// @access  Private (Admin Only)
router.post("/", verifyToken, requireAdmin, async (req, res) => {
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
      imageUrl,
      galleryUrls,
      sourceUrls,
      isPublished = false,
      verificationStatus = "verified",
      townBoundaryStatus = "confirmed",
    } = req.body;

    if (!name || !category || !addressFull) {
      return res.status(400).json({ message: "Name, category, and full address are required." });
    }

    const cleanSlug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const customId = `fz-${category.slice(0, 3).toLowerCase()}-${Date.now().toString().slice(-4)}`;

    let coordinates;
    try {
      coordinates = normalizeCoordinates(latitude, longitude, {
        allowNull: !isPublished,
        enforceTownBounds: Boolean(isPublished),
      });
    } catch (coordinateError) {
      return res.status(400).json({ message: coordinateError.message });
    }

    const placeData = {
      id: customId,
      name,
      slug: cleanSlug,
      alternateNames: alternateNames || [],
      category,
      subcategory: subcategory || "",
      description: description || "",
      addressFull,
      locality: locality || "Fazilnagar Town",
      streetOrLandmark: streetOrLandmark || "",
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      mapsUrl: coordinates.latitude === null ? "" : buildMapsUrl(coordinates.latitude, coordinates.longitude),
      phone: phone || "",
      website: website || "",
      openingHours: openingHours || "",
      services: services || [],
      imageUrl: imageUrl || "",
      galleryUrls: galleryUrls || [],
      sourceUrls: sourceUrls || ["Admin/Portal Entry"],
      verificationStatus: isPublished ? "verified" : verificationStatus,
      townBoundaryStatus: isPublished ? "confirmed" : townBoundaryStatus,
      isPublished: Boolean(isPublished),
      isArchived: false,
      submissionSource: "official",
      lastVerifiedAt: new Date(),
    };

    let savedPlace = null;
    try {
      savedPlace = await Place.create(placeData);
    } catch (dbErr) {
      console.warn("Database create skipped/failed, persisting to JSON:", dbErr.message);
      savedPlace = { ...placeData, _id: customId };
    }

    // Always update JSON seed files
    syncJsonPlaces((list) => {
      const idx = list.findIndex((p) => p.id === customId || p.slug === cleanSlug);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...placeData };
      } else {
        list.push(placeData);
      }
      return list;
    });

    res.status(201).json({
      message: "Place created successfully in directory.",
      place: savedPlace,
    });
  } catch (err) {
    console.error("Submit Place Error:", err);
    res.status(500).json({ message: "Failed to submit establishment candidate." });
  }
});

// @route   PUT /api/places/:id
// @desc    Moderator update: verify, edit place details, coordinates, photos
// @access  Public / Admin
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, lastVerifiedAt: new Date() };

    if (Object.prototype.hasOwnProperty.call(updateData, "latitude") || Object.prototype.hasOwnProperty.call(updateData, "longitude")) {
      try {
        const coordinates = normalizeCoordinates(updateData.latitude, updateData.longitude, {
          allowNull: true,
          enforceTownBounds: updateData.isPublished === true,
        });
        updateData.latitude = coordinates.latitude;
        updateData.longitude = coordinates.longitude;
        updateData.mapsUrl = coordinates.latitude === null ? "" : buildMapsUrl(coordinates.latitude, coordinates.longitude);
      } catch (coordinateError) {
        return res.status(400).json({ message: coordinateError.message });
      }
    } else if (Object.prototype.hasOwnProperty.call(updateData, "mapsUrl")) {
      delete updateData.mapsUrl;
    }

    if (updateData.isPublished === true) {
      updateData.townBoundaryStatus = updateData.townBoundaryStatus || "confirmed";
      if (!updateData.verificationStatus) {
        updateData.verificationStatus = "verified";
      }
    }

    let updated = null;
    try {
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        updated = await Place.findByIdAndUpdate(id, updateData, { new: true });
      }
      if (!updated) {
        const queryOr = [{ id }, { slug: id }];
        if (updateData.name) {
          queryOr.push({ name: updateData.name });
          queryOr.push({ name: new RegExp(`^${updateData.name.trim()}$`, "i") });
        }
        updated = await Place.findOneAndUpdate(
          { $or: queryOr },
          updateData,
          { new: true }
        );
      }
    } catch (dbErr) {
      console.warn("MongoDB update error, updating local file:", dbErr.message);
    }

    // Always synchronize local JSON files
    let updatedInJson = false;
    syncJsonPlaces((list) => {
      const idx = list.findIndex(
        (p) =>
          String(p.id) === String(id) ||
          String(p._id) === String(id) ||
          p.slug === id ||
          (updated && (String(p.id) === String(updated.id) || String(p._id) === String(updated._id) || p.slug === updated.slug || p.name === updated.name))
      );
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...updateData };
        if (!updated) updated = list[idx];
        updatedInJson = true;
      }
      return list;
    });

    if (!updated && !updatedInJson) {
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
// @desc    Delete place from directory
// @access  Public / Admin
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    try {
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        await Place.findByIdAndDelete(id);
      } else {
        await Place.findOneAndDelete({ $or: [{ id }, { slug: id }] });
      }
    } catch (dbErr) {
      console.warn("MongoDB delete error, continuing with JSON sync:", dbErr.message);
    }

    syncJsonPlaces((list) =>
      list.filter((p) => String(p.id) !== String(id) && String(p._id) !== String(id) && p.slug !== id)
    );

    res.status(200).json({ message: "Place removed from directory." });
  } catch (err) {
    console.error("Delete Place Error:", err);
    res.status(500).json({ message: "Failed to remove establishment." });
  }
});

export default router;
