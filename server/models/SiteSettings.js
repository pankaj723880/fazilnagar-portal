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
  },
  { timestamps: true }
);

const SiteSettings = mongoose.model("SiteSettings", siteSettingsSchema);
export default SiteSettings;
