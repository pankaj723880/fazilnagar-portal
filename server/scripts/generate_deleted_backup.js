import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bakPath = path.join(__dirname, "../data/places.json.bak");
const currentPath = path.join(__dirname, "../data/places.json");

const bak = JSON.parse(fs.readFileSync(bakPath, "utf8"));
const current19 = JSON.parse(fs.readFileSync(currentPath, "utf8"));
const retainedSlugs = new Set(current19.map((p) => p.slug));

const deleted = bak.filter((p) => !retainedSlugs.has(p.slug));
console.log(`Original places count in backup: ${bak.length}`);
console.log(`Retained official places count: ${current19.length}`);
console.log(`Deleted places count: ${deleted.length}`);

const deletedWithMeta = deleted.map((p) => {
  const isPetrol =
    p.category === "Transport & Travel" &&
    (p.name.toLowerCase().includes("petrol") || p.name.toLowerCase().includes("fuel"));
  return {
    ...p,
    deletedAt: "2026-10-14T02:51:50.000Z",
    deletionReason: isPetrol
      ? "Petrol pump excluded and permanently deleted per portal cleanup policy"
      : `Category '${p.category}' excluded per portal cleanup policy (only schools, colleges, and hospitals retained)`,
  };
});

const backupJsonPath = path.join(__dirname, "../data/deleted_places_backup.json");
fs.writeFileSync(backupJsonPath, JSON.stringify(deletedWithMeta, null, 2), "utf8");

const backupCsvPath = path.join(__dirname, "../data/deleted_places_backup.csv");
const csvHeaders = ["id", "slug", "name", "category", "subcategory", "addressFull", "latitude", "longitude", "phone", "deletionReason", "deletedAt"];
const csvRows = [csvHeaders.join(",")];
for (const r of deletedWithMeta) {
  csvRows.push([
    `"${r.id || r._id || ""}"`,
    `"${r.slug || ""}"`,
    `"${(r.name || "").replace(/"/g, '""')}"`,
    `"${r.category || ""}"`,
    `"${r.subcategory || ""}"`,
    `"${(r.addressFull || "").replace(/"/g, '""')}"`,
    r.latitude || "",
    r.longitude || "",
    `"${r.phone || ""}"`,
    `"${(r.deletionReason || "").replace(/"/g, '""')}"`,
    `"${r.deletedAt || ""}"`,
  ].join(","));
}
fs.writeFileSync(backupCsvPath, csvRows.join("\n"), "utf8");

console.log(`Successfully generated deleted places backup:`);
console.log(`  - JSON: ${backupJsonPath} (${deletedWithMeta.length} items)`);
console.log(`  - CSV:  ${backupCsvPath} (${deletedWithMeta.length} items)`);
