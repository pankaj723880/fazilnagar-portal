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

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db"
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await autoSeedIfEmpty();
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;