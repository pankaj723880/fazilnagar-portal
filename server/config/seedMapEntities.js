import Place from "../models/Place.js";
import path from "path";
import { fileURLToPath } from "url";
import { buildMapsUrl } from "../utils/coordinates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedMapEntities() {
  try {
    const regionalLocationsPath = path.resolve(__dirname, "../../client/src/data/regionalLocations.js");
    const { REGIONAL_LOCATIONS } = await import(`file://${regionalLocationsPath.replace(/\\/g, "/")}`);

    if (!Array.isArray(REGIONAL_LOCATIONS) || REGIONAL_LOCATIONS.length === 0) {
      console.warn("No regional locations found to seed.");
      return;
    }

    let seededCount = 0;

    for (const loc of REGIONAL_LOCATIONS) {
      const isLavkushPurab =
        loc.sno === 34 ||
        loc.id === "loc-34-lavkush-purab" ||
        loc.name?.toLowerCase().includes("lavkush purab");

      const isLavkushPashchim =
        loc.sno === 35 ||
        loc.id === "loc-35-lavkush-pashchim" ||
        loc.name?.toLowerCase().includes("lavkush pashchim");

      let name = loc.name;
      let hindiName = loc.hindiName || "";
      let lat = Number(loc.latitude ?? loc.lat);
      let lng = Number(loc.longitude ?? loc.lng);
      let dist = Number(loc.calculatedDistanceKm ?? loc.distanceKm ?? 0);
      let direction = loc.compassDirection || "Center";
      let coordSource = loc.coordinateSource || loc.source || "Regional Geospatial Survey";
      let verStatus = loc.verificationStatus || "verified";

      // Fix verified coordinates for Lavkush Purab Patti (Census 2011 Village Code: 189499)
      if (isLavkushPurab) {
        name = "Lavkush Purab Patti";
        hindiName = "लवकुश पूरब पट्टी";
        lat = 26.7095;
        lng = 84.0507;
        dist = 3.0;
        direction = "N";
        coordSource = "Census of India 2011 / LGD Code 189499 (Field Verification Pending)";
        verStatus = "needs_verification";
      }

      // Fix verified coordinates for Lavkush Pashchim Patti (Census 2011 Village Code: 189283)
      if (isLavkushPashchim) {
        name = "Lavkush Pashchim Patti";
        hindiName = "लवकुश पश्चिम पट्टी";
        lat = 26.7354;
        lng = 84.0306;
        dist = 6.2;
        direction = "NW";
        coordSource = "Census of India 2011 / LGD Code 189283 (Field Verification Pending)";
        verStatus = "needs_verification";
      }

      const entityDoc = {
        id: loc.id,
        name,
        hindiName,
        sno: loc.sno,
        category: loc.category || loc.type || "village",
        entityType: loc.type || "village",
        subcategory: loc.sourceCategory || "",
        locality: loc.block || "Fazilnagar",
        district: loc.district || "Kushinagar",
        state: loc.state || "Uttar Pradesh",
        country: "India",
        latitude: lat,
        longitude: lng,
        distanceKm: dist,
        calculatedDistanceKm: dist,
        compassDirection: direction,
        distanceBand: loc.distanceBand || "",
        section: loc.section || "",
        coordinateSource: coordSource,
        verificationStatus: verStatus,
        townBoundaryStatus: "confirmed",
        isPublished: true,
        isArchived: false,
        mapsUrl: buildMapsUrl(lat, lng),
        addressFull: `${name}, Fazilnagar Block, Kushinagar, Uttar Pradesh`,
      };

      await Place.findOneAndUpdate(
        { $or: [{ id: loc.id }, { sno: loc.sno, entityType: loc.type }] },
        { $set: entityDoc },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      seededCount++;
    }

    // Ensure Karmaini is stored as its own separate entity distinct from Lavkush Purab
    const karmainiDoc = {
      id: "loc-karmaini-bazar",
      name: "Karmaini",
      hindiName: "करमैनी (Karmaini)",
      sno: 118,
      category: "village",
      entityType: "village",
      subcategory: "गांव / बाजार",
      locality: "Tamkuhi Raj / Fazilnagar",
      district: "Kushinagar",
      state: "Uttar Pradesh",
      country: "India",
      latitude: 26.7110,
      longitude: 84.0790,
      distanceKm: 4.3,
      calculatedDistanceKm: 4.3,
      compassDirection: "NE",
      distanceBand: "0-5 km",
      section: "Part 1 (0-20 km & Local)",
      coordinateSource: "Census 2011 / Revenue Records Kushinagar",
      verificationStatus: "verified",
      townBoundaryStatus: "confirmed",
      isPublished: true,
      isArchived: false,
      mapsUrl: buildMapsUrl(26.7110, 84.0790),
      addressFull: "Karmaini Bazar, Kushinagar, Uttar Pradesh",
    };

    await Place.findOneAndUpdate(
      { id: karmainiDoc.id },
      { $set: karmainiDoc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`[Database Seeder] Successfully seeded/synchronized ${seededCount + 1} map entities.`);
  } catch (err) {
    console.error("[Database Seeder] Error seeding map entities:", err.message);
  }
}

export default seedMapEntities;
