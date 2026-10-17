import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Place from "../models/Place.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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