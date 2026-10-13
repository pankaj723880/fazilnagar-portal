import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const PRESERVED_OFFICIAL_CATEGORIES = [
  "Schools & Colleges",
  "Hospitals & Clinics",
  "Medical Stores & Pharmacies",
];

async function runArchiveMigration() {
  const serverPlacesPath = path.join(__dirname, "../data/places.json");
  const clientPlacesPath = path.join(__dirname, "../../client/src/data/places.json");

  // Read current dataset
  const raw = fs.readFileSync(serverPlacesPath, "utf8");
  const places = JSON.parse(raw);

  // Backup files
  const timestamp = Date.now();
  const backupServerPath = path.join(__dirname, `../data/places_backup_${timestamp}.json`);
  fs.writeFileSync(backupServerPath, JSON.stringify(places, null, 2), "utf8");
  console.log(`[Backup] Created timestamped backup: ${backupServerPath}`);

  let preservedCount = 0;
  let archivedCount = 0;

  const updatedPlaces = places.map((place) => {
    const isPreserved = PRESERVED_OFFICIAL_CATEGORIES.includes(place.category);
    if (isPreserved) {
      preservedCount++;
      return {
        ...place,
        isArchived: false,
        isPublished: true,
        submissionSource: "official",
        archiveReason: "",
      };
    } else {
      archivedCount++;
      return {
        ...place,
        isArchived: true,
        isPublished: false,
        submissionSource: "official",
        archiveReason: "pre_community_unverified",
        archivedAt: new Date().toISOString(),
      };
    }
  });

  // Write updated JSON files
  fs.writeFileSync(serverPlacesPath, JSON.stringify(updatedPlaces, null, 2), "utf8");
  fs.writeFileSync(clientPlacesPath, JSON.stringify(updatedPlaces, null, 2), "utf8");
  console.log(`[FileUpdate] Updated ${serverPlacesPath} and ${clientPlacesPath}`);
  console.log(`[Summary] Preserved official entities: ${preservedCount}`);
  console.log(`[Summary] Safely archived unverified entities: ${archivedCount}`);

  // Update MongoDB Atlas if connected
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (uri) {
    try {
      console.log("[MongoDB] Connecting to MongoDB to synchronize archive flags...");
      await mongoose.connect(uri);
      console.log("[MongoDB] Connected successfully.");

      const Place = mongoose.model(
        "Place",
        new mongoose.Schema({}, { strict: false }),
        "places"
      );

      let dbUpdated = 0;
      for (const p of updatedPlaces) {
        await Place.findOneAndUpdate(
          { slug: p.slug },
          {
            $set: {
              isArchived: p.isArchived,
              isPublished: p.isPublished,
              submissionSource: p.submissionSource,
              archiveReason: p.archiveReason,
              archivedAt: p.archivedAt || null,
            },
          },
          { upsert: false }
        );
        dbUpdated++;
      }
      console.log(`[MongoDB] Synchronized archive flags for ${dbUpdated} documents in MongoDB Atlas.`);
      await mongoose.disconnect();
    } catch (dbErr) {
      console.warn("[MongoDB] Database sync notice (JSON files were successfully updated):", dbErr.message);
    }
  } else {
    console.log("[Notice] MONGO_URI not found in local environment; files updated successfully.");
  }
}

runArchiveMigration()
  .then(() => {
    console.log("[Complete] Archive migration completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[Error] Migration failed:", err);
    process.exit(1);
  });
