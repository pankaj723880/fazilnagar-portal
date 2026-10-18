import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Place from "../models/Place.js";
import ContributionForm from "../models/ContributionForm.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ensureAreaDetailsForm = async () => {
  try {
    const existing = await ContributionForm.findOne({ slug: "area-details" });
    if (!existing) {
      await ContributionForm.create({
        title: "Fazilnagar Area & Boundary Details",
        slug: "area-details",
        description: "Contribute or suggest updates for Fazilnagar localities, wards, villages, and geographic ground truth coordinates.",
        instructions: "Please enter accurate area details and attach an authentic Google Maps location pin or decimal coordinates.",
        targetModule: "map",
        entityType: "locality",
        purpose: "both",
        fields: [
          { name: "name", label: "Village / Locality / Place Name", type: "text", required: true, order: 1 },
          { name: "hindiName", label: "Name in Hindi / नाम (हिंदी में)", type: "text", required: false, order: 2 },
          { name: "entityType", label: "Entity Settlement Type", type: "select", options: ["village", "locality", "town", "city", "landmark", "hub", "place"], defaultValue: "locality", required: true, order: 3 },
          { name: "locality", label: "Block / Tehsil", type: "text", defaultValue: "Fazilnagar", required: false, order: 4 },
          { name: "addressFull", label: "Full Postal Address / Boundary Note", type: "address", required: false, order: 5 },
          { name: "googleMapsUrl", label: "Google Maps Location Link", type: "googleMapsUrl", required: true, order: 6 },
          { name: "latitude", label: "Latitude (North)", type: "latitude", required: true, order: 7 },
          { name: "longitude", label: "Longitude (East)", type: "longitude", required: true, order: 8 },
          { name: "description", label: "Overview / Description", type: "textarea", required: false, order: 9 },
        ],
        attachmentsConfig: {
          enabled: true,
          maxFiles: 3,
          maxSizeMb: 5,
          allowedTypes: ["image/jpeg", "image/png", "image/webp"],
        },
        status: "published",
      });
      console.log("[AutoSeed] Successfully created default area-details contribution form.");
    }
  } catch (err) {
    console.error("[AutoSeed] Area details form check error:", err.message);
  }
};

const autoSeedIfEmpty = async () => {
  try {
    const count = await Place.countDocuments();
    if (count === 0) {
      const seedFile = path.join(__dirname, "../data/places.json");
      if (fs.existsSync(seedFile)) {
        const raw = fs.readFileSync(seedFile, "utf-8");
        const places = JSON.parse(raw);
        console.log(`[AutoSeed] Database is empty. Auto-seeding ${places.length} verified town places...`);
        for (const p of places) {
          await Place.findOneAndUpdate(
            { slug: p.slug },
            { ...p },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
        console.log(`[AutoSeed] Successfully populated ${places.length} places into database.`);
      }
    }
    await ensureAreaDetailsForm();
  } catch (err) {
    console.error("[AutoSeed] Warning:", err.message);
  }
};

let dbConnectionError = null;
let detectedUriSource = "default_fallback";

const connectDB = async () => {
  try {
    let rawUri =
      process.env.MONGO_URI ||
      process.env.MONGO_URL ||
      process.env.MONGODB_URI ||
      process.env.MONGODB_URL ||
      process.env["mongodb url"] ||
      process.env["MONGODB URL"] ||
      process.env["mongodb_url"] ||
      "";

    rawUri = (rawUri || "").trim();

    let uri = rawUri;
    if (!uri) {
      uri = "mongodb://127.0.0.1:27017/fazilnagar_db";
      detectedUriSource = "local_default (no MONGO_URI env var detected)";
    } else {
      detectedUriSource = "environment_variable_detected";
      // Auto-append database name if omitted from Atlas SRV URI
      if (uri.startsWith("mongodb+srv://") && uri.endsWith(".mongodb.net")) {
        uri = `${uri}/fazilnagar_db?retryWrites=true&w=majority`;
      } else if (uri.startsWith("mongodb+srv://") && uri.endsWith(".mongodb.net/")) {
        uri = `${uri}fazilnagar_db?retryWrites=true&w=majority`;
      }
    }

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 20,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    dbConnectionError = null;
    await autoSeedIfEmpty();
  } catch (error) {
    dbConnectionError = error.message;
    console.error(`MongoDB Connection Error: ${error.message}`);
  }
};

export { dbConnectionError, detectedUriSource };
export default connectDB;