import fs from "fs";

// The 35 candidate villages (SNO 27 to 61)
const CANDIDATE_VILLAGES = [
  { sno: 27, name: "Narainpur", hindiName: "नरायनपुर", candidateLat: 26.6940, candidateLng: 84.0580 },
  { sno: 28, name: "Kasturba", hindiName: "कस्तूरबा", candidateLat: 26.6810, candidateLng: 84.0310 },
  { sno: 29, name: "Madhopur", hindiName: "माधोपुर", candidateLat: 26.6610, candidateLng: 84.0490 },
  { sno: 30, name: "Dhanauji Khurd", hindiName: "धनौजी खुर्द", candidateLat: 26.6530, candidateLng: 84.0530 },
  { sno: 31, name: "Dehwa Patti", hindiName: "देहवा पट्टी", candidateLat: 26.7120, candidateLng: 84.0480 },
  { sno: 32, name: "Dahari Patti", hindiName: "दहारी पट्टी", candidateLat: 26.7090, candidateLng: 84.0240 },
  { sno: 33, name: "Rudawalia", hindiName: "रुदावलिया", candidateLat: 26.6850, candidateLng: 84.0880 },
  { sno: 34, name: "Lavkush Purab", hindiName: "लवकुश पूरब पट्टी", candidateLat: 26.7110, candidateLng: 84.0790 },
  { sno: 35, name: "Lavkush Pashchim", hindiName: "लवकुश पश्चिम पट्टी", candidateLat: 26.7130, candidateLng: 84.0720 },
  { sno: 36, name: "Jokwa Khurd", hindiName: "जोकवा खुर्द", candidateLat: 26.6790, candidateLng: 84.0020 },
  { sno: 37, name: "Jokwa Buzurg", hindiName: "जोकवा बुजुर्ग", candidateLat: 26.6820, candidateLng: 83.9960 },
  { sno: 38, name: "Jaura Manrakhan", hindiName: "जौरा मनरखन", candidateLat: 26.6490, candidateLng: 84.0710 },
  { sno: 39, name: "Rahasujanubi", hindiName: "रहसू जनूबी पट्टी", candidateLat: 26.6410, candidateLng: 84.0780 },
  { sno: 40, name: "Dhundhwalia", hindiName: "धुंधवालिया", candidateLat: 26.6290, candidateLng: 84.0520 },
  { sno: 41, name: "Bhathahi Buzurg", hindiName: "भठही बुजुर्ग", candidateLat: 26.7290, candidateLng: 84.0890 },
  { sno: 42, name: "Bhathahi Khurd", hindiName: "भठही खुर्द", candidateLat: 26.7320, candidateLng: 84.0950 },
  { sno: 43, name: "Kanaura", hindiName: "कनौरा", candidateLat: 26.6410, candidateLng: 84.0090 },
  { sno: 44, name: "Baliawa", hindiName: "बलियावा", candidateLat: 26.7410, candidateLng: 84.0390 },
  { sno: 45, name: "Bhathawa", hindiName: "भठावा", candidateLat: 26.7280, candidateLng: 84.0040 },
  { sno: 46, name: "Belwa Khurd", hindiName: "बेलवा खुर्द", candidateLat: 26.6810, candidateLng: 84.1190 },
  { sno: 47, name: "Belwa Kalan", hindiName: "बेलवा कलां", candidateLat: 26.6780, candidateLng: 84.1250 },
  { sno: 48, name: "Amwa Sri Dubey", hindiName: "अमवा श्री दुबे", candidateLat: 26.7480, candidateLng: 84.0450 },
  { sno: 49, name: "Avarwa Safiganja", hindiName: "अवरवा सफीगंजा", candidateLat: 26.6120, candidateLng: 84.0490 },
  { sno: 50, name: "Koilaswa Buzurg", hindiName: "कोइलसवा बुजुर्ग", candidateLat: 26.7550, candidateLng: 84.0520 },
  { sno: 51, name: "Bankata Bazar", hindiName: "बनकटा बाजार", candidateLat: 26.6280, candidateLng: 84.1180 },
  { sno: 52, name: "Barahara", hindiName: "बरहरा", candidateLat: 26.6050, candidateLng: 84.0620 },
  { sno: 53, name: "Loharwalia", hindiName: "लोहरवलिया", candidateLat: 26.7390, candidateLng: 83.9850 },
  { sno: 54, name: "Gurwalia", hindiName: "गुरवलिया", candidateLat: 26.7610, candidateLng: 84.0410 },
  { sno: 55, name: "Nakataha Mishra", hindiName: "नकटाहा मिश्र", candidateLat: 26.7490, candidateLng: 84.1080 },
  { sno: 56, name: "Chainpur", hindiName: "चैनपुर", candidateLat: 26.6210, candidateLng: 83.9920 },
  { sno: 57, name: "Laxmipur Misra", hindiName: "लक्ष्मीपुर मिश्रा", candidateLat: 26.7520, candidateLng: 84.0950 },
  { sno: 58, name: "Sumahi Buzurg", hindiName: "सुमाही बुजुर्ग", candidateLat: 26.7480, candidateLng: 83.9780 },
  { sno: 59, name: "Chaura Ram", hindiName: "चौरा राम तवक्कलशाही", candidateLat: 26.6750, candidateLng: 83.9520 },
  { sno: 60, name: "Khairatia", hindiName: "खैरटिया", candidateLat: 26.5920, candidateLng: 84.0480 },
  { sno: 61, name: "Sohang", hindiName: "सोहंग", candidateLat: 26.6080, candidateLng: 83.9850 },
];

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function searchNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&countrycodes=in&viewbox=83.85,26.85,84.25,26.50&bounded=0`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "FazilnagarPortalVerification/1.0 (contact: info@fazilnagar.in)"
      }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

async function verifyAll() {
  const results = [];
  console.log(`Starting OSM verification for ${CANDIDATE_VILLAGES.length} candidate villages...`);

  for (let i = 0; i < CANDIDATE_VILLAGES.length; i++) {
    const v = CANDIDATE_VILLAGES[i];
    await sleep(1050); // respect Nominatim 1 req/sec policy

    // Try searches:
    // 1. "<Name>, Kushinagar"
    // 2. "<Name>, Fazilnagar"
    // 3. "<HindiName>, कुशीनगर"
    let hits = await searchNominatim(`${v.name}, Kushinagar`);
    if (!hits.length && v.name !== "Fazilnagar") {
      await sleep(1050);
      hits = await searchNominatim(`${v.name}, Fazilnagar`);
    }
    if (!hits.length && v.hindiName) {
      await sleep(1050);
      hits = await searchNominatim(`${v.hindiName}, कुशीनगर`);
    }

    // Filter hits that are in Kushinagar / Fazilnagar bounds (26.50 to 26.85 N, 83.85 to 84.25 E)
    const validHits = hits.filter(h => {
      const lat = parseFloat(h.lat);
      const lon = parseFloat(h.lon);
      return lat >= 26.45 && lat <= 26.90 && lon >= 83.80 && lon <= 84.30;
    });

    if (validHits.length > 0) {
      // Pick best hit closest to candidate or matching village
      let best = validHits[0];
      let minDist = calculateDistance(v.candidateLat, v.candidateLng, parseFloat(best.lat), parseFloat(best.lon));

      for (const h of validHits) {
        const d = calculateDistance(v.candidateLat, v.candidateLng, parseFloat(h.lat), parseFloat(h.lon));
        if (d < minDist) {
          minDist = d;
          best = h;
        }
      }

      const verifiedLat = parseFloat(best.lat);
      const verifiedLng = parseFloat(best.lon);

      results.push({
        sno: v.sno,
        name: v.name,
        hindiName: v.hindiName,
        sourceLatitude: v.candidateLat,
        sourceLongitude: v.candidateLng,
        verifiedLatitude: verifiedLat,
        verifiedLongitude: verifiedLng,
        discrepancyKm: minDist,
        osmType: best.type,
        osmId: best.osm_id,
        osmDisplayName: best.display_name,
        verificationStatus: "verified",
        coordinateSource: `OpenStreetMap (OSM ${best.osm_type || "node"}/${best.osm_id})`,
      });
      console.log(`[${i+1}/${CANDIDATE_VILLAGES.length}] SNO ${v.sno} ${v.name}: VERIFIED via OSM (${verifiedLat}, ${verifiedLng}), dist from candidate: ${minDist}km`);
    } else {
      results.push({
        sno: v.sno,
        name: v.name,
        hindiName: v.hindiName,
        sourceLatitude: v.candidateLat,
        sourceLongitude: v.candidateLng,
        verifiedLatitude: v.candidateLat,
        verifiedLongitude: v.candidateLng,
        discrepancyKm: 0,
        osmType: null,
        osmId: null,
        osmDisplayName: null,
        verificationStatus: "needs_verification",
        coordinateSource: "Supplied Candidate Record (Unverified in OSM)",
      });
      console.log(`[${i+1}/${CANDIDATE_VILLAGES.length}] SNO ${v.sno} ${v.name}: NEEDS_VERIFICATION (no confident OSM settlement match)`);
    }
  }

  fs.writeFileSync("client/scripts/osm_verification_results.json", JSON.stringify(results, null, 2));
  console.log("Verification finished. Saved client/scripts/osm_verification_results.json.");
}

verifyAll().catch(console.error);
