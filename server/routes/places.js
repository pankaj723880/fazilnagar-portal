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
let cachedPublicPlaces = null;
let cachedPublicPlacesTime = 0;
let cachedStatsSummary = null;
let cachedStatsSummaryTime = 0;
let cachedMapEntities = null;
let cachedMapEntitiesTime = 0;
const PLACES_CACHE_TTL_MS = 60 * 1000; // 60s in-memory cache

export function invalidatePlacesCache() {
  cachedPublicPlaces = null;
  cachedPublicPlacesTime = 0;
  cachedStatsSummary = null;
  cachedStatsSummaryTime = 0;
  cachedMapEntities = null;
  cachedMapEntitiesTime = 0;
}

// @route   GET /api/places/map-entities
// @desc    Get all active map entities (villages, towns, cities, landmarks, hubs, civic establishments)
// @access  Public
router.get("/map-entities", async (req, res) => {
  try {
    if (cachedMapEntities && Date.now() - cachedMapEntitiesTime < PLACES_CACHE_TTL_MS) {
      return res.status(200).json(cachedMapEntities);
    }

    const entities = await Place.find({
      isPublished: { $ne: false },
      isArchived: { $ne: true },
      latitude: { $ne: null },
      longitude: { $ne: null },
    })
      .sort({ sno: 1, name: 1 })
      .lean();

    if (entities && entities.length > 0) {
      const mapped = entities.map((e) => ({
        ...e,
        id: e.id || String(e._id),
        lat: Number(e.latitude),
        lng: Number(e.longitude),
        type: e.entityType || e.category || "village",
        mapsUrl: e.mapsUrl || buildMapsUrl(e.latitude, e.longitude),
      }));
      cachedMapEntities = mapped;
      cachedMapEntitiesTime = Date.now();
      return res.status(200).json({ success: true, count: mapped.length, data: mapped });
    }

    // Fallback to static dataset if database is empty or still initializing
    const regionalLocationsPath = path.resolve(__dirname, "../../client/src/data/regionalLocations.js");
    if (fs.existsSync(regionalLocationsPath)) {
      const { REGIONAL_LOCATIONS } = await import(`file://${regionalLocationsPath.replace(/\\/g, "/")}`);
      return res.status(200).json({ success: true, count: REGIONAL_LOCATIONS.length, data: REGIONAL_LOCATIONS });
    }

    return res.status(200).json({ success: true, count: 0, data: [] });
  } catch (err) {
    console.error("Map Entities Fetch Error:", err);
    try {
      const regionalLocationsPath = path.resolve(__dirname, "../../client/src/data/regionalLocations.js");
      const { REGIONAL_LOCATIONS } = await import(`file://${regionalLocationsPath.replace(/\\/g, "/")}`);
      return res.status(200).json({ success: true, count: REGIONAL_LOCATIONS.length, data: REGIONAL_LOCATIONS });
    } catch (_) {
      res.status(500).json({ success: false, message: "Failed to fetch map entities." });
    }
  }
});

// @route   GET /api/places
// @desc    Get published, verified town directory places
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { category, search, locality, sort = "name" } = req.query;

    const isDefaultQuery =
      (!category || category === "all" || category === "All" || category === "All Places") &&
      !locality &&
      (!search || !search.trim()) &&
      sort === "name";

    if (isDefaultQuery && cachedPublicPlaces && Date.now() - cachedPublicPlacesTime < PLACES_CACHE_TTL_MS) {
      return res.status(200).json(cachedPublicPlaces);
    }

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
      const sanitized = String(search).trim().slice(0, 100);
      const escaped = sanitized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
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

    const places = await Place.find(query).sort(sortOption).lean();

    if (isDefaultQuery) {
      cachedPublicPlaces = places;
      cachedPublicPlacesTime = Date.now();
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
    invalidatePlacesCache();
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
    if (cachedStatsSummary && Date.now() - cachedStatsSummaryTime < PLACES_CACHE_TTL_MS) {
      return res.status(200).json(cachedStatsSummary);
    }

    const [
      total,
      published,
      archived,
      inReview,
      verified,
      needsBoundary,
      needsAddress,
      categoryCounts,
    ] = await Promise.all([
      Place.countDocuments(),
      Place.countDocuments({ isPublished: true, isArchived: { $ne: true } }),
      Place.countDocuments({ isArchived: true }),
      Place.countDocuments({ isPublished: false, isArchived: { $ne: true } }),
      Place.countDocuments({ verificationStatus: "verified", isArchived: { $ne: true } }),
      Place.countDocuments({ verificationStatus: "needs_boundary_verification", isArchived: { $ne: true } }),
      Place.countDocuments({ verificationStatus: "needs_address_verification", isArchived: { $ne: true } }),
      Place.aggregate([
        { $match: { isPublished: true, isArchived: { $ne: true } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const statsPayload = {
      total,
      published,
      archived,
      inReview,
      verified,
      needsBoundary,
      needsAddress,
      categoryCounts,
    };

    cachedStatsSummary = statsPayload;
    cachedStatsSummaryTime = Date.now();

    res.status(200).json(statsPayload);
  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ message: "Failed to load directory stats." });
  }
});

// @route   GET /api/places/admin
// @desc    Get all map entities & directory records (searchable, filterable, paginated)
// @access  Admin
router.get("/admin", verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      status,
      boundary,
      archived,
      category,
      entityType,
      search,
      page,
      limit,
      paginated,
    } = req.query;

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
    if (category && category !== "all") {
      filter.category = category;
    }
    if (entityType && entityType !== "all") {
      filter.entityType = entityType;
    }

    if (search && search.trim()) {
      const sanitized = String(search).trim().slice(0, 100);
      const escaped = sanitized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      filter.$or = [
        { name: regex },
        { hindiName: regex },
        { slug: regex },
        { category: regex },
        { entityType: regex },
        { addressFull: regex },
        { locality: regex },
        { district: regex },
      ];
    }

    const sortOption = { sno: 1, updatedAt: -1 };

    // Support optional pagination
    if (paginated === "true" || (page && limit)) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 25));
      const skip = (pageNum - 1) * limitNum;

      const [total, places] = await Promise.all([
        Place.countDocuments(filter),
        Place.find(filter).sort(sortOption).skip(skip).limit(limitNum).lean(),
      ]);

      return res.status(200).json({
        places,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        limit: limitNum,
      });
    }

    const places = await Place.find(filter).sort(sortOption).lean();
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
    invalidatePlacesCache();
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
    invalidatePlacesCache();
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
// @desc    Create a map entity or official place directly in directory
// @access  Private (Admin Only)
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      alternateNames,
      hindiName,
      entityType = "place",
      sno,
      category,
      subcategory,
      description,
      addressFull,
      locality,
      district,
      state,
      country,
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
      coordinateSource,
      distanceKm,
      calculatedDistanceKm,
      compassDirection,
      distanceBand,
      section,
      isPublished = true,
      verificationStatus = "verified",
      townBoundaryStatus = "confirmed",
      force = false,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Entity name is required." });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ message: "Category is required." });
    }

    // Duplicate check: Search for an existing entity before creating another with the same or similar name
    const existingSimilar = await Place.findOne({
      $or: [
        { name: new RegExp(`^${name.trim()}$`, "i") },
        { slug: name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "") },
      ],
      isArchived: { $ne: true },
    });

    if (existingSimilar && !force) {
      return res.status(409).json({
        message: `An entity with the name "${existingSimilar.name}" already exists (ID: ${existingSimilar.id || existingSimilar._id}). Provide 'force: true' if you explicitly intend to create a duplicate.`,
        existingEntity: existingSimilar,
      });
    }

    let coordinates;
    try {
      coordinates = normalizeCoordinates(latitude, longitude, {
        allowNull: !isPublished,
        enforceTownBounds: false,
      });
    } catch (coordinateError) {
      return res.status(400).json({ message: coordinateError.message });
    }

    const cleanSlug = name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const customId = req.body.id || `map-${(entityType || category).slice(0, 3).toLowerCase()}-${Date.now().toString().slice(-6)}`;

    const placeData = {
      id: customId,
      name: name.trim(),
      hindiName: (hindiName || "").trim(),
      slug: cleanSlug,
      alternateNames: alternateNames || [],
      category: category.trim(),
      entityType: entityType || "place",
      sno: sno ? Number(sno) : null,
      subcategory: subcategory || "",
      description: description || "",
      addressFull: addressFull || `${name.trim()}, ${locality || "Fazilnagar"}, ${district || "Kushinagar"}, ${state || "Uttar Pradesh"}`,
      locality: locality || "Fazilnagar Town",
      district: district || "Kushinagar",
      state: state || "Uttar Pradesh",
      country: country || "India",
      streetOrLandmark: streetOrLandmark || "",
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      distanceKm: distanceKm !== undefined ? Number(distanceKm) : null,
      calculatedDistanceKm: calculatedDistanceKm !== undefined ? Number(calculatedDistanceKm) : null,
      compassDirection: compassDirection || "",
      distanceBand: distanceBand || "",
      section: section || "",
      coordinateSource: coordinateSource || "Admin Geospatial Management",
      mapsUrl: coordinates.latitude === null ? "" : buildMapsUrl(coordinates.latitude, coordinates.longitude),
      phone: phone || "",
      website: website || "",
      openingHours: openingHours || "",
      services: services || [],
      imageUrl: imageUrl || "",
      galleryUrls: galleryUrls || [],
      sourceUrls: sourceUrls || ["Admin/Portal Entry"],
      verificationStatus: verificationStatus || "verified",
      townBoundaryStatus: townBoundaryStatus || "confirmed",
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

    invalidatePlacesCache();

    res.status(201).json({
      message: "Map entity created successfully.",
      place: savedPlace,
    });
  } catch (err) {
    console.error("Submit Place Error:", err);
    res.status(500).json({ message: "Failed to create map entity: " + err.message });
  }
});

// @route   PUT /api/places/:id
// @desc    Admin update: edit entity details, exact geographical coordinates, and status
// @access  Private (Admin Only)
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, lastVerifiedAt: new Date() };

    if (Object.prototype.hasOwnProperty.call(updateData, "latitude") || Object.prototype.hasOwnProperty.call(updateData, "longitude")) {
      try {
        const coordinates = normalizeCoordinates(updateData.latitude, updateData.longitude, {
          allowNull: true,
          enforceTownBounds: false,
        });
        updateData.latitude = coordinates.latitude;
        updateData.longitude = coordinates.longitude;
        updateData.mapsUrl = coordinates.latitude === null ? "" : buildMapsUrl(coordinates.latitude, coordinates.longitude);
      } catch (coordinateError) {
        return res.status(400).json({ message: coordinateError.message });
      }
    } else if (Object.prototype.hasOwnProperty.call(updateData, "mapsUrl") && !updateData.mapsUrl) {
      if (updateData.latitude && updateData.longitude) {
        updateData.mapsUrl = buildMapsUrl(updateData.latitude, updateData.longitude);
      }
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
      return res.status(404).json({ message: "Entity not found." });
    }

    invalidatePlacesCache();

    res.status(200).json({
      message: "Map entity updated successfully.",
      place: updated,
    });
  } catch (err) {
    console.error("Update Place Error:", err);
    res.status(500).json({ message: "Failed to update map entity: " + err.message });
  }
});

// @route   DELETE /api/places/:id
// @desc    Delete entity from directory with safeguards
// @access  Private (Admin Only)
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Critical Safeguard: Protect Town Center Hub against accidental deletion
    if (id === "fazilnagar-hub" || id === "loc-1-fazilnagar-centre") {
      return res.status(400).json({
        message: "The central Fazilnagar Hub cannot be deleted as it is the zero-km origin reference.",
      });
    }

    let placeToDelete = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      placeToDelete = await Place.findById(id);
    } else {
      placeToDelete = await Place.findOne({ $or: [{ id }, { slug: id }] });
    }

    if (!placeToDelete) {
      return res.status(404).json({ message: "Entity not found." });
    }

    if (placeToDelete.id === "fazilnagar-hub" || placeToDelete.name === "Fazilnagar Centre") {
      return res.status(400).json({
        message: "The central Fazilnagar Hub cannot be deleted as it is the zero-km origin reference.",
      });
    }

    await Place.findByIdAndDelete(placeToDelete._id);

    syncJsonPlaces((list) =>
      list.filter((p) => String(p.id) !== String(id) && String(p._id) !== String(id) && p.slug !== id)
    );

    invalidatePlacesCache();

    res.status(200).json({
      message: `Entity "${placeToDelete.name}" deleted successfully from map database.`,
      deletedId: placeToDelete.id || placeToDelete._id,
    });
  } catch (err) {
    console.error("Delete Place Error:", err);
    res.status(500).json({ message: "Failed to remove entity: " + err.message });
  }
});

export default router;
