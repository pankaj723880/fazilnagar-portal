import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API from "../api";
import seedPlaces from "../data/places.json";
import { openGoogleMapsDirections } from "../utils/directions";
import { usePageSEO } from "../utils/seo";
import { getThumbnailUrl } from "../utils/mediaUtils";
const CommunityPlaceModal = lazy(() => import("../components/CommunityPlaceModal"));
const AdminPlaceEditModal = lazy(() => import("../components/AdminPlaceEditModal"));
const DirectoryMap = lazy(() => import("../components/DirectoryMap"));
import { isUserAdmin, getAuthToken } from "../utils/authStorage";
import { getSocket } from "../socket";
import { FAZILNAGAR_AREAS } from "../constants/areas";
import { ScrollReveal } from "../components/ScrollReveal";
import { matchesSearchText, useDebouncedSearch } from "../utils/searchUtils";
import {
  Search,
  Mic,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  Clock,
  Layers,
  Filter,
  ArrowUpDown,
  Plus,
  AlertTriangle,
  Building,
  GraduationCap,
  Stethoscope,
  Store,
  Pill,
  Utensils,
  Wrench,
  Fuel,
  Landmark,
  Hotel,
  Church,
  BookOpen,
  Edit3,
  ShieldCheck,
  X,
  Info,
  ChevronDown,
  RotateCcw,
  Compass,
  Heart,
  MoreVertical,
  SlidersHorizontal,
} from "lucide-react";

// Category configurations matching reference specification
const PRIMARY_CATEGORIES = [
  { id: "all", name: "All Categories", icon: Layers, iconColor: "text-slate-600" },
  { id: "Schools", name: "Schools", icon: GraduationCap, iconColor: "text-blue-500" },
  { id: "Hospitals", name: "Hospitals", icon: Stethoscope, iconColor: "text-red-500" },
  { id: "Shops", name: "Shops", icon: Store, iconColor: "text-amber-500" },
  { id: "Pharmacies", name: "Pharmacies", icon: Pill, iconColor: "text-emerald-500" },
  { id: "Restaurants", name: "Restaurants", icon: Utensils, iconColor: "text-orange-500" },
  { id: "Services", name: "Services", icon: Wrench, iconColor: "text-purple-500" },
];

const MORE_CATEGORIES = [
  { id: "Petrol Pumps", name: "Petrol Pumps", icon: Fuel },
  { id: "Banks", name: "Banks & ATMs", icon: Landmark },
  { id: "Hotels", name: "Hotels & Lodges", icon: Hotel },
  { id: "Temples", name: "Temples & Shrines", icon: Church },
  { id: "Coaching Centres", name: "Coaching Centres", icon: BookOpen },
  { id: "Community Facilities", name: "Community Facilities", icon: Building },
  { id: "Other Businesses", name: "Other Businesses", icon: Store },
];

// Fallback curated images for categories when place image is missing
const CATEGORY_FALLBACK_IMAGES = {
  schools: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&auto=format&fit=crop",
  hospitals: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&auto=format&fit=crop",
  pharmacies: "https://images.unsplash.com/photo-1586015554060-8db665956dc9?w=400&auto=format&fit=crop",
  shops: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&auto=format&fit=crop",
  restaurants: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&auto=format&fit=crop",
  services: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&auto=format&fit=crop",
  default: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=400&auto=format&fit=crop",
};

function getCategoryFallbackImage(category) {
  const cat = (category || "").toLowerCase();
  if (cat.includes("school") || cat.includes("college") || cat.includes("education")) return CATEGORY_FALLBACK_IMAGES.schools;
  if (cat.includes("pharmacy") || cat.includes("chemist") || cat.includes("medical store")) return CATEGORY_FALLBACK_IMAGES.pharmacies;
  if (cat.includes("hospital") || cat.includes("clinic") || cat.includes("health")) return CATEGORY_FALLBACK_IMAGES.hospitals;
  if (cat.includes("restaurant") || cat.includes("food") || cat.includes("dhaba") || cat.includes("cafe")) return CATEGORY_FALLBACK_IMAGES.restaurants;
  if (cat.includes("shop") || cat.includes("store") || cat.includes("market")) return CATEGORY_FALLBACK_IMAGES.shops;
  if (cat.includes("service") || cat.includes("repair")) return CATEGORY_FALLBACK_IMAGES.services;
  return CATEGORY_FALLBACK_IMAGES.default;
}

// Category icon & badge helper
function getCategoryVisual(category, subcategory) {
  const combined = `${category || ""} ${subcategory || ""}`.toLowerCase();
  if (combined.includes("school") || combined.includes("college") || combined.includes("education")) {
    return { icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-50 text-blue-700 border-blue-100" };
  }
  if (combined.includes("pharmacy") || combined.includes("chemist") || combined.includes("medical store")) {
    return { icon: Pill, color: "text-emerald-600", bg: "bg-emerald-50 text-emerald-700 border-emerald-100" };
  }
  if (combined.includes("hospital") || combined.includes("clinic") || combined.includes("health")) {
    return { icon: Stethoscope, color: "text-red-600", bg: "bg-red-50 text-red-700 border-red-100" };
  }
  if (combined.includes("restaurant") || combined.includes("food") || combined.includes("dhaba") || combined.includes("cafe")) {
    return { icon: Utensils, color: "text-orange-600", bg: "bg-orange-50 text-orange-700 border-orange-100" };
  }
  if (combined.includes("shop") || combined.includes("store") || combined.includes("market")) {
    return { icon: Store, color: "text-amber-600", bg: "bg-amber-50 text-amber-700 border-amber-100" };
  }
  if (combined.includes("service") || combined.includes("repair") || combined.includes("workshop")) {
    return { icon: Wrench, color: "text-purple-600", bg: "bg-purple-50 text-purple-700 border-purple-100" };
  }
  if (combined.includes("bank") || combined.includes("atm")) {
    return { icon: Landmark, color: "text-indigo-600", bg: "bg-indigo-50 text-indigo-700 border-indigo-100" };
  }
  if (combined.includes("hotel") || combined.includes("lodge")) {
    return { icon: Hotel, color: "text-teal-600", bg: "bg-teal-50 text-teal-700 border-teal-100" };
  }
  if (combined.includes("fuel") || combined.includes("petrol")) {
    return { icon: Fuel, color: "text-cyan-600", bg: "bg-cyan-50 text-cyan-700 border-cyan-100" };
  }
  return { icon: Building, color: "text-slate-600", bg: "bg-slate-50 text-slate-700 border-slate-200" };
}

// Helper function to match place category and subcategory robustly
function matchesCategory(placeCat, placeSubcat, targetCat) {
  if (!targetCat || targetCat === "all" || targetCat === "All" || targetCat === "All Categories") return true;
  const target = targetCat.toLowerCase().trim();
  const c = (placeCat || "").toLowerCase().trim();
  const sc = (placeSubcat || "").toLowerCase().trim();

  if (target === "schools" || target === "schools & colleges" || target.includes("school")) {
    return c.includes("school") || c.includes("college") || sc.includes("school") || sc.includes("college") || c.includes("education") || sc.includes("education") || c.includes("coaching") || sc.includes("coaching");
  }
  if (target === "hospitals" || target === "hospitals & clinics" || target.includes("hospital")) {
    return (c.includes("hospital") || c.includes("clinic") || sc.includes("hospital") || sc.includes("clinic") || c.includes("health") || sc.includes("health")) && !c.includes("pharmacy") && !sc.includes("pharmacy");
  }
  if (target === "pharmacies" || target === "pharmacy") {
    return c.includes("pharmacy") || sc.includes("pharmacy") || c.includes("chemist") || sc.includes("chemist") || c.includes("medical store") || sc.includes("medical store");
  }
  if (target === "shops" || target === "shops & stores" || target.includes("shop")) {
    return c.includes("shop") || sc.includes("shop") || c.includes("store") || sc.includes("store") || c.includes("market") || sc.includes("retail");
  }
  if (target === "restaurants" || target === "restaurants & dhabas" || target.includes("restaurant")) {
    return c.includes("restaurant") || sc.includes("restaurant") || c.includes("dhaba") || sc.includes("dhaba") || c.includes("food") || sc.includes("food") || c.includes("cafe") || sc.includes("cafe");
  }
  if (target === "services" || target === "repair services" || target.includes("service")) {
    return c.includes("service") || sc.includes("service") || c.includes("repair") || sc.includes("repair") || c.includes("workshop") || sc.includes("workshop") || c.includes("office") || sc.includes("agency");
  }
  if (target.includes("petrol") || target.includes("fuel")) {
    return c.includes("petrol") || c.includes("fuel") || sc.includes("petrol") || sc.includes("fuel") || c.includes("transport");
  }
  if (target.includes("bank") || target.includes("atm")) {
    return c.includes("bank") || sc.includes("bank") || c.includes("atm") || sc.includes("atm") || c.includes("financial");
  }

  if (c === target || sc === target) return true;
  if (c && (c.includes(target) || target.includes(c))) return true;
  if (sc && (sc.includes(target) || target.includes(sc))) return true;

  const targetWords = target.split(/[\s&,/]+/).filter((w) => w.length > 3);
  return targetWords.some((w) => c.includes(w) || sc.includes(w));
}

// Helper to filter embedded verified places
function filterPlaces(list, category, locality, search, sort) {
  let filtered = Array.isArray(list) ? [...list] : [];
  filtered = filtered.filter(
    (p) =>
      p &&
      !p.isArchived &&
      p.isPublished !== false &&
      p.latitude !== null &&
      p.longitude !== null &&
      !isNaN(parseFloat(p.latitude)) &&
      !isNaN(parseFloat(p.longitude))
  );

  if (category && category !== "all" && category !== "All") {
    filtered = filtered.filter((p) => matchesCategory(p.category, p.subcategory, category));
  }
  if (locality && locality !== "all") {
    const locLower = locality.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        (p.locality && p.locality.toLowerCase().includes(locLower)) ||
        (p.streetOrLandmark && p.streetOrLandmark.toLowerCase().includes(locLower)) ||
        (p.addressFull && p.addressFull.toLowerCase().includes(locLower))
    );
  }
  if (search && search.trim()) {
    filtered = filtered.filter((p) => {
      const target = [
        p.name,
        p.nameHi,
        p.hindiName,
        Array.isArray(p.alternateNames) ? p.alternateNames.join(" ") : "",
        p.category,
        p.subcategory,
        p.addressFull,
        p.locality,
        p.streetOrLandmark,
        p.description,
        Array.isArray(p.services) ? p.services.join(" ") : "",
      ].filter(Boolean).join(" ");
      return matchesSearchText(target, search);
    });
  }

  if (sort === "name") {
    filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } else if (sort === "name_desc") {
    filtered.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
  } else if (sort === "category") {
    filtered.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
  }

  return filtered;
}

export default function Directory({ user }) {
  usePageSEO({
    title: "Fazilnagar Town Directory | Verified Local Places, Shops & Institutions",
    description: "Browse the complete verified local directory of Fazilnagar (PIN 274401, Kushinagar, UP). Find schools, hospitals, doctors, pharmacies, shops, markets, banks, and essential civic facilities.",
    canonicalPath: "/directory",
  });

  const [isAdminState, setIsAdminState] = useState(() => Boolean(isUserAdmin() && (!user || user.role === "admin")));
  useEffect(() => {
    const handleAuth = () => {
      setIsAdminState(Boolean(isUserAdmin() && (!user || user.role === "admin")));
    };
    window.addEventListener("auth-change", handleAuth);
    return () => window.removeEventListener("auth-change", handleAuth);
  }, [user]);
  const isAdmin = Boolean(isAdminState && isUserAdmin());

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = searchParams.get("category") || "all";
  const initialSearch = searchParams.get("search") || "";

  const [allMasterPlaces, setAllMasterPlaces] = useState(() => {
    try {
      const cached = sessionStorage.getItem("fazilnagar_cached_places");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return Array.isArray(seedPlaces)
      ? seedPlaces.filter((p) => !p.isArchived && p.isPublished !== false)
      : [];
  });

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [selectedLocality, setSelectedLocality] = useState("all");
  const [sortBy, setSortBy] = useState("name"); // "name" | "name_desc" | "category"
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [detailModalPlace, setDetailModalPlace] = useState(null);

  // Filter drawer toggle
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // More categories dropdown toggle
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef(null);

  // Card overflow menu state (place id)
  const [openCardMenuId, setOpenCardMenuId] = useState(null);

  // LocalStorage favorites state
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("fazilnagar_directory_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const toggleFavorite = (placeId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setFavorites((prev) => {
      const isFav = prev.includes(placeId);
      const next = isFav ? prev.filter((id) => id !== placeId) : [...prev, placeId];
      try {
        localStorage.setItem("fazilnagar_directory_favorites", JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
      setOpenCardMenuId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalPlace, setEditModalPlace] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdminQueue, setShowAdminQueue] = useState(false);
  const [adminQueuePlaces, setAdminQueuePlaces] = useState([]);

  useEffect(() => {
    if (searchParams.get("add") === "true") {
      if (!getAuthToken()) {
        navigate("/login", {
          state: {
            from: "/directory?add=true",
            message: "Please log in to add a place to the town directory.",
          },
        });
      } else {
        setShowAddModal(true);
      }
    }
  }, [searchParams, navigate]);

  const [stats, setStats] = useState(() => {
    try {
      const cached = sessionStorage.getItem("fazilnagar_cached_places_stats");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.total || parsed.published)) return parsed;
      }
    } catch (_) {}
    const catMap = {};
    seedPlaces.forEach((p) => {
      catMap[p.category] = (catMap[p.category] || 0) + 1;
    });
    return {
      total: seedPlaces.length,
      published: seedPlaces.length,
      inReview: 0,
      categoryCounts: Object.keys(catMap).map((c) => ({ _id: c, count: catMap[c] })),
    };
  });
  const [toastMessage, setToastMessage] = useState("");

  // Map interaction & height controls
  const [isMapActive, setIsMapActive] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Voice Search Handler
  const [voiceToast, setVoiceToast] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

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

  const debouncedSearch = useDebouncedSearch(searchQuery, 200);

  const places = useMemo(() => {
    return filterPlaces(allMasterPlaces, selectedCategory, selectedLocality, debouncedSearch, sortBy);
  }, [allMasterPlaces, selectedCategory, selectedLocality, debouncedSearch, sortBy]);

  const [fetchError, setFetchError] = useState(null);

  const fetchPlaces = useCallback(async () => {
    try {
      const res = await API.get("/places");
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.places)
        ? res.data.places
        : Array.isArray(res.data?.data)
        ? res.data.data
        : null;
      if (Array.isArray(data)) {
        const valid = data.filter((p) => !p.isArchived && p.isPublished !== false);
        setAllMasterPlaces(valid);
        setFetchError(null);
        try {
          sessionStorage.setItem("fazilnagar_cached_places", JSON.stringify(valid));
        } catch (_) {}

        const updateItemInPlace = (current) => {
          if (!current) return null;
          const currentId = current._id || current.id || current.slug;
          const updated = valid.find(
            (p) =>
              (p._id && currentId && String(p._id) === String(currentId)) ||
              (p.id && currentId && String(p.id) === String(currentId)) ||
              (p.slug && currentId && String(p.slug) === String(currentId)) ||
              (p.name && current.name && p.name === current.name)
          );
          return updated || current;
        };

        setSelectedPlace(updateItemInPlace);
        setDetailModalPlace(updateItemInPlace);
        setEditModalPlace(updateItemInPlace);
      }
    } catch (err) {
      console.warn("[Directory] Using verified local seed data:", err.message);
      setFetchError("Displaying verified town directory.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await API.get("/places/stats/summary");
      if (res.data && (res.data.total || res.data.published)) {
        setStats(res.data);
        try {
          sessionStorage.setItem("fazilnagar_cached_places_stats", JSON.stringify(res.data));
        } catch (_) {}
        return;
      }
    } catch (err) {
      // ignore
    }
    const catMap = {};
    seedPlaces.forEach((p) => {
      catMap[p.category] = (catMap[p.category] || 0) + 1;
    });
    setStats({
      total: seedPlaces.length,
      published: seedPlaces.length,
      inReview: 0,
      categoryCounts: Object.keys(catMap).map((c) => ({ _id: c, count: catMap[c] })),
    });
  }, []);

  const fetchAdminQueue = useCallback(async () => {
    try {
      const res = await API.get("/places/admin", {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      let data = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
      if (data.length === 0) {
        data = seedPlaces.filter((p) => p.isPublished === false);
      }
      setAdminQueuePlaces(data);
    } catch (err) {
      setAdminQueuePlaces(seedPlaces.filter((p) => p.isPublished === false));
    }
  }, []);

  useEffect(() => {
    fetchPlaces();
    fetchStats();
  }, [fetchPlaces, fetchStats]);

  // Real-time synchronization
  useEffect(() => {
    const handlePlaceUpdate = () => {
      try {
        sessionStorage.removeItem("fazilnagar_cached_places");
        sessionStorage.removeItem("fazilnagar_cached_places_stats");
      } catch (_) {}
      fetchPlaces();
      fetchStats();
      if (isAdmin) {
        fetchAdminQueue();
      }
    };

    const handleStorage = (e) => {
      if (e.key === "fazilnagar_last_place_update") {
        handlePlaceUpdate();
      }
    };

    window.addEventListener("fazilnagar-place-updated", handlePlaceUpdate);
    window.addEventListener("storage", handleStorage);

    let socket = null;
    try {
      socket = getSocket();
      if (socket) {
        socket.on("places_updated", handlePlaceUpdate);
      }
    } catch (_) {}

    return () => {
      window.removeEventListener("fazilnagar-place-updated", handlePlaceUpdate);
      window.removeEventListener("storage", handleStorage);
      if (socket) {
        socket.off("places_updated", handlePlaceUpdate);
      }
    };
  }, [fetchPlaces, fetchStats, fetchAdminQueue, isAdmin]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Sync state if URL search params change
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      if (cat !== selectedCategory) {
        setSelectedCategory(cat);
        setSelectedPlace(null);
      }
    } else if (selectedCategory !== "all") {
      setSelectedCategory("all");
      setSelectedPlace(null);
    }
    const search = searchParams.get("search");
    if (search !== null && search !== searchQuery) {
      setSearchQuery(search);
      setSelectedPlace(null);
    }
  }, [searchParams]);

  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
    setSelectedPlace(null);
    setShowMoreMenu(false);
    const newParams = new URLSearchParams(searchParams);
    if (catId === "all") {
      newParams.delete("category");
    } else {
      newParams.set("category", catId);
    }
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setSelectedPlace(null);
    const newParams = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      newParams.set("search", searchQuery.trim());
    } else {
      newParams.delete("search");
    }
    setSearchParams(newParams);
    fetchPlaces();
  };

  const handleApprovePlace = async (id) => {
    if (!isAdmin) return;
    try {
      await API.put(
        `/places/${id}`,
        {
          isPublished: true,
          townBoundaryStatus: "confirmed",
          verificationStatus: "verified",
        },
        {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        }
      );
      showToast("Establishment approved and published!");
      fetchAdminQueue();
      fetchPlaces();
      fetchStats();
    } catch (err) {
      setAdminQueuePlaces((prev) => prev.filter((p) => (p._id || p.id) !== id));
      showToast("Updated locally: Establishment verified inside town directory.");
    }
  };

  const isMoreCategorySelected = MORE_CATEGORIES.some((c) => c.id === selectedCategory);

  return (
    <div id="directory-page" className="space-y-4 sm:space-y-5 pb-24 font-sans max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Moderation Queue Drawer (Admin Only) */}
      {isAdmin && (
        <div className="flex items-center justify-end">
          <button
            onClick={() => {
              setShowAdminQueue(!showAdminQueue);
              if (!showAdminQueue) fetchAdminQueue();
            }}
            className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-200 transition cursor-pointer shadow-2xs"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Admin Queue ({stats?.inReview || adminQueuePlaces.filter((p) => !p.isPublished).length || 0})</span>
          </button>
        </div>
      )}

      {isAdmin && showAdminQueue && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-amber-900">
                Verification Desk & Boundary Moderation (Admin)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-amber-800">
              {adminQueuePlaces.filter((p) => !p.isPublished).length || 0} Pending
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {(adminQueuePlaces.length > 0 ? adminQueuePlaces : seedPlaces)
              .filter((p) => !p.isPublished)
              .map((item) => (
                <div key={item._id || item.id} className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs space-y-1.5 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900">{item.name}</h4>
                      <p className="text-[11px] text-slate-500">{item.addressFull || item.locality}</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleApprovePlace(item._id || item.id)}
                      className="text-xs font-bold bg-[#087F62] hover:bg-emerald-800 text-white px-2.5 py-1.5 rounded-lg transition"
                    >
                      Verify & Publish
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Voice Status Toast */}
      {voiceToast && (
        <div className="py-1 px-3 rounded-lg bg-[#111A2E] text-white text-[11px] text-center font-medium animate-in fade-in duration-150 shadow-sm max-w-xs mx-auto">
          {voiceToast}
        </div>
      )}

      {/* ========================================================
          1. SEARCH AND FILTER PANEL (Replaces deleted hero banner)
          ======================================================== */}
      <section aria-label="Search and filter directory" className="bg-white rounded-2xl border border-[#E3EAF1] shadow-xs p-3.5 sm:p-4 space-y-3">
        {/* Search Row */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#71819B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search schools, clinics, shops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F5F7FA] text-[#182338] placeholder-[#71819B] text-xs sm:text-sm pl-9 pr-16 py-2.5 min-h-[42px] rounded-xl border border-transparent outline-none focus:border-[#C92F3D] focus:bg-white transition font-medium"
              aria-label="Search schools, clinics, shops"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={handleVoiceSearch}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isListening ? "text-red-600 bg-red-50 animate-pulse" : "text-[#71819B] hover:text-[#182338]"
                }`}
                title="Voice search"
                aria-label="Voice search"
              >
                <Mic className="w-4 h-4" />
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    fetchPlaces();
                  }}
                  className="p-1.5 text-[#71819B] hover:text-[#182338] cursor-pointer"
                  aria-label="Clear search query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Square Filter Button (Icon-Only, Sliders Icon, opens filter panel) */}
          <button
            type="button"
            onClick={() => setShowFilterDrawer((prev) => !prev)}
            className={`w-[42px] h-[42px] min-w-[42px] rounded-xl border flex items-center justify-center transition cursor-pointer active:scale-95 ${
              showFilterDrawer || selectedLocality !== "all"
                ? "bg-[#C92F3D] text-white border-[#C92F3D] shadow-xs"
                : "bg-[#F5F7FA] hover:bg-slate-100 text-[#182338] border-[#E3EAF1]"
            }`}
            aria-label="Filter options"
            title="Filter options"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Filter Drawer (Toggled by square filter button) */}
        {showFilterDrawer && (
          <div className="bg-[#F5F7FA] rounded-xl p-3 border border-[#E3EAF1] space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#182338]">Filter by Ward / Area</span>
              {(selectedLocality !== "all" || searchQuery || selectedCategory !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLocality("all");
                    setSelectedCategory("all");
                    setSearchQuery("");
                    setSortBy("name");
                    setSearchParams({});
                  }}
                  className="text-[11px] font-semibold text-[#C92F3D] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All</span>
                </button>
              )}
            </div>
            <select
              value={selectedLocality}
              onChange={(e) => setSelectedLocality(e.target.value)}
              className="w-full bg-white text-xs font-semibold text-[#182338] p-2 rounded-lg border border-[#E3EAF1] outline-none cursor-pointer"
            >
              <option value="all">All Wards / Areas</option>
              {FAZILNAGAR_AREAS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Category Chips Row */}
        <div className="relative">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 -mx-1 px-1 flex-nowrap sm:flex-wrap">
            {PRIMARY_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected =
                selectedCategory === cat.id ||
                (cat.id === "all" && (!selectedCategory || selectedCategory === "all"));

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap transition flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-[#C92F3D] text-white shadow-xs font-bold"
                      : "bg-[#F5F7FA] hover:bg-slate-100 text-[#182338] border border-[#E3EAF1]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-white" : cat.iconColor}`} />
                  <span>{cat.name}</span>
                </button>
              );
            })}

            {/* Overflow "More" Category Menu */}
            <div className="relative shrink-0" ref={moreMenuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreMenu((prev) => !prev);
                }}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap transition flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                  isMoreCategorySelected
                    ? "bg-[#C92F3D] text-white shadow-xs font-bold"
                    : "bg-[#F5F7FA] hover:bg-slate-100 text-[#182338] border border-[#E3EAF1]"
                }`}
                aria-expanded={showMoreMenu}
                aria-haspopup="true"
              >
                <span>{isMoreCategorySelected ? selectedCategory : "More"}</span>
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              </button>

              {showMoreMenu && (
                <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-[#E3EAF1] py-1.5 z-40 text-xs animate-in fade-in duration-150 max-h-64 overflow-y-auto">
                  {MORE_CATEGORIES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleCategorySelect(item.id)}
                      className={`w-full px-3 py-2 text-left font-medium flex items-center justify-between cursor-pointer transition ${
                        selectedCategory === item.id
                          ? "bg-red-50 text-[#C92F3D] font-bold"
                          : "text-[#182338] hover:bg-[#F5F8FA]"
                      }`}
                    >
                      <span>{item.name}</span>
                      {selectedCategory === item.id && <span className="text-[#C92F3D]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          2. VERIFIED PLACES STATISTICS STRIP
          ======================================================== */}
      {stats && (
        <section aria-label="Town statistics" className="bg-white rounded-xl border border-[#E3EAF1] shadow-2xs px-4 py-2.5 flex items-center justify-between text-xs overflow-x-auto gap-3 scrollbar-none">
          {/* Verified Count */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-5 h-5 rounded-full bg-[#E8F5E9] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#087F62]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-extrabold text-[#182338] text-xs sm:text-sm">
                {stats.published || places.length}
              </span>
              <span className="text-[#71819B] font-medium">Verified Places</span>
            </div>
          </div>

          <div className="h-4 w-px bg-[#E3EAF1] shrink-0" />

          {/* Categories Count */}
          <div className="flex items-center gap-2 shrink-0">
            <Layers className="w-4 h-4 text-[#71819B]" />
            <div className="flex items-baseline gap-1">
              <span className="font-extrabold text-[#182338] text-xs sm:text-sm">
                {stats.categoryCounts?.length || 7}
              </span>
              <span className="text-[#71819B] font-medium">Categories</span>
            </div>
          </div>

          <div className="h-4 w-px bg-[#E3EAF1] shrink-0" />

          {/* Location Pin */}
          <div className="flex items-center gap-1.5 shrink-0 text-[#182338] font-semibold">
            <MapPin className="w-3.5 h-3.5 text-[#C92F3D]" />
            <span>Fazilnagar, UP</span>
          </div>
        </section>
      )}

      {/* ========================================================
          3. WARD/AREA AND SORTING CONTROLS CARD
          ======================================================== */}
      <section aria-label="Area and sorting filters" className="bg-white rounded-xl border border-[#E3EAF1] shadow-xs p-2 sm:p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {/* Left: Ward / Area Selector */}
        <div className="relative flex items-center bg-[#F5F7FA] rounded-xl px-3 py-2 border border-[#E3EAF1] hover:border-slate-300 transition">
          <Filter className="w-3.5 h-3.5 text-[#71819B] shrink-0 mr-2" />
          <select
            value={selectedLocality}
            onChange={(e) => setSelectedLocality(e.target.value)}
            className="w-full bg-transparent text-xs font-semibold text-[#182338] outline-none cursor-pointer appearance-none pr-6"
            aria-label="Filter by Ward or Area"
          >
            <option value="all">All Wards / Areas</option>
            {FAZILNAGAR_AREAS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-[#71819B] absolute right-2.5 pointer-events-none" />
        </div>

        {/* Right: Sort Selector */}
        <div className="relative flex items-center bg-[#F5F7FA] rounded-xl px-3 py-2 border border-[#E3EAF1] hover:border-slate-300 transition">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#71819B] shrink-0 mr-2" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full bg-transparent text-xs font-semibold text-[#182338] outline-none cursor-pointer appearance-none pr-6"
            aria-label="Sort directory results"
          >
            <option value="name">Sort: A to Z</option>
            <option value="name_desc">Sort: Z to A</option>
            <option value="category">Sort: Category</option>
          </select>
          <ChevronDown className="w-4 h-4 text-[#71819B] absolute right-2.5 pointer-events-none" />
        </div>
      </section>

      {/* Screen Reader Announcement for Search & Filter Results */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {loading
          ? "Searching verified town directory..."
          : places.length === 0
          ? `No places found for "${searchQuery || 'selected filters'}". Try checking spelling or resetting filters.`
          : `${places.length} verified places displayed.`}
      </div>

      {fetchError && (
        <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <span>ℹ️ {fetchError}</span>
        </div>
      )}

      {/* ========================================================
          4. MAP CARD (Large, rounded, matching reference)
          ======================================================== */}
      <section aria-label="Interactive town map">
        <Suspense
          fallback={
            <div className="w-full h-[300px] sm:h-[380px] lg:h-[440px] bg-[#F5F8FA] rounded-2xl sm:rounded-3xl border border-[#E3EAF1] flex flex-col items-center justify-center gap-2">
              <div className="w-7 h-7 border-3 border-[#C92F3D] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[#71819B] font-medium">Loading town map view...</span>
            </div>
          }
        >
          <DirectoryMap
            places={places}
            selectedPlace={selectedPlace}
            onSelectPlace={(p) => {
              setSelectedPlace(p);
              setDetailModalPlace(p);
            }}
            isMapExpanded={isMapExpanded}
            onToggleExpand={() => setIsMapExpanded((prev) => !prev)}
            isMapActive={isMapActive}
            onSetActive={setIsMapActive}
          />
        </Suspense>
      </section>

      {/* ========================================================
          5. RESULTS SUMMARY ROW
          ======================================================== */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-xs sm:text-sm font-bold text-[#182338]">
          Showing <span className="text-[#C92F3D]">{places.length}</span> {places.length === 1 ? "place" : "places"}
        </h2>
        {selectedCategory !== "all" && (
          <span className="text-[11px] font-semibold text-[#C92F3D] bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full">
            {selectedCategory}
          </span>
        )}
      </div>

      {/* ========================================================
          6. DIRECTORY LISTING CARDS
          ======================================================== */}
      {places.length === 0 && !loading ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-[#E3EAF1] shadow-2xs max-w-md mx-auto my-6 animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="text-sm font-bold text-[#182338]">
            {searchQuery ? `No results for "${searchQuery.slice(0, 40)}"` : "No establishments found"}
          </h3>
          <p className="text-xs text-[#71819B] mt-1 leading-relaxed">
            {searchQuery
              ? "We couldn't find a matching verified establishment. Try typing in Hindi (e.g. 'अस्पताल', 'स्कूल') or English, or reset filters to view all places."
              : "No verified places matched your filters within Fazilnagar town limits."}
          </p>
          <button
            onClick={() => {
              setSelectedCategory("all");
              setSelectedLocality("all");
              setSearchQuery("");
              setSortBy("name");
              setSearchParams({});
            }}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111A2E] hover:bg-[#C92F3D] text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {places.map((place, idx) => {
            const entityId = place._id || place.id || place.slug;
            const isVerified = place.verificationStatus === "verified" || place.isPublished === true;
            const isFavorite = favorites.includes(entityId);
            const catVisual = getCategoryVisual(place.category, place.subcategory);
            const CatIcon = catVisual.icon;

            return (
              <ScrollReveal
                key={entityId || idx}
                variant="fade-up"
                staggerIndex={Math.min(idx, 8)}
                staggerBaseDelay={25}
                once={true}
                className="transition-colors"
              >
                <div
                  onClick={() => {
                    setSelectedPlace(place);
                    setDetailModalPlace(place);
                  }}
                  className="bg-white rounded-2xl border border-[#E3EAF1] hover:border-slate-300 shadow-xs hover:shadow-sm transition p-3 sm:p-3.5 flex gap-3 sm:gap-3.5 items-start cursor-pointer relative group text-left"
                >
                  {/* Left: Thumbnail Image with fallback */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200/60 relative">
                    <img
                      src={getThumbnailUrl(place.imageUrl, 200) || getCategoryFallbackImage(place.category)}
                      alt={place.name}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = getCategoryFallbackImage(place.category);
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Middle: Place info */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      {isVerified && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#087F62] bg-[#E8F5E9] px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-[#087F62]" /> Verified
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${catVisual.bg}`}>
                        <CatIcon className={`w-3 h-3 ${catVisual.color}`} />
                        <span className="truncate max-w-[120px]">{place.subcategory || place.category}</span>
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-[#182338] leading-tight line-clamp-1 group-hover:text-[#C92F3D] transition-colors">
                      {place.name}
                    </h3>

                    <p className="text-[11px] text-[#71819B] font-medium mt-1 line-clamp-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#C92F3D] shrink-0" />
                      <span>{place.streetOrLandmark || place.addressFull || place.locality}</span>
                    </p>

                    {place.openingHours && (
                      <p className="text-[10px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        <span className="truncate">{place.openingHours}</span>
                      </p>
                    )}
                  </div>

                  {/* Right: Favorite + 3-dot overflow menu */}
                  <div className="shrink-0 flex flex-col items-end justify-between self-stretch gap-2">
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(entityId, e)}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Heart
                        className={`w-4 h-4 transition ${
                          isFavorite ? "fill-[#C92F3D] text-[#C92F3D]" : "text-slate-400 hover:text-slate-600"
                        }`}
                      />
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenCardMenuId((prev) => (prev === entityId ? null : entityId));
                        }}
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition cursor-pointer text-[#71819B] hover:text-[#182338]"
                        aria-label="More options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openCardMenuId === entityId && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 bottom-full mb-1 w-36 bg-white rounded-xl shadow-xl border border-[#E3EAF1] py-1.5 z-30 text-xs animate-in fade-in duration-150"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenCardMenuId(null);
                              openGoogleMapsDirections(place);
                            }}
                            className="w-full px-3 py-1.5 text-left font-medium text-[#182338] hover:bg-[#F5F8FA] flex items-center gap-2 cursor-pointer"
                          >
                            <Navigation className="w-3.5 h-3.5 text-[#087F62]" />
                            <span>Directions</span>
                          </button>
                          {place.phone && (
                            <a
                              href={`tel:${place.phone.replace(/\s+/g, "")}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenCardMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left font-medium text-[#182338] hover:bg-[#F5F8FA] flex items-center gap-2"
                            >
                              <Phone className="w-3.5 h-3.5 text-blue-600" />
                              <span>Call</span>
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenCardMenuId(null);
                              setDetailModalPlace(place);
                            }}
                            className="w-full px-3 py-1.5 text-left font-medium text-[#182338] hover:bg-[#F5F8FA] flex items-center gap-2 cursor-pointer"
                          >
                            <Info className="w-3.5 h-3.5 text-slate-500" />
                            <span>Details</span>
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenCardMenuId(null);
                                setEditModalPlace(place);
                                setShowEditModal(true);
                              }}
                              className="w-full px-3 py-1.5 text-left font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                              <span>Edit (Admin)</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      )}

      {/* ========================================================
          7. FLOATING ADD PLACE ACTION BUTTON (Exactly ONE on the page)
          ======================================================== */}
      <button
        type="button"
        onClick={() => {
          if (!getAuthToken()) {
            navigate("/login", {
              state: {
                from: "/directory?add=true",
                message: "Please log in to add a place to the town directory.",
              },
            });
            return;
          }
          setShowAddModal(true);
        }}
        className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#087F62] hover:bg-[#06654e] active:scale-95 text-white shadow-xl flex items-center justify-center transition cursor-pointer border-2 border-white/90 group"
        aria-label="Add Place to Directory"
        title="Add Place to Directory"
      >
        <Plus className="w-7 h-7 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
      </button>

      {/* Place Detail & Audit Modal */}
      {detailModalPlace && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full sm:my-auto p-4 sm:p-5 shadow-2xl relative max-h-[85vh] overflow-y-auto animate-fade-in-up sm:animate-modal-pop">
            <button
              onClick={() => setDetailModalPlace(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-50 text-[#C92F3D]">
                  {detailModalPlace.category} • {detailModalPlace.subcategory || "Verified"}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1.5 leading-snug">
                  {detailModalPlace.name}
                </h2>
                {detailModalPlace.alternateNames?.length > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Also known as: {detailModalPlace.alternateNames.join(", ")}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-[#E3EAF1] space-y-1.5 text-xs">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C92F3D] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">Address:</span>
                    <p className="text-slate-600">{detailModalPlace.addressFull}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-slate-600">
                  <div>
                    <span className="font-bold text-slate-800">Locality:</span>
                    <p>{detailModalPlace.locality || "Fazilnagar"}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Coordinates:</span>
                    <p>
                      {detailModalPlace.latitude
                        ? `${detailModalPlace.latitude}° N, ${detailModalPlace.longitude}° E`
                        : "Verified Ground Location"}
                    </p>
                  </div>
                </div>
              </div>

              {detailModalPlace.description && (
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800">About:</span>
                  <p className="text-xs text-slate-600 leading-relaxed">{detailModalPlace.description}</p>
                </div>
              )}

              {/* Research & Verification Metadata */}
              <div
                className={`p-3 rounded-xl border space-y-1.5 text-xs ${
                  detailModalPlace.verificationStatus === "verified"
                    ? "bg-emerald-50/70 border-emerald-100 text-emerald-950"
                    : "bg-amber-50/70 border-amber-200 text-amber-950"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck
                      className={`w-4 h-4 ${
                        detailModalPlace.verificationStatus === "verified" ? "text-[#087F62]" : "text-amber-700"
                      }`}
                    />
                    <span>Geographical Audit Status</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      detailModalPlace.verificationStatus === "verified"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {detailModalPlace.verificationStatus === "verified" ? "Verified" : "Needs Review"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
                  <div>
                    <span className="font-semibold">Record ID:</span> {detailModalPlace.id || detailModalPlace._id || detailModalPlace.slug}
                  </div>
                  <div>
                    <span className="font-semibold">Town Limits:</span> Confirmed Inside Town
                  </div>
                </div>
                {detailModalPlace.reviewNotes && (
                  <div className="text-[11px] pt-1 border-t border-slate-200/60 leading-normal">
                    <span className="font-semibold">Audit Notes:</span> {detailModalPlace.reviewNotes}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {detailModalPlace.phone ? (
                  <a
                    href={`tel:${detailModalPlace.phone.replace(/\s+/g, "")}`}
                    className="bg-[#111A2E] hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition text-center flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call ({detailModalPlace.phone})</span>
                  </a>
                ) : (
                  <button disabled className="bg-slate-100 text-slate-400 font-semibold text-xs py-2.5 rounded-xl">
                    No Phone
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections(detailModalPlace)}
                  className="bg-[#087F62] hover:bg-emerald-800 text-white font-bold text-xs py-2.5 rounded-xl transition text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Live Directions</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      const p = detailModalPlace;
                      setDetailModalPlace(null);
                      setEditModalPlace(p);
                      setShowEditModal(true);
                    }}
                    className="col-span-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2.5 rounded-xl transition text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Establishment (Admin)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Place Add & Edit Modal */}
      {showEditModal && (
        <Suspense fallback={null}>
          <AdminPlaceEditModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setEditModalPlace(null);
            }}
            place={editModalPlace}
            onSave={(savedPlace) => {
              setShowEditModal(false);
              setEditModalPlace(null);
              showToast(`Place "${savedPlace.name}" saved successfully!`);
              setAllMasterPlaces((prev) => {
                const id = savedPlace._id || savedPlace.id || savedPlace.slug;
                const idx = prev.findIndex((p) => (p._id || p.id || p.slug) === id);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = savedPlace;
                  return copy;
                }
                return [savedPlace, ...prev];
              });
              if (selectedPlace && (selectedPlace._id === savedPlace._id || selectedPlace.id === savedPlace.id)) {
                setSelectedPlace(savedPlace);
              }
              fetchPlaces();
              fetchStats();
            }}
            onDelete={(deletedId) => {
              setShowEditModal(false);
              setEditModalPlace(null);
              showToast("Place removed from directory.");
              setAllMasterPlaces((prev) =>
                prev.filter((p) => (p._id || p.id || p.slug) !== deletedId)
              );
              if (selectedPlace && (selectedPlace._id === deletedId || selectedPlace.id === deletedId || selectedPlace.slug === deletedId)) {
                setSelectedPlace(null);
              }
              fetchPlaces();
              fetchStats();
            }}
          />
        </Suspense>
      )}

      {/* Community Place Submission Modal */}
      {showAddModal && (
        <Suspense fallback={null}>
          <CommunityPlaceModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSuccess={(sub) => {
              showToast(`Place "${sub.name}" submitted for verification! (Tracking Ref: ${sub.referenceId})`);
              fetchStats();
            }}
          />
        </Suspense>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-20 right-4 z-50 bg-[#111A2E] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs border border-slate-700 transition-all duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
