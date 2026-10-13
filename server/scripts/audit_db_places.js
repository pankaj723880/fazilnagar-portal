import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function inspect() {
  await mongoose.connect("mongodb://127.0.0.1:27017/fazilnagar_db");
  const placesCol = mongoose.connection.db.collection("places");
  const allPlaces = await placesCol.find().toArray();

  console.log("Total places found in DB:", allPlaces.length);

  const retained = [];
  const toDelete = [];

  for (const p of allPlaces) {
    const cat = p.category;
    // Check if school, college, hospital
    const isRetained =
      cat === "Schools & Colleges" ||
      cat === "Hospitals & Clinics" ||
      cat === "Schools" ||
      cat === "Colleges" ||
      cat === "Hospitals";

    if (isRetained) {
      retained.push(p);
    } else {
      toDelete.push(p);
    }
  }

  console.log(`Retained count: ${retained.length}`);
  console.log(`To delete count: ${toDelete.length}`);

  console.log("\n--- RETAINED ENTITIES ---");
  retained.forEach((p, i) => {
    console.log(`${i + 1}. [${p.category}] ${p.name} (slug: ${p.slug}, id: ${p.id || p._id}, coords: ${p.latitude}, ${p.longitude})`);
  });

  console.log("\n--- DELETED ENTITIES BY CATEGORY ---");
  const delByCat = {};
  toDelete.forEach((p) => {
    delByCat[p.category] = delByCat[p.category] || [];
    delByCat[p.category].push({ name: p.name, slug: p.slug, id: p.id || p._id });
  });

  for (const [cat, items] of Object.entries(delByCat)) {
    console.log(`\nCategory: "${cat}" (${items.length} records):`);
    items.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.name} (${item.slug})`);
    });
  }

  await mongoose.disconnect();
}

inspect().catch(console.error);
