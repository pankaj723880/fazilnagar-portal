import mongoose from "mongoose";

const heroSlideSchema = new mongoose.Schema({
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  caption: { type: String, default: "" },
  imageUrl: { type: String, required: true },
  linkUrl: { type: String, default: "/directory" },
  buttonText: { type: String, default: "Explore Now" },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
});

const statItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  value: { type: String, required: true },
  subtext: { type: String, default: "" },
  icon: { type: String, default: "Landmark" },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
});

const sectionVisibilitySchema = new mongoose.Schema({
  announcementBanner: { type: Boolean, default: true },
  heroCarousel: { type: Boolean, default: true },
  statsCounters: { type: Boolean, default: true },
  quickCategories: { type: Boolean, default: true },
  interactiveMap: { type: Boolean, default: true },
  featuredDirectory: { type: Boolean, default: true },
  heritageSpotlight: { type: Boolean, default: true },
  emergencyStrip: { type: Boolean, default: true },
  latestNews: { type: Boolean, default: true },
  citizenCorner: { type: Boolean, default: true },
  publicServices: { type: Boolean, default: true },
  advertisements: { type: Boolean, default: true },
});

const navItemSchema = new mongoose.Schema({
  id: { type: String, default: "home" },
  label: { type: String, default: "Home" },
  path: { type: String, default: "/" },
  badge: { type: String, default: "" },
  isExternal: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 1 },
});

export const DEFAULT_NAV_ITEMS = [
  { id: "home", label: "Home", path: "/", badge: "", isExternal: false, isActive: true, displayOrder: 1 },
  { id: "explore", label: "Explore", path: "/#explore-categories", badge: "", isExternal: false, isActive: true, displayOrder: 2 },
  { id: "directory", label: "Directory", path: "/directory", badge: "37", isExternal: false, isActive: true, displayOrder: 3 },
  { id: "events", label: "Events & Melas", path: "/#events-melas-section", badge: "", isExternal: false, isActive: true, displayOrder: 4 },
  { id: "map", label: "Map", path: "/#town-map-section", badge: "", isExternal: false, isActive: true, displayOrder: 5 },
  { id: "news", label: "Local Updates", path: "/news", badge: "", isExternal: false, isActive: true, displayOrder: 6 },
  { id: "heritage", label: "Twin Heritage", path: "/#about-fazilnagar-section", badge: "", isExternal: false, isActive: true, displayOrder: 7 },
];

const trustBadgeSchema = new mongoose.Schema({
  id: { type: String, default: "tb-1" },
  label: { type: String, default: "Strictly Inside Town Limits" },
  icon: { type: String, default: "ShieldCheck" },
  isActive: { type: Boolean, default: true },
});

export const DEFAULT_TRUST_BADGES = [
  { id: "tb-1", label: "Strictly Inside Town Limits", icon: "ShieldCheck", isActive: true },
  { id: "tb-2", label: "Exact Ground Coordinates", icon: "Navigation", isActive: true },
  { id: "tb-3", label: "Ancient Pawanagar Heritage", icon: "Landmark", isActive: true },
];

const actionButtonSchema = new mongoose.Schema({
  id: { type: String, default: "btn-explore" },
  label: { type: String, default: "Explore Town" },
  icon: { type: String, default: "Compass" },
  target: { type: String, default: "explore-categories" },
  isLink: { type: Boolean, default: false },
  variant: { type: String, default: "primary" },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 1 },
});

export const DEFAULT_ACTION_BUTTONS = [
  { id: "btn-explore", label: "Explore Town", icon: "Compass", target: "explore-categories", isLink: false, variant: "primary", isActive: true, displayOrder: 1 },
  { id: "btn-events", label: "Events & Melas", icon: "Calendar", target: "events-melas-section", isLink: false, variant: "secondary", isActive: true, displayOrder: 2 },
  { id: "btn-heritage", label: "Twin Heritage", icon: "Landmark", target: "about-fazilnagar-section", isLink: false, variant: "accent", isActive: true, displayOrder: 3 },
  { id: "btn-map", label: "Map", icon: "Map", target: "town-map-section", isLink: false, variant: "ghost", isActive: true, displayOrder: 4 },
  { id: "btn-add", label: "+ Add Place", icon: "PlusCircle", target: "/directory?add=true", isLink: true, variant: "emerald", isActive: true, displayOrder: 5 },
];

const publicServiceCardSchema = new mongoose.Schema({
  id: { type: String, default: "service-chc" },
  badge: { type: String, default: "24/7 Healthcare" },
  title: { type: String, default: "Community Health Centre (CHC)" },
  address: { type: String, default: "Hospital Road, Fazilnagar - 274401" },
  description: { type: String, default: "Emergency ward, routine maternal delivery, vaccination and ambulance hub." },
  phone: { type: String, default: "05564-222102" },
  statusLabel: { type: String, default: "" },
  actionType: { type: String, default: "directions" },
  actionLabel: { type: String, default: "Directions" },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 1 },
});

export const DEFAULT_SERVICE_CARDS = [
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
];

const siteSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "primary_settings",
      unique: true,
      index: true,
    },
    siteName: {
      type: String,
      default: "Fazilnagar Town Official Civic & Local Directory Portal",
    },
    shortName: {
      type: String,
      default: "Fazilnagar Portal",
    },
    tagline: {
      type: String,
      default: "Municipal Nagar Panchayat • Kushinagar, Uttar Pradesh",
    },
    taglineHindi: {
      type: String,
      default: "नगर पंचायत फाजिलनगर • कुशीनगर, उत्तर प्रदेश",
    },
    logoUrl: {
      type: String,
      default: "/icon-192.svg",
    },
    faviconUrl: {
      type: String,
      default: "/icon-192.svg",
    },
    // Announcement Banner
    announcement: {
      enabled: { type: Boolean, default: true },
      text: {
        type: String,
        default: "Welcome to Official Fazilnagar Town Portal — Verified Civic Directory, Healthcare & Public Services",
      },
      link: { type: String, default: "/directory" },
      bgColor: { type: String, default: "#0D5E49" },
      textColor: { type: String, default: "#FFFFFF" },
    },
    // Contact & Office Information
    contact: {
      officialPhone: { type: String, default: "+91 5564 222102" },
      emergencyPhone: { type: String, default: "112 / 108" },
      chcPhone: { type: String, default: "+91 94520 89540" },
      email: { type: String, default: "contact@fazilnagar.com" },
      officeAddress: {
        type: String,
        default: "Nagar Panchayat Office, Main Market Road, Fazilnagar, Kushinagar - 274401",
      },
      workingHours: { type: String, default: "10:00 AM – 05:00 PM (Mon-Sat)" },
    },
    // Social Media Links
    socialLinks: {
      facebook: { type: String, default: "" },
      twitter: { type: String, default: "" },
      instagram: { type: String, default: "" },
      youtube: { type: String, default: "" },
      whatsappGroup: { type: String, default: "" },
    },
    // SEO Defaults
    seo: {
      metaTitle: {
        type: String,
        default: "Fazilnagar Town Portal | Official Civic & Local Directory",
      },
      metaDescription: {
        type: String,
        default: "Official digital civic portal for Fazilnagar town. Verified schools, colleges, hospitals, emergency aid, local news, and community directory in Kushinagar, UP.",
      },
      ogImageUrl: {
        type: String,
        default: "https://images.unsplash.com/photo-1541888946425-d0fbb18f15f7?auto=format&fit=crop&w=1200&q=80",
      },
      canonicalBase: {
        type: String,
        default: "https://fazilnagar.vercel.app",
      },
    },
    // Hero Slider & Animations
    heroSettings: {
      animationSpeed: { type: Number, default: 5000 }, // Milliseconds per slide
      animationDirection: { type: String, enum: ["left", "right", "fade"], default: "left" },
      enableAutoplay: { type: Boolean, default: true },
      slides: [heroSlideSchema],
    },
    // Statistics & Counters
    stats: [statItemSchema],
    // Section Visibility & Ordering
    sections: {
      type: sectionVisibilitySchema,
      default: () => ({}),
    },
    // Footer configuration
    footer: {
      copyrightText: {
        type: String,
        default: "© 2026 Fazilnagar Town Portal. Dedicated to the residents and visitors of Fazilnagar, Kushinagar, UP.",
      },
      disclaimer: {
        type: String,
        default: "All institutional locations verified by municipal mapping coordinates. Independent civic public resource.",
      },
    },
    // Top Civic Alert Bar
    topAlertBar: {
      enabled: { type: Boolean, default: true },
      badgeText: { type: String, default: "LIVE CIVIC" },
      text: {
        type: String,
        default: "Fazilnagar Town Official Civic & Local Directory Portal (PIN 274401)",
      },
      helplineLabel: { type: String, default: "📞 Helpline" },
      helplineNumber: { type: String, default: "112" },
    },
    // Main Navigation Header
    navigation: {
      brandFirst: { type: String, default: "FAZIL" },
      brandSecond: { type: String, default: "NAGAR" },
      tagline: { type: String, default: "Your Town. Your Community." },
      actionButtonText: { type: String, default: "+ Add Story" },
      actionButtonLink: { type: String, default: "/create-news" },
      navItems: {
        type: [navItemSchema],
        default: () => DEFAULT_NAV_ITEMS,
      },
    },
    // Hero Custom Dynamic Content
    heroContent: {
      badgeLocation: { type: String, default: "Kushinagar" },
      badgeText: { type: String, default: "Official Civic Portal" },
      badgeSubtext: { type: String, default: "Nagar Panchayat Fazilnagar • Kushinagar (PIN 274401)" },
      heading: { type: String, default: "" },
      subheadingHindi: { type: String, default: "" },
      description: {
        type: String,
        default: "Official digital civic portal for Fazilnagar town. Verified schools, colleges, hospitals, emergency aid, local news, and community directory in Kushinagar, UP.",
      },
      searchPlaceholder: {
        type: String,
        default: "Search schools, hospitals, medical stores, sweet shops…",
      },
      searchButtonText: { type: String, default: "Search" },
      trustBadges: {
        type: [trustBadgeSchema],
        default: () => DEFAULT_TRUST_BADGES,
      },
      actionButtons: {
        type: [actionButtonSchema],
        default: () => DEFAULT_ACTION_BUTTONS,
      },
    },
    // Homepage Section Headings & Subtitles
    homepageSections: {
      explore: {
        badge: { type: String, default: "Civic Directory Index" },
        title: { type: String, default: "Explore Fazilnagar" },
        subtitle: {
          type: String,
          default: "Verified institutions across schools, colleges, hospitals, and fuel stations.",
        },
        buttonText: { type: String, default: "Open Full Directory" },
        buttonLink: { type: String, default: "/directory" },
      },
      publicServices: {
        badge: { type: String, default: "Public Welfare & Emergency" },
        title: { type: String, default: "Essential Public Services" },
        subtitle: {
          type: String,
          default: "Emergency numbers, primary healthcare, pharmacy points, and administrative offices in Fazilnagar.",
        },
        cards: {
          type: [publicServiceCardSchema],
          default: () => DEFAULT_SERVICE_CARDS,
        },
      },
      map: {
        badge: { type: String, default: "Geospatial Verification" },
        title: { type: String, default: "Explore Fazilnagar on Map" },
        subtitle: {
          type: String,
          default: "Every pin uses exact decimal coordinates along the NH-27, College Road, and Hospital Road axis.",
        },
        coordinatesText: { type: String, default: "26.6827° N, 84.0498° E" },
      },
      events: {
        badge: { type: String, default: "Town Fairs, Melas & Cultural Celebrations" },
        title: { type: String, default: "Upcoming Events & Town Melas" },
        subtitle: {
          type: String,
          default: "Experience the vibrant community life of Fazilnagar — from the sacred Pawapuri Nirvana Mela to civic festivals, devotional aartis, and annual town gatherings.",
        },
        ctaText: { type: String, default: "+ Submit Event / Mela" },
      },
      heritage: {
        badge: { type: String, default: "Town Profile, Antiquity & Sacred Heritage" },
        title: { type: String, default: "Fazilnagar & Kushinagar: The Sacred Twin Heritage" },
        subtitle: {
          type: String,
          default: "Explore the deep 2,600-year-old antiquity, sacred spiritual milestones of Bhagwan Mahavira and Lord Buddha, and modern civic significance of the two historic capitals of the ancient Malla Republic.",
        },
        tab1Label: { type: String, default: "🏛️ Fazilnagar (Pawanagar)" },
        tab2Label: { type: String, default: "☸️ Kushinagar (Mahaparinirvana)" },
        tab3Label: { type: String, default: "✨ The Twin Sacred Bond" },
      },
    },
  },
  { timestamps: true }
);

const SiteSettings = mongoose.model("SiteSettings", siteSettingsSchema);
export default SiteSettings;
