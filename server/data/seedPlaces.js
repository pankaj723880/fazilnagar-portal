import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Place from "../models/Place.js";
import connectDB from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const seedPlaces = async () => {
  try {
    await connectDB();

    const rawData = fs.readFileSync(path.join(__dirname, "places.json"), "utf-8");
    const places = JSON.parse(rawData);

    console.log(`Found ${places.length} places in places.json. Seeding into MongoDB...`);

    // Upsert each place by slug or name
    for (const placeData of places) {
      await Place.findOneAndUpdate(
        { slug: placeData.slug },
        { ...placeData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const count = await Place.countDocuments();
    const published = await Place.countDocuments({ isPublished: true });
    const inReview = await Place.countDocuments({ isPublished: false });

    console.log(`✅ Successfully seeded database!`);
    console.log(`Total Places: ${count} | Published (Verified Town): ${published} | In Review Queue: ${inReview}`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding Error:", err);
    process.exit(1);
  }
};

seedPlaces();
