/**
 * Dynamic CMS Client Service for Fazilnagar Portal
 * Fetches dynamic website content, hero slides, settings, public services, events, and heritage sites with graceful caching and offline fallbacks.
 */
import API from "../api";

const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache
const memoryCache = {
  settings: { data: null, timestamp: 0 },
  services: { data: null, timestamp: 0 },
  events: { data: null, timestamp: 0 },
  heritage: { data: null, timestamp: 0 },
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
    enableAutoplay: true,
    slides: [
      {
        _id: "default-slide-1",
        title: "Official Civic & Digital Directory",
        subtitle: "Fazilnagar Nagar Panchayat, Kushinagar",
        caption: "Find verified schools, colleges, healthcare centres, public services, and live community news in Fazilnagar.",
        imageUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb18f15f7?auto=format&fit=crop&w=1600&q=80",
        linkUrl: "/directory",
        buttonText: "Browse Town Directory",
        isActive: true,
      },
      {
        _id: "default-slide-2",
        title: "Healthcare & 24/7 Emergency Medical Aid",
        subtitle: "Community Health Centre & Verified Clinics",
        caption: "Access Community Health Centre (CHC) Fazilnagar, 24x7 ambulance contacts, and verified medical stores.",
        imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=80",
        linkUrl: "/emergency",
        buttonText: "Emergency Healthcare Hub",
        isActive: true,
      },
      {
        _id: "default-slide-3",
        title: "Sacred Twin Heritage of Fazilnagar & Kushinagar",
        subtitle: "Historic Pawapuri Dham & Ancient Pilgrimage Trail",
        caption: "Explore the sacred historical convergence of Bhagwan Mahavira's nirvana land and Buddha's Mahaparinirvana trail.",
        imageUrl: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1600&q=80",
        linkUrl: "/tourism",
        buttonText: "Explore Twin Heritage",
        isActive: true,
      },
    ],
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
};

/**
 * Fetches centralized site settings with fallback and memory cache.
 */
export async function getSiteSettings(forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && memoryCache.settings.data && now - memoryCache.settings.timestamp < CACHE_TTL_MS) {
    return memoryCache.settings.data;
  }

  try {
    const res = await API.get("/settings", { timeout: 8000 });
    if (res.data?.success && res.data?.settings) {
      const merged = { ...DEFAULT_SITE_SETTINGS, ...res.data.settings };
      memoryCache.settings = { data: merged, timestamp: now };
      return merged;
    }
  } catch (err) {
    console.warn("[CMSService] Settings fetch fallback:", err.message);
  }

  return memoryCache.settings.data || DEFAULT_SITE_SETTINGS;
}

/**
 * Fetches dynamic public services with category and search filtering.
 */
export async function getPublicServices({ category = "All", search = "" } = {}) {
  try {
    const params = {};
    if (category && category !== "All") params.category = category;
    if (search) params.search = search;

    const res = await API.get("/services", { params, timeout: 8000 });
    if (res.data?.success && Array.isArray(res.data?.services)) {
      return res.data.services;
    }
  } catch (err) {
    console.warn("[CMSService] Services fetch error:", err.message);
  }
  return [];
}

/**
 * Fetches dynamic community events and religious notices.
 */
export async function getEvents({ category = "All", search = "", timeFilter = "upcoming" } = {}) {
  try {
    const params = {};
    if (category && category !== "All") params.category = category;
    if (search) params.search = search;
    if (timeFilter) params.timeFilter = timeFilter;

    const res = await API.get("/events", { params, timeout: 8000 });
    if (res.data?.success && Array.isArray(res.data?.events)) {
      return res.data.events;
    }
  } catch (err) {
    console.warn("[CMSService] Events fetch error:", err.message);
  }
  return [];
}

/**
 * Fetches sacred twin heritage destinations.
 */
export async function getHeritageSites() {
  try {
    const res = await API.get("/heritage", { timeout: 8000 });
    if (res.data?.success && Array.isArray(res.data?.sites)) {
      return res.data.sites;
    }
  } catch (err) {
    console.warn("[CMSService] Heritage fetch error:", err.message);
  }
  return [];
}
