import fs from "fs";
import { RAW_SUPPLIED_RECORDS, FAZILNAGAR_CENTRE, calculateDistance, getCompassDirection, getDistanceBand } from "./processSuppliedLocations.js";

console.log("Analyzing distance discrepancies between supplied distance and Haversine distance from Fazilnagar Centre (26.6827, 84.0498)...");

const report = [];

for (const rec of RAW_SUPPLIED_RECORDS) {
  const calcDist = calculateDistance(
    FAZILNAGAR_CENTRE.lat,
    FAZILNAGAR_CENTRE.lng,
    rec.lat,
    rec.lng
  );
  
  // Extract supplied distance number from raw text if present (e.g. from distanceKm or category or text)
  // In RAW_SUPPLIED_RECORDS, let's see what was recorded
  const suppliedDist = rec.distanceKm !== undefined ? rec.distanceKm : null;
  const diff = suppliedDist !== null ? Math.abs(calcDist - suppliedDist) : 0;
  
  report.push({
    sno: rec.sno,
    name: rec.name,
    lat: rec.lat,
    lng: rec.lng,
    suppliedDist,
    calcDist,
    diff: Math.round(diff * 100) / 100,
  });
}

const mismatches = report.filter(r => r.suppliedDist !== null && r.diff > 0.5);
console.log(`Total records analyzed: ${report.length}`);
console.log(`Mismatches > 0.5 km: ${mismatches.length}`);
mismatches.forEach(m => {
  console.log(`SNO ${m.sno} ${m.name}: supplied=${m.suppliedDist} km, calculated=${m.calcDist} km (diff=${m.diff} km)`);
});
