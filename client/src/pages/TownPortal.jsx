import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import seedPlaces from "../data/places.json";
import { openGoogleMapsDirections } from "../utils/directions";
import InstallButton from "../components/InstallButton";
import AdvertisementSlot from "../components/AdvertisementSlot";
import { usePageSEO } from "../utils/seo";
import CommunityPlaceModal from "../components/CommunityPlaceModal";
import { getAuthUser, clearAuthSession } from "../utils/authStorage";
import {
  getSiteSettings,
  DEFAULT_SITE_SETTINGS,
  getCachedSettings,
  getHeritageSites,
  DEFAULT_HERITAGE_SITES,
  getCachedHeritage,
  getEvents,
  DEFAULT_EVENTS,
  getCachedEvents,
} from "../services/cmsService";

// Lazy-load Leaflet Map to eliminate render-blocking JS and main-thread freeze
const TownInteractiveMap = lazy(() => import("../components/TownInteractiveMap"));
import {
  MapPin,
  ShieldCheck,
  PlusCircle,
  Compass,
  LayoutGrid,
  Menu,
  X,
  Home,
  Grid,
  Map,
  Store,
  Bell,
  BookOpen,
  Plus,
  Search,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Landmark,
  Navigation,
  GraduationCap,
  Stethoscope,
  Pill,
  Cake,
  Sun,
  Moon,
  Utensils,
  ShoppingBag,
  Bed,
  Building2,
  PhoneCall,
  Sparkles,
  Bus,
  Layers,
  Clock,
  Phone,
  Check,
  Calendar,
  Edit3,
  CalendarPlus,
  CheckCircle,
  ExternalLink,
  Info,
  SlidersHorizontal,
  Coffee,
  HeartPulse,
  Flame,
  Shield,
  Briefcase,
  AlertCircle,
  Fuel,
  Share2,
} from "lucide-react";

// Filtered Categories strictly for Schools & Colleges, Hospitals, and Petrol Pumps
const EXPLORE_21_CATEGORIES = [
  { id: "schools", name: "Schools & Colleges", query: "Schools & Colleges", icon: GraduationCap, count: 9 },
  { id: "hospitals", name: "Hospitals & Healthcare", query: "Hospitals & Clinics", icon: Stethoscope, count: 10 },
  { id: "fuel", name: "Petrol Pumps & Fuel", query: "Petrol Pumps", icon: Fuel, count: 3 },
  { id: "all-places", name: "All Verified Places", query: "all", icon: Layers, count: 22 },
];

// Curated Real Town Establishments (Schools, Hospitals, Petrol Pumps)
const VERIFIED_TOWN_PLACES = [
  {
    id: "sch-01",
    name: "The Hermitage School",
    nameHindi: "द हर्मिटेज स्कूल फाजिलनगर",
    category: "Schools & Colleges",
    subcategory: "Senior Secondary School",
    address: "Hospital Road, Fazilnagar - 274401",
    landmark: "Hospital Road Corridor, Near CHC, Fazilnagar",
    lat: 26.6804068,
    lng: 84.046655,
    hours: "08:00 AM – 02:00 PM",
    phone: "+91 94520 89540",
    desc: "Renowned English-medium institution providing quality education with comprehensive campus facilities.",
    badge: "CBSE / English Medium",
  },
  {
    id: "hosp-01",
    name: "Community Health Centre (CHC) Fazilnagar",
    nameHindi: "सामुदायिक स्वास्थ्य केंद्र (सीएचसी) फाजिलनगर",
    category: "Hospitals & Clinics",
    subcategory: "Public Hospital",
    address: "Hospital Road, Fazilnagar - 274401",
    landmark: "Hospital Road Campus, Near The Hermitage School, Fazilnagar",
    lat: 26.6807500,
    lng: 84.0471500,
    hours: "24x7 Emergency Services",
    phone: "+91 5564 222102",
    desc: "30-bed public healthcare institution providing primary medical, emergency ambulance, and maternal health services.",
    badge: "Government",
  },
  {
    id: "fuel-01",
    name: "Indian Oil (IOCL) Kisan Sewa Kendra Petrol Pump",
    nameHindi: "इंडियन ऑयल किसान सेवा केंद्र पेट्रोल पंप",
    category: "Petrol Pumps",
    subcategory: "Fuel Station",
    address: "NH-27 Highway Corridor (Amawa Link), Fazilnagar - 274401",
    landmark: "NH-27 Highway West Axis, Fazilnagar",
    lat: 26.6826000,
    lng: 84.0442000,
    hours: "06:00 AM – 11:00 PM",
    phone: "+91 94520 12345",
    desc: "Authorized IOCL fueling station offering petrol, high-speed diesel, lubricants, automated air, and clean restrooms.",
    badge: "Indian Oil",
  },
  {
    id: "sch-02",
    name: "Pawanagar Mahavir Inter College",
    nameHindi: "पावानगर महावीर इंटर कॉलेज",
    category: "Schools & Colleges",
    subcategory: "Intermediate College",
    address: "College Road, Fazilnagar - 274401",
    landmark: "College Road Landmark Corridor, Fazilnagar",
    lat: 26.6894086,
    lng: 84.0519967,
    hours: "08:30 AM – 03:00 PM",
    phone: "+91 5564 222115",
    desc: "Historic educational anchor institution of Fazilnagar town providing secondary and senior secondary education.",
    badge: "UP Board",
  },
  {
    id: "fuel-02",
    name: "HP Petrol Pump - Fazilnagar Highway Filling Station",
    nameHindi: "एचपी पेट्रोल पंप - फाजिलनगर हाईवे",
    category: "Petrol Pumps",
    subcategory: "Fuel Station",
    address: "NH-27 Highway East (Bankata Crossing), Fazilnagar - 274401",
    landmark: "NH-27 Highway East, Near Bankata Turn, Fazilnagar",
    lat: 26.6821000,
    lng: 84.0556000,
    hours: "24x7 Fueling Services",
    phone: "+91 94520 23456",
    desc: "Hindustan Petroleum retail outlet serving highway transit vehicles, local farm machinery, and commuters.",
    badge: "Hindustan Petroleum",
  },
];

// Dynamic Icon Map for CMS-managed buttons, cards, and badges
const HERO_ICON_MAP = {
  Compass,
  Calendar,
  Landmark,
  Map,
  PlusCircle,
  ShieldCheck,
  Navigation,
  Sparkles,
  PhoneCall,
  Store,
  GraduationCap,
  Stethoscope,
  Info,
  Layers,
  LayoutGrid,
  Search,
};

const HERO_BUTTON_VARIANTS = {
  primary: "bg-[#B8323C] hover:bg-[#991B1B] text-white shadow-lg",
  amber: "bg-amber-600 hover:bg-amber-700 text-white shadow-lg",
  dark: "bg-slate-800/80 hover:bg-slate-800 text-white border border-white/20 backdrop-blur-md shadow-lg",
  glass: "bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-md shadow-lg",
  emerald: "bg-[#0D5E49] hover:bg-emerald-800 text-white shadow-lg",
};

function matchesCategory(placeCat, placeSubcat, targetCat) {
  if (!targetCat || targetCat === "all" || targetCat === "All") return true;
  const target = targetCat.toLowerCase().trim();
  const c = (placeCat || "").toLowerCase().trim();
  const sc = (placeSubcat || "").toLowerCase().trim();

  if (c === target || sc === target) return true;
  if (c && (c.includes(target) || target.includes(c))) return true;
  if (sc && (sc.includes(target) || target.includes(sc))) return true;

  const targetWords = target.split(/[\s&,/]+/).filter((w) => w.length > 3);
  return targetWords.some((w) => c.includes(w) || sc.includes(w));
}

const activeSeedPlaces = Array.isArray(seedPlaces)
  ? seedPlaces.filter((p) => !p.isArchived && p.isPublished !== false)
  : [];

const INITIAL_PLACES = activeSeedPlaces.length > 0
  ? activeSeedPlaces.map((p) => ({
      id: p.id || p._id,
      name: p.name,
      nameHindi: p.alternateNames?.[0] || p.name,
      category: p.category,
      subcategory: p.subcategory,
      address: p.addressFull || p.locality,
      landmark: p.streetOrLandmark || p.addressFull || p.locality,
      lat: !isNaN(parseFloat(p.latitude)) ? parseFloat(p.latitude) : null,
      lng: !isNaN(parseFloat(p.longitude)) ? parseFloat(p.longitude) : null,
      latitude: !isNaN(parseFloat(p.latitude)) ? parseFloat(p.latitude) : null,
      longitude: !isNaN(parseFloat(p.longitude)) ? parseFloat(p.longitude) : null,
      hours: p.openingHours || "General Hours",
      phone: p.phone || "",
      desc: p.description,
      badge: p.subcategory || p.category,
      verificationStatus: p.verificationStatus || "verified",
      townBoundaryStatus: p.townBoundaryStatus || "confirmed",
      submissionSource: p.submissionSource || "official",
    }))
  : VERIFIED_TOWN_PLACES.filter((p) => [
      "Hospitals & Clinics",
      "Schools & Colleges",
      "Medical Stores & Pharmacies"
    ].includes(p.category));

export default function TownPortal() {
  const navigate = useNavigate();
  usePageSEO({
    title: "Fazilnagar Town Civic & Local Directory Portal | Kushinagar, UP",
    description: "Official civic and local directory portal for Fazilnagar town (PIN 274401, Kushinagar, Uttar Pradesh). Verified town directory of schools, hospitals, local doctors, emergency helplines, shops, markets, and community news.",
    canonicalPath: "/",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [places, setPlaces] = useState(INITIAL_PLACES);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [mapFilter, setMapFilter] = useState("all");
  const [mapViewMode, setMapViewMode] = useState("map"); // "map" | "list"
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [modalType, setModalType] = useState(null); // "business" | "correction" | "event" | null
  const [communityModalOpen, setCommunityModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [liveNews, setLiveNews] = useState([]);
  const [aboutTab, setAboutTab] = useState("fazilnagar"); // "fazilnagar" | "kushinagar" | "connection"
  const [isDirectoryExpanded, setIsDirectoryExpanded] = useState(false);

  const toggleDirectoryExpanded = () => {
    if (isDirectoryExpanded) {
      setIsDirectoryExpanded(false);
      const section = document.getElementById("explore-categories");
      if (section) {
        const rect = section.getBoundingClientRect();
        if (rect.top < 0) {
          const yOffset = -96;
          const y = rect.top + (window.scrollY || window.pageYOffset || 0) + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }
    } else {
      setIsDirectoryExpanded(true);
    }
  };

  const displayedCategories = isDirectoryExpanded
    ? EXPLORE_21_CATEGORIES
    : EXPLORE_21_CATEGORIES.slice(0, 4);

  // Dynamic Site Settings, Heritage Sites & Events from CMS
  const [siteSettings, setSiteSettings] = useState(() => getCachedSettings() || DEFAULT_SITE_SETTINGS);
  const [heritageSites, setHeritageSites] = useState(() => getCachedHeritage() || DEFAULT_HERITAGE_SITES);
  const [events, setEvents] = useState(() => getCachedEvents() || DEFAULT_EVENTS);
  const [selectedEventCategory, setSelectedEventCategory] = useState("All");

  const loadCMSData = () => {
    getSiteSettings(true).then((s) => {
      if (s) setSiteSettings(s);
    });

    getHeritageSites(true).then((sites) => {
      if (Array.isArray(sites)) {
        setHeritageSites(sites);
      }
    });

    getEvents({}, true).then((evts) => {
      if (Array.isArray(evts)) {
        setEvents(evts);
      }
    });
  };

  useEffect(() => {
    loadCMSData();

    const handleCMSUpdate = () => {
      loadCMSData();
    };

    window.addEventListener("cms-cache-cleared", handleCMSUpdate);
    const handleStorage = (e) => {
      if (e.key === "fazilnagar_cms_cache_bust") {
        loadCMSData();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("cms-cache-cleared", handleCMSUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Filter dynamic heritage sites for tabs with smart zone and category matching + fallback
  const fazilnagarCandidates = (heritageSites || []).filter((s) => {
    if (s.isPublished === false) return false;
    if (s.heritageZone === "fazilnagar" || s.heritageZone === "both") return true;
    if (s.heritageZone === "kushinagar") return false;
    const name = (s.name || "").toLowerCase();
    const cat = s.category || "";
    const dist = (s.distanceFromFazilnagarCenter || "").toLowerCase();
    if (cat === "Buddhist Heritage") return false;
    if (name.includes("kushinagar") || dist.includes("18 km")) return false;
    return true;
  });
  const isCustomHeritage = Array.isArray(heritageSites) && heritageSites !== DEFAULT_HERITAGE_SITES;
  const fazilnagarSites = isCustomHeritage
    ? fazilnagarCandidates
    : fazilnagarCandidates.length > 0
    ? fazilnagarCandidates
    : DEFAULT_HERITAGE_SITES.filter((s) => s.heritageZone === "fazilnagar");

  const kushinagarCandidates = (heritageSites || []).filter((s) => {
    if (s.isPublished === false) return false;
    if (s.heritageZone === "kushinagar" || s.heritageZone === "both") return true;
    if (s.heritageZone === "fazilnagar") return false;
    const name = (s.name || "").toLowerCase();
    const cat = s.category || "";
    const dist = (s.distanceFromFazilnagarCenter || "").toLowerCase();
    return cat === "Buddhist Heritage" || name.includes("kushinagar") || dist.includes("18 km");
  });
  const kushinagarSites = isCustomHeritage
    ? kushinagarCandidates
    : kushinagarCandidates.length > 0
    ? kushinagarCandidates
    : DEFAULT_HERITAGE_SITES.filter((s) => s.heritageZone === "kushinagar");

  // Filter dynamic community events
  const eventCategories = ["All", "Mela & Fair", "Aarti & Puja", "Religious Festival", "Civic & Cultural"];
  const filteredEvents = (events || []).filter((evt) => {
    if (evt.isPublished === false || evt.status === "draft" || evt.status === "archived") return false;
    if (selectedEventCategory === "All") return true;
    return evt.category === selectedEventCategory;
  });

  // Compute dynamic hero slides (custom admin slides if any with valid URLs)
  const configuredSlides = (siteSettings?.heroSettings?.slides || []).filter(
    (s) => s && s.isActive !== false && s.imageUrl && !s.imageUrl.startsWith("blob:")
  );
  const dynamicHeroSlides = configuredSlides.map((s, idx) => ({
    id: s._id || idx,
    src: s.imageUrl,
    title: s.title,
    location: s.subtitle || "Fazilnagar",
    caption: s.caption || "",
    linkUrl: s.linkUrl || "/directory",
    buttonText: s.buttonText || "Browse Town Directory",
  }));

  // Hero Background Carousel States
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);

  // Auto-advance Carousel only if more than 1 slide exists
  const carouselInterval = siteSettings?.heroSettings?.animationSpeed || 6000;
  useEffect(() => {
    if (isHeroHovered) return;
    if (dynamicHeroSlides.length <= 1) return;
    if (siteSettings?.heroSettings?.enableAutoplay === false) return;
    const carouselTimer = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % dynamicHeroSlides.length);
    }, carouselInterval);
    return () => clearInterval(carouselTimer);
  }, [isHeroHovered, dynamicHeroSlides.length, carouselInterval, siteSettings?.heroSettings?.enableAutoplay]);

  // Smooth scroll handler with visual landing glow pulse animation (Reflow-free)
  const handleSmoothScroll = (e, targetId) => {
    if (e && e.preventDefault) e.preventDefault();
    if (targetId === "town-map-section") {
      setIsMapVisible(true);
    }
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      element.classList.remove("section-highlight-active");
      requestAnimationFrame(() => {
        element.classList.add("section-highlight-active");
      });
      setTimeout(() => {
        element.classList.remove("section-highlight-active");
      }, 2200);
    }
  };

  // If user arrives with a hash in URL, smoothly scroll and highlight target section
  useEffect(() => {
    if (window.location.hash) {
      const sectionId = window.location.hash.replace("#", "");
      if (sectionId === "town-map-section") {
        setIsMapVisible(true);
      }
      setTimeout(() => {
        handleSmoothScroll(null, sectionId);
      }, 350);
    }
  }, []);

  useEffect(() => {
    const syncUser = () => {
      setCurrentUser(getAuthUser());
    };

    syncUser();
    window.addEventListener("auth-change", syncUser);
    return () => {
      window.removeEventListener("auth-change", syncUser);
    };
  }, []);

  const handleLogout = () => {
    clearAuthSession(true);
    setCurrentUser(null);
  };

  const [isMapVisible, setIsMapVisible] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  // Fetch live places & news from backend if available
  useEffect(() => {
    API.get("/places?limit=100")
      .then((res) => {
        const rawList = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
        if (rawList.length > 0) {
          const apiPlaces = rawList.map((p) => ({
            id: p._id || p.id,
            name: p.name,
            nameHindi: p.alternateNames?.[0] || p.name,
            category: p.category,
            subcategory: p.subcategory,
            address: p.addressFull,
            landmark: p.streetOrLandmark || p.locality,
            lat: p.latitude || p.lat || null,
            lng: p.longitude || p.lng || null,
            latitude: p.latitude || p.lat || null,
            longitude: p.longitude || p.lng || null,
            hours: p.openingHours || "General Hours",
            phone: p.phone || "Public Listing",
            desc: p.description,
            badge: p.subcategory || p.category,
            verificationStatus: p.verificationStatus || "verified",
            townBoundaryStatus: p.townBoundaryStatus || "confirmed",
          }));
          setPlaces(apiPlaces);
        }
      })
      .catch(() => {
        // Fallback to grounded local verified data
      });

    API.get("/news")
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setLiveNews(res.data);
        }
      })
      .catch(() => {
        // Graceful fallback to verified news without console error
      });
  }, []);

  // Lazy-load Town Map when user scrolls near the map section
  useEffect(() => {
    const el = document.getElementById("town-map-section");
    if (!el) return;

    if (!window.IntersectionObserver) {
      setIsMapVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsMapVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "350px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Search autocomplete matches
  const searchMatches = searchQuery.trim()
    ? places.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.landmark.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.subcategory && p.subcategory.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const handleSelectLocation = (place) => {
    setIsMapVisible(true);
    setSelectedPlace(place);
    setSearchQuery("");
    setDropdownOpen(false);
    const mapSec = document.getElementById("town-map-section");
    if (mapSec) mapSec.scrollIntoView({ behavior: "smooth" });
  };

  const handleFormSubmit = async (e, type) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    const payload = {
      type,
      title: formData.get("title") || "",
      category: formData.get("category") || "",
      phone: formData.get("phone") || "",
      landmark: formData.get("landmark") || "",
      venue: formData.get("venue") || "",
      eventDate: formData.get("eventDate") || "",
      organizer: formData.get("organizer") || "",
      details: formData.get("details") || "",
      submittedBy: {
        name: currentUser?.name || "Local Resident",
        email: currentUser?.email || "",
      },
    };

    try {
      await API.post("/submissions", payload);
      setModalType(null);
      let msg = "Establishment submitted to town admin review queue!";
      if (type === "correction") msg = "Thank you! Information correction submitted for Admin review.";
      if (type === "event") msg = "Event announcement submitted for Admin approval!";
      showToast(msg);
      form.reset();
    } catch (err) {
      console.error("Submission error:", err);
      showToast("Submission failed. Please check connection and try again.");
    }
  };

  // Filtered Schools preview
  const schoolsList = places.filter(
    (p) => p.category === "Schools & Colleges" || (p.subcategory && p.subcategory.includes("School"))
  );

  const MAP_CATEGORY_TABS = [
    { id: "all", label: "All Verified Places" },
    { id: "Schools & Colleges", label: "Schools & Colleges" },
    { id: "Hospitals & Clinics", label: "Hospitals & Healthcare" },
    { id: "Petrol Pumps", label: "Petrol Pumps & Fuel" },
  ];

  const filteredMapPlaces = places.filter(
    (p) => matchesCategory(p.category, p.subcategory, mapFilter)
  );

  const currentMapTabLabel =
    MAP_CATEGORY_TABS.find((t) => t.id === mapFilter)?.label || "Verified Places";

  return (
    <div className="w-full max-w-full overflow-x-hidden bg-[#F5F7F8] font-sans text-[#18232E] selection:bg-[#B8323C] selection:text-white">


      {/* Dynamic Civic Announcement Ticker Banner */}
      {siteSettings.sections?.announcementBanner !== false &&
        siteSettings.announcement?.enabled &&
        siteSettings.announcement?.text && (
          <aside
            aria-label="Civic Announcement Banner"
            style={{
              backgroundColor: siteSettings.announcement.bgColor || "#0D5E49",
              color: siteSettings.announcement.textColor || "#FFFFFF",
            }}
            className="w-full px-4 py-2.5 text-center text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition z-30 relative"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-300 animate-pulse" />
            <span>{siteSettings.announcement.text}</span>
            {siteSettings.announcement.link && (
              <Link
                to={siteSettings.announcement.link}
                className="underline hover:opacity-80 ml-2 inline-flex items-center gap-0.5 text-amber-200 font-extrabold"
              >
                <span>View Details</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </aside>
        )}

      {/* ========================================================
          SECTION 2: HERO SECTION (Dynamic Kushinagar & Fazilnagar Carousel)
          ======================================================== */}
      {siteSettings.sections?.heroCarousel !== false && (
        <section
          id="hero-section"
          onMouseEnter={() => setIsHeroHovered(true)}
          onMouseLeave={() => setIsHeroHovered(false)}
          className="relative text-white py-12 sm:py-20 lg:py-24 overflow-hidden border-b border-slate-800 bg-[#0B131E]"
        >
          {/* Civic Hero Background & Dynamic Carousel (if slides configured) */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Deep rich civic gradient base */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0B131E] via-[#0F1B2B] to-[#070D14]" />
            {/* Subtle civic ambient lighting accents */}
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 right-1/4 w-[500px] h-[250px] bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
            {/* Subtle civic grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
                backgroundSize: "28px 28px",
              }}
            />

            {/* If slides exist, render carousel image transitions */}
            {dynamicHeroSlides.length > 0 &&
              dynamicHeroSlides.map((img, idx) => {
                const isCurrent = idx === (heroSlideIndex % dynamicHeroSlides.length);
                if (!isCurrent) return null;

                return (
                  <div
                    key={img.id || idx}
                    className="absolute inset-0 transition-opacity duration-1000 ease-in-out opacity-100 z-10"
                  >
                    <img
                      src={img.src}
                      alt={img.title || "Fazilnagar"}
                      fetchPriority={idx === 0 ? "high" : "auto"}
                      loading={idx === 0 ? "eager" : "lazy"}
                      decoding={idx === 0 ? "sync" : "async"}
                      width="1200"
                      height="600"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                      className="w-full h-full object-cover object-center animate-ken-burns scale-105 transition-transform duration-1000 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/75 z-20"></div>
                  </div>
                );
              })}
          </div>

          <div className="relative z-30 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Civic / Active Landmark Pill Badge */}
            {dynamicHeroSlides.length > 0 ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/30 text-xs text-slate-100 font-medium mb-5 shadow-2xl animate-fade-in-up">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-amber-300 font-bold">
                  📍 {dynamicHeroSlides[heroSlideIndex % dynamicHeroSlides.length]?.location || "Fazilnagar"}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-semibold text-white">
                  {dynamicHeroSlides[heroSlideIndex % dynamicHeroSlides.length]?.title || "Official Civic Portal"}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-slate-100 font-medium mb-5 shadow-xl animate-fade-in-up">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-emerald-300 font-bold">
                  📍 {siteSettings.heroContent?.badgeLocation || "Official Civic Portal"}
                </span>
                <span className="text-slate-400">•</span>
                <span className="font-semibold text-slate-200">
                  {siteSettings.heroContent?.badgeTitle || "Nagar Panchayat Fazilnagar • Kushinagar (PIN 274401)"}
                </span>
              </div>
            )}

            {/* Master Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight font-heading drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
              {siteSettings.heroContent?.heading || siteSettings.siteName || "Fazilnagar Town Civic & Local Directory"}
              <span className="block text-xl sm:text-3xl lg:text-3.5xl text-[#FF4D5A] font-bold mt-2 drop-shadow-[0_4px_16px_rgba(255,77,90,0.6)]">
                {siteSettings.heroContent?.subtitleHindi || siteSettings.taglineHindi || siteSettings.tagline || "Apna Fazilnagar, Apni Pehchaan"}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-100 max-w-2xl mx-auto mb-9 font-medium leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
              {siteSettings.heroContent?.description || siteSettings.seo?.metaDescription ||
                "Fazilnagar Town Official Civic & Local Directory Portal (PIN 274401, Kushinagar, Uttar Pradesh). Discover verified places, healthcare, schools, emergency helplines, shops, and community updates."}
            </p>

          {/* Smart Search Bar */}
          <div className="max-w-2xl mx-auto relative text-left">
            <div className="bg-white rounded-2xl p-2 shadow-2xl flex flex-col sm:flex-row items-center gap-2 border border-[#E1E6EA]">
              <div className="flex items-center gap-3 w-full px-3 py-2 text-[#18232E]">
                <Search className="w-5 h-5 text-[#647180] flex-shrink-0" />
                <input
                  type="text"
                  placeholder={siteSettings.heroContent?.searchPlaceholder || "Search schools, hospitals, medical stores, sweet shops…"}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setDropdownOpen(Boolean(e.target.value.trim()));
                  }}
                  onFocus={() => {
                    if (searchQuery.trim()) setDropdownOpen(true);
                  }}
                  className="w-full text-xs sm:text-sm outline-none bg-transparent placeholder-slate-400 text-[#18232E] font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setDropdownOpen(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  if (!searchQuery.trim()) {
                    showToast("Please enter a keyword to search town directory.");
                    return;
                  }
                  navigate(`/directory?search=${encodeURIComponent(searchQuery)}`);
                }}
                className="w-full sm:w-auto bg-[#18232E] hover:bg-[#B8323C] text-white px-6 py-2.5 rounded-xl font-bold text-xs tracking-wide transition shadow-sm whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{siteSettings.heroContent?.searchButtonText || "Search"}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
              </button>
            </div>

            {/* Smart Search Suggestions Dropdown */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-[#E1E6EA] z-50 overflow-hidden max-h-80 overflow-y-auto animate-slide-down">
                <div className="p-3 border-b border-slate-100 text-[11px] font-bold text-[#647180] uppercase tracking-wider flex justify-between items-center">
                  <span>Verified Town Results</span>
                  <span className="text-[#0D5E49] font-bold">{searchMatches.length} matches</span>
                </div>
                {searchMatches.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    <p className="text-xs font-semibold text-slate-800">No matching places found inside town boundary</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Search by category like "Schools", "Hospital", "Sweets", or road name "College Road".
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {searchMatches.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectLocation(item)}
                        className="p-3.5 hover:bg-slate-50 cursor-pointer transition flex items-center justify-between"
                      >
                        <div className="pr-2">
                          <span className="text-[10px] font-bold text-[#B8323C] uppercase tracking-wider block">
                            {item.category}
                          </span>
                          <h5 className="text-xs font-bold text-[#18232E]">{item.name}</h5>
                          <p className="text-[11px] text-[#647180] line-clamp-1">{item.landmark}</p>
                        </div>
                        <span className="text-xs font-semibold text-[#0D5E49] flex items-center gap-1">
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Primary CTA Buttons with Smooth Animations & CMS Configuration */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {((siteSettings.heroContent?.actionButtons && siteSettings.heroContent.actionButtons.length > 0)
              ? siteSettings.heroContent.actionButtons
              : DEFAULT_SITE_SETTINGS.heroContent.actionButtons
            )
              .filter((btn) => btn && btn.isActive !== false)
              .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
              .map((btn) => {
                const IconComponent = HERO_ICON_MAP[btn.icon] || Compass;
                const variantClasses = HERO_BUTTON_VARIANTS[btn.variant] || HERO_BUTTON_VARIANTS.primary;
                const commonClasses = `inline-flex items-center gap-2 ${variantClasses} text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg transition cursor-pointer hover:scale-105 active:scale-95 duration-200`;

                if (btn.isLink) {
                  if (btn.target && btn.target.startsWith("http")) {
                    return (
                      <a
                        key={btn.id || btn.label}
                        href={btn.target}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={commonClasses}
                      >
                        <IconComponent className="w-4 h-4" />
                        <span>{btn.label}</span>
                      </a>
                    );
                  }
                  return (
                    <Link
                      key={btn.id || btn.label}
                      to={btn.target || "/directory"}
                      className={commonClasses}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span>{btn.label}</span>
                    </Link>
                  );
                }

                return (
                  <button
                    key={btn.id || btn.label}
                    onClick={(e) => handleSmoothScroll(e, btn.target || "explore-categories")}
                    className={commonClasses}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{btn.label}</span>
                  </button>
                );
              })}
          </div>

          {/* Town Trust Badges */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-300">
            {((siteSettings.heroContent?.trustBadges && siteSettings.heroContent.trustBadges.length > 0)
              ? siteSettings.heroContent.trustBadges
              : DEFAULT_SITE_SETTINGS.heroContent.trustBadges
            ).map((badge, idx) => {
              const IconComponent = HERO_ICON_MAP[badge.icon] || ShieldCheck;
              return (
                <span key={badge.id || idx} className="flex items-center gap-1.5">
                  <IconComponent className="w-4 h-4 text-emerald-400" /> {badge.text}
                </span>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* ========================================================
          SECTION 3: EXPLORE FAZILNAGAR (21 Clickable Categories)
          ======================================================== */}
      <section id="explore-categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8323C] uppercase tracking-wider mb-1">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{siteSettings?.homepageSections?.explore?.badge || "Civic Directory Index"}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#18232E] tracking-tight font-heading">
              {siteSettings?.homepageSections?.explore?.title || "Explore Fazilnagar"}
            </h2>
            <p className="text-xs sm:text-sm text-[#647180] mt-1">
              {siteSettings?.homepageSections?.explore?.subtitle || "Verified institutions across schools, colleges, hospitals, and fuel stations."}
            </p>
          </div>
          <Link
            to="/directory"
            className="text-xs font-bold px-4 py-2.5 rounded-xl bg-[#18232E] hover:bg-[#B8323C] text-white transition self-start md:self-auto cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 duration-150"
          >
            <span>{siteSettings?.homepageSections?.explore?.viewAllText || "Open Full Directory"}</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
          </Link>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 transition-all duration-300">
          {EXPLORE_21_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.id}
                to={cat.query === "all" ? "/directory" : `/directory?category=${encodeURIComponent(cat.query)}`}
                className="group bg-white p-3.5 rounded-xl border border-[#E1E6EA] hover:border-[#CBD5E1] hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="w-9 h-9 rounded-lg bg-[#F5F7F8] text-[#18232E] flex items-center justify-center mb-2.5 group-hover:bg-[#18232E] group-hover:text-white transition">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#18232E] group-hover:text-[#B8323C] transition line-clamp-1 leading-snug">
                    {cat.name}
                  </h3>
                  <span className="text-[10px] text-[#647180] font-medium block mt-0.5">
                    {cat.count} listings
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom Collapse Button when expanded */}
        {isDirectoryExpanded && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={toggleDirectoryExpanded}
              className="text-xs font-bold px-5 py-2.5 rounded-xl bg-[#18232E] hover:bg-[#B8323C] text-white transition cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95 duration-150"
            >
              <span>Close Directory</span>
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        )}
      </section>

      {/* Dedicated Homepage Advertisement Slot (Zero footprint when inactive/unpublished) */}
      <AdvertisementSlot />

      {/* ========================================================
          SECTION 4: ESSENTIAL SERVICES (High-Priority Civic Hub)
          ======================================================== */}
      <section className="bg-white py-16 border-y border-[#E1E6EA] content-visibility-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D5E49] uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{siteSettings?.homepageSections?.publicServices?.badge || "Public Welfare & Emergency"}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18232E] tracking-tight font-heading">
              {siteSettings?.homepageSections?.publicServices?.title || "Essential Public Services"}
            </h2>
            <p className="text-xs sm:text-sm text-[#647180] mt-1">
              {siteSettings?.homepageSections?.publicServices?.subtitle || "Emergency numbers, primary healthcare, pharmacy points, and administrative offices in Fazilnagar."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {((siteSettings?.homepageSections?.publicServices?.cards && siteSettings.homepageSections.publicServices.cards.length > 0)
              ? siteSettings.homepageSections.publicServices.cards
              : DEFAULT_SITE_SETTINGS.homepageSections.publicServices.cards
            ).map((card, idx) => (
              <div key={card.id || idx} className="bg-[#F5F7F8] p-5 rounded-2xl border border-[#E1E6EA] flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-[#B8323C] uppercase tracking-wider block mb-1">
                    {card.badge}
                  </span>
                  <h3 className="text-sm font-bold text-[#18232E]">{card.title}</h3>
                  <p className="text-xs text-[#647180] mt-1">{card.address}</p>
                  <p className="text-[11px] text-slate-600 mt-2">
                    {card.description}
                  </p>
                </div>
                <div className="pt-4 border-t border-[#E1E6EA] mt-4 flex items-center justify-between">
                  {card.phone ? (
                    <a href={`tel:${card.phone.replace(/[^0-9+]/g, "")}`} className="text-xs font-bold text-[#18232E] hover:text-[#B8323C]">
                      {card.phoneLabel || `📞 ${card.phone}`}
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-semibold">{card.hours || "General"}</span>
                  )}
                  {card.directions && (
                    <button
                      type="button"
                      onClick={() => openGoogleMapsDirections({ name: card.title, landmark: card.address, lat: 26.6827, lng: 84.0498 })}
                      className="text-xs font-bold text-[#0D5E49] hover:underline cursor-pointer"
                    >
                      Directions
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 5: EXPLORE FAZILNAGAR ON MAP (Leaflet Synchronized)
          ======================================================== */}
      <section id="town-map-section" className="py-16 content-visibility-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D5E49] uppercase tracking-wider mb-1">
                <Map className="w-3.5 h-3.5" />
                <span>{siteSettings?.homepageSections?.map?.badge || "Geospatial Verification"}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18232E] tracking-tight font-heading">
                {siteSettings?.homepageSections?.map?.title || "Explore Fazilnagar on Map"}
              </h2>
              <p className="text-xs sm:text-sm text-[#647180] mt-1">
                {siteSettings?.homepageSections?.map?.subtitle || "Every pin uses exact decimal coordinates along the NH-27, College Road, and Hospital Road axis."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setCommunityModalOpen(true)}
                className="bg-[#0D5E49] hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Add place with exact map location and images (4-Step Wizard)"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Add Place</span>
              </button>

              {/* Map & List View Toggle */}
              <div className="bg-white p-1 rounded-xl border border-[#E1E6EA] flex items-center text-xs font-semibold">
                <button
                  onClick={() => setMapViewMode("map")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    mapViewMode === "map" ? "bg-[#18232E] text-white" : "text-[#647180] hover:text-[#18232E]"
                  }`}
                >
                  Map View
                </button>
                <button
                  onClick={() => setMapViewMode("list")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    mapViewMode === "list" ? "bg-[#18232E] text-white" : "text-[#647180] hover:text-[#18232E]"
                  }`}
                >
                  List View
                </button>
              </div>

              <div className="text-[11px] text-[#18232E] bg-white px-3 py-1.5 rounded-xl border border-[#E1E6EA] font-semibold hidden sm:flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0D5E49] animate-pulse"></span>
                <span>{siteSettings?.homepageSections?.map?.coordinatesText || "26.6827° N, 84.0498° E"}</span>
              </div>
            </div>
          </div>

          {/* Map Category Filters */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-3 mb-4 text-xs font-semibold custom-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {MAP_CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setMapFilter(tab.id);
                  setSelectedPlace(null);
                }}
                className={`px-3 sm:px-3.5 py-1.5 rounded-xl whitespace-nowrap transition border cursor-pointer ${
                  mapFilter === tab.id
                    ? "bg-[#18232E] text-white border-[#18232E]"
                    : "bg-white border-[#E1E6EA] text-[#647180] hover:bg-slate-50 hover:text-[#18232E]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Map Content */}
          {mapViewMode === "map" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Leaflet Map Frame */}
              <div className="lg:col-span-2 bg-white rounded-2xl overflow-hidden border border-[#E1E6EA] shadow-xs relative min-h-[290px] h-[310px] sm:h-[420px] lg:h-[480px]">
                {isMapVisible ? (
                  <Suspense
                    fallback={
                      <div className="w-full h-full min-h-[290px] bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-2">
                        <div className="w-6 h-6 border-2 border-slate-300 border-t-[#B8323C] rounded-full animate-spin" />
                        <span className="text-xs font-semibold">Loading Town Map…</span>
                      </div>
                    }
                  >
                    <TownInteractiveMap
                      places={places}
                      mapFilter={mapFilter}
                      selectedPlace={selectedPlace}
                      onSelectPlace={setSelectedPlace}
                      matchesCategory={matchesCategory}
                    />
                  </Suspense>
                ) : (
                  <div className="w-full h-full min-h-[290px] bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <MapPin className="w-7 h-7 text-[#B8323C]/60 animate-bounce" />
                    <span className="text-xs font-semibold text-slate-500">Interactive OpenStreetMap</span>
                  </div>
                )}
              </div>

              {/* Category Places List View (Maintains list visible at all times per user requirement) */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E1E6EA] shadow-xs flex flex-col justify-between h-full min-h-[360px] sm:min-h-[440px] animate-fade-in-up">
                <div className="flex flex-col h-full">
                  <div className="pb-3 border-b border-[#E1E6EA] mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#18232E] flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#B8323C]" />
                        <span>{currentMapTabLabel}</span>
                      </span>
                      <span className="text-[11px] font-bold bg-slate-100 text-[#18232E] px-2.5 py-0.5 rounded-full">
                        {filteredMapPlaces.length} places
                      </span>
                    </div>
                    <p className="text-[11px] text-[#647180] mt-1">
                      Click any place below to zoom & highlight pin on map:
                    </p>
                  </div>

                  <div className="space-y-2 overflow-y-auto max-h-[360px] lg:max-h-[420px] pr-1 custom-scrollbar flex-1">
                    {filteredMapPlaces.length === 0 ? (
                      <div className="text-center py-10 text-xs text-[#647180]">
                        No verified places found in this category.
                      </div>
                    ) : (
                      filteredMapPlaces.map((p) => {
                        const isSelected = selectedPlace && (
                          (selectedPlace.id && (selectedPlace.id === p.id || selectedPlace.id === p._id)) ||
                          (selectedPlace._id && (selectedPlace._id === p._id || selectedPlace._id === p.id)) ||
                          selectedPlace.name === p.name
                        );
                        return (
                          <div
                            key={p.id || p._id}
                            onClick={() => {
                              setSelectedPlace(p);
                            }}
                            className={`p-3 rounded-xl border transition cursor-pointer group flex items-start justify-between gap-2 shadow-2xs ${
                              isSelected
                                ? "border-blue-500 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/30"
                                : "border-[#E1E6EA] hover:border-[#B8323C] bg-[#F5F7F8] hover:bg-white"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                                  isSelected ? "bg-blue-100 text-blue-800" : "bg-red-50 text-[#B8323C]"
                                }`}>
                                  {p.badge || p.subcategory || p.category}
                                </span>
                                {isSelected ? (
                                  <span className="text-[9px] text-blue-700 bg-white/90 px-1.5 py-0.2 rounded-full border border-blue-200 font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                    <span>Pinned & Zoomed</span>
                                  </span>
                                ) : (
                                  p.phone && (
                                    <span className="text-[9px] text-[#0D5E49] font-semibold">
                                      Verified
                                    </span>
                                  )
                                )}
                              </div>
                              <h3 className={`text-sm font-bold transition mt-1 truncate ${
                                isSelected ? "text-blue-900" : "text-[#18232E] group-hover:text-[#B8323C]"
                              }`}>
                                {p.name}
                              </h3>
                              {p.nameHindi && (
                                <p className="text-[10px] text-[#647180] truncate">{p.nameHindi}</p>
                              )}
                              <p className="text-[11px] text-[#647180] flex items-center gap-1 mt-1 truncate">
                                <MapPin className={`w-3 h-3 shrink-0 ${isSelected ? "text-blue-600 animate-bounce" : "text-slate-400"}`} />
                                <span>{p.landmark || p.address}</span>
                              </p>
                            </div>
                            <div className="shrink-0 pt-2 flex items-center gap-1">
                              {isSelected && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openGoogleMapsDirections(p);
                                  }}
                                  className="text-[10px] font-bold text-white bg-[#0D5E49] hover:bg-emerald-700 px-2 py-1 rounded-lg shadow-2xs transition"
                                  title="Get Google Maps Directions"
                                >
                                  🧭 Go
                                </button>
                              )}
                              <ChevronRight className={`w-4 h-4 transition shrink-0 ${
                                isSelected ? "text-blue-600" : "text-slate-400 group-hover:text-[#B8323C] group-hover:translate-x-0.5"
                              }`} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Map Alternative List View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
              {places
                .filter((p) => mapFilter === "all" || p.category === mapFilter || p.subcategory === mapFilter)
                .map((p) => (
                  <div key={p.id} className="bg-white p-5 rounded-2xl border border-[#E1E6EA] shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-[10px] font-bold text-[#B8323C] uppercase">{p.category}</span>
                        <span className="text-[11px] text-[#0D5E49] font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Verified
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-[#18232E] mb-1">{p.name}</h3>
                      <p className="text-xs text-[#647180] mb-2">{p.landmark}</p>
                      <p className="text-xs text-slate-600 line-clamp-2">{p.desc}</p>
                    </div>
                    <div className="pt-3 border-t border-[#E1E6EA] mt-3 flex items-center justify-between text-xs">
                      <span className="text-[#647180] text-[11px]">{p.hours}</span>
                      <button
                        type="button"
                        onClick={() => openGoogleMapsDirections(p)}
                        className="text-[#0D5E49] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Directions <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================
          SECTION 6: DISCOVER LOCAL BUSINESSES (Verified Shops)
          ======================================================== */}
      <section className="bg-white py-16 border-b border-[#E1E6EA] content-visibility-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8323C] uppercase tracking-wider mb-1">
                <Store className="w-3.5 h-3.5" />
                <span>Commerce & Retail</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18232E] tracking-tight font-heading">
                Discover Local Businesses
              </h2>
              <p className="text-xs sm:text-sm text-[#647180] mt-1">
                Authentic sweet houses, bakeries, medical stores, and retail markets serving Fazilnagar town.
              </p>
            </div>
            <Link
              to="/directory?category=Sweet%20Shops%20%26%20Bakeries"
              className="text-xs font-bold text-[#B8323C] hover:underline flex items-center gap-1"
            >
              <span>View All Shops</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Prashant Sweet House */}
            <div className="bg-[#F5F7F8] p-5 rounded-2xl border border-[#E1E6EA] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#B8323C] uppercase">Sweet Shop & Chaat</span>
                <h3 className="text-sm font-bold text-[#18232E] mt-1">Prashant Sweet House</h3>
                <p className="text-xs text-[#647180] mt-0.5">Main Market, NH-27 Chowk</p>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                  Famous for pure desi ghee peda, rasgulla, morning kachori-jalebi, and evening chaat snacks.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E1E6EA] mt-4 flex items-center justify-between text-xs">
                <a href="tel:09839245678" className="font-bold text-[#18232E] hover:text-[#B8323C]">
                  Call Shop
                </a>
                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections({ name: "Prashant Sweet House", lat: 26.6833, lng: 84.0502, landmark: "Main Market, NH-27 Chowk, Fazilnagar" })}
                  className="font-bold text-[#0D5E49] hover:underline cursor-pointer"
                >
                  Directions
                </button>
              </div>
            </div>

            {/* Kanha Sweets */}
            <div className="bg-[#F5F7F8] p-5 rounded-2xl border border-[#E1E6EA] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#B8323C] uppercase">Mithai & Snacks</span>
                <h3 className="text-sm font-bold text-[#18232E] mt-1">Kanha Sweets</h3>
                <p className="text-xs text-[#647180] mt-0.5">College Road Crossing</p>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                  Specialty sweets, fresh milk paneer, and authentic namkeen prepared daily with verified purity.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E1E6EA] mt-4 flex items-center justify-between text-xs">
                <a href="tel:09450987654" className="font-bold text-[#18232E] hover:text-[#B8323C]">
                  Call Shop
                </a>
                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections({ name: "Kanha Sweets", lat: 26.6844, lng: 84.0506, landmark: "College Road Crossing, Fazilnagar" })}
                  className="font-bold text-[#0D5E49] hover:underline cursor-pointer"
                >
                  Directions
                </button>
              </div>
            </div>

            {/* Amit Medical Store */}
            <div className="bg-[#F5F7F8] p-5 rounded-2xl border border-[#E1E6EA] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#0D5E49] uppercase">Retail Pharmacy</span>
                <h3 className="text-sm font-bold text-[#18232E] mt-1">Amit Medical Store</h3>
                <p className="text-xs text-[#647180] mt-0.5">College Road, Fazilnagar</p>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                  Licensed retail chemist providing allopathic pharmaceuticals, surgical kits, and health monitors.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E1E6EA] mt-4 flex items-center justify-between text-xs">
                <a href="tel:09450812345" className="font-bold text-[#18232E] hover:text-[#B8323C]">
                  Call Chemist
                </a>
                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections({ name: "Amit Medical Store", lat: 26.6846, lng: 84.0503, landmark: "College Road, Fazilnagar" })}
                  className="font-bold text-[#0D5E49] hover:underline cursor-pointer"
                >
                  Directions
                </button>
              </div>
            </div>

            {/* Maurya Electronics */}
            <div className="bg-[#F5F7F8] p-5 rounded-2xl border border-[#E1E6EA] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#647180] uppercase">Electronics & Mobile</span>
                <h3 className="text-sm font-bold text-[#18232E] mt-1">Maurya Electronics & Mobile</h3>
                <p className="text-xs text-[#647180] mt-0.5">Babu Bazar, Fazilnagar</p>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                  Smartphones, home appliances, inverter battery care, and chip-level device repair services.
                </p>
              </div>
              <div className="pt-3 border-t border-[#E1E6EA] mt-4 flex items-center justify-between text-xs">
                <a href="tel:09838877665" className="font-bold text-[#18232E] hover:text-[#B8323C]">
                  Call Store
                </a>
                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections({ name: "Maurya Electronics & Mobile", lat: 26.6827, lng: 84.0486, landmark: "Babu Bazar, Fazilnagar" })}
                  className="font-bold text-[#0D5E49] hover:underline cursor-pointer"
                >
                  Directions
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 7: SCHOOLS & COLLEGES (Education Preview)
          ======================================================== */}
      <section className="py-16 content-visibility-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8323C] uppercase tracking-wider mb-1">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Education Directory</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18232E] tracking-tight font-heading">
                Schools & Colleges in Town
              </h2>
              <p className="text-xs sm:text-sm text-[#647180] mt-1">
                Verified educational institutions located within Fazilnagar town boundary.
              </p>
            </div>
            <Link
              to="/directory?category=Schools%20%26%20Colleges"
              className="text-xs font-bold bg-[#18232E] hover:bg-[#B8323C] text-white px-4 py-2.5 rounded-xl transition self-start md:self-auto"
            >
              View All Schools & Colleges →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Sanskar Central Academy */}
            <div className="bg-white p-5 rounded-2xl border border-[#E1E6EA] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[10px] font-bold text-[#B8323C] uppercase bg-red-50 px-2 py-0.5 rounded">
                    CBSE English Medium
                  </span>
                  <span className="text-[11px] text-[#0D5E49] font-bold">Nursery – Class XII</span>
                </div>
                <h3 className="text-base font-bold text-[#18232E] mb-1">Sanskar Central Academy</h3>
                <p className="text-xs text-[#647180] mb-3">Durga Bhawan Campus, College Road</p>
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  Established CBSE-affiliated co-educational academy with smart computer labs, audio-visual classes, and sports training.
                </p>
              </div>
              <div className="pt-4 border-t border-[#E1E6EA] mt-4 flex items-center justify-between text-xs">
                <a href="tel:09452089540" className="font-bold text-[#18232E] hover:text-[#B8323C]">
                  📞 094520 89540
                </a>
                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections({ name: "Sanskar Central Academy", lat: 26.6852, lng: 84.0508, landmark: "Durga Bhawan Campus, College Road, Fazilnagar" })}
                  className="font-bold text-[#0D5E49] hover:underline cursor-pointer"
                >
                  Directions
                </button>
              </div>
            </div>

            {/* Pawanagar Mahavir Inter College */}
            <div className="bg-white p-5 rounded-2xl border border-[#E1E6EA] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[10px] font-bold text-slate-700 uppercase bg-slate-100 px-2 py-0.5 rounded">
                    UP Board Sr. Secondary
                  </span>
                  <span className="text-[11px] text-[#0D5E49] font-bold">Class VI – XII</span>
                </div>
                <h3 className="text-base font-bold text-[#18232E] mb-1">Pawanagar Mahavir Inter College</h3>
                <p className="text-xs text-[#647180] mb-3">College Road, Fazilnagar</p>
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  Historic town anchor college offering Science, Commerce, and Arts streams with extensive athletic grounds.
                </p>
              </div>
              <div className="pt-4 border-t border-[#E1E6EA] mt-4 flex items-center justify-between text-xs">
                <a href="tel:05564222115" className="font-bold text-[#18232E] hover:text-[#B8323C]">
                  📞 05564-222115
                </a>
                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections({ name: "Pawanagar Mahavir Inter College", lat: 26.6848, lng: 84.0510, landmark: "College Road, Fazilnagar" })}
                  className="font-bold text-[#0D5E49] hover:underline cursor-pointer"
                >
                  Directions
                </button>
              </div>
            </div>

            {/* The Hermitage School */}
            <div className="bg-white p-5 rounded-2xl border border-[#E1E6EA] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded">
                    English Medium Primary
                  </span>
                  <span className="text-[11px] text-[#0D5E49] font-bold">KG – Middle</span>
                </div>
                <h3 className="text-base font-bold text-[#18232E] mb-1">The Hermitage School</h3>
                <p className="text-xs text-[#647180] mb-3">Hospital Road (Near Sarkari Hospital)</p>
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  Quality foundational school focusing on language fluency, cognitive development, and creative extracurriculars.
                </p>
              </div>
              <div className="pt-4 border-t border-[#E1E6EA] mt-4 flex items-center justify-between text-xs">
                <a href="tel:09919523411" className="font-bold text-[#18232E] hover:text-[#B8323C]">
                  📞 099195 23411
                </a>
                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections({ name: "The Hermitage School", lat: 26.6821, lng: 84.0526, landmark: "Hospital Road, Fazilnagar" })}
                  className="font-bold text-[#0D5E49] hover:underline cursor-pointer"
                >
                  Directions
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION: UPCOMING EVENTS & TOWN MELAS (Religious Melas & Civic Festivals)
          ======================================================== */}
      <section id="events-melas-section" className="bg-white py-16 border-t border-[#E1E6EA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>{siteSettings?.homepageSections?.events?.badge || "Town Fairs, Melas & Cultural Celebrations"}</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#18232E] tracking-tight font-heading">
                {siteSettings?.homepageSections?.events?.title || "Upcoming Events & Town Melas"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                {siteSettings?.homepageSections?.events?.subtitle || "Experience the vibrant community life of Fazilnagar — from the sacred Pawapuri Nirvana Mela to civic festivals, devotional aartis, and annual town gatherings."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalType("event");
                  setCommunityModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 bg-[#0D5E49] hover:bg-[#0a4838] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{siteSettings?.homepageSections?.events?.ctaText || "+ Submit Event / Mela"}</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
            {eventCategories.map((cat) => {
              const count = cat === "All"
                ? events.filter((e) => e.isPublished !== false && e.status !== "draft").length
                : events.filter((e) => (e.isPublished !== false && e.status !== "draft") && e.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedEventCategory(cat)}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedEventCategory === cat
                      ? "bg-[#18232E] text-white shadow-xs"
                      : "bg-[#F5F7F8] hover:bg-slate-200 text-slate-700 border border-[#E1E6EA]"
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    selectedEventCategory === cat ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Events Grid */}
          {filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((evt) => {
                const eventDate = evt.startDate ? new Date(evt.startDate) : null;
                const monthStr = eventDate && !isNaN(eventDate.getTime())
                  ? eventDate.toLocaleDateString("en-IN", { month: "short" }).toUpperCase()
                  : "TBD";
                const dayStr = eventDate && !isNaN(eventDate.getTime()) ? eventDate.getDate() : "—";
                const yearStr = eventDate && !isNaN(eventDate.getTime()) ? eventDate.getFullYear() : "";

                return (
                  <article
                    key={evt._id || evt.id}
                    className="group bg-white rounded-2xl border border-[#E1E6EA] hover:border-amber-300 shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Banner Image with Badges */}
                      <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
                        {evt.bannerImage ? (
                          <img
                            src={evt.bannerImage}
                            alt={evt.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-900/60 via-slate-900 to-[#18232E] flex items-center justify-center">
                            <Calendar className="w-12 h-12 text-amber-300/40" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-amber-200/80 shadow-2xs">
                            {evt.category || "Event"}
                          </span>
                          {evt.isFeatured && (
                            <span className="text-[10px] font-bold text-amber-900 bg-gradient-to-r from-amber-300 to-amber-400 px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                              ★ Featured Mela
                            </span>
                          )}
                        </div>

                        {/* Date Ribbon Badge */}
                        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-xl p-2 text-center shadow-md border border-white/60 min-w-[50px]">
                          <span className="block text-[9px] font-extrabold text-red-600 leading-none">
                            {monthStr}
                          </span>
                          <span className="block text-base font-black text-slate-900 leading-tight">
                            {dayStr}
                          </span>
                          {yearStr && (
                            <span className="block text-[8px] font-semibold text-slate-500 leading-none">
                              {yearStr}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="p-5 space-y-3">
                        <div>
                          <h3 className="text-base font-bold text-[#18232E] group-hover:text-amber-800 transition-colors line-clamp-2">
                            {evt.title}
                          </h3>
                          {evt.titleHindi && (
                            <p className="text-xs text-amber-900/80 font-hindi font-medium mt-0.5 line-clamp-1">
                              {evt.titleHindi}
                            </p>
                          )}
                        </div>

                        {/* Timing & Venue */}
                        <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
                          {evt.timeString && (
                            <div className="flex items-center gap-2 text-[11px]">
                              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="font-medium text-slate-700">{evt.timeString}</span>
                            </div>
                          )}
                          <div className="flex items-start gap-2 text-[11px]">
                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <span className="line-clamp-1 text-slate-700 font-medium">
                              {evt.venue}{evt.address ? ` • ${evt.address}` : ""}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                          {evt.summary || evt.description}
                        </p>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-[#F5F7F8]/70 border-t border-[#E1E6EA] flex items-center justify-between text-xs gap-2">
                      <span className="text-[11px] text-slate-500 truncate max-w-[140px]" title={evt.organizer}>
                        {evt.organizer ? `Org: ${evt.organizer}` : "Civic Committee"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.share) {
                              navigator.share({
                                title: evt.title,
                                text: `${evt.title} at ${evt.venue}, Fazilnagar`,
                                url: window.location.href,
                              }).catch(() => {});
                            } else {
                              navigator.clipboard?.writeText(`${evt.title} - ${evt.venue}, Fazilnagar. Details: ${window.location.href}`);
                              showToast("Event details copied to clipboard!");
                            }
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-white transition cursor-pointer"
                          title="Share event"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openGoogleMapsDirections({
                            name: evt.venue,
                            lat: evt.latitude || 26.6827,
                            lng: evt.longitude || 84.0498,
                            landmark: evt.address || "Fazilnagar",
                          })}
                          className="font-bold text-[#0D5E49] hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 px-2.5 py-1 rounded-lg text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>Directions</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#F5F7F8] rounded-2xl border border-[#E1E6EA] p-10 text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No scheduled events in this category</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No festivals or melas are currently listed for "{selectedEventCategory}". Check other categories or submit an announcement to town administration.
              </p>
              <button
                type="button"
                onClick={() => setSelectedEventCategory("All")}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                View All Town Events
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================
          SECTION 8: LOCAL NEWS & CIVIC BULLETINS (Dated & Credible)
          ======================================================== */}
      <section id="local-updates-section" className="bg-[#18232E] text-white py-16 content-visibility-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
                <Bell className="w-3.5 h-3.5" />
                <span>Dated Community Bulletins</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading">
                Local News & Civic Bulletins
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Official notices and community happenings verified from local organizers.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/news"
                className="text-red-400 hover:text-white text-xs font-bold inline-flex items-center gap-1 transition"
              >
                <span>View All Updates ({liveNews.length > 0 ? liveNews.length : 3}) →</span>
              </Link>
              <Link
                to="/create-news"
                className="inline-flex items-center gap-1.5 bg-[#B8323C] hover:bg-[#991B1B] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Post News</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {liveNews.length > 0 ? (
              liveNews.slice(0, 3).map((item) => (
                <div
                  key={item._id || item.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all group"
                >
                  {item.image && (
                    <div className="h-40 w-full overflow-hidden bg-slate-950">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider bg-red-950/60 px-2 py-0.5 rounded border border-red-800/40">
                          {item.category || "General"}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })
                            : "Recent"}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mb-1.5 group-hover:text-red-300 transition-colors line-clamp-2">
                        {item.title}
                      </h3>
                      {item.titleHi && (
                        <p className="text-xs text-slate-400 font-serif line-clamp-1 mb-1">
                          {item.titleHi}
                        </p>
                      )}
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                    </div>
                    <div className="pt-4 border-t border-slate-800/80 mt-4 text-[11px] text-slate-400 flex items-center justify-between">
                      <span className="truncate">By {item.author?.name || "Local Reporter"}</span>
                      <Link to="/news" className="text-red-400 hover:text-red-300 font-semibold shrink-0 ml-2">
                        Read Bulletin →
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <>
                {/* Event 1 */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-[10px] font-bold text-amber-400 uppercase">Cultural Heritage</span>
                      <span className="text-[11px] text-slate-400">Annual Festival</span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1.5">
                      Kartik Poornima & Nirvana Mahotsav at Pawanagar
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Traditional annual pilgrimage gathering following Diwali celebrating the nirvana legacy of Lord Mahavira at the historic shrine.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-800 mt-4 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Source: Pawanagar Trust</span>
                    <span className="text-emerald-400 font-semibold">Post-Diwali</span>
                  </div>
                </div>

                {/* Event 2 */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-[10px] font-bold text-[#0D5E49] uppercase">Healthcare Routine</span>
                      <span className="text-[11px] text-slate-400">Every Wednesday</span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1.5">
                      Weekly Immunization & Maternal Day at CHC Fazilnagar
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Public health team conducts designated infant immunizations, maternal nutrition checkups, and child wellness counseling.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-800 mt-4 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Source: CHC Health Desk</span>
                    <span className="text-emerald-400 font-semibold">Weekly</span>
                  </div>
                </div>

                {/* Event 3 */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-[10px] font-bold text-blue-400 uppercase">Civic Works</span>
                      <span className="text-[11px] text-slate-400">Highway Corridor</span>
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1.5">
                      NH-27 Highway Service Road Beautification & Lighting
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Town civic maintenance program underway for solar streetlight installation and pedestrian pathway clearing at Main Chowk.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-800 mt-4 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Source: Town Civic Circle</span>
                    <span className="text-emerald-400 font-semibold">In Progress</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 9: ABOUT FAZILNAGAR & KUSHINAGAR (History & Culture)
          ======================================================== */}
      <section id="about-fazilnagar-section" className="py-16 bg-white border-t border-[#E1E6EA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8323C] uppercase tracking-wider mb-2 bg-red-50 px-3 py-1 rounded-full border border-red-100">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{siteSettings?.homepageSections?.heritage?.badge || "Town Profile, Antiquity & Sacred Heritage"}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#18232E] tracking-tight mb-3 font-heading">
              {siteSettings?.homepageSections?.heritage?.title || "Fazilnagar & Kushinagar: The Sacred Twin Heritage"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {siteSettings?.homepageSections?.heritage?.subtitle || "Explore the deep 2,600-year-old antiquity, sacred spiritual milestones of Bhagwan Mahavira and Lord Buddha, and modern civic significance of the two historic capitals of the ancient Malla Republic."}
            </p>

            {/* Interactive Tab Switcher */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6 p-1.5 bg-[#F5F7F8] rounded-2xl border border-[#E1E6EA] max-w-xl mx-auto">
              <button
                type="button"
                onClick={() => setAboutTab("fazilnagar")}
                className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  aboutTab === "fazilnagar"
                    ? "bg-[#18232E] text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <span>{siteSettings?.homepageSections?.heritage?.tab1Label || "🏛️ Fazilnagar (Pawanagar)"}</span>
              </button>
              <button
                type="button"
                onClick={() => setAboutTab("kushinagar")}
                className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  aboutTab === "kushinagar"
                    ? "bg-[#18232E] text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <span>{siteSettings?.homepageSections?.heritage?.tab2Label || "☸️ Kushinagar (Mahaparinirvana)"}</span>
              </button>
              <button
                type="button"
                onClick={() => setAboutTab("connection")}
                className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  aboutTab === "connection"
                    ? "bg-[#18232E] text-white shadow-md"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <span>{siteSettings?.homepageSections?.heritage?.tab3Label || "✨ The Twin Sacred Bond"}</span>
              </button>
            </div>
          </div>

          {/* TAB 1: FAZILNAGAR (PAWANAGAR) */}
          {aboutTab === "fazilnagar" && (
            <div className="space-y-8 animate-fadeIn">
              {/* Dynamic Image Gallery Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fazilnagarSites.map((site) => (
                  <div
                    key={site._id || site.slug || site.name}
                    className="group relative rounded-2xl overflow-hidden shadow-lg border border-[#E1E6EA] bg-slate-900 aspect-16/10 flex flex-col justify-end"
                  >
                    <img
                      src={site.primaryImage || "/images/fazilnagar_pawanagar.webp"}
                      alt={site.name}
                      width="800"
                      height="500"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="relative z-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 flex flex-col justify-end space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-950/85 border border-amber-600/50 px-2 py-0.5 rounded-full w-fit">
                          {site.category || "Jain Heritage"}
                        </span>
                        {site.distanceFromFazilnagarCenter && (
                          <span className="text-[10px] font-semibold text-slate-300 bg-black/50 px-2 py-0.5 rounded-full border border-white/20">
                            📍 {site.distanceFromFazilnagarCenter}
                          </span>
                        )}
                        {site.isTwinHeritageHighlight && (
                          <span className="text-[10px] font-semibold text-amber-300 bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-500/40">
                            ★ Twin Axis
                          </span>
                        )}
                      </div>
                      <h3 className="text-white font-bold text-base sm:text-lg leading-snug">
                        {site.name}
                      </h3>
                      {site.nameHindi && (
                        <p className="text-amber-200/90 text-xs font-hindi">
                          {site.nameHindi}
                        </p>
                      )}
                      <p className="text-slate-200 text-xs line-clamp-2 leading-relaxed">
                        {site.historicalSignificance || site.narrative}
                      </p>
                      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-300 border-t border-white/20 mt-1">
                        <span className="truncate max-w-[200px]">
                          🕒 {site.visitingHours || "06:00 AM – 07:00 PM"} • {site.entryFee || "Free Entry"}
                        </span>
                        <button
                          type="button"
                          onClick={() => openGoogleMapsDirections({
                            name: site.name,
                            lat: site.latitude || 26.6827,
                            lng: site.longitude || 84.0498,
                            landmark: site.locationAddress || "Fazilnagar",
                          })}
                          className="font-bold text-amber-300 hover:text-white underline cursor-pointer shrink-0 ml-2"
                        >
                          Directions →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* History & Importance Deep Dive */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#F5F7F8] p-6 sm:p-8 rounded-2xl border border-[#E1E6EA] space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#B8323C] uppercase tracking-wide">
                    <Landmark className="w-4 h-4" />
                    <span>Historical Significance of Fazilnagar (Pawanagar)</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#18232E] font-heading">
                    Ancient Capital of the Malla Republic & Lord Mahavira's Nirvana
                  </h3>
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
                    <p>
                      <strong>Fazilnagar</strong> is historically identified with ancient <strong>Pawa (Pawanagar)</strong>,
                      one of the two sovereign capitals of the ancient democratic <strong>Malla Mahajanapada</strong> (6th century BCE).
                      According to canonical Jain literature (Kalpa Sutra and Uttaradhyayana Sutra), the 24th Jain Tirthankara,{" "}
                      <strong>Lord Mahavira</strong>, spent his last monsoon retreat here, delivered his final immortal sermons at
                      King Hastipala's council, and attained ultimate <em>Nirvana</em> on the new moon night of Kartik (Kartik Amavasya) in 527 BCE.
                    </p>
                    <p>
                      To mark the departure of the supreme light of truth, the confederate kings of Kasi, Kosala, and the nine Malla chieftains
                      illuminated their homes and streets with rows of clay lamps—establishing the sacred origin of the festival of{" "}
                      <strong>Deepavali (Diwali)</strong>.
                    </p>
                    <p>
                      In Buddhist chronicles (Maha-parinibbana Sutta), Pawa holds equal reverence. Before his Parinirvana,{" "}
                      <strong>Gautam Buddha</strong> visited Pawa, stayed in the mango grove of Cunda the metalsmith, accepted his final meal,
                      and then walked past the tranquil <strong>Kakuttha (Kakodha) River</strong>, resting beneath trees on his path to Kushinagar.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#E1E6EA] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-white p-3 rounded-xl border border-[#E1E6EA]">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">Antiquity</span>
                      <span className="text-xs font-extrabold text-[#18232E]">2,600+ Years</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-[#E1E6EA]">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">Ancient Dynasty</span>
                      <span className="text-xs font-extrabold text-[#18232E]">Malla Republic</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-[#E1E6EA]">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">PIN Code</span>
                      <span className="text-xs font-extrabold text-[#18232E]">274401</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-[#E1E6EA]">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">Highway</span>
                      <span className="text-xs font-extrabold text-[#18232E]">NH-27 4-Lane</span>
                    </div>
                  </div>
                </div>

                {/* Modern Importance Column */}
                <div className="bg-white p-6 rounded-2xl border border-[#E1E6EA] space-y-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#0D5E49] tracking-wider block mb-1">
                      Present-Day Importance
                    </span>
                    <h3 className="text-base font-bold text-[#18232E] font-heading mb-3">
                      Modern Civic, Educational & Commercial Hub
                    </h3>
                    <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="text-[#0D5E49] font-bold text-sm">✓</span>
                        <span><strong>Education Center:</strong> Houses prominent institutions including Pawanagar Mahavir Inter College, Degree Colleges, and private academies serving 15+ surrounding gram panchayats.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#0D5E49] font-bold text-sm">✓</span>
                        <span><strong>Strategic Highway Corridor:</strong> Directly situated on the Golden East-West corridor NH-27 (Old NH-28), connecting Gorakhpur with Bihar and Assam.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#0D5E49] font-bold text-sm">✓</span>
                        <span><strong>Public Health Care:</strong> Community Health Centre (CHC) Fazilnagar provides 24/7 maternal, emergency ambulance, and immunization care.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#0D5E49] font-bold text-sm">✓</span>
                        <span><strong>Grain & Trade Mandi:</strong> A prime marketplace for sugarcane, grains, electronics, fertilizers, and building materials.</span>
                      </li>
                    </ul>
                  </div>

                  <a
                    href="#town-map-section"
                    className="w-full bg-[#18232E] hover:bg-[#B8323C] text-white text-xs font-bold py-2.5 rounded-xl transition text-center block shadow-xs"
                  >
                    View Fazilnagar Landmarks on Map
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KUSHINAGAR (MAHAPARINIRVANA) */}
          {aboutTab === "kushinagar" && (
            <div className="space-y-8 animate-fadeIn">
              {/* Dynamic Image Gallery Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {kushinagarSites.map((site) => (
                  <div
                    key={site._id || site.slug || site.name}
                    className="group relative rounded-2xl overflow-hidden shadow-lg border border-[#E1E6EA] bg-slate-900 aspect-16/10 flex flex-col justify-end"
                  >
                    <img
                      src={site.primaryImage || "/images/kushinagar_mahaparinirvana.webp"}
                      alt={site.name}
                      width="800"
                      height="500"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="relative z-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 flex flex-col justify-end space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400 bg-rose-950/85 border border-rose-600/50 px-2 py-0.5 rounded-full w-fit">
                          {site.category || "Buddhist Heritage"}
                        </span>
                        {site.distanceFromFazilnagarCenter && (
                          <span className="text-[10px] font-semibold text-slate-300 bg-black/50 px-2 py-0.5 rounded-full border border-white/20">
                            📍 {site.distanceFromFazilnagarCenter}
                          </span>
                        )}
                        {site.isTwinHeritageHighlight && (
                          <span className="text-[10px] font-semibold text-amber-300 bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-500/40">
                            ★ Twin Axis
                          </span>
                        )}
                      </div>
                      <h3 className="text-white font-bold text-base sm:text-lg leading-snug">
                        {site.name}
                      </h3>
                      {site.nameHindi && (
                        <p className="text-amber-200/90 text-xs font-hindi">
                          {site.nameHindi}
                        </p>
                      )}
                      <p className="text-slate-200 text-xs line-clamp-2 leading-relaxed">
                        {site.historicalSignificance || site.narrative}
                      </p>
                      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-300 border-t border-white/20 mt-1">
                        <span className="truncate max-w-[200px]">
                          🕒 {site.visitingHours || "06:00 AM – 06:00 PM"} • {site.entryFee || "Free Entry"}
                        </span>
                        <button
                          type="button"
                          onClick={() => openGoogleMapsDirections({
                            name: site.name,
                            lat: site.latitude || 26.7402,
                            lng: site.longitude || 83.8887,
                            landmark: site.locationAddress || "Kushinagar",
                          })}
                          className="font-bold text-amber-300 hover:text-white underline cursor-pointer shrink-0 ml-2"
                        >
                          Directions →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* History & Importance Deep Dive */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#F5F7F8] p-6 sm:p-8 rounded-2xl border border-[#E1E6EA] space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#B8323C] uppercase tracking-wide">
                    <Landmark className="w-4 h-4" />
                    <span>Sacred Antiquity of Kushinagar (Kusinara)</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#18232E] font-heading">
                    The Supreme Mahaparinirvana Sthal of Lord Gautam Buddha
                  </h3>
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
                    <p>
                      <strong>Kushinagar</strong> (anciently known as <em>Kushavati</em> and <em>Kusinara</em>) was the sister sovereign
                      seat of the Malla Republic, situated approximately <strong>18 km northwest of Fazilnagar</strong>.
                      It is revered worldwide by hundreds of millions of Buddhists as one of the four principal holy sites of Buddhism
                      (alongside Lumbini, Bodh Gaya, and Sarnath).
                    </p>
                    <p>
                      In 483 BCE, at the age of 80, <strong>Gautama Buddha</strong> reached the Upavattana grove of Sal trees along the
                      Hiranyavati River in Kusinara. Here, lying between two blossoming Sal trees with his head to the north, he delivered
                      his last discourse to his disciples, gave his final admonition:{" "}
                      <em>"Appamadena sampadetha" (Strive diligently for your liberation)</em>, and attained ultimate Parinirvana.
                    </p>
                    <p>
                      In 1876, British archaeologist <strong>A.C.L. Carlleyle</strong> and Sir Alexander Cunningham excavated the site,
                      unearthing the celebrated <strong>6.1-meter-long monolith red sandstone reclining Buddha statue</strong>,
                      sculpted during the 5th-century Gupta era with the inscription of craftsman Dinna of Mathura.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#E1E6EA] grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-white p-3 rounded-xl border border-[#E1E6EA]">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">Distance from Town</span>
                      <span className="text-xs font-extrabold text-[#18232E]">18 km (~20 min)</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-[#E1E6EA]">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">International Airport</span>
                      <span className="text-xs font-extrabold text-[#18232E]">Operational</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-[#E1E6EA]">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">Buddhist Circuit</span>
                      <span className="text-xs font-extrabold text-[#18232E]">Global Hub</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-[#E1E6EA]">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">District HQ</span>
                      <span className="text-xs font-extrabold text-[#18232E]">Kushinagar</span>
                    </div>
                  </div>
                </div>

                {/* Key Monuments Column */}
                <div className="bg-white p-6 rounded-2xl border border-[#E1E6EA] space-y-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#B8323C] tracking-wider block mb-1">
                      Key Pilgrimage Monuments
                    </span>
                    <h3 className="text-base font-bold text-[#18232E] font-heading mb-3">
                      World Heritage Archaeological Wonders
                    </h3>
                    <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="text-[#B8323C] font-bold text-sm">☸</span>
                        <span><strong>Mahaparinirvana Temple:</strong> Rebuilt in 1956 for the 2500th Buddha Jayanti, housing the world-famous reclining Buddha.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#B8323C] font-bold text-sm">☸</span>
                        <span><strong>Ramabhar Stupa:</strong> Monumental brick chaitya standing 49 feet tall at the Buddha's holy cremation site.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#B8323C] font-bold text-sm">☸</span>
                        <span><strong>Matha Kuar Shrine:</strong> Features a colossal 10th-century blue-black stone Buddha in Bhumisparsha mudra.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#B8323C] font-bold text-sm">☸</span>
                        <span><strong>International Monasteries:</strong> Cultural monasteries built by Thailand, Myanmar, Japan, Sri Lanka, Tibet, China, Vietnam, and Cambodia.</span>
                      </li>
                    </ul>
                  </div>

                  <Link
                    to="/tourism"
                    className="w-full bg-[#B8323C] hover:bg-[#991B1B] text-white text-xs font-bold py-2.5 rounded-xl transition text-center block shadow-xs"
                  >
                    Explore Tourism Guide & Itineraries
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TWIN SACRED BOND */}
          {aboutTab === "connection" && (
            <div className="space-y-8 animate-fadeIn">
              <div className="bg-gradient-to-br from-slate-900 to-[#18232E] text-white p-8 sm:p-10 rounded-3xl shadow-xl space-y-6">
                <div className="max-w-3xl">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 bg-amber-950/80 border border-amber-600/50 px-3 py-1 rounded-full">
                    A Confluence of Two World Religions
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold mt-3 font-heading text-white">
                    Pawa (Fazilnagar) & Kusinara (Kushinagar): The Twin Capitals of the Malla Republic
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm mt-3 leading-relaxed">
                    Nowhere else on Earth are the ultimate mortal milestones of two supreme world spiritual luminaries—Lord Mahavira
                    (Jainism) and Lord Gautam Buddha (Buddhism)—located in such intimate geographic and historic proximity.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-800 text-xs">
                  <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 space-y-2">
                    <span className="text-lg">🏛️</span>
                    <h3 className="font-bold text-amber-300 text-sm">The Malla Mahajanapada</h3>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      Over 2,600 years ago, the Mallas established one of ancient India's earliest democratic oligarchic republics,
                      divided into two confederate capital regions: Pawa (modern Fazilnagar) and Kusinara (modern Kushinagar).
                    </p>
                  </div>

                  <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 space-y-2">
                    <span className="text-lg">🕯️</span>
                    <h3 className="font-bold text-amber-300 text-sm">Mahavira's Nirvana in Pawa</h3>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      In 527 BCE, the 24th Tirthankara Bhagwan Mahavira attained Nirvana at Pawa. The Malla chieftains lit deepams
                      to dispel the spiritual darkness, originating the eternal Diwali celebration observed to this day.
                    </p>
                  </div>

                  <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/60 space-y-2">
                    <span className="text-lg">☸️</span>
                    <h3 className="font-bold text-amber-300 text-sm">Buddha's Parinirvana in Kusinara</h3>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      In 483 BCE, Gautam Buddha accepted his final meal in Pawa's mango grove, rested by the Kakodha/Kukuttha river,
                      and walked the short 18 km route to Kushinagar to attain Mahaparinirvana under the twin Sal trees.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>Connected seamlessly by 4-lane NH-27 (Distance: 18 km / Travel Time: 20 minutes)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      to="/directory"
                      className="bg-[#B8323C] hover:bg-[#991B1B] text-white font-bold px-4 py-2 rounded-xl transition"
                    >
                      Browse Town Directory
                    </Link>
                    <Link
                      to="/tourism"
                      className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2 rounded-xl transition"
                    >
                      View Tourism Route
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================
          SECTION 10: CITIZEN CORNER (Actionable Forms)
          ======================================================== */}
      <section id="citizen-corner-section" className="bg-white py-16 border-t border-[#E1E6EA] content-visibility-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D5E49] uppercase tracking-wider mb-1">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Community Participation</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18232E] tracking-tight font-heading">
              Citizen Corner
            </h2>
            <p className="text-xs sm:text-sm text-[#647180] mt-1">
              Help maintain accuracy by suggesting a local place, reporting an error, or broadcasting a town event.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Action 1 */}
            <div className="bg-[#F5F7F8] rounded-2xl p-6 border border-[#E1E6EA] flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-white text-[#18232E] flex items-center justify-center mb-3.5 border border-[#E1E6EA]">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#18232E] mb-1">Suggest a Business</h3>
                <p className="text-xs text-[#647180] leading-relaxed mb-5">
                  Are you a shopkeeper, doctor, or trade operator inside Fazilnagar town limits? Submit your details for verification.
                </p>
              </div>
              <button
                onClick={() => setModalType("business")}
                className="w-full bg-[#18232E] hover:bg-[#B8323C] text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Suggest Place</span>
              </button>
            </div>

            {/* Action 2 */}
            <div className="bg-[#F5F7F8] rounded-2xl p-6 border border-[#E1E6EA] flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-white text-amber-600 flex items-center justify-center mb-3.5 border border-[#E1E6EA]">
                  <Edit3 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#18232E] mb-1">Report Incorrect Info</h3>
                <p className="text-xs text-[#647180] leading-relaxed mb-5">
                  Noticed a wrong phone number, closed establishment, or village listing inside town directory? Report it to moderators.
                </p>
              </div>
              <button
                onClick={() => setModalType("correction")}
                className="w-full bg-white hover:bg-slate-50 text-[#18232E] border border-[#E1E6EA] font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Report Error</span>
              </button>
            </div>

            {/* Action 3 */}
            <div className="bg-[#F5F7F8] rounded-2xl p-6 border border-[#E1E6EA] flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 rounded-xl bg-white text-[#0D5E49] flex items-center justify-center mb-3.5 border border-[#E1E6EA]">
                  <CalendarPlus className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#18232E] mb-1">Submit a Local Event</h3>
                <p className="text-xs text-[#647180] leading-relaxed mb-5">
                  Organizing a public camp, inter-college competition, or cultural katha inside town? Submit the date and organizer.
                </p>
              </div>
              <button
                onClick={() => setModalType("event")}
                className="w-full bg-[#0D5E49] hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Submit Event</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 11: FOOTER (Editorial Civic Footer)
          ======================================================== */}
      <footer className="bg-[#18232E] text-slate-400 text-xs border-t border-slate-800 pb-16 lg:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Wordmark & Tagline */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white text-[#18232E] flex items-center justify-center font-extrabold text-sm">
                F
              </div>
              <div>
                <span className="text-white font-extrabold text-sm tracking-tight font-heading block">
                  {siteSettings?.navigation?.brandFirst || "FAZIL"}<span className="text-[#B8323C]">{siteSettings?.navigation?.brandSecond || "NAGAR"}</span>
                </span>
                <span className="text-[10px] text-slate-400">{siteSettings?.navigation?.tagline || "Your Town. Your Community."}</span>
              </div>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              {siteSettings?.footer?.aboutText || "Fazilnagar Town Local Directory & Civic Information Platform. Ground-verified coordinates and transparent public data for residents and visitors."}
            </p>
            <p className="text-[10px] text-slate-400 italic">
              {siteSettings?.footer?.disclaimerText || "Notice: An independent community directory for Fazilnagar town. Not affiliated with any official government ministry without explicit authorization."}
            </p>
          </div>

          {/* Col 2: Quick Navigation */}
          <div className="space-y-2">
            <h3 className="text-white font-bold uppercase tracking-wider text-[11px] font-heading">
              Quick Navigation
            </h3>
            <ul className="space-y-2 text-xs">
              <li><button onClick={(e) => handleSmoothScroll(e, "hero-section")} className="hover:text-white cursor-pointer transition py-1 inline-block">Home</button></li>
              <li><Link to="/directory" className="hover:text-white font-bold text-red-400 py-1 inline-block">Town Directory (Map & List)</Link></li>
              <li><button onClick={(e) => handleSmoothScroll(e, "town-map-section")} className="hover:text-white cursor-pointer transition py-1 inline-block">Interactive OpenStreetMap</button></li>
              <li><button onClick={(e) => handleSmoothScroll(e, "local-updates-section")} className="hover:text-white cursor-pointer transition py-1 inline-block">Local Updates & Notices</button></li>
              <li><button onClick={(e) => handleSmoothScroll(e, "about-fazilnagar-section")} className="hover:text-white cursor-pointer transition py-1 inline-block">About Fazilnagar</button></li>
              <li><button onClick={(e) => handleSmoothScroll(e, "citizen-corner-section")} className="hover:text-white cursor-pointer transition py-1 inline-block">Citizen Corner</button></li>
            </ul>
          </div>

          {/* Col 3: Directory Categories */}
          <div className="space-y-2">
            <h3 className="text-white font-bold uppercase tracking-wider text-[11px] font-heading">
              Popular Categories
            </h3>
            <ul className="space-y-2 text-xs">
              <li><Link to="/directory?category=Schools%20%26%20Colleges" className="hover:text-white py-1 inline-block">Schools & Colleges</Link></li>
              <li><Link to="/directory?category=Hospitals%20%26%20Clinics" className="hover:text-white py-1 inline-block">Hospitals & Clinics</Link></li>
              <li><Link to="/directory?category=Medical%20Stores%20%26%20Pharmacies" className="hover:text-white py-1 inline-block">Medical Stores</Link></li>
              <li><Link to="/directory?category=Sweet%20Shops%20%26%20Bakeries" className="hover:text-white py-1 inline-block">Sweet Shops & Bakeries</Link></li>
              <li><Link to="/directory?category=Religious%20Places" className="hover:text-white py-1 inline-block">Temples & Mosques</Link></li>
              <li><Link to="/directory?category=Public%20Facilities" className="hover:text-white py-1 inline-block">Banks & Post Office</Link></li>
            </ul>
          </div>

          {/* Col 4: Contact & Legal */}
          <div className="space-y-2">
            <h3 className="text-white font-bold uppercase tracking-wider text-[11px] font-heading">
              Support & Legal
            </h3>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => setModalType("correction")} className="hover:text-white text-left cursor-pointer py-1 inline-block">Report Inaccurate Data</button></li>
              <li><button onClick={() => setModalType("business")} className="hover:text-white text-left cursor-pointer py-1 inline-block">Suggest New Place</button></li>
              <li><Link to="/admin/review" className="hover:text-amber-300 text-amber-400 font-bold flex items-center gap-1"><span>🛡️</span> Admin Review Desk</Link></li>
              <li><span className="text-slate-400">Postal Area: PIN 274401</span></li>
              <li><span className="text-slate-400">District: Kushinagar, UP</span></li>
              <li className="pt-2 text-[10px] text-slate-400">
                <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span> • <span className="hover:text-slate-400 cursor-pointer">Terms of Use</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 py-4 text-center text-[11px] text-slate-400">
          {siteSettings?.footer?.copyrightText ||
            `© ${new Date().getFullYear()} Fazilnagar Town Portal • Modern Civic & Editorial System. All rights reserved.`}
        </div>
      </footer>

      {/* ========================================================
          INTERACTIVE MODALS: SUGGESTION, CORRECTION & EVENT
          ======================================================== */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-[#E1E6EA] animate-modal-pop">
            <button
              onClick={() => setModalType(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            {modalType === "business" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-[#B8323C] flex items-center justify-center">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#18232E] font-heading">Suggest a Place in Town</h3>
                    <p className="text-[11px] text-[#647180]">Listing must be located inside Fazilnagar town limits.</p>
                  </div>
                </div>

                <form onSubmit={(e) => handleFormSubmit(e, "business")} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-[#18232E] mb-1">Establishment Name *</label>
                    <input
                      type="text"
                      name="title"
                      required
                      placeholder="e.g. Mahavir Peda Bhandar, Sharma Optical"
                      className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none focus:border-[#B8323C]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-[#18232E] mb-1">Category *</label>
                      <select name="category" required className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none bg-white">
                        <option value="">Select Category</option>
                        {EXPLORE_21_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-[#18232E] mb-1">Public Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="Verified 10 digits"
                        className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none focus:border-[#B8323C]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#18232E] mb-1">Town Landmark / Road *</label>
                    <input
                      type="text"
                      name="landmark"
                      required
                      placeholder="e.g. Near Kasya Highway Crossing, Babu Bazar"
                      className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none focus:border-[#B8323C]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#18232E] hover:bg-[#B8323C] text-white font-bold py-2.5 rounded-xl transition mt-2 shadow-xs cursor-pointer"
                  >
                    Submit Place for Moderation
                  </button>
                </form>
              </>
            )}

            {modalType === "correction" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#18232E] font-heading">Report Incorrect Information</h3>
                    <p className="text-[11px] text-[#647180]">Help keep phone numbers and coordinates accurate.</p>
                  </div>
                </div>

                <form onSubmit={(e) => handleFormSubmit(e, "correction")} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-[#18232E] mb-1">Listing Name *</label>
                    <input
                      type="text"
                      name="title"
                      required
                      placeholder="Name of school, clinic, or shop"
                      className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none focus:border-amber-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#18232E] mb-1">Correction Details *</label>
                    <textarea
                      rows={3}
                      name="details"
                      required
                      placeholder="Describe what is wrong (e.g. wrong phone number, closed, or located outside town boundary)..."
                      className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none focus:border-amber-600"
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#18232E] hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Send Correction Report
                  </button>
                </form>
              </>
            )}

            {modalType === "event" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0D5E49] flex items-center justify-center">
                    <CalendarPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#18232E] font-heading">Submit Local Event Announcement</h3>
                    <p className="text-[11px] text-[#647180]">Community, educational, or religious event in town.</p>
                  </div>
                </div>

                <form onSubmit={(e) => handleFormSubmit(e, "event")} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-[#18232E] mb-1">Event Title *</label>
                    <input
                      type="text"
                      name="title"
                      required
                      placeholder="e.g. Free Blood Donation Camp, Sports Meet"
                      className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none focus:border-[#0D5E49]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-[#18232E] mb-1">Date *</label>
                      <input
                        type="date"
                        name="eventDate"
                        required
                        className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none focus:border-[#0D5E49]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#18232E] mb-1">Venue in Town *</label>
                      <input
                        type="text"
                        name="venue"
                        required
                        placeholder="e.g. College Ground, CHC"
                        className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none focus:border-[#0D5E49]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#18232E] mb-1">Organizer / Source *</label>
                    <input
                      type="text"
                      name="organizer"
                      required
                      placeholder="Name of school, hospital, or trust"
                      className="w-full p-2.5 rounded-xl border border-[#E1E6EA] outline-none focus:border-[#0D5E49]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#0D5E49] hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Broadcast Event
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Community Place Submission Modal */}
      <CommunityPlaceModal
        isOpen={communityModalOpen}
        onClose={() => setCommunityModalOpen(false)}
        onSuccess={(sub) => {
          showToast(`Place "${sub.name}" submitted! Tracking ID: ${sub.referenceId}`);
        }}
      />

      {/* Global Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#18232E] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs border border-slate-700 animate-slide-down">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
