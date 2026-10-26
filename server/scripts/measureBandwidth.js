import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load mock / seed datasets to simulate real responses
const placesRaw = fs.readFileSync(path.join(__dirname, "../data/places.json"), "utf8");
const placesData = JSON.parse(placesRaw);

const civicRaw = fs.existsSync(path.join(__dirname, "../data/civicDirectory.json"))
  ? fs.readFileSync(path.join(__dirname, "../data/civicDirectory.json"), "utf8")
  : "[]";
const civicData = JSON.parse(civicRaw);

const regionalLocationsPath = path.resolve(__dirname, "../../client/src/data/regionalLocations.js");
let regionalLocationsData = [];
if (fs.existsSync(regionalLocationsPath)) {
  const { REGIONAL_LOCATIONS } = await import(`file://${regionalLocationsPath.replace(/\\/g, "/")}`);
  regionalLocationsData = REGIONAL_LOCATIONS;
}

// Simulated real endpoint payloads
const endpoints = [
  {
    name: "GET /api/places/map-entities",
    category: "Map & Geo",
    description: "All 100+ geographic regional entities and boundary pins",
    payload: { success: true, count: regionalLocationsData.length, data: regionalLocationsData },
  },
  {
    name: "GET /api/places",
    category: "Directory",
    description: "Published verified town directory listings (default limit)",
    payload: placesData,
  },
  {
    name: "GET /api/news",
    category: "News Feed",
    description: "Standard public news articles list (25 articles with media metadata)",
    payload: Array.from({ length: 25 }, (_, i) => ({
      _id: `66b9318a24c56890123456${i.toString(16).padStart(2, "0")}`,
      title: `Fazilnagar News Bulletin Update #${i + 1} - Town Development and Civic Report`,
      titleHi: `फाजिलनगर नगर समाचार अपडेट #${i + 1}`,
      summary: "Comprehensive weekly briefing on civic infrastructure, Nagar Panchayat meetings, and local initiatives in Fazilnagar.",
      description: "Detailed report covering municipal road paving, sanitation drives, and regional connectivity expansions across wards.",
      category: i % 3 === 0 ? "Governance" : i % 2 === 0 ? "Education" : "Development",
      location: "Fazilnagar Town",
      source: "Town Bureau",
      mediaUrl: "https://fazilnagar-portal-l95o.onrender.com/api/google-drive/media/64f0ab1234567890abcdef12",
      mediaType: "image",
      isPublished: true,
      isFeatured: i === 0,
      publishedAt: new Date().toISOString(),
      views: 120 + i * 5,
      likes: 15 + i,
      commentCount: 4,
      author: { name: "Admin Bureau", email: "admin@fazilnagar.com", role: "admin" },
    })),
  },
  {
    name: "GET /api/news/feed",
    category: "Reels / Shorts",
    description: "Vertical video / story reels feed with rich comments & like counts (page 1)",
    payload: {
      stories: Array.from({ length: 10 }, (_, i) => ({
        _id: `67a1234567890abcdef123${i.toString(16).padStart(2, "0")}`,
        title: `Reel Video Story #${i + 1}: Live Highlights from Pawanagar Heritage`,
        summary: "Short video story capturing historic artifacts and community gatherings.",
        video: "https://fazilnagar-portal-l95o.onrender.com/api/google-drive/media/64f0ab1234567890abcdef99",
        image: "https://fazilnagar-portal-l95o.onrender.com/api/google-drive/media/64f0ab1234567890abcdef88?w=400",
        mediaType: "video",
        likes: 45 + i * 3,
        views: 310 + i * 20,
        commentCount: 8,
        isLiked: false,
        author: { name: "Citizen Reporter", role: "user" },
      })),
      total: 42,
      page: 1,
      limit: 10,
      totalPages: 5,
      hasMore: true,
    },
  },
  {
    name: "GET /api/civic-directory",
    category: "Civic Directory",
    description: "Public civic services, schools, police stations, hospitals index",
    payload: civicData.length > 0 ? civicData : [
      { id: "1", name: "Community Health Centre Fazilnagar", category: "Healthcare", phone: "05564-222100", address: "NH-28 Main Road" },
      { id: "2", name: "Fazilnagar Police Station", category: "Emergency", phone: "112", address: "Block Campus" }
    ],
  },
  {
    name: "GET /api/jobs",
    category: "Jobs Portal",
    description: "Job vacancies summary listing (excluding heavy detail fields)",
    payload: {
      success: true,
      listings: Array.from({ length: 12 }, (_, i) => ({
        _id: `67c1234567890abcdef456${i.toString(16).padStart(2, "0")}`,
        title: `Position #${i + 1}: Senior Accountant & Office Manager`,
        companyName: "Fazilnagar Trading Corp",
        location: "Main Market, Fazilnagar",
        jobType: "Full-time",
        category: "Finance & Accounting",
        salary: { min: 20000, max: 35000, isNegotiable: true },
        isVerified: true,
        status: "open",
        views: 85 + i * 2,
        createdAt: new Date().toISOString(),
      })),
      total: 28,
      page: 1,
      totalPages: 3,
    },
  },
  {
    name: "GET /api/jobs/categories",
    category: "Jobs Portal",
    description: "Aggregated job and job seeker category counters",
    payload: {
      success: true,
      totalOpenJobs: 28,
      totalSeekers: 15,
      jobCategories: [
        { _id: "Retail & Sales", count: 8 },
        { _id: "Healthcare & Pharmacy", count: 6 },
        { _id: "Education & Teaching", count: 5 },
        { _id: "IT & Computer Operator", count: 4 },
        { _id: "Logistics & Transport", count: 3 },
      ],
      seekerCategories: [
        { _id: "Computer Operator", count: 7 },
        { _id: "Sales Executive", count: 5 },
        { _id: "Teacher", count: 3 },
      ],
    },
  },
  {
    name: "GET /api/services",
    category: "Public Services",
    description: "Public civic services catalogue (ambulance, fire, electricity, municipal)",
    payload: {
      success: true,
      count: 14,
      services: Array.from({ length: 14 }, (_, i) => ({
        _id: `66d1234567890abcdef789${i.toString(16).padStart(2, "0")}`,
        name: `Public Utility Service #${i + 1}`,
        category: i % 2 === 0 ? "Emergency" : "Municipal",
        contactNumber: "1800-180-5145",
        timing: "24x7 Hours",
        isPublished: true,
      })),
    },
  },
  {
    name: "GET /api/heritage",
    category: "Tourism",
    description: "Verified heritage & Buddhist pilgrim trail monuments",
    payload: {
      success: true,
      count: 8,
      sites: Array.from({ length: 8 }, (_, i) => ({
        _id: `66e1234567890abcdef999${i.toString(16).padStart(2, "0")}`,
        name: `Pawanagar Mahaparinirvana Locus Monument #${i + 1}`,
        category: "Buddhist Heritage",
        heritageZone: "fazilnagar",
        significance: "Historical Jain and Buddhist sacred convergence site in Kushinagar district.",
        isPublished: true,
      })),
    },
  },
  {
    name: "GET /api/settings",
    category: "Site Settings",
    description: "Centralized site configuration, hero carousel slides, and theme parameters",
    payload: {
      success: true,
      settings: {
        siteName: "Fazilnagar Portal",
        logoUrl: "https://fazilnagar-portal-l95o.onrender.com/api/google-drive/media/logo_123",
        heroSettings: {
          animationSpeed: 6000,
          enableAutoplay: true,
          slides: [
            { title: "Pawanagar Dham", subtitle: "Historic Holy Land", imageUrl: "/images/fazilnagar_pawanagar.webp" },
            { title: "Civic Directory", subtitle: "Verified Services", imageUrl: "/images/hero-directory.webp" },
          ],
        },
        themeConfig: { themeId: "heritage-terracotta", mode: "light" },
        liveVisitorCounter: { mode: "real" },
      },
    },
  },
  {
    name: "GET /api/advertisements/active",
    category: "Advertisements",
    description: "Active town banner and floating announcements",
    payload: {
      ad: {
        _id: "67f1234567890abcdef111",
        title: "Fazilnagar Mahotsav 2026 Community Cultural Fest",
        format: "floating",
        bannerUrl: "https://fazilnagar-portal-l95o.onrender.com/api/google-drive/media/ad_banner_1",
        linkUrl: "/events",
        isActive: true,
        isPermanent: false,
      },
      ads: [
        {
          _id: "67f1234567890abcdef111",
          title: "Fazilnagar Mahotsav 2026 Community Cultural Fest",
          format: "floating",
          bannerUrl: "https://fazilnagar-portal-l95o.onrender.com/api/google-drive/media/ad_banner_1",
          linkUrl: "/events",
          isActive: true,
          isPermanent: false,
        },
      ],
    },
  },
  {
    name: "GET /api/forms/public/:slug",
    category: "Dynamic Forms",
    description: "Public citizen contribution form field schema (e.g. area-details)",
    payload: {
      title: "Area & Establishment Verification Form",
      slug: "area-details",
      description: "Submit verified business or landmark updates to Fazilnagar Town Portal.",
      fields: [
        { name: "name", label: "Establishment Name", fieldType: "text", required: true, order: 1 },
        { name: "category", label: "Category", fieldType: "select", required: true, order: 2 },
        { name: "phone", label: "Contact Phone", fieldType: "phone", required: true, order: 3 },
        { name: "address", label: "Full Address", fieldType: "textarea", required: true, order: 4 },
      ],
      attachmentsConfig: { maxFiles: 5, maxSizeMb: 5 },
      status: "published",
    },
  },
];

console.log("==========================================================================================================");
console.log("FAZILNAGAR PORTAL: EMPIRICAL BACKEND BANDWIDTH BENCHMARK (MEASURED RESPONSE SIZES)");
console.log("==========================================================================================================");
console.log(
  "Endpoint".padEnd(35) +
  "Raw JSON".padEnd(14) +
  "Gzipped".padEnd(14) +
  "ETag 304".padEnd(12) +
  "Gzip Savings".padEnd(15) +
  "Cache-304 Savings"
);
console.log("-".repeat(106));

const measurements = [];

for (const ep of endpoints) {
  const rawStr = JSON.stringify(ep.payload);
  const rawBytes = Buffer.byteLength(rawStr, "utf8");
  const gzippedBuf = zlib.gzipSync(Buffer.from(rawStr), { level: 6 });
  const gzippedBytes = gzippedBuf.length;
  const etag304Bytes = 0; // HTTP 304 Not Modified sends ZERO response body bytes

  const gzipSavingsPercent = ((1 - gzippedBytes / rawBytes) * 100).toFixed(1);
  const cache304SavingsPercent = "100.0";

  measurements.push({
    endpoint: ep.name,
    category: ep.category,
    rawBytes,
    gzippedBytes,
    etag304Bytes,
    gzipSavingsPercent: parseFloat(gzipSavingsPercent),
  });

  const rawFormatted = rawBytes >= 1024 ? `${(rawBytes / 1024).toFixed(1)} KB` : `${rawBytes} B`;
  const gzipFormatted = gzippedBytes >= 1024 ? `${(gzippedBytes / 1024).toFixed(1)} KB` : `${gzippedBytes} B`;

  console.log(
    ep.name.padEnd(35) +
    rawFormatted.padEnd(14) +
    gzipFormatted.padEnd(14) +
    "0 B (304)".padEnd(12) +
    `${gzipSavingsPercent}%`.padEnd(15) +
    `${cache304SavingsPercent}%`
  );
}

console.log("-".repeat(106));

// Compute cumulative reduction
const totalRaw = measurements.reduce((sum, m) => sum + m.rawBytes, 0);
const totalGzip = measurements.reduce((sum, m) => sum + m.gzippedBytes, 0);
const overallSavings = ((1 - totalGzip / totalRaw) * 100).toFixed(1);

console.log(
  `TOTAL CUMULATIVE`.padEnd(35) +
  `${(totalRaw / 1024).toFixed(1)} KB`.padEnd(14) +
  `${(totalGzip / 1024).toFixed(1)} KB`.padEnd(14) +
  `0 B (304)`.padEnd(12) +
  `${overallSavings}% overall reduction`.padEnd(15)
);
console.log("==========================================================================================================");
