/**
 * Dynamic CMS Client Service for Fazilnagar Portal
 * Fetches dynamic website content, hero slides, settings, public services, events, and heritage sites with graceful caching and offline fallbacks.
 */
import API from "../api";
import seedPlaces from "../data/places.json";

const CACHE_TTL_MS = 60 * 1000; // 60 seconds in-memory cache to eliminate duplicate network calls on refreshes while supporting instant live updates

const inFlightRequests = new Map();

function fetchWithDeduplication(key, fetcher) {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }
  const promise = fetcher().finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
}

let liveBroadcastChannel = null;
try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    liveBroadcastChannel = new BroadcastChannel("fazilnagar_cms_live_channel");
    liveBroadcastChannel.onmessage = (event) => {
      if (event.data?.type === "CMS_UPDATE") {
        clearCMSCache(event.data.key, false);
        window.dispatchEvent(new CustomEvent("cms-cache-cleared", { detail: event.data }));
      }
    };
  }
} catch (_) {}

function getPersistentCache(key) {
  try {
    const raw = localStorage.getItem(`fazilnagar_cms_${key}`);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

function setPersistentCache(key, data) {
  try {
    localStorage.setItem(`fazilnagar_cms_${key}`, JSON.stringify(data));
  } catch (_) {}
}

export function getCachedSettings() {
  return getPersistentCache("settings") || memoryCache.settings.data;
}

export function getCachedHeritage() {
  return getPersistentCache("heritage") || memoryCache.heritage.data;
}

export function getCachedEvents() {
  return getPersistentCache("events") || memoryCache.events.data;
}

export function getCachedCivicDirectory() {
  return getPersistentCache("civicDirectory") || memoryCache.civicDirectory?.data || null;
}

const memoryCache = {
  settings: { data: getPersistentCache("settings"), timestamp: Date.now() },
  services: { data: null, timestamp: 0 },
  events: { data: getPersistentCache("events"), timestamp: Date.now() },
  heritage: { data: getPersistentCache("heritage"), timestamp: Date.now() },
  civicDirectory: { data: getPersistentCache("civicDirectory"), timestamp: Date.now() },
};

export const DEFAULT_HERO_SLIDES = [
  {
    _id: "default-slide-1",
    title: "Official Civic & Digital Directory",
    subtitle: "Fazilnagar Nagar Panchayat, Kushinagar",
    caption: "Find verified schools, colleges, healthcare centres, public services, and live community news in Fazilnagar.",
    imageUrl: "/images/fazilnagar_pawanagar.webp",
    linkUrl: "/directory",
    buttonText: "Browse Town Directory",
    isActive: true,
  },
  {
    _id: "default-slide-2",
    title: "Healthcare & 24/7 Emergency Medical Aid",
    subtitle: "Community Health Centre & Verified Clinics",
    caption: "Access Community Health Centre (CHC) Fazilnagar, 24x7 ambulance contacts, and verified medical stores.",
    imageUrl: "/images/kushinagar_mahaparinirvana.webp",
    linkUrl: "/emergency",
    buttonText: "Emergency Healthcare Hub",
    isActive: true,
  },
  {
    _id: "default-slide-3",
    title: "Sacred Twin Heritage of Fazilnagar & Kushinagar",
    subtitle: "Historic Pawapuri Dham & Ancient Pilgrimage Trail",
    caption: "Explore the sacred historical convergence of Bhagwan Mahavira's nirvana land and Buddha's Mahaparinirvana trail.",
    imageUrl: "/images/fazilnagar_kakodha.webp",
    linkUrl: "/tourism",
    buttonText: "Explore Twin Heritage",
    isActive: true,
  },
];

export const DEFAULT_SITE_SETTINGS = {
  siteName: "Fazilnagar Town Civic & Local Directory Portal (Unofficial, Community-Run)",
  shortName: "Fazilnagar Portal",
  tagline: "Independent Civic & Local Directory • Kushinagar, Uttar Pradesh",
  taglineHindi: "स्वतंत्र नागरिक एवं स्थानीय निर्देशिका • कुशीनगर, उत्तर प्रदेश",
  logoUrl: "/icon-192.svg",
  announcement: {
    enabled: true,
    text: "Welcome to Fazilnagar Town Portal — Unofficial, Community-Run Civic Directory & Local Guide",
    link: "/directory",
    bgColor: "#0D5E49",
    textColor: "#FFFFFF",
  },
  contact: {
    officialPhone: "+91 5564 222102",
    emergencyPhone: "112 / 108",
    chcPhone: "+91 94520 89540",
    email: "contact@fazilnagar.me",
    officeAddress: "Fazilnagar Town, Kushinagar - 274401 (Community Desk)",
    workingHours: "10:00 AM – 05:00 PM (Mon-Sat)",
  },
  socialLinks: {
    facebook: "",
    twitter: "",
    instagram: "",
    youtube: "",
    whatsappGroup: "",
  },
  seo: {
    metaTitle: "Fazilnagar Town Portal | Civic Directory & Local Guide (Unofficial)",
    metaDescription: "Unofficial, community-operated civic and local directory portal for Fazilnagar town (PIN 274401, Kushinagar, UP). Verified schools, hospitals, emergency aid, local news, and community directory.",
    ogImageUrl: "https://www.fazilnagar.me/og-image.jpg",
  },
  heroSettings: {
    animationSpeed: 5000,
    animationDirection: "left",
    enableAutoplay: true,
    slides: DEFAULT_HERO_SLIDES,
  },
  stats: [
    { id: "stat-schools", label: "Schools & Colleges", value: "9+", subtext: "Verified Institutions", icon: "GraduationCap", isActive: true },
    { id: "stat-hospitals", label: "Hospitals & Clinics", value: "10+", subtext: "24/7 Healthcare Facilities", icon: "Stethoscope", isActive: true },
    { id: "stat-places", label: "Mapped Civic Places", value: "19", subtext: "Canonical Ground Truth", icon: "MapPin", isActive: true },
    { id: "stat-wards", label: "Selectable Wards & Areas", value: "26", subtext: "Municipal Boundary Scope", icon: "Landmark", isActive: true },
  ],
  sections: {
    announcementBanner: true,
    heroCarousel: true,
    statsCounters: true,
    quickCategories: true,
    interactiveMap: true,
    featuredDirectory: true,
    heritageSpotlight: true,
    emergencyStrip: true,
    latestNews: true,
    citizenCorner: true,
    publicServices: true,
    advertisements: true,
  },
  footer: {
    copyrightText: "© 2026 Fazilnagar Town Portal. Dedicated to the residents and visitors of Fazilnagar, Kushinagar, UP.",
    disclaimer: "All institutional locations verified by municipal mapping coordinates. Independent civic public resource.",
  },
  topAlertBar: {
    enabled: true,
    badgeText: "LIVE CIVIC",
    text: "Fazilnagar Town Official Civic & Local Directory Portal (PIN 274401)",
    helplineLabel: "📞 Helpline",
    helplineNumber: "112",
  },
  navigation: {
    brandFirst: "FAZIL",
    brandSecond: "NAGAR",
    tagline: "Your Town. Your Community.",
    actionButtonText: "+ Add Story",
    actionButtonLink: "/create-news",
    navItems: [
      { id: "home", label: "Home", path: "/", badge: "", isExternal: false, isActive: true, displayOrder: 1 },
      { id: "explore", label: "Explore", path: "/#explore-categories", badge: "", isExternal: false, isActive: true, displayOrder: 2 },
      { id: "directory", label: "Directory", path: "/directory", badge: String(seedPlaces?.length || 19), isExternal: false, isActive: true, displayOrder: 3 },
      { id: "map", label: "Map", path: "/#regional-connectivity-section", badge: "", isExternal: false, isActive: true, displayOrder: 4 },
      { id: "news", label: "Local Updates", path: "/news", badge: "", isExternal: false, isActive: true, displayOrder: 5 },
    ],
  },
  heroContent: {
    badgeLocation: "Kushinagar",
    badgeText: "Community Civic Portal",
    badgeSubtext: "Community Directory • Fazilnagar, Kushinagar (PIN 274401)",
    heading: "",
    subheadingHindi: "",
    description: "Unofficial, community-operated digital civic portal for Fazilnagar town. Verified schools, colleges, hospitals, emergency aid, local news, and community directory in Kushinagar, UP.",
    searchPlaceholder: "Search schools, hospitals, medical stores, sweet shops…",
    searchButtonText: "Search",
    trustBadges: [
      { id: "tb-1", label: "Strictly Inside Town Limits", icon: "ShieldCheck", isActive: true },
      { id: "tb-2", label: "Exact Ground Coordinates", icon: "Navigation", isActive: true },
      { id: "tb-3", label: "Ancient Pawanagar Heritage", icon: "Landmark", isActive: true },
    ],
    actionButtons: [
      { id: "btn-explore", label: "Explore Town", icon: "Compass", target: "explore-categories", isLink: false, variant: "primary", isActive: true, displayOrder: 1 },
      { id: "btn-events", label: "Events & Melas", icon: "Calendar", target: "events-melas-section", isLink: false, variant: "secondary", isActive: true, displayOrder: 2 },
      { id: "btn-heritage", label: "Twin Heritage", icon: "Landmark", target: "about-fazilnagar-section", isLink: false, variant: "accent", isActive: true, displayOrder: 3 },
      { id: "btn-map", label: "Map", icon: "Map", target: "regional-connectivity-section", isLink: false, variant: "ghost", isActive: true, displayOrder: 4 },
      { id: "btn-add", label: "+ Add Place", icon: "PlusCircle", target: "/directory?add=true", isLink: true, variant: "emerald", isActive: true, displayOrder: 5 },
    ],
  },
  homepageSections: {
    explore: {
      badge: "Civic Directory Index",
      title: "Explore Fazilnagar",
      subtitle: "Verified institutions across schools, colleges, hospitals, and fuel stations.",
      buttonText: "Open Full Directory",
      buttonLink: "/directory",
    },
    publicServices: {
      badge: "Public Welfare & Emergency",
      title: "Essential Public Services",
      subtitle: "Emergency numbers, primary healthcare, pharmacy points, and administrative offices in Fazilnagar.",
      cards: [
        {
          id: "service-chc",
          badge: "24/7 Healthcare",
          title: "Community Health Centre (CHC)",
          address: "Hospital Road, Fazilnagar - 274401",
          description: "Emergency ward, routine maternal delivery, vaccination and ambulance hub.",
          phone: "05564-222102",
          actionType: "directions",
          actionLabel: "Directions",
          isActive: true,
          displayOrder: 1,
        },
        {
          id: "service-police",
          badge: "Law & Order",
          title: "Fazilnagar Police Chowki",
          address: "NH-27 Highway Chowk, Fazilnagar",
          description: "Emergency police assistance under Pataherwa PS jurisdiction.",
          phone: "112",
          actionType: "directions",
          actionLabel: "Directions",
          isActive: true,
          displayOrder: 2,
        },
        {
          id: "service-post",
          badge: "Postal Services",
          title: "Fazilnagar Sub Post Office",
          address: "Block Road, Fazilnagar (PIN 274401)",
          description: "Speed Post, postal parcels, savings schemes, and Aadhaar-enabled payments.",
          phone: "05564-222120",
          statusLabel: "09:00–17:00",
          isActive: true,
          displayOrder: 3,
        },
        {
          id: "service-power",
          badge: "Power Utility",
          title: "UPPCL 33/11kV Substation",
          address: "Block Road Perimeter, Fazilnagar",
          description: "Electricity distribution control, billing queries, and transformer outages.",
          phone: "1912",
          statusLabel: "24x7 Control",
          isActive: true,
          displayOrder: 4,
        },
      ],
    },
    map: {
      badge: "Geospatial Verification",
      title: "Explore Fazilnagar on Map",
      subtitle: "Every pin uses exact decimal coordinates along the NH-27, College Road, and Hospital Road axis.",
      coordinatesText: "26.6827° N, 84.0498° E",
    },
    events: {
      badge: "Town Fairs, Melas & Cultural Celebrations",
      title: "Upcoming Events & Town Melas",
      subtitle: "Experience the vibrant community life of Fazilnagar — from the sacred Pawapuri Nirvana Mela to civic festivals, devotional aartis, and annual town gatherings.",
      ctaText: "+ Submit Event / Mela",
    },
    heritage: {
      badge: "Town Profile, Antiquity & Sacred Heritage",
      title: "Fazilnagar & Kushinagar: The Sacred Twin Heritage",
      subtitle: "Explore the deep 2,600-year-old antiquity, sacred spiritual milestones of Bhagwan Mahavira and Lord Buddha, and modern civic significance of the two historic capitals of the ancient Malla Republic.",
      tab1Label: "🏛️ Fazilnagar (Pawanagar)",
      tab2Label: "☸️ Kushinagar (Mahaparinirvana)",
      tab3Label: "✨ The Twin Sacred Bond",
    },
  },
};

function deepMerge(target, source) {
  if (!source) return target;
  const output = { ...target };
  Object.keys(source).forEach((key) => {
    if (source[key] !== null && typeof source[key] === "object" && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else if (source[key] !== undefined) {
      output[key] = source[key];
    }
  });
  return output;
}

/**
 * Fetches centralized site settings with fallback and memory cache.
 */
export async function getSiteSettings(forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && memoryCache.settings.data && now - memoryCache.settings.timestamp < CACHE_TTL_MS) {
    return memoryCache.settings.data;
  }

  return fetchWithDeduplication("settings", async () => {
    try {
      const res = await API.get("/settings", {
        params: forceFresh ? { _t: Date.now() } : undefined,
        headers: forceFresh ? { "Cache-Control": "no-cache", Pragma: "no-cache" } : undefined,
        timeout: 30000,
      });
      if (res.data?.success && res.data?.settings) {
        const merged = deepMerge(DEFAULT_SITE_SETTINGS, res.data.settings);
        setPersistentCache("settings", merged);
        memoryCache.settings = { data: merged, timestamp: Date.now() };
        return merged;
      }
    } catch (err) {
      console.warn("[CMSService] Settings fetch fallback:", err.message);
    }

    return memoryCache.settings.data || getPersistentCache("settings") || DEFAULT_SITE_SETTINGS;
  });
}

/**
 * Fetches dynamic public services with category and search filtering.
 */
export async function getPublicServices({ category = "All", search = "" } = {}) {
  try {
    const params = {};
    if (category && category !== "All") params.category = category;
    if (search) params.search = search;

    const res = await API.get("/services", { params, timeout: 30000 });
    if (res.data?.success && Array.isArray(res.data?.services)) {
      return res.data.services;
    }
  } catch (err) {
    console.warn("[CMSService] Services fetch error:", err.message);
  }
  return [];
}

export const DEFAULT_HERITAGE_SITES = [
  {
    _id: "default-heritage-1",
    name: "Pawapuri Jain Tirth Kshetra (पावापुरी तीर्थ)",
    nameHindi: "श्री दिगंबर एवं श्वेतांबर पावापुरी जैन मंदिर",
    slug: "pawapuri-jain-tirth-fazilnagar",
    category: "Jain Heritage",
    heritageZone: "fazilnagar",
    historicalSignificance: "Sacred Nirvana Sthal of 24th Tirthankar Bhagwan Mahavira according to archaeological and Jain scriptural tradition (ancient Pawa).",
    narrative: "Fazilnagar is historically identified with ancient Pawa (Pawanagar), where Bhagwan Mahavira delivered his final divine discourse (Sarvodaya Upadesh) and attained Moksha (Nirvana) in 527 BCE. The sprawling tirth complex features exquisite marble architectures, peaceful meditation courtyards, dharamshala for pilgrims, and historic idol shrines.",
    distanceFromFazilnagarCenter: "0 km (Town Center, NH-27 Corridor)",
    locationAddress: "Pawapuri Mandir Campus, Fazilnagar - 274401",
    latitude: 26.6827,
    longitude: 84.0498,
    visitingHours: "05:30 AM – 08:30 PM",
    entryFee: "Free Admission for all pilgrims and visitors",
    primaryImage: "/images/fazilnagar_pawanagar.webp",
    isTwinHeritageHighlight: true,
    isPublished: true,
  },
  {
    _id: "default-heritage-2",
    name: "Historic Kakodha Ghat & Brick Archaeological Remains",
    nameHindi: "काकोधा घाट एवं प्राचीन कुकुत्था नदी अवशेष",
    slug: "kakodha-ghat-fazilnagar",
    category: "Historical Monument",
    heritageZone: "fazilnagar",
    historicalSignificance: "The revered river where Lord Buddha bathed and drank water on his holy journey from Pawa towards Kushinagar.",
    narrative: "Ancient Kukuttha river ghat where Gautam Buddha stopped to bathe and drink cool water before proceeding on his final journey to Kushinagar. Archaeological excavations unearthed brick structures and terracotta remains.",
    distanceFromFazilnagarCenter: "2 km (Town Environs)",
    locationAddress: "Kakodha Ghat, Fazilnagar, Kushinagar",
    latitude: 26.6912,
    longitude: 84.0534,
    visitingHours: "Open Daylight Hours",
    entryFee: "Free Admission",
    primaryImage: "/images/fazilnagar_kakodha.webp",
    isTwinHeritageHighlight: true,
    isPublished: true,
  },
  {
    _id: "default-heritage-3",
    name: "Ancient Sathiaon Chetiya Mound & Archaeological Environs",
    nameHindi: "साथियावँ प्राचीन स्तूप टीला एवं पुरातात्विक क्षेत्र",
    slug: "sathiaon-ancient-mound",
    category: "Historical Monument",
    heritageZone: "fazilnagar",
    historicalSignificance: "Ancient Malla era habitation mound with historical terracottas and ring-wells linking early republican history of eastern UP.",
    narrative: "Located directly in the immediate vicinity of Fazilnagar, Sathiaon possesses ancient archaeological mounds dating back to the NBPW and Kushan periods. Renowned historians associate it with Buddhist and Jain monastic settlements contemporary with Kushinagar's Malla republic.",
    distanceFromFazilnagarCenter: "2.5 km North-East",
    locationAddress: "Sathiaon Archaeological Sector, Fazilnagar, Kushinagar",
    latitude: 26.695,
    longitude: 84.062,
    visitingHours: "Open during daylight hours",
    entryFee: "Free Admission",
    primaryImage: "https://images.unsplash.com/photo-1590077428593-a55bb07c4665?auto=format&fit=crop&w=1200&q=80",
    isTwinHeritageHighlight: true,
    isPublished: true,
  },
  {
    _id: "default-heritage-4",
    name: "Mahaparinirvana Temple & Nirvana Stupa (Kushinagar Twin Axis)",
    nameHindi: "महापरिनिर्वाण मंदिर एवं स्तूप (कुशीनगर)",
    slug: "mahaparinirvana-kushinagar",
    category: "Buddhist Heritage",
    heritageZone: "kushinagar",
    historicalSignificance: "The sacred sanctuary commemorating where Lord Gautam Buddha attained Mahaparinirvana in 483 BCE under the twin Sal trees.",
    narrative: "Fazilnagar and Kushinagar form a sacred twin heritage circuit separated by merely 18 km along the Buddhist corridor. Ancient records state that Lord Buddha partook his last meal at Pawa before walking to the Sal grove of Kushinagar to attain Mahaparinirvana.",
    distanceFromFazilnagarCenter: "18 km West (Direct Highway Corridor)",
    locationAddress: "Archaeological Park, Kushinagar - 274403",
    latitude: 26.7402,
    longitude: 83.8887,
    visitingHours: "06:00 AM – 06:00 PM",
    entryFee: "ASI Prescribed Entry (Rs. 25 Indian / Rs. 300 Foreign)",
    primaryImage: "/images/kushinagar_mahaparinirvana.webp",
    isTwinHeritageHighlight: true,
    isPublished: true,
  },
  {
    _id: "default-heritage-5",
    name: "Ancient Ramabhar Stupa — Holy Cremation Mound",
    nameHindi: "रामाभार स्तूप (मुकुटबंधन चैत्य)",
    slug: "ramabhar-stupa-kushinagar",
    category: "Buddhist Heritage",
    heritageZone: "kushinagar",
    historicalSignificance: "A majestic 49-foot brick dome marking the exact site where the mortal remains of Buddha were cremated with supreme reverence by the Mallas.",
    narrative: "Located 1.5 km east of the Mahaparinirvana temple, Ramabhar marks the site of the holy cremation of Lord Buddha (Mukutbandhana Chaitya).",
    distanceFromFazilnagarCenter: "19 km West",
    locationAddress: "Ramabhar, Kushinagar - 274403",
    latitude: 26.735,
    longitude: 83.902,
    visitingHours: "06:00 AM – 06:00 PM",
    entryFee: "Free Admission",
    primaryImage: "/images/kushinagar_ramabhar.webp",
    isTwinHeritageHighlight: true,
    isPublished: true,
  },
];

export const DEFAULT_EVENTS = [
  {
    _id: "default-event-1",
    title: "Pawapuri Mahavira Nirvana Mahotsav & Annual Mela",
    titleHindi: "पावापुरी महावीर निर्वाण महोत्सव एवं वार्षिक मेला",
    category: "Mela & Fair",
    summary: "Annual religious fair and commemorative festival celebrating the sacred Jain tirthankar heritage of ancient Pawa.",
    description: "Devotees from across India assemble at the sacred Pawapuri Digambar & Shwetambar Jain Mandir complex in Fazilnagar to celebrate Diwali Nirvana Mahotsav with prabhat pheri, laddu offering, and cultural assemblies.",
    venue: "Pawapuri Jain Tirth Complex, Fazilnagar",
    address: "Pawapuri Dham, Main Road, Fazilnagar, Kushinagar",
    latitude: 26.6827,
    longitude: 84.0498,
    startDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString(),
    timeString: "06:00 AM – 10:00 PM Daily",
    organizer: "Shri Digambar Jain Teerth Kshetra Committee, Pawapuri (Fazilnagar)",
    organizerContact: "+91 94520 89540",
    bannerImage: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80",
    isFeatured: true,
    status: "published",
    isPublished: true,
  },
  {
    _id: "default-event-2",
    title: "Shri Ram Navami Mahotsav & Grand Maha Aarti",
    titleHindi: "श्री राम जन्मोत्सव एवं नगर महाआरती",
    category: "Aarti & Puja",
    summary: "Traditional civic Maha Aarti and procession through the main market corridor of Fazilnagar.",
    description: "Civic celebration with collective Vedic chanting, deepotsav, and traditional devotional songs at the town square temple followed by prasadam distribution for all residents and visitors.",
    venue: "Shiv Mandir & Market Square, Fazilnagar",
    address: "Fazilnagar Crossing, Main Road Corridor",
    latitude: 26.6815,
    longitude: 84.0482,
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    timeString: "06:30 PM Onwards",
    organizer: "Fazilnagar Dharmik Seva Samiti",
    organizerContact: "+91 5564 222102",
    bannerImage: "https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?auto=format&fit=crop&w=1200&q=80",
    isFeatured: true,
    status: "published",
    isPublished: true,
  },
];

/**
 * Invalidates the in-memory cache and broadcasts an immediate update event.
 */
export function clearCMSCache(key, broadcast = true) {
  if (key && memoryCache[key]) {
    memoryCache[key] = { data: null, timestamp: 0 };
    try {
      localStorage.removeItem(`fazilnagar_cms_${key}`);
    } catch (_) {}
  } else if (!key) {
    Object.keys(memoryCache).forEach((k) => {
      memoryCache[k] = { data: null, timestamp: 0 };
      try {
        localStorage.removeItem(`fazilnagar_cms_${k}`);
      } catch (_) {}
    });
  }

  try {
    const stamp = Date.now().toString();
    localStorage.setItem("fazilnagar_cms_cache_bust", stamp);
    window.dispatchEvent(new CustomEvent("cms-cache-cleared", { detail: { key, stamp } }));
    if (broadcast && liveBroadcastChannel) {
      liveBroadcastChannel.postMessage({ type: "CMS_UPDATE", key, stamp });
    }
  } catch (_) {}
}

/**
 * Subscribes to live CMS changes across all devices and tabs without page reload.
 * Combines BroadcastChannel (instant same-browser), storage event, visibility revalidation,
 * and background heartbeat polling to /settings/live-version.
 * Returns an unsubscribe cleanup function.
 */
// Shared singleton state for live updates across all subscribers
const liveSubscribers = new Set();
let livePollingInterval = null;
let lastKnownVersion = null;
let isLiveListening = false;

function setupLiveListeners() {
  if (isLiveListening || typeof window === "undefined") return;
  isLiveListening = true;

  const triggerAll = (info) => {
    clearCMSCache(undefined, false);
    liveSubscribers.forEach((cb) => {
      try {
        cb(info);
      } catch (err) {
        console.warn("[LiveSync] Callback error:", err);
      }
    });
  };

  const handleLocalEvent = (e) => triggerAll({ source: "local", detail: e.detail });
  const handleStorageEvent = (e) => {
    if (e.key === "fazilnagar_cms_cache_bust") {
      triggerAll({ source: "storage", stamp: e.newValue });
    }
  };
  const handleVisibility = () => {
    if (document.visibilityState === "visible") {
      checkLiveServerVersion();
    }
  };

  window.addEventListener("cms-cache-cleared", handleLocalEvent);
  window.addEventListener("storage", handleStorageEvent);
  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("focus", handleVisibility);

  // Background version check every 15s instead of aggressive per-component interval
  livePollingInterval = setInterval(checkLiveServerVersion, 15000);
}

async function checkLiveServerVersion() {
  if (liveSubscribers.size === 0) return;
  try {
    const res = await API.get("/settings/live-version", {
      params: { _t: Date.now() },
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      timeout: 8000,
    });
    if (res.data?.success && res.data?.updatedAt) {
      const serverVersion = res.data.updatedAt;
      if (lastKnownVersion && lastKnownVersion !== serverVersion) {
        clearCMSCache(undefined, false);
        liveSubscribers.forEach((cb) => {
          try {
            cb({ source: "poll", version: serverVersion });
          } catch (_) {}
        });
      }
      lastKnownVersion = serverVersion;
    }
  } catch (_) {}
}

/**
 * Subscribes to live CMS changes across all devices and tabs without page reload.
 * Uses a single shared listener and interval across all mounted components.
 */
export function subscribeToCMSLiveUpdates(callback) {
  if (typeof window === "undefined" || typeof callback !== "function") {
    return () => {};
  }

  liveSubscribers.add(callback);
  setupLiveListeners();

  return () => {
    liveSubscribers.delete(callback);
    if (liveSubscribers.size === 0 && livePollingInterval) {
      clearInterval(livePollingInterval);
      livePollingInterval = null;
      isLiveListening = false;
    }
  };
}

/**
 * Fetches dynamic community events and religious notices with cache-busting.
 */
export async function getEvents({ category = "All", search = "", timeFilter = "" } = {}, forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && memoryCache.events.data && now - memoryCache.events.timestamp < CACHE_TTL_MS) {
    return memoryCache.events.data;
  }

  const cacheKey = `events_${category}_${search}_${timeFilter}`;
  return fetchWithDeduplication(cacheKey, async () => {
    try {
      const params = {};
      if (forceFresh) params._t = Date.now();
      if (category && category !== "All") params.category = category;
      if (search) params.search = search;
      if (timeFilter) params.timeFilter = timeFilter;

      const res = await API.get("/events", {
        params,
        headers: forceFresh ? { "Cache-Control": "no-cache", Pragma: "no-cache" } : undefined,
        timeout: 30000,
      });
      if (res.data?.success && Array.isArray(res.data?.events)) {
        setPersistentCache("events", res.data.events);
        memoryCache.events = { data: res.data.events, timestamp: Date.now() };
        return res.data.events;
      }
    } catch (err) {
      console.warn("[CMSService] Events fetch error, using fallbacks:", err.message);
    }
    return memoryCache.events.data || getPersistentCache("events") || [];
  });
}

/**
 * Fetches sacred twin heritage destinations with cache-busting and graceful fallback.
 */
export async function getHeritageSites(forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && memoryCache.heritage.data && now - memoryCache.heritage.timestamp < CACHE_TTL_MS) {
    return memoryCache.heritage.data;
  }

  return fetchWithDeduplication("heritage", async () => {
    try {
      const res = await API.get("/heritage", {
        params: forceFresh ? { _t: Date.now() } : undefined,
        headers: forceFresh ? { "Cache-Control": "no-cache", Pragma: "no-cache" } : undefined,
        timeout: 30000,
      });
      if (res.data?.success && Array.isArray(res.data?.sites)) {
        setPersistentCache("heritage", res.data.sites);
        memoryCache.heritage = { data: res.data.sites, timestamp: Date.now() };
        return res.data.sites;
      }
    } catch (err) {
      console.warn("[CMSService] Heritage fetch error, using fallbacks:", err.message);
    }
    return memoryCache.heritage.data || getPersistentCache("heritage") || [];
  });
}

export const DEFAULT_CIVIC_DIRECTORY_PLACES = [
  {
    id: "chc-fazilnagar",
    itemId: "chc-fazilnagar",
    title: "CHC Fazilnagar",
    subtitle: "Hospital Road",
    category: "healthcare",
    categoryLabel: "🏥 Healthcare",
    phone: "05564222102",
    lat: 26.6808,
    lng: 84.0472,
    image: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&auto=format&fit=crop",
    verified: true,
    isActive: true,
    displayOrder: 1,
  },
  {
    id: "prashant-sweets",
    itemId: "prashant-sweets",
    title: "Prashant Sweet House",
    subtitle: "Main Market, NH-27 Chowk",
    category: "sweets",
    categoryLabel: "🍬 Sweets & Chaat",
    phone: "09839245678",
    lat: 26.6833,
    lng: 84.0502,
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop",
    verified: true,
    isActive: true,
    displayOrder: 2,
  },
  {
    id: "pawanagar-college",
    itemId: "pawanagar-college",
    title: "Pawanagar Mahavir Inter College",
    subtitle: "College Road",
    category: "schools",
    categoryLabel: "🏫 Schools",
    phone: "09450467890",
    lat: 26.6843,
    lng: 84.0454,
    image: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&auto=format&fit=crop",
    verified: true,
    isActive: true,
    displayOrder: 3,
  },
  {
    id: "indian-oil-fuel",
    itemId: "indian-oil-fuel",
    title: "Indian Oil Petrol Pump",
    subtitle: "NH-27 Highway",
    category: "fuel",
    categoryLabel: "⛽ Fuel Stations",
    phone: "1800224344",
    lat: 26.6850,
    lng: 84.0490,
    image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop",
    verified: true,
    isActive: true,
    displayOrder: 4,
  },
  {
    id: "maa-yashoda-hosp",
    itemId: "maa-yashoda-hosp",
    title: "Maa Yashoda Hospital",
    subtitle: "Garahiya More, NH-28",
    category: "healthcare",
    categoryLabel: "🏥 Healthcare",
    phone: "09450812345",
    lat: 26.6835,
    lng: 84.0458,
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop",
    verified: true,
    isActive: true,
    displayOrder: 5,
  },
  {
    id: "hermitage-school",
    itemId: "hermitage-school",
    title: "The Hermitage School",
    subtitle: "Hospital Road",
    category: "schools",
    categoryLabel: "🏫 Schools",
    phone: "09919523411",
    lat: 26.6804,
    lng: 84.0467,
    image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop",
    verified: true,
    isActive: true,
    displayOrder: 6,
  },
  {
    id: "kanha-sweets",
    itemId: "kanha-sweets",
    title: "Kanha Sweets",
    subtitle: "College Road Crossing",
    category: "sweets",
    categoryLabel: "🍬 Sweets & Chaat",
    phone: "09450987654",
    lat: 26.6833,
    lng: 84.0498,
    image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop",
    verified: true,
    isActive: true,
    displayOrder: 7,
  },
  {
    id: "hp-fuel-pump",
    itemId: "hp-fuel-pump",
    title: "Hindustan Petroleum (HP)",
    subtitle: "Pawanagar Bypass",
    category: "fuel",
    categoryLabel: "⛽ Fuel Stations",
    phone: "18002333555",
    lat: 26.6815,
    lng: 84.0430,
    image: "https://images.unsplash.com/photo-1527018607616-0526648e861c?w=800&auto=format&fit=crop",
    verified: true,
    isActive: true,
    displayOrder: 8,
  },
  {
    id: "fazilnagar-mandi",
    itemId: "fazilnagar-mandi",
    title: "Fazilnagar Sabzi Mandi",
    subtitle: "NH-27 Mandi Chowk",
    category: "markets",
    categoryLabel: "🥦 Sabzi & Mandi",
    phone: "18001801551",
    lat: 26.6820,
    lng: 84.0460,
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop",
    verified: true,
    isActive: true,
    displayOrder: 9,
  },
];

/**
 * Fetches dynamic Civic Directory Index listings with cache-busting and graceful fallback.
 */
export async function getCivicDirectory(forceFresh = false, includeAll = false) {
  const now = Date.now();
  if (!forceFresh && !includeAll && memoryCache.civicDirectory?.data && now - memoryCache.civicDirectory.timestamp < CACHE_TTL_MS) {
    return memoryCache.civicDirectory.data;
  }

  const cacheKey = `civicDirectory_${includeAll ? 'all' : 'public'}`;
  return fetchWithDeduplication(cacheKey, async () => {
    try {
      const params = {};
      if (forceFresh) params._t = Date.now();
      if (includeAll) params.all = "true";

      const res = await API.get("/civic-directory", {
        params,
        headers: forceFresh ? { "Cache-Control": "no-cache", Pragma: "no-cache" } : undefined,
        timeout: 30000,
      });

      const items = res.data?.items || (Array.isArray(res.data) ? res.data : []);
      if (Array.isArray(items)) {
        const normalized = items.map((i) => ({
          ...i,
          id: i.id || i._id || i.itemId,
        }));
        if (!includeAll) {
          setPersistentCache("civicDirectory", normalized);
          memoryCache.civicDirectory = { data: normalized, timestamp: Date.now() };
        }
        return normalized;
      }
    } catch (err) {
      console.warn("[CMSService] Civic Directory fetch error, using fallbacks:", err.message);
    }

    return memoryCache.civicDirectory?.data || getPersistentCache("civicDirectory") || DEFAULT_CIVIC_DIRECTORY_PLACES;
  });
}

