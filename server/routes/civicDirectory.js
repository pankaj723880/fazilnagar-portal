import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import CivicDirectoryItem from "../models/CivicDirectoryItem.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { logAdminAction } from "../models/AuditLog.js";
import { matchesEtag } from "./googleDrive.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.join(__dirname, "../data/civicDirectory.json");

/**
 * Helper to safely read seed JSON
 */
function readJsonDirectory() {
  try {
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, "utf8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("[CivicDirectory] JSON read error:", err.message);
  }
  return [];
}

/**
 * Helper to synchronize filesystem JSON fallback
 */
function syncJsonDirectory(updater) {
  try {
    const current = readJsonDirectory();
    const updated = updater(current);
    fs.writeFileSync(jsonPath, JSON.stringify(updated, null, 2), "utf8");
  } catch (err) {
    console.warn("[CivicDirectory] JSON sync warning:", err.message);
  }
}

let hasCheckedCivicSeed = false;
async function seedDefaultCivicIfEmpty() {
  if (hasCheckedCivicSeed) return;
  hasCheckedCivicSeed = true;
  try {
    const count = await CivicDirectoryItem.countDocuments();
    if (count === 0) {
      const fallbackList = readJsonDirectory();
      if (fallbackList.length > 0) {
        console.log(`[CivicDirectory] Seeding ${fallbackList.length} items into database...`);
        await CivicDirectoryItem.insertMany(fallbackList);
      }
    }
  } catch (err) {
    console.warn("[CivicDirectory] Seed check skipped:", err.message);
  }
}

/**
 * @route   GET /api/civic-directory
 * @desc    Get civic directory index listings for carousel (public active or admin all)
 * @access  Public
 */
router.get("/", async (req, res) => {
  try {
    await seedDefaultCivicIfEmpty();
    const { all, includeInactive } = req.query;
    const showAll = all === "true" || includeInactive === "true";
    if (!showAll) {
      res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    }

    const filter = showAll ? {} : { isActive: { $ne: false } };
    let items = [];
    let isDbHealthy = true;

    try {
      items = await CivicDirectoryItem.find(filter).sort({ displayOrder: 1, createdAt: 1 }).lean();
    } catch (dbErr) {
      console.warn("[CivicDirectory] Mongo fetch error, using JSON:", dbErr.message);
      isDbHealthy = false;
    }

    // Only fallback to JSON if database connection failed, NOT when items array is legitimately empty
    if (!isDbHealthy) {
      const fallbackList = readJsonDirectory();
      items = showAll ? fallbackList : fallbackList.filter((i) => i.isActive !== false);
    }

    if (!showAll) {
      const maxTime = items.reduce((max, item) => {
        const t = new Date(item.updatedAt || item.createdAt || 0).getTime();
        return t > max ? t : max;
      }, 0);
      const etag = `"civic_dir_${maxTime}_${items.length}"`;
      res.setHeader("ETag", etag);
      if (matchesEtag(req.headers["if-none-match"], etag)) {
        return res.status(304).end();
      }
    }

    return res.status(200).json({
      success: true,
      count: items.length,
      items,
    });
  } catch (err) {
    console.error("[CivicDirectory] GET error:", err);
    const fallbackList = readJsonDirectory();
    return res.status(200).json({
      success: true,
      count: fallbackList.length,
      items: fallbackList,
    });
  }
});

/**
 * @route   POST /api/civic-directory
 * @desc    Create a new Civic Directory Index listing
 * @access  Private (Admin)
 */
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      subtitle,
      category,
      categoryLabel,
      phone,
      lat,
      lng,
      directionsUrl,
      image,
      verified,
      isActive,
      displayOrder,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Listing title/name is required." });
    }

    // Calculate display order if omitted
    let order = Number(displayOrder);
    if (isNaN(order)) {
      try {
        const lastItem = await CivicDirectoryItem.findOne().sort({ displayOrder: -1 });
        order = lastItem ? (lastItem.displayOrder || 0) + 1 : 1;
      } catch (_) {
        order = 1;
      }
    }

    const itemId = `civic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const newItemData = {
      itemId,
      title: title.trim(),
      subtitle: (subtitle || "").trim(),
      category: (category || "general").trim().toLowerCase(),
      categoryLabel: (categoryLabel || "📍 Civic").trim(),
      phone: (phone || "").trim(),
      lat: !isNaN(parseFloat(lat)) ? parseFloat(lat) : null,
      lng: !isNaN(parseFloat(lng)) ? parseFloat(lng) : null,
      directionsUrl: (directionsUrl || "").trim(),
      image: (image || "").trim(),
      verified: verified !== false,
      isActive: isActive !== false,
      displayOrder: order,
    };

    let savedItem = null;
    try {
      savedItem = await CivicDirectoryItem.create(newItemData);
    } catch (dbErr) {
      console.warn("[CivicDirectory] Mongo create fallback:", dbErr.message);
      savedItem = { ...newItemData, _id: itemId };
    }

    // Sync JSON
    syncJsonDirectory((list) => {
      list.push(savedItem.toObject ? savedItem.toObject() : savedItem);
      return list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    });

    // Log admin audit
    try {
      await logAdminAction({
        adminUser: req.user.id,
        adminEmail: req.user.email,
        action: "CREATE",
        entityType: "CivicDirectoryItem",
        entityId: String(savedItem._id || itemId),
        entityTitle: savedItem.title,
        changesSummary: `Created Civic Directory Index listing "${savedItem.title}"`,
        ipAddress: req.ip,
      });
    } catch (_) {}

    return res.status(201).json({
      success: true,
      message: "Listing added to Civic Directory Index successfully.",
      item: savedItem,
    });
  } catch (err) {
    console.error("[CivicDirectory] Create error:", err);
    return res.status(500).json({ success: false, message: "Failed to create directory listing: " + err.message });
  }
});

/**
 * @route   PATCH /api/civic-directory/reorder
 * @desc    Bulk reorder display sequence of listings
 * @access  Private (Admin)
 */
router.patch("/reorder", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { items } = req.body; // Expects [{ id, displayOrder }] or [{ _id, displayOrder }]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Array of items with displayOrder is required." });
    }

    for (const entry of items) {
      const id = entry.id || entry._id || entry.itemId;
      const order = Number(entry.displayOrder);
      if (id && !isNaN(order)) {
        try {
          if (String(id).match(/^[0-9a-fA-F]{24}$/)) {
            await CivicDirectoryItem.findByIdAndUpdate(id, { displayOrder: order });
          } else {
            await CivicDirectoryItem.findOneAndUpdate({ itemId: id }, { displayOrder: order });
          }
        } catch (_) {}
      }
    }

    // Sync JSON file
    syncJsonDirectory((list) => {
      items.forEach((entry) => {
        const id = String(entry.id || entry._id || entry.itemId);
        const order = Number(entry.displayOrder);
        const match = list.find((i) => String(i._id) === id || String(i.itemId) === id);
        if (match) match.displayOrder = order;
      });
      return list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    });

    try {
      await logAdminAction({
        adminUser: req.user.id,
        adminEmail: req.user.email,
        action: "UPDATE",
        entityType: "CivicDirectoryItem",
        entityId: "bulk-reorder",
        entityTitle: "Civic Directory Reorder",
        changesSummary: `Reordered ${items.length} directory listings`,
        ipAddress: req.ip,
      });
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: "Display order reordered successfully.",
    });
  } catch (err) {
    console.error("[CivicDirectory] Reorder error:", err);
    return res.status(500).json({ success: false, message: "Failed to reorder listings: " + err.message });
  }
});

/**
 * @route   PATCH /api/civic-directory/:id/toggle-active
 * @desc    Toggle visibility of a listing
 * @access  Private (Admin)
 */
router.patch("/:id/toggle-active", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let item = null;

    try {
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        item = await CivicDirectoryItem.findById(id);
      }
      if (!item) {
        item = await CivicDirectoryItem.findOne({ itemId: id });
      }
    } catch (_) {}

    let newStatus = true;
    if (item) {
      item.isActive = !item.isActive;
      await item.save();
      newStatus = item.isActive;
    }

    // Sync JSON
    syncJsonDirectory((list) => {
      const idx = list.findIndex((i) => String(i._id) === String(id) || String(i.itemId) === String(id));
      if (idx >= 0) {
        list[idx].isActive = item ? item.isActive : !list[idx].isActive;
        newStatus = list[idx].isActive;
        if (!item) item = list[idx];
      }
      return list;
    });

    if (!item) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }

    try {
      await logAdminAction({
        adminUser: req.user.id,
        adminEmail: req.user.email,
        action: newStatus ? "PUBLISH" : "UNPUBLISH",
        entityType: "CivicDirectoryItem",
        entityId: String(item._id || id),
        entityTitle: item.title,
        changesSummary: `${newStatus ? "Showed" : "Hid"} listing "${item.title}"`,
        ipAddress: req.ip,
      });
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: `Listing is now ${newStatus ? "live on homepage" : "hidden"}.`,
      item,
    });
  } catch (err) {
    console.error("[CivicDirectory] Toggle active error:", err);
    return res.status(500).json({ success: false, message: "Failed to toggle visibility: " + err.message });
  }
});

/**
 * @route   PUT /api/civic-directory/:id
 * @desc    Update a Civic Directory listing
 * @access  Private (Admin)
 */
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      category,
      categoryLabel,
      phone,
      lat,
      lng,
      directionsUrl,
      image,
      verified,
      isActive,
      displayOrder,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Listing title/name is required." });
    }

    const updateFields = {
      title: title.trim(),
      subtitle: (subtitle || "").trim(),
      category: (category || "general").trim().toLowerCase(),
      categoryLabel: (categoryLabel || "📍 Civic").trim(),
      phone: (phone || "").trim(),
      lat: !isNaN(parseFloat(lat)) ? parseFloat(lat) : null,
      lng: !isNaN(parseFloat(lng)) ? parseFloat(lng) : null,
      directionsUrl: (directionsUrl || "").trim(),
      image: (image || "").trim(),
      verified: verified !== false,
      isActive: isActive !== false,
    };

    if (displayOrder !== undefined && !isNaN(Number(displayOrder))) {
      updateFields.displayOrder = Number(displayOrder);
    }

    let updated = null;
    try {
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        updated = await CivicDirectoryItem.findByIdAndUpdate(id, updateFields, { new: true });
      }
      if (!updated) {
        updated = await CivicDirectoryItem.findOneAndUpdate({ itemId: id }, updateFields, { new: true });
      }
    } catch (dbErr) {
      console.warn("[CivicDirectory] Mongo update warning:", dbErr.message);
    }

    // Sync JSON
    let foundInJson = false;
    syncJsonDirectory((list) => {
      const idx = list.findIndex((i) => String(i._id) === String(id) || String(i.itemId) === String(id));
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...updateFields };
        if (!updated) updated = list[idx];
        foundInJson = true;
      }
      return list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    });

    if (!updated && !foundInJson) {
      return res.status(404).json({ success: false, message: "Listing not found." });
    }

    try {
      await logAdminAction({
        adminUser: req.user.id,
        adminEmail: req.user.email,
        action: "UPDATE",
        entityType: "CivicDirectoryItem",
        entityId: String(id),
        entityTitle: updated?.title || title,
        changesSummary: `Updated directory listing "${updated?.title || title}"`,
        ipAddress: req.ip,
      });
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: "Listing updated successfully.",
      item: updated,
    });
  } catch (err) {
    console.error("[CivicDirectory] Update error:", err);
    return res.status(500).json({ success: false, message: "Failed to update listing: " + err.message });
  }
});

/**
 * @route   DELETE /api/civic-directory/:id
 * @desc    Delete a Civic Directory listing
 * @access  Private (Admin)
 */
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let deletedTitle = "";

    try {
      let doc = null;
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        doc = await CivicDirectoryItem.findByIdAndDelete(id);
      } else {
        doc = await CivicDirectoryItem.findOneAndDelete({ itemId: id });
      }
      if (doc) deletedTitle = doc.title;
    } catch (dbErr) {
      console.warn("[CivicDirectory] Mongo delete warning:", dbErr.message);
    }

    // Sync JSON
    syncJsonDirectory((list) => {
      const match = list.find((i) => String(i._id) === String(id) || String(i.itemId) === String(id));
      if (match && !deletedTitle) deletedTitle = match.title;
      return list.filter((i) => String(i._id) !== String(id) && String(i.itemId) !== String(id));
    });

    try {
      await logAdminAction({
        adminUser: req.user.id,
        adminEmail: req.user.email,
        action: "DELETE",
        entityType: "CivicDirectoryItem",
        entityId: String(id),
        entityTitle: deletedTitle || id,
        changesSummary: `Deleted directory listing "${deletedTitle || id}"`,
        ipAddress: req.ip,
      });
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: "Listing removed from directory index.",
    });
  } catch (err) {
    console.error("[CivicDirectory] Delete error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete listing: " + err.message });
  }
});

export default router;
