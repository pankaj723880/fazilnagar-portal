/**
 * Dynamic CMS Client Service for Fazilnagar Portal
 * Fetches dynamic website content, hero slides, settings, public services, events, and heritage sites with graceful caching and offline fallbacks.
 */
import API from "../api";

const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

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

const memoryCache = {
  settings: { data: getPersistentCache("settings"), timestamp: Date.now() },
  services: { data: null, timestamp: 0 },
  events: { data: getPersistentCache("events"), timestamp: Date.now() },
  heritage: { data: getPersistentCache("heritage"), timestamp: Date.now() },
};

export const DEFAULT_SITE_SETTINGS = {
  siteName: "Fazilnagar Town Official Civic & Local Directory Portal",
  shortName: "Fazilnagar Portal",
  tagline: "Municipal Nagar Panchayat • Kushinagar, Uttar Pradesh",
  taglineHindi: "नगर पंचायत फाजिलनगर • कुशीनगर, उत्तर प्रदेश",
  logoUrl: "/icon-192.svg",
  announcement: {
    enabled: true,
    text: "Welcome to Official Fazilnagar Town Portal — Verified Civic Directory, Healthcare & Public Services",
    link: "/directory",
    bgColor: "#0D5E49",
    textColor: "#FFFFFF",
  },
  contact: {
    officialPhone: "+91 5564 222102",
    emergencyPhone: "112 / 108",
    chcPhone: "+91 94520 89540",
    email: "contact@fazilnagar.com",
    officeAddress: "Nagar Panchayat Office, Main Market Road, Fazilnagar, Kushinagar - 274401",
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
    metaTitle: "Fazilnagar Town Portal | Official Civic & Local Directory",
    metaDescription: "Official digital civic portal for Fazilnagar town. Verified schools, colleges, hospitals, emergency aid, local news, and community directory in Kushinagar, UP.",
    ogImageUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb18f15f7?auto=format&fit=crop&w=1200&q=80",
  },
  heroSettings: {
    animationSpeed: 5000,
    animationDirection: "left",
    enableAutoplay: false,
    slides: [],
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
      { id: "directory", label: "Directory", path: "/directory", badge: "37", isExternal: false, isActive: true, displayOrder: 3 },
      { id: "events", label: "Events & Melas", path: "/#events-melas-section", badge: "", isExternal: false, isActive: true, displayOrder: 4 },
      { id: "map", label: "Map", path: "/#town-map-section", badge: "", isExternal: false, isActive: true, displayOrder: 5 },
      { id: "news", label: "Local Updates", path: "/news", badge: "", isExternal: false, isActive: true, displayOrder: 6 },
      { id: "heritage", label: "Twin Heritage", path: "/#about-fazilnagar-section", badge: "", isExternal: false, isActive: true, displayOrder: 7 },
    ],
  },
  heroContent: {
    badgeLocation: "Kushinagar",
    badgeText: "Official Civic Portal",
    badgeSubtext: "Nagar Panchayat Fazilnagar • Kushinagar (PIN 274401)",
    heading: "",
    subheadingHindi: "",
    description: "Official digital civic portal for Fazilnagar town. Verified schools, colleges, hospitals, emergency aid, local news, and community directory in Kushinagar, UP.",
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
      { id: "btn-map", label: "Map", icon: "Map", target: "town-map-section", isLink: false, variant: "ghost", isActive: true, displayOrder: 4 },
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

  try {
    const res = await API.get("/settings", {
      params: { _t: now },
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      timeout: 30000,
    });
    if (res.data?.success && res.data?.settings) {
      const merged = deepMerge(DEFAULT_SITE_SETTINGS, res.data.settings);
      setPersistentCache("settings", merged);
      memoryCache.settings = { data: merged, timestamp: now };
      return merged;
    }
  } catch (err) {
    console.warn("[CMSService] Settings fetch fallback:", err.message);
  }

  return memoryCache.settings.data || getPersistentCache("settings") || DEFAULT_SITE_SETTINGS;
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
export function clearCMSCache(key) {
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
  } catch (_) {}
}

/**
 * Fetches dynamic community events and religious notices with cache-busting.
 */
export async function getEvents({ category = "All", search = "", timeFilter = "" } = {}, forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && memoryCache.events.data && now - memoryCache.events.timestamp < CACHE_TTL_MS) {
    return memoryCache.events.data;
  }

  try {
    const params = { _t: now };
    if (category && category !== "All") params.category = category;
    if (search) params.search = search;
    if (timeFilter) params.timeFilter = timeFilter;

    const res = await API.get("/events", {
      params,
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      timeout: 30000,
    });
    if (res.data?.success && Array.isArray(res.data?.events)) {
      setPersistentCache("events", res.data.events);
      memoryCache.events = { data: res.data.events, timestamp: now };
      return res.data.events;
    }
  } catch (err) {
    console.warn("[CMSService] Events fetch error, using fallbacks:", err.message);
  }
  return memoryCache.events.data || getPersistentCache("events") || DEFAULT_EVENTS;
}

/**
 * Fetches sacred twin heritage destinations with cache-busting and graceful fallback.
 */
export async function getHeritageSites(forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && memoryCache.heritage.data && now - memoryCache.heritage.timestamp < CACHE_TTL_MS) {
    return memoryCache.heritage.data;
  }

  try {
    const res = await API.get("/heritage", {
      params: { _t: now },
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      timeout: 30000,
    });
    if (res.data?.success && Array.isArray(res.data?.sites)) {
      setPersistentCache("heritage", res.data.sites);
      memoryCache.heritage = { data: res.data.sites, timestamp: now };
      return res.data.sites;
    }
  } catch (err) {
    console.warn("[CMSService] Heritage fetch error, using fallbacks:", err.message);
  }
  return memoryCache.heritage.data || getPersistentCache("heritage") || DEFAULT_HERITAGE_SITES;
}
