import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Mic,
  X,
  Phone,
  Navigation,
  MapPin,
  Map,
  Compass,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Plus,
  Layers,
  GraduationCap,
  Stethoscope,
  Fuel,
  Store,
  Calendar,
  AlertTriangle,
  Info,
  Clock,
  Shield,
  Zap,
  Mail,
  Building2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import NotificationCenter from "./NotificationCenter";
import { openGoogleMapsDirections } from "../utils/directions";
import { getAuthUser, isUserAdmin } from "../utils/authStorage";
import {
  getCivicDirectory,
  getCachedCivicDirectory,
  subscribeToCMSLiveUpdates,
} from "../services/cmsService";
import seedPlaces from "../data/places.json";

// Authoritative verified places for Fazilnagar Mobile Portal
const VERIFIED_CAROUSEL_PLACES = [
  {
    id: "chc-fazilnagar",
    title: "CHC Fazilnagar",
    subtitle: "Hospital Road",
    category: "healthcare",
    categoryLabel: "🏥 Healthcare",
    phone: "05564222102",
    lat: 26.6808,
    lng: 84.0472,
    image: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&auto=format&fit=crop",
    verified: true,
  },
  {
    id: "prashant-sweets",
    title: "Prashant Sweet House",
    subtitle: "Main Market, NH-27 Chowk",
    category: "sweets",
    categoryLabel: "🍬 Sweets & Chaat",
    phone: "09839245678",
    lat: 26.6833,
    lng: 84.0502,
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop",
    verified: true,
  },
  {
    id: "pawanagar-college",
    title: "Pawanagar Mahavir Inter College",
    subtitle: "College Road",
    category: "schools",
    categoryLabel: "🏫 Schools",
    phone: "09450467890",
    lat: 26.6843,
    lng: 84.0454,
    image: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&auto=format&fit=crop",
    verified: true,
  },
  {
    id: "indian-oil-fuel",
    title: "Indian Oil Petrol Pump",
    subtitle: "NH-27 Highway",
    category: "fuel",
    categoryLabel: "⛽ Fuel Stations",
    phone: "1800224344",
    lat: 26.6850,
    lng: 84.0490,
    image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop",
    verified: true,
  },
  {
    id: "maa-yashoda-hosp",
    title: "Maa Yashoda Hospital",
    subtitle: "Garahiya More, NH-28",
    category: "healthcare",
    categoryLabel: "🏥 Healthcare",
    phone: "09450812345",
    lat: 26.6835,
    lng: 84.0458,
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop",
    verified: true,
  },
  {
    id: "hermitage-school",
    title: "The Hermitage School",
    subtitle: "Hospital Road",
    category: "schools",
    categoryLabel: "🏫 Schools",
    phone: "09919523411",
    lat: 26.6804,
    lng: 84.0467,
    image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop",
    verified: true,
  },
  {
    id: "kanha-sweets",
    title: "Kanha Sweets",
    subtitle: "College Road Crossing",
    category: "sweets",
    categoryLabel: "🍬 Sweets & Chaat",
    phone: "09450987654",
    lat: 26.6833,
    lng: 84.0498,
    image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop",
    verified: true,
  },
  {
    id: "hp-fuel-pump",
    title: "Hindustan Petroleum (HP)",
    subtitle: "Pawanagar Bypass",
    category: "fuel",
    categoryLabel: "⛽ Fuel Stations",
    phone: "18002333555",
    lat: 26.6815,
    lng: 84.0430,
    image: "https://images.unsplash.com/photo-1527018607616-0526648e861c?w=800&auto=format&fit=crop",
    verified: true,
  },
  {
    id: "fazilnagar-mandi",
    title: "Fazilnagar Sabzi Mandi",
    subtitle: "NH-27 Mandi Chowk",
    category: "markets",
    categoryLabel: "🛒 Markets",
    phone: "05564222140",
    lat: 26.6828,
    lng: 84.0485,
    image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&auto=format&fit=crop",
    verified: true,
  },
];

// 1. Essential Public Services Data
const ESSENTIAL_SERVICES = [
  {
    id: "police",
    badge: "LAW & ORDER",
    badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-100",
    title: "Fazilnagar Police Chowki",
    location: "NH-27 Highway Chowk",
    details: "Patrolling, law & order, women desk, emergency aid",
    phone: "112",
    directNum: "05564222100",
  },
  {
    id: "chc",
    badge: "24/7 HEALTHCARE",
    badgeStyle: "bg-sky-50 text-sky-700 border-sky-100",
    title: "CHC Fazilnagar Hospital",
    location: "Hospital Road",
    details: "Emergency trauma, maternity, OPD, pathology lab",
    phone: "05564222102",
    directNum: "05564222102",
  },
  {
    id: "post",
    badge: "POSTAL SERVICES",
    badgeStyle: "bg-amber-50 text-amber-700 border-amber-100",
    title: "Sub Post Office Fazilnagar",
    location: "Main Market, PIN 274401",
    details: "Speed post, Aadhaar updates, savings schemes",
    phone: "05564222120",
    directNum: "05564222120",
  },
  {
    id: "power",
    badge: "POWER UTILITY",
    badgeStyle: "bg-orange-50 text-orange-700 border-orange-100",
    title: "UPPCL Power Substation",
    location: "Pawanagar Road",
    details: "Town power supply, breakdown helpline, complaints",
    phone: "1912",
    directNum: "1912",
  },
];

// 3. Commerce & Retail Local Shops
const RETAIL_SHOPS = [
  {
    id: "prashant-sweets-shop",
    name: "Prashant Sweet House",
    tag: "Desi Ghee Peda",
    address: "Main Market, NH-27",
    phone: "09839245678",
    lat: 26.6833,
    lng: 84.0502,
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop",
  },
  {
    id: "kanha-sweets-shop",
    name: "Kanha Sweets",
    tag: "Fresh Paneer & Mithai",
    address: "College Road Crossing",
    phone: "09450987654",
    lat: 26.6833,
    lng: 84.0498,
    image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop",
  },
  {
    id: "amit-medical",
    name: "Amit Medical Store",
    tag: "24/7 Pharmacy",
    address: "Near CHC Hospital",
    phone: "09838012345",
    lat: 26.6810,
    lng: 84.0475,
    image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&auto=format&fit=crop",
  },
  {
    id: "maurya-electronics",
    name: "Maurya Electronics",
    tag: "Appliances & Repairs",
    address: "Main Market Bazaar",
    phone: "09451122334",
    lat: 26.6830,
    lng: 84.0510,
    image: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=600&auto=format&fit=crop",
  },
];

// 4. Education Schools & Colleges Data
const SCHOOLS_DIRECTORY = [
  {
    id: "pawanagar-ic",
    name: "Pawanagar Mahavir Inter College",
    board: "UP BOARD",
    classes: "Class 6 – XII",
    location: "College Road Campus",
    phone: "09450467890",
    lat: 26.6843,
    lng: 84.0454,
    facilities: "Arts, Science & Commerce streams, sports ground, physics & chem labs, NCC wing.",
    timing: "09:00 AM – 03:30 PM",
  },
  {
    id: "hermitage",
    name: "The Hermitage School",
    board: "CBSE",
    classes: "Nursery – Class 8",
    location: "Hospital Road",
    phone: "09919523411",
    lat: 26.6804,
    lng: 84.0467,
    facilities: "Modern classrooms, computer lab, library, sports activities, safe transport.",
    timing: "08:30 AM – 02:00 PM",
  },
  {
    id: "sanskar-academy",
    name: "Sanskar Central Academy",
    board: "CBSE",
    classes: "Nursery – Class 10",
    location: "NH-27 Sector",
    phone: "09450881234",
    lat: 26.6822,
    lng: 84.0538,
    facilities: "English medium education, smart classes, science exhibitions, karate training.",
    timing: "08:00 AM – 02:00 PM",
  },
  {
    id: "kd-public",
    name: "K.D. Public Intermediate College",
    board: "UP BOARD",
    classes: "Nursery – XII",
    location: "Block Outskirts",
    phone: "09935166201",
    lat: 26.6845,
    lng: 84.0442,
    facilities: "Co-educational Hindi & English curriculum, library, extracurriculars.",
    timing: "08:00 AM – 02:00 PM",
  },
];

// 2. Map Filter categories
const MAP_FILTER_TABS = [
  { id: "all", label: "All Verified (20)" },
  { id: "schools", label: "Schools & Colleges" },
  { id: "healthcare", label: "Hospitals" },
  { id: "fuel", label: "Petrol Pumps" },
];

// 5. Melas & Events Category Tabs
const EVENT_TABS = ["All (0)", "Mela & Fair", "Aarti & Puja", "Civic & Cultural"];

// Main Category Pills for Section 1.4 Horizontal Swipe Category Carousel
const CATEGORY_PILLS = [
  { id: "all", label: "All Places", style: "bg-slate-900 text-white" },
  { id: "healthcare", label: "🏥 Healthcare", style: "bg-blue-50 text-blue-700 border border-blue-100" },
  { id: "schools", label: "🏫 Schools", style: "bg-amber-50 text-amber-700 border border-amber-100" },
  { id: "sweets", label: "🍬 Sweets & Food", style: "bg-rose-50 text-rose-700 border border-rose-100" },
  { id: "fuel", label: "⛽ Fuel Stations", style: "bg-emerald-50 text-emerald-700 border border-emerald-100" },
  { id: "markets", label: "🛒 Markets", style: "bg-purple-50 text-purple-700 border border-purple-100" },
];

export default function MobileHomePortal({
  onOpenAddPlace,
  onOpenCorrection,
  onOpenEvent,
}) {
  const navigate = useNavigate();

  // Current logged in user for Top App Bar
  const [authUser, setAuthUser] = useState(() => getAuthUser());

  useEffect(() => {
    const syncUser = () => setAuthUser(getAuthUser());
    window.addEventListener("auth-change", syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener("auth-change", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  const isAdmin = Boolean(authUser && authUser.role === "admin" && isUserAdmin());

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isListening, setIsListening] = useState(false);
  const [voiceToast, setVoiceToast] = useState("");
  const recognitionRef = useRef(null);

  // Section 2: Map Preview & Switcher State
  const [mapCategory, setMapCategory] = useState("all");
  const [mapViewType, setMapViewType] = useState("map"); // "map" | "list"

  // Section 4: School Bottom Sheet Drawer State
  const [selectedSchool, setSelectedSchool] = useState(null);

  // Section 5: Event Category Tab
  const [selectedEventTab, setSelectedEventTab] = useState("All (0)");

  // Section 6: Sacred Heritage Accordion State
  const [isHeritageHistoryOpen, setIsHeritageHistoryOpen] = useState(false);

  // Section 8: Footer Accordions
  const [footerOpen, setFooterOpen] = useState({
    quickNav: false,
    community: false,
    emergency: false,
    legal: false,
  });

  const toggleFooterSection = (key) => {
    setFooterOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Dynamic Civic Directory Index listings from database / CMS
  const [civicPlaces, setCivicPlaces] = useState(() => getCachedCivicDirectory() || VERIFIED_CAROUSEL_PLACES);

  useEffect(() => {
    let isMounted = true;
    const loadCivic = async () => {
      try {
        const list = await getCivicDirectory();
        if (isMounted && Array.isArray(list) && list.length > 0) {
          setCivicPlaces(list);
        }
      } catch (_) {}
    };

    loadCivic();
    const unsubscribe = subscribeToCMSLiveUpdates(() => {
      loadCivic();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Filter carousel places based on selected category & search query
  const filteredPlaces = useMemo(() => {
    let list = (civicPlaces || VERIFIED_CAROUSEL_PLACES).filter((p) => p.isActive !== false);
    if (selectedCategory !== "all") {
      list = list.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.subtitle || "").toLowerCase().includes(q) ||
          (p.categoryLabel || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [civicPlaces, selectedCategory, searchQuery]);

  // Places for Section 2 Map/List switcher
  const mapPlaces = useMemo(() => {
    const list = (civicPlaces || VERIFIED_CAROUSEL_PLACES).filter((p) => p.isActive !== false);
    if (mapCategory === "all") return list;
    return list.filter((p) => p.category === mapCategory);
  }, [civicPlaces, mapCategory]);

  // Voice Search Handler
  const handleVoiceSearch = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceToast("Voice search not supported in this browser. Please type.");
      setTimeout(() => setVoiceToast(""), 3000);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceToast("Listening... Speak now");
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setVoiceToast(`Search: "${transcript}"`);
        setTimeout(() => setVoiceToast(""), 2500);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setVoiceToast("Could not recognize voice. Please try typing.");
        setTimeout(() => setVoiceToast(""), 2500);
      };

      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto min-h-screen bg-slate-50 flex flex-col font-sans pb-24 text-slate-800 selection:bg-red-500 selection:text-white relative">
      {/* ========================================================
          1.1 TOP APP BAR (Sticky, 54px h)
          ======================================================== */}
      <header className="sticky top-0 z-30 w-full h-[54px] backdrop-blur-md bg-white/95 border-b border-slate-100 px-4 flex items-center justify-between shadow-2xs">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            F
          </div>
          <div>
            <h1 className="font-extrabold tracking-tight text-slate-900 text-sm leading-none font-heading">
              FAZILNAGAR
            </h1>
            <p className="text-[9px] text-slate-500 font-medium tracking-wide mt-0.5">
              PIN 274401 • Kushinagar, UP
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationCenter lightMode={true} subtleDot={true} />
          {authUser ? (
            <Link
              to={isAdmin ? "/admin/review" : "/news"}
              className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition text-slate-800"
              title={isAdmin ? "Admin Console" : (authUser.name || authUser.email)}
            >
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center">
                {isAdmin ? "A" : (authUser.name?.[0] || "U").toUpperCase()}
              </div>
              <span className="text-[10px] font-bold text-slate-700 max-w-[60px] truncate">
                {isAdmin ? "Admin" : (authUser.name?.split(" ")[0] || "Citizen")}
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition border border-slate-200/80"
              title="Citizen Login"
            >
              <span className="text-sm">👤</span>
            </Link>
          )}
        </div>
      </header>

      {/* Voice Status Toast */}
      {voiceToast && (
        <div className="px-4 pt-2">
          <div className="py-1 px-3 rounded-lg bg-slate-900 text-white text-[11px] text-center font-medium animate-in fade-in duration-150">
            {voiceToast}
          </div>
        </div>
      )}

      {/* ========================================================
          1.2 UNIFIED HERO & SEARCH AREA
          ======================================================== */}
      <section className="bg-gradient-to-b from-amber-50/50 via-slate-50/30 to-transparent px-4 pt-3 pb-2" aria-label="Hero & Search Area">
        {/* Short Heading */}
        <div className="mb-2">
          <h2 className="text-[18px] font-black text-slate-900 font-heading tracking-tight leading-tight">
            Official Fazilnagar Portal
          </h2>
          <p className="text-[10px] text-slate-500 font-medium">
            Verified Town Directory & Public Services
          </p>
        </div>

        {/* Search Pill Input */}
        <div className="relative flex items-center bg-white rounded-2xl border border-slate-200/90 shadow-sm px-3.5 py-2.5 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100 transition">
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                navigate(`/directory?search=${encodeURIComponent(searchQuery.trim())}`);
              }
            }}
            placeholder="Search CHC, schools, markets, or emergency..."
            className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent outline-none font-medium"
            aria-label="Search directory"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-slate-400 hover:text-slate-600 p-0.5 ml-1 transition"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleVoiceSearch}
              className={`p-1 rounded-lg text-slate-400 hover:text-slate-700 active:scale-90 transition ${
                isListening ? "text-red-500 animate-pulse bg-red-50" : ""
              }`}
              aria-label="Voice search"
              title="Speak to search"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
          <a
            href="tel:112"
            className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-black border border-rose-200 shrink-0 ml-1.5 hover:bg-rose-200 transition"
            title="Dial 112 Emergency"
          >
            112
          </a>
        </div>

        {/* Micro-pills immediately below the search bar */}
        <div className="flex items-center gap-2 mt-2 px-0.5 overflow-x-auto no-scrollbar">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[10px] font-bold shrink-0">
            <span>📍</span> Strictly Inside Town Limits
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200/80 text-[10px] font-bold shrink-0">
            <span>🛰️</span> Exact Ground Coordinates
          </span>
        </div>
      </section>

      {/* ========================================================
          1.3 IMMEDIATE TOUCH 4-COLUMN SOS & UTILITY GRID
          ======================================================== */}
      <section className="px-4 py-2" aria-label="Quick SOS & Utility Actions">
        <div className="grid grid-cols-4 gap-2">
          <a
            href="tel:112"
            className="flex flex-col items-center justify-center p-2 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200/80 active:scale-95 transition-all duration-150 touch-manipulation shadow-2xs group"
          >
            <span className="text-xl mb-1 group-active:scale-110 transition-transform select-none">
              🚨
            </span>
            <span className="text-[11px] font-black text-rose-700 leading-tight">
              112 SOS
            </span>
            <span className="text-[9px] text-rose-600 font-medium leading-none mt-0.5">
              Police Patrol
            </span>
          </a>

          <a
            href="tel:05564222102"
            className="flex flex-col items-center justify-center p-2 rounded-2xl bg-sky-50 text-sky-800 border border-sky-200/80 active:scale-95 transition-all duration-150 touch-manipulation shadow-2xs group"
          >
            <span className="text-xl mb-1 group-active:scale-110 transition-transform select-none">
              🏥
            </span>
            <span className="text-[11px] font-black text-sky-800 leading-tight">
              CHC Hosp
            </span>
            <span className="text-[9px] text-sky-600 font-medium leading-none mt-0.5">
              24/7 Casualty
            </span>
          </a>

          <a
            href="tel:112"
            className="flex flex-col items-center justify-center p-2 rounded-2xl bg-indigo-50 text-indigo-800 border border-indigo-200/80 active:scale-95 transition-all duration-150 touch-manipulation shadow-2xs group"
          >
            <span className="text-xl mb-1 group-active:scale-110 transition-transform select-none">
              👮
            </span>
            <span className="text-[11px] font-black text-indigo-800 leading-tight">
              Police Chowki
            </span>
            <span className="text-[9px] text-indigo-600 font-medium leading-none mt-0.5">
              Town Help
            </span>
          </a>

          <a
            href="tel:1912"
            className="flex flex-col items-center justify-center p-2 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/80 active:scale-95 transition-all duration-150 touch-manipulation shadow-2xs group"
          >
            <span className="text-xl mb-1 group-active:scale-110 transition-transform select-none">
              ⚡
            </span>
            <span className="text-[11px] font-black text-amber-800 leading-tight">
              Power (1912)
            </span>
            <span className="text-[9px] text-amber-600 font-medium leading-none mt-0.5">
              Substation
            </span>
          </a>
        </div>
      </section>

      {/* ========================================================
          4. LIVE BULLETIN BANNER
          ======================================================== */}
      <section className="px-4 py-1" aria-label="Live Bulletin">
        <Link
          to="/news"
          className="bg-slate-900 text-white rounded-xl py-2 px-3 flex items-center justify-between text-xs hover:bg-slate-800 active:scale-[0.98] transition shadow-xs group"
        >
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0 uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              LIVE
            </span>
            <span className="truncate text-slate-200 font-medium">
              Navratri Mela timings released...
            </span>
          </div>
          <span className="text-slate-400 group-hover:text-white font-bold text-[11px] shrink-0 flex items-center gap-0.5 transition-colors">
            <span>View</span>
            <span className="text-xs">→</span>
          </span>
        </Link>
      </section>

      {/* ========================================================
          1.4 HORIZONTAL SWIPE CATEGORY CAROUSEL
          ======================================================== */}
      <section className="px-4 pt-2.5 pb-1" aria-label="Category Filters">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 touch-pan-x">
          {CATEGORY_PILLS.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition active:scale-95 cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : cat.style || "bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ========================================================
          1.5 HORIZONTAL SNAP CAROUSEL (VERIFIED PLACES)
          ======================================================== */}
      <section className="px-4 py-2" aria-label="Verified Places Carousel">
        <div className="flex items-center justify-between mb-2 px-0.5">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-slate-900">CIVIC DIRECTORY INDEX</h2>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
              {filteredPlaces.length}
            </span>
          </div>
          <Link
            to="/directory"
            className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5"
          >
            <span>View All ({seedPlaces?.length || 19})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {filteredPlaces.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/80 my-2">
            <p className="text-xs text-slate-500">No verified places found matching this filter.</p>
            <button
              onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
              }}
              className="mt-2 text-xs font-bold text-blue-600 hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto snap-x snap-mandatory flex gap-3 no-scrollbar pb-2 pt-1 touch-pan-x">
            {filteredPlaces.map((place, pIdx) => (
              <article
                key={place._id || place.id || place.itemId || pIdx}
                className="w-[270px] snap-start shrink-0 bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-100 mb-2.5">
                  <img
                    src={place.image}
                    alt={place.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                    {place.categoryLabel || place.category}
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {place.title}
                      </h3>
                      {place.verified !== false && (
                        <span className="text-emerald-600 text-xs shrink-0 font-bold" title="Verified">
                          ✔
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      📍 {place.subtitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100">
                    <a
                      href={place.phone ? `tel:${place.phone}` : "#"}
                      onClick={(e) => {
                        if (!place.phone) e.preventDefault();
                      }}
                      className={`h-10 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold transition shadow-xs ${
                        !place.phone ? "opacity-40 cursor-not-allowed" : ""
                      }`}
                      aria-label={`Call ${place.title}`}
                    >
                      <Phone className="w-3.5 h-3.5 text-white" />
                      <span>Call</span>
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        openGoogleMapsDirections({
                          name: place.title,
                          lat: place.lat,
                          lng: place.lng,
                          landmark: place.subtitle,
                          directionsUrl: place.directionsUrl,
                        })
                      }
                      className="h-10 flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs font-bold border border-slate-200 transition cursor-pointer"
                      aria-label={`Directions to ${place.title}`}
                    >
                      <Navigation className="w-3.5 h-3.5 text-slate-700" />
                      <span>Directions</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================
          SPEC 1: ESSENTIAL PUBLIC SERVICES & HELPLINES (2x2 Compact Grid)
          - Badge with category (LAW & ORDER, 24/7 HEALTHCARE, POSTAL, POWER)
          - Title & Location 1 line each
          - Sub-details truncated with ellipsis
          - Action: direct phone button with "Call Now" CTA (h-10 rounded-xl bg-slate-900 text-white text-xs font-semibold)
          ======================================================== */}
      <section className="px-4 py-3" aria-label="Essential Public Services">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-base">🏛️</span>
            <h2 className="text-sm font-bold text-slate-900">Essential Public Services</h2>
          </div>
          <Link to="/emergency" className="text-xs font-bold text-red-600 hover:text-red-700">
            All Helplines →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {ESSENTIAL_SERVICES.map((srv) => (
            <div
              key={srv.id}
              className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border uppercase tracking-wider mb-1.5 ${srv.badgeStyle}`}>
                  {srv.badge}
                </span>
                <h3 className="text-xs font-bold text-slate-900 truncate leading-tight">
                  {srv.title}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  📍 {srv.location}
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-1 leading-normal">
                  {srv.details}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100">
                <a
                  href={`tel:${srv.phone}`}
                  className="h-10 w-full rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
                  aria-label={`Call ${srv.title} at ${srv.phone}`}
                >
                  <Phone className="w-3.5 h-3.5 text-white" />
                  <span>Call {srv.phone}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          SPEC 2: GEOSPATIAL MAP & CATEGORY SWITCHER
          - Floating horizontal filter bar: All Verified (20), Schools, Hospitals, Petrol Pumps
          - Toggle switch between "Map View" and "List View"
          - Latitude/Longitude badge (26.6827° N, 84.0498° E) micro-pill at top right
          ======================================================== */}
      {/* ========================================================
          1.6 INTERACTIVE MAP FEATURE BLOCK
          ======================================================== */}
      <section className="px-4 py-3" aria-label="Interactive Map Feature Block">
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🗺️</span>
              <div>
                <h3 className="text-sm font-extrabold text-white">Interactive Map</h3>
                <span className="text-[10px] text-emerald-400 font-semibold">Verified Ground Coordinates</span>
              </div>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-slate-800/80 text-[10px] font-mono text-slate-300 border border-slate-700">
              26.6827° N, 84.0498° E
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            20+ verified coordinate pins on NH-27, College Rd, & Hospital Rd axis.
          </p>

          <div className="pt-1 flex items-center justify-between border-t border-slate-800/80">
            <span className="text-[11px] text-slate-400">
              Pins, clinics, petrol pumps & schools
            </span>
            <Link
              to="/directory"
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-xs shadow-sm active:scale-95 transition inline-flex items-center gap-1.5"
            >
              <span>Open Map View →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================
          SPEC 3: COMMERCE & RETAIL DIRECTORY CARDS (2-Col Grid)
          - Image thumbnail with specialty tag (Desi Ghee Peda, Fresh Paneer, Pharmacy, Electronics)
          - Business Name (semi-bold 13px) + verified green checkmark
          - Street address snippet (Main Market, NH-27)
          - Dual Action Footer: [📞 Call] and [📍 Route] with py-2 rounded-xl border border-slate-200 active:scale-95
          - Bottom link: "View All 15+ Local Shops →"
          ======================================================== */}
      <section className="px-4 py-3" aria-label="Commerce & Retail Directory">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-base">🛍️</span>
            <h2 className="text-sm font-bold text-slate-900">Local Commerce & Shops</h2>
          </div>
          <Link
            to="/directory?category=Sweet%20Shops%20%26%20Bakeries"
            className="text-xs font-bold text-red-600 hover:text-red-700"
          >
            All Shops →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {RETAIL_SHOPS.map((shop) => (
            <div
              key={shop.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                <img
                  src={shop.image}
                  alt={shop.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <span className="absolute top-1.5 left-1.5 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                  {shop.tag}
                </span>
              </div>

              <div className="p-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <h3 className="text-[13px] font-semibold text-slate-900 truncate">
                      {shop.name}
                    </h3>
                    <span className="text-emerald-600 text-xs font-bold shrink-0">✔</span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {shop.address}
                  </p>
                </div>

                {/* Dual Action Footer: [📞 Call] and [📍 Route] */}
                <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-slate-100 text-xs">
                  <a
                    href={`tel:${shop.phone}`}
                    className="py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition"
                    aria-label={`Call ${shop.name}`}
                  >
                    <span>📞</span>
                    <span>Call</span>
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      openGoogleMapsDirections({
                        name: shop.name,
                        lat: shop.lat,
                        lng: shop.lng,
                        landmark: shop.address,
                      })
                    }
                    className="py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-blue-700 text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
                    aria-label={`Route to ${shop.name}`}
                  >
                    <span>📍</span>
                    <span>Route</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-3">
          <Link
            to="/directory"
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 py-1.5 px-4 rounded-full shadow-2xs active:scale-95 transition"
          >
            <span>View All 15+ Local Shops</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* ========================================================
          SPEC 4: EDUCATION DIRECTORY (Schools & Colleges List Tiles + Bottom Sheet)
          - Left: 48x48px rounded school icon or crest placeholder
          - Middle: Institution Name + Board badge (CBSE, UP BOARD) + Class range tag
          - Right: Tap arrow > that opens slide-up Bottom Sheet (Drawer) containing full details
          - Quick action: Direct "Call School" or "Directions" triggerable from the sheet
          ======================================================== */}
      <section className="px-4 py-3" aria-label="Education Directory">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-base">🏫</span>
            <h2 className="text-sm font-bold text-slate-900">Schools & Colleges</h2>
          </div>
          <Link to="/education" className="text-xs font-bold text-red-600 hover:text-red-700">
            Education Hub →
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {SCHOOLS_DIRECTORY.map((school) => (
            <button
              key={school.id}
              type="button"
              onClick={() => setSelectedSchool(school)}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer"
            >
              <div className="flex items-center gap-3 overflow-hidden pr-2">
                {/* 48x48px rounded crest icon */}
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center shrink-0 text-xl font-bold font-heading">
                  🎓
                </div>

                <div className="overflow-hidden">
                  <h3 className="text-xs font-bold text-slate-900 truncate">
                    {school.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-extrabold uppercase">
                      {school.board}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 text-[9px] font-medium">
                      {school.classes}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    📍 {school.location}
                  </p>
                </div>
              </div>

              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* School Bottom Sheet Modal (Drawer) */}
      {selectedSchool && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-[420px] bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-250 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center text-2xl font-bold">
                  🎓
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {selectedSchool.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                      {selectedSchool.board}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {selectedSchool.classes}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSchool(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="font-semibold text-slate-800 mb-0.5">Campus & Academic Facilities:</p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {selectedSchool.facilities}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Campus Location</span>
                  <strong className="text-slate-800">{selectedSchool.location}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Academic Hours</span>
                  <strong className="text-slate-800">{selectedSchool.timing}</strong>
                </div>
              </div>

              {/* Sheet Quick Actions: Direct Call & Route */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <a
                  href={`tel:${selectedSchool.phone}`}
                  className="h-11 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call School</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    openGoogleMapsDirections({
                      name: selectedSchool.name,
                      lat: selectedSchool.lat,
                      lng: selectedSchool.lng,
                      landmark: selectedSchool.location,
                    });
                    setSelectedSchool(null);
                  }}
                  className="h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Directions</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SPEC 5: TOWN FAIRS, MELAS & CULTURAL CELEBRATIONS
          - Category tabs as compact chips: All (0), Mela & Fair, Aarti & Puja, Civic & Cultural
          - Empty state redesign:
            * Compact 100px illustration/icon with text: "No active melas today"
            * Primary Action Button: [+ Submit Town Event / Mela] (compact secondary button style)
            * Link: "Browse Past Fairs & Archives →"
          ======================================================== */}
      <section className="px-4 py-3" aria-label="Town Fairs and Melas">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-base">🎪</span>
            <h2 className="text-sm font-bold text-slate-900">Town Fairs & Melas</h2>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold">Calendar 2026</span>
        </div>

        {/* Compact Chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1 touch-pan-x mb-2.5">
          {EVENT_TABS.map((tab) => {
            const isActive = selectedEventTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedEventTab(tab)}
                className={`shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition active:scale-95 cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Redesigned Compact Empty State */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center text-2xl mb-2">
            🪔
          </div>
          <p className="text-xs font-bold text-slate-800">No active melas today</p>
          <p className="text-[11px] text-slate-400 mt-0.5 max-w-[240px]">
            Have an upcoming fair, puja, or sports tournament in Fazilnagar?
          </p>

          <div className="flex items-center gap-2 mt-3 w-full">
            <button
              type="button"
              onClick={() => {
                if (onOpenEvent) onOpenEvent();
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-900 text-white text-xs font-semibold active:scale-95 transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Submit Event</span>
            </button>
            <Link
              to="/news"
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold active:scale-95 transition text-center"
            >
              Past Archives →
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================
          1.7 COLLAPSIBLE SACRED HERITAGE ACCORDION
          ======================================================== */}
      <section className="px-4 py-3" aria-label="Sacred Heritage">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 shadow-md space-y-3">
          {/* Header & Twin Badges */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <span>🏛️</span>
              <span>Sacred Twin Heritage (2,600+ Years)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                Pawanagar ⇄ Kushinagar
              </span>
            </div>
          </div>

          {/* 2 Feature Micro-Cards */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/80 flex flex-col justify-between">
              <div>
                <p className="font-bold text-white text-[11px] leading-tight">
                  Pawapuri Jain Tirth
                </p>
                <p className="text-[10px] text-amber-300 font-medium mt-0.5">
                  05:30 AM – 08:30 PM
                </p>
                <p className="text-[9px] text-slate-400 mt-1">
                  Nirvana bhoomi of 24th Tirthankara • Free Entry
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  openGoogleMapsDirections({
                    name: "Pawapuri Jain Tirth Kshetra",
                    lat: 26.6855,
                    lng: 84.0530,
                    landmark: "Pawanagar Tirth Marg, Fazilnagar",
                  })
                }
                className="mt-2.5 py-1 px-2 rounded-lg bg-amber-400 text-slate-900 font-bold text-[10px] active:scale-95 transition text-center cursor-pointer"
              >
                Directions →
              </button>
            </div>

            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/80 flex flex-col justify-between">
              <div>
                <p className="font-bold text-white text-[11px] leading-tight">
                  Historic Kakodha Ghat
                </p>
                <p className="text-[10px] text-emerald-300 font-medium mt-0.5">
                  Ancient Holy River Bath
                </p>
                <p className="text-[9px] text-slate-400 mt-1">
                  Lord Buddha holy river bathing site en route Kushinagar
                </p>
              </div>
              <Link
                to="/directory"
                className="mt-2.5 py-1 px-2 rounded-lg bg-slate-700 text-white font-bold text-[10px] active:scale-95 transition text-center"
              >
                View Map →
              </Link>
            </div>
          </div>

          {/* Collapsible History Accordion with Micro Fact-sheets */}
          <div className="pt-2 border-t border-slate-700/70">
            <button
              type="button"
              onClick={() => setIsHeritageHistoryOpen((prev) => !prev)}
              className="w-full flex items-center justify-between text-[11px] font-bold text-amber-300 hover:text-amber-200 transition cursor-pointer"
            >
              <span>🏛️ Sacred Twin Heritage (Pawanagar & Kushinagar) [{isHeritageHistoryOpen ? "Collapse ↑" : "Expand ↓"}]</span>
              {isHeritageHistoryOpen ? (
                <ChevronUp className="w-4 h-4 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 shrink-0" />
              )}
            </button>

            {isHeritageHistoryOpen && (
              <div className="mt-2.5 space-y-2.5 animate-in fade-in duration-200">
                {/* 4 Micro Fact-sheets */}
                <div className="grid grid-cols-4 gap-1 text-center text-[9px] font-medium text-slate-300">
                  <div className="bg-slate-800/90 rounded-lg p-1.5 border border-slate-700">
                    <span className="block text-[8px] text-slate-400">Antiquity</span>
                    <strong className="text-white font-bold">2600+ yrs</strong>
                  </div>
                  <div className="bg-slate-800/90 rounded-lg p-1.5 border border-slate-700">
                    <span className="block text-[8px] text-slate-400">Dynasty</span>
                    <strong className="text-white font-bold">Malla</strong>
                  </div>
                  <div className="bg-slate-800/90 rounded-lg p-1.5 border border-slate-700">
                    <span className="block text-[8px] text-slate-400">PIN</span>
                    <strong className="text-white font-bold">274401</strong>
                  </div>
                  <div className="bg-slate-800/90 rounded-lg p-1.5 border border-slate-700">
                    <span className="block text-[8px] text-slate-400">Highway</span>
                    <strong className="text-white font-bold">NH-27</strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 space-y-2 leading-relaxed bg-slate-800/60 rounded-xl p-3 border border-slate-700">
                  <p>
                    Fazilnagar represents the historic site of ancient <strong>Pawanagar (Pawa)</strong> of the Malla Republic. It is revered worldwide where Bhagwan Mahavira attained Nirvana on Kartik Amavasya in 527 BCE, commemorating the very genesis of the <strong>Deepavali (Festival of Lights)</strong> celebration.
                  </p>
                  <p>
                    Adjacent to Pawanagar lies Kushinagar (just 16 km west), where Bhagwan Buddha attained Mahaparinirvana, binding these twin centers in immortal spiritual harmony.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================
          1.8 CITIZEN CORNER CTA SPLIT CARD
          ======================================================== */}
      <section className="px-4 py-3" aria-label="Citizen Contribution Desk">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Card A: List Business */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-bold mb-1.5">
                🏪
              </div>
              <h3 className="text-xs font-bold text-slate-900 leading-tight">
                List Business
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                Shopkeeper or clinic in town limit?
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onOpenAddPlace) onOpenAddPlace();
              }}
              className="mt-3.5 h-12 w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold active:scale-95 transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Listing</span>
            </button>
          </div>

          {/* Card B: Report Error */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-sm font-bold mb-1.5">
                ⚠️
              </div>
              <h3 className="text-xs font-bold text-slate-900 leading-tight">
                Report Error
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                Found outdated phone or place?
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onOpenCorrection) onOpenCorrection();
              }}
              className="mt-3.5 h-12 w-full rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Report Bug</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 6: ADAPTABLE FOOTER SYSTEM (Collapsible Accordions)
          ======================================================== */}
      <footer className="mt-4 px-4 pt-4 pb-28 border-t border-slate-200 bg-white text-slate-600 text-xs space-y-2.5">
        {/* Custom Brand Title Block */}
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-slate-900 font-extrabold text-sm tracking-tight font-heading">
            FAZIL<span className="text-[#B8323C]">NAGAR</span> Civic Portal
          </h3>
          <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
            PIN 274401. NH-27 Corridor, Kushinagar, UP
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Admin Help / Complaints: <span className="text-slate-700 font-mono">+91 5564 222102</span> • Toll-Free: <span className="text-slate-700 font-mono">1800-180-5145</span>
          </p>
        </div>

        {/* Accordion 1: Civic Navigation */}
        <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => toggleFooterSection("quickNav")}
            className="w-full p-3 flex items-center justify-between font-bold text-slate-800 bg-slate-50/70 cursor-pointer"
          >
            <span>▶ Civic Navigation (Town Directory, News, Emergency)</span>
            {footerOpen.quickNav ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>
          {footerOpen.quickNav && (
            <div className="p-3 bg-white divide-y divide-slate-100 text-xs">
              <Link to="/" className="block py-1.5 text-slate-700 hover:text-red-600">
                🏛️ Portal Home
              </Link>
              <Link to="/directory" className="block py-1.5 text-slate-700 hover:text-red-600 font-semibold text-red-600">
                📍 Town Directory &amp; Map
              </Link>
              <Link to="/news" className="block py-1.5 text-slate-700 hover:text-red-600">
                📰 Town Updates &amp; News
              </Link>
              <Link to="/emergency" className="block py-1.5 text-slate-700 hover:text-red-600">
                🚨 24/7 Helplines &amp; Police
              </Link>
              <Link to="/healthcare" className="block py-1.5 text-slate-700 hover:text-red-600">
                🏥 Hospitals &amp; Clinics
              </Link>
              <Link to="/govt" className="block py-1.5 text-slate-700 hover:text-red-600">
                🏛️ Public Services
              </Link>
            </div>
          )}
        </div>

        {/* Accordion 2: Community Actions */}
        <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => toggleFooterSection("community")}
            className="w-full p-3 flex items-center justify-between font-bold text-slate-800 bg-slate-50/70 cursor-pointer"
          >
            <span>▶ Community Actions (Submit Local News, Citizen Login)</span>
            {footerOpen.community ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>
          {footerOpen.community && (
            <div className="p-3 bg-white divide-y divide-slate-100 text-xs">
              <Link to="/create-news" className="block py-1.5 text-slate-700 hover:text-red-600">
                ✍️ Submit Local News
              </Link>
              <Link to="/login" className="block py-1.5 text-slate-700 hover:text-red-600">
                👤 Citizen / Reporter Login
              </Link>
              <Link to="/register" className="block py-1.5 text-slate-700 hover:text-red-600">
                📝 Register Resident Account
              </Link>
              {isAdmin && (
                <Link to="/admin/review" className="block py-1.5 text-amber-700 font-bold hover:text-amber-800">
                  🛡️ Admin dashboard
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Accordion 3: Emergency Hotline Numbers */}
        <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => toggleFooterSection("emergency")}
            className="w-full p-3 flex items-center justify-between font-bold text-slate-800 bg-slate-50/70 cursor-pointer"
          >
            <span>▶ Emergency Hotline Numbers (Police 112, CHC Ambulance 108)</span>
            {footerOpen.emergency ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>
          {footerOpen.emergency && (
            <div className="p-3 bg-white divide-y divide-slate-100 text-xs">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-700">Police Outpost:</span>
                <a href="tel:112" className="text-red-600 font-black font-mono">112</a>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-700">Ambulance Emergency:</span>
                <a href="tel:108" className="text-emerald-600 font-black font-mono">108</a>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-700">Women Helpline:</span>
                <a href="tel:1090" className="text-amber-600 font-black font-mono">1090</a>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-700">Fazilnagar CHC Direct:</span>
                <a href="tel:05564222108" className="text-blue-600 font-bold font-mono">+91 5564 222108</a>
              </div>
            </div>
          )}
        </div>

        {/* Accordion 4: Legal & Independent Portal Notice */}
        <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => toggleFooterSection("legal")}
            className="w-full p-3 flex items-center justify-between font-bold text-slate-800 bg-slate-50/70 cursor-pointer"
          >
            <span>▶ Legal &amp; Independent Portal Notice</span>
            {footerOpen.legal ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>
          {footerOpen.legal && (
            <div className="p-3 bg-white text-[11px] text-slate-500 leading-relaxed space-y-1.5">
              <p>
                <strong>Independent community directory notice:</strong> Fazilnagar Portal is an independent community initiative for residents, travelers, and local businesses in Fazilnagar Block (PIN 274401, Kushinagar).
              </p>
              <p>
                Emergency numbers link directly to respective national and state utility hotlines (112, 108, 1912).
              </p>
            </div>
          )}
        </div>

        <div className="pt-3 pb-6 text-center text-[11px] text-slate-400">
          Copyright: 2026 Fazilnagar Town Portal Modern Civic &amp; Editorial System
        </div>
      </footer>

      {/* ========================================================
          FLOATING ACTION BUTTON (FAB): [+ Add Place]
          - Positioned above bottom navbar at bottom-20 right-4
          ======================================================== */}
      <button
        type="button"
        onClick={() => {
          if (onOpenAddPlace) onOpenAddPlace();
        }}
        className="fixed right-4 bottom-20 z-40 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 px-3.5 rounded-full shadow-lg border border-emerald-600 active:scale-95 transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
        aria-label="Add Place to Directory"
      >
        <Plus className="w-4 h-4" />
        <span>Add Place</span>
      </button>
    </div>
  );
}
