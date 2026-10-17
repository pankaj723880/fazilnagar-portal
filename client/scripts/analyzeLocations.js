import {
  FAZILNAGAR_CENTRE,
  RAW_SUPPLIED_RECORDS,
  calculateDistance,
  getCompassDirection,
  getDistanceBand,
} from "./processSuppliedLocations.js";
import { REGIONAL_LOCATIONS } from "../src/data/regionalLocations.js";

console.log("=================================================");
console.log("FAZILNAGAR 117 SUPPLIED LOCATIONS DATASET ANALYSIS");
console.log("=================================================");
console.log(`Configured Fazilnagar Centre: lat=${FAZILNAGAR_CENTRE.lat}, lng=${FAZILNAGAR_CENTRE.lng}`);
console.log(`Total supplied records: ${RAW_SUPPLIED_RECORDS.length}`);

// 1. Process each record with Haversine distance and compass direction
const processed = RAW_SUPPLIED_RECORDS.map((rec) => {
  const calcDist = calculateDistance(
    FAZILNAGAR_CENTRE.lat,
    FAZILNAGAR_CENTRE.lng,
    rec.lat,
    rec.lng
  );
  const calcDir = rec.sno === 1 ? "Center" : getCompassDirection(
    FAZILNAGAR_CENTRE.lat,
    FAZILNAGAR_CENTRE.lng,
    rec.lat,
    rec.lng
  );
  const band = getDistanceBand(calcDist);

  // Determine standard type: 'hub' | 'village' | 'town' | 'city'
  let type = "village";
  const catLower = rec.category.toLowerCase();
  if (rec.sno === 1 || catLower.includes("केंद्र") || catLower.includes("मुख्यालय")) {
    type = rec.sno === 1 ? "hub" : "town";
  } else if (catLower.includes("शहर") || rec.section.includes("Part 3") || (rec.section.includes("Part 2") && ["Gorakhpur", "Deoria", "Gopalganj", "Bettiah", "Siwan", "Motihari", "Bagaha", "Maharajganj", "Khalilabad", "Barhaj"].includes(rec.name))) {
    type = "city";
  } else if (catLower.includes("कस्बा") || catLower.includes("नगर") || catLower.includes("तहसील") || catLower.includes("तीर्थस्थल") || catLower.includes("मुख्यालय")) {
    type = "town";
  } else {
    type = "village";
  }

  return {
    ...rec,
    calcDist,
    calcDir,
    band,
    type,
  };
});

// Distance Bands summary
const bandsSummary = {};
processed.forEach((p) => {
  bandsSummary[p.band] = (bandsSummary[p.band] || 0) + 1;
});
console.log("\nDistance Bands Distribution (Calculated Straight-Line):");
console.table(bandsSummary);

// Types summary
const typesSummary = {};
processed.forEach((p) => {
  typesSummary[p.type] = (typesSummary[p.type] || 0) + 1;
});
console.log("\nEntity Types Distribution:");
console.table(typesSummary);

// 2. Coordinate sanity check
const coordDiscrepancies = [];
processed.forEach((p) => {
  if (isNaN(p.lat) || isNaN(p.lng)) {
    coordDiscrepancies.push({ sno: p.sno, name: p.name, reason: "NaN coordinate" });
  }
  if (p.lat < 20 || p.lat > 35) {
    coordDiscrepancies.push({ sno: p.sno, name: p.name, reason: `Unusual Latitude: ${p.lat}` });
  }
  if (p.lng < 70 || p.lng > 90) {
    coordDiscrepancies.push({ sno: p.sno, name: p.name, reason: `Unusual Longitude: ${p.lng}` });
  }
});
console.log(`\nCoordinate range discrepancies found: ${coordDiscrepancies.length}`);
if (coordDiscrepancies.length > 0) {
  console.table(coordDiscrepancies);
}

// 3. Duplicate Candidates within the 117 dataset
const exactCoordDupes = [];
for (let i = 0; i < processed.length; i++) {
  for (let j = i + 1; j < processed.length; j++) {
    const a = processed[i];
    const b = processed[j];
    const distBetween = calculateDistance(a.lat, a.lng, b.lat, b.lng);
    if (distBetween < 0.2) { // within 200 meters
      exactCoordDupes.push({
        pair: `${a.sno}: ${a.name} & ${b.sno}: ${b.name}`,
        distKm: distBetween,
        aCoord: `[${a.lat}, ${a.lng}]`,
        bCoord: `[${b.lat}, ${b.lng}]`,
      });
    }
  }
}
console.log(`\nDuplicate / Overlapping coordinate pairs (< 200m) in supplied 117: ${exactCoordDupes.length}`);
if (exactCoordDupes.length > 0) {
  console.table(exactCoordDupes);
}

// 4. Overlap with existing REGIONAL_LOCATIONS dataset (137 records)
const existingOverlaps = [];
processed.forEach((p) => {
  const match = REGIONAL_LOCATIONS.find((reg) => {
    // Check by name or very close coordinate
    const nameMatch = reg.name.toLowerCase().includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(reg.name.toLowerCase());
    const coordDist = calculateDistance(p.lat, p.lng, reg.lat, reg.lng);
    return nameMatch || coordDist < 0.5;
  });
  if (match) {
    existingOverlaps.push({
      suppliedSno: p.sno,
      suppliedName: p.name,
      suppliedCoord: `[${p.lat}, ${p.lng}]`,
      existingName: match.name,
      existingCoord: `[${match.lat}, ${match.lng}]`,
      distanceDiffKm: calculateDistance(p.lat, p.lng, match.lat, match.lng),
    });
  }
});
console.log(`\nMatches/Correlations with existing regionalLocations: ${existingOverlaps.length}`);
console.log("Sample matches:", existingOverlaps.slice(0, 10));

// 5. Section vs Calculated Distance Consistency Check
// Part 1 is labeled "0 to 20 km & nearby"
// Part 2 is labeled "20 से 100 किमी के दायरे के प्रसिद्ध शहर व कस्बे (64 से 78)"
// Part 3 is labeled "उत्तर प्रदेश के सीमावर्ती राज्यों के प्रमुख शहर (79 से 117)"
const sectionDistanceAnomalies = [];
processed.forEach((p) => {
  if (p.sno >= 64 && p.sno <= 78) {
    // Expected ~20 to 100 km
    if (p.calcDist < 20 || p.calcDist > 100) {
      sectionDistanceAnomalies.push({
        sno: p.sno,
        name: p.name,
        section: "Part 2 (20-100 km)",
        calcDistKm: p.calcDist,
        note: p.calcDist < 20 ? "Straight-line < 20km (road distance may be > 20km)" : "Straight-line > 100km",
      });
    }
  }
  if (p.sno <= 63 && p.sno > 1) {
    if (p.calcDist > 30) {
      sectionDistanceAnomalies.push({
        sno: p.sno,
        name: p.name,
        section: "Part 1 (0-20km & nearby)",
        calcDistKm: p.calcDist,
        note: "Straight-line > 30km (e.g., Padrauna/Hata regional anchors)",
      });
    }
  }
});
console.log(`\nSection distance observations/discrepancies: ${sectionDistanceAnomalies.length}`);
console.table(sectionDistanceAnomalies);
