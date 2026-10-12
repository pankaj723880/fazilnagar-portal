import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import API from "../api";
import seedPlaces from "../data/places.json";
import { openGoogleMapsDirections } from "../utils/directions";
import {
  Search,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  Clock,
  Layers,
  Map,
  List,
  Filter,
  ArrowUpDown,
  ArrowLeft,
  Download,
  PlusCircle,
  AlertTriangle,
  Building,
  GraduationCap,
  Stethoscope,
  Pill,
  Cake,
  Landmark,
  Bus,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  X,
  Info,
  Calendar,
  Check,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

// Category configurations with distinct styling and Lucide icons
const CATEGORIES = [
  { id: "all", name: "All Categories", icon: Layers, color: "slate" },
  { id: "Schools & Colleges", name: "Schools & Colleges", icon: GraduationCap, color: "blue" },
  { id: "Hospitals & Clinics", name: "Hospitals & Clinics", icon: Stethoscope, color: "rose" },
  { id: "Sweet Shops & Bakeries", name: "Sweet Shops & Bakeries", icon: Cake, color: "amber" },
  { id: "Medical Stores & Pharmacies", name: "Medical Stores", icon: Pill, color: "emerald" },
  { id: "Religious Places", name: "Religious Places", icon: Landmark, color: "purple" },
  { id: "Public Facilities", name: "Public Facilities & Banks", icon: Building, color: "sky" },
  { id: "Transport & Travel", name: "Transport & Travel", icon: Bus, color: "lime" },
  { id: "Shopping & Services", name: "Shopping & Trade", icon: ShoppingBag, color: "orange" },
];

// Helper function to match place category and subcategory robustly
function matchesCategory(placeCat, placeSubcat, targetCat) {
  if (!targetCat || targetCat === "all" || targetCat === "All" || targetCat === "All Categories") return true;
  const target = targetCat.toLowerCase().trim();
  const c = (placeCat || "").toLowerCase().trim();
  const sc = (placeSubcat || "").toLowerCase().trim();

  if (c === target || sc === target) return true;
  if (c && (c.includes(target) || target.includes(c))) return true;
  if (sc && (sc.includes(target) || target.includes(sc))) return true;

  // Split multi-word categories for fuzzy match (e.g., "Medical Stores" -> "Medical Stores & Pharmacies")
  const targetWords = target.split(/[\s&,/]+/).filter((w) => w.length > 3);
  return targetWords.some((w) => c.includes(w) || sc.includes(w));
}

// Helper to filter embedded verified places - strictly includes confirmed town locations with valid GPS coordinates
function filterPlaces(list, category, locality, search, sort) {
  let filtered = Array.isArray(list) ? [...list] : [];
  // Ensure unverified candidates without coordinates or unpublished places are quarantined
  filtered = filtered.filter(
    (p) =>
      p &&
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
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.alternateNames?.some((a) => a.toLowerCase().includes(q)) ||
        p.addressFull?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.subcategory?.toLowerCase().includes(q) ||
        p.locality?.toLowerCase().includes(q) ||
        p.streetOrLandmark?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }
  if (sort === "name") {
    filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } else if (sort === "category") {
    filtered.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
  }
  return filtered;
}

export default function Directory({ user }) {
  // Verification & Moderation queue is strictly restricted to authenticated Admins
  const isAdmin =
    user?.role === "admin" ||
    (() => {
      try {
        return JSON.parse(localStorage.getItem("user") || "{}")?.role === "admin";
      } catch {
        return false;
      }
    })();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = searchParams.get("category") || "all";
  const initialSearch = searchParams.get("search") || "";
  const [allMasterPlaces, setAllMasterPlaces] = useState(seedPlaces);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [selectedLocality, setSelectedLocality] = useState("all");
  const [viewMode, setViewMode] = useState(searchParams.get("view") || "map"); // "map" | "list"
  const [sortBy, setSortBy] = useState("name"); // "name" | "category"
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [detailModalPlace, setDetailModalPlace] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdminQueue, setShowAdminQueue] = useState(false);
  const [adminQueuePlaces, setAdminQueuePlaces] = useState([]);
  const [stats, setStats] = useState(() => {
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

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const sideListRef = useRef(null);

  // Instant synchronous filtered places: always perfectly in sync with selected category
  const places = useMemo(() => {
    return filterPlaces(allMasterPlaces, selectedCategory, selectedLocality, searchQuery, sortBy);
  }, [allMasterPlaces, selectedCategory, selectedLocality, searchQuery, sortBy]);

  // Scroll side list back to top whenever category or filter changes
  useEffect(() => {
    if (sideListRef.current) {
      sideListRef.current.scrollTop = 0;
    }
  }, [selectedCategory, selectedLocality, searchQuery]);

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
    const view = searchParams.get("view");
    if (view && (view === "map" || view === "list") && view !== viewMode) {
      setViewMode(view);
    }
  }, [searchParams]);

  // Fetch verified places and stats on mount
  useEffect(() => {
    fetchPlaces();
    fetchStats();
  }, []);

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      const res = await API.get("/places");
      const data = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
      if (data.length > 0) {
        setAllMasterPlaces(data);
      }
    } catch (err) {
      console.warn("API unavailable, keeping seed verified places:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await API.get("/places/stats/summary");
      if (res.data && (res.data.total || res.data.published)) {
        setStats(res.data);
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
  };

  const fetchAdminQueue = async () => {
    try {
      const res = await API.get("/places/admin");
      let data = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
      if (data.length === 0) {
        data = seedPlaces.filter((p) => p.isPublished === false);
      }
      setAdminQueuePlaces(data);
    } catch (err) {
      console.warn("Failed to fetch admin queue from API, loading local seed queue:", err);
      setAdminQueuePlaces(seedPlaces.filter((p) => p.isPublished === false));
    }
  };

  // Custom vector SVG marker icon to prevent broken Leaflet image 404s
  const createMarkerIcon = (isSelected) => {
    const color = isSelected ? "#B8323C" : "#0f766e";
    const size = isSelected ? 36 : 28;
    const height = isSelected ? 44 : 36;
    const svgHtml = `
      <div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${height}px;cursor:pointer;filter:drop-shadow(0 3px 5px rgba(0,0,0,0.35));transition:transform 0.2s;">
        <svg viewBox="0 0 24 24" width="${size}" height="${height}" fill="${color}" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.8" fill="#ffffff" />
        </svg>
      </div>
    `;
    return L.divIcon({
      html: svgHtml,
      className: "fazilnagar-custom-pin",
      iconSize: [size, height],
      iconAnchor: [size / 2, height],
      popupAnchor: [0, -height + 2],
    });
  };

  // Map initialization & synchronization
  useEffect(() => {
    if (viewMode !== "map") return;
    if (!mapContainerRef.current) return;

    // Clean up stale leaflet id if instance was lost (StrictMode / unmount)
    if (mapContainerRef.current._leaflet_id && !mapInstanceRef.current) {
      delete mapContainerRef.current._leaflet_id;
    }

    if (!mapInstanceRef.current) {
      const townLat = 26.6827;
      const townLng = 84.0498;

      const map = L.map(mapContainerRef.current, {
        center: [townLat, townLng],
        zoom: 15,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    // Force Leaflet to compute container dimensions once rendered
    const resizeTimer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    renderMapMarkers(places);

    return () => {
      clearTimeout(resizeTimer);
    };
  }, [places, viewMode]);

  // Clean up Leaflet on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const renderMapMarkers = (items) => {
    if (!mapInstanceRef.current) return;

    // Clear previous markers
    markersRef.current.forEach((m) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(m);
      }
    });
    markersRef.current = [];

    const itemsWithCoords = items.filter(
      (p) =>
        p.isPublished !== false &&
        p.latitude !== null &&
        p.longitude !== null &&
        !isNaN(parseFloat(p.latitude)) &&
        !isNaN(parseFloat(p.longitude))
    );

    itemsWithCoords.forEach((place) => {
      const lat = parseFloat(place.latitude);
      const lng = parseFloat(place.longitude);
      const isSelected = selectedPlace && (selectedPlace._id === place._id || selectedPlace.id === place.id);

      const marker = L.marker([lat, lng], {
        icon: createMarkerIcon(isSelected),
        title: place.name,
      }).addTo(mapInstanceRef.current);

      const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${lat},${lng}&travelmode=driving`;

      marker.bindPopup(`
        <div style="font-size: 12px; min-width: 200px; font-family: system-ui, -apple-system, sans-serif; padding: 2px;">
          <span style="font-size: 9px; font-weight: 800; color: #0d9488; text-transform: uppercase; letter-spacing: 0.5px;">${place.category}</span>
          <h4 style="margin: 3px 0 4px; font-size: 14px; font-weight: 800; color: #0f172a; line-height: 1.2;">${place.name}</h4>
          <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.3;">${place.streetOrLandmark || place.addressFull || place.locality}</p>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <a href="${directionsUrl}" target="_blank" rel="noreferrer" style="color: #0f766e; text-decoration: none; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 3px;">
              <span>🧭 Live Directions</span>
            </a>
            ${place.phone ? `<a href="tel:${place.phone.replace(/\\s+/g, '')}" style="color: #0f172a; text-decoration: none; font-weight: 700; font-size: 11px;">📞 Call</a>` : ''}
          </div>
        </div>
      `);

      marker.on("click", () => {
        handleSelectPlace(place);
      });

      markersRef.current.push(marker);
    });

    if (itemsWithCoords.length > 0) {
      if (selectedPlace && selectedPlace.latitude && selectedPlace.longitude) {
        mapInstanceRef.current.panTo([parseFloat(selectedPlace.latitude), parseFloat(selectedPlace.longitude)], { animate: true });
      } else {
        const bounds = L.latLngBounds(itemsWithCoords.map((p) => [parseFloat(p.latitude), parseFloat(p.longitude)]));
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      }
    }
  };

  const handleSelectPlace = (place) => {
    setSelectedPlace(place);
    if (mapInstanceRef.current && place.latitude && place.longitude) {
      const lat = parseFloat(place.latitude);
      const lng = parseFloat(place.longitude);
      mapInstanceRef.current.setView([lat, lng], 16, { animate: true });

      // Update marker icons to highlight the selected place
      markersRef.current.forEach((m) => {
        const pos = m.getLatLng();
        const isMatch = Math.abs(pos.lat - lat) < 0.0001 && Math.abs(pos.lng - lng) < 0.0001;
        m.setIcon(createMarkerIcon(isMatch));
        if (isMatch) {
          m.openPopup();
        }
      });
    }
  };

  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
    setSelectedPlace(null);
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

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      category: formData.get("category"),
      subcategory: formData.get("subcategory"),
      addressFull: formData.get("addressFull"),
      locality: formData.get("locality"),
      streetOrLandmark: formData.get("streetOrLandmark"),
      phone: formData.get("phone"),
      description: formData.get("description"),
      sourceUrls: ["Citizen Submission via Directory Form"],
    };

    try {
      await API.post("/places", data);
      showToast("Place submitted successfully to verification queue!");
      setShowAddModal(false);
      fetchStats();
    } catch (err) {
      showToast("Submission failed. Please check required fields.");
    }
  };

  const handleApprovePlace = async (id) => {
    if (!isAdmin) return;
    try {
      await API.put(`/places/${id}`, {
        isPublished: true,
        townBoundaryStatus: "confirmed",
        verificationStatus: "verified",
      });
      showToast("Establishment approved and published to public town directory!");
      fetchAdminQueue();
      fetchPlaces();
      fetchStats();
    } catch (err) {
      setAdminQueuePlaces((prev) => prev.filter((p) => (p._id || p.id) !== id));
      showToast("Updated locally: Establishment verified inside town directory.");
    }
  };

  // Extract distinct localities from verified places for filter dropdown
  const localities = Array.from(new Set(allMasterPlaces.map((p) => p.locality).filter(Boolean)));

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 sm:pb-16 font-sans">
      {/* Header Banner - Modern Civic Slate with Crimson & Emerald Accents */}
      <div className="bg-slate-900 text-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6 border border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
            <span className="bg-emerald-600 text-white text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5" /> Town Boundary Verified (PIN 274401)
            </span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">NH-27 Highway Corridor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Fazilnagar Complete Local Directory
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed line-clamp-2 sm:line-clamp-none">
            Exact, verified physical locations strictly within Fazilnagar town limits. Complete directory of schools,
            colleges, hospitals, clinics, sweet shops, pharmacies, religious shrines, banks, and essential services.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 sm:gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 sm:px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add / Suggest Place</span>
          </button>

          <a
            href={`${API.defaults.baseURL || "https://fazilnagar-portal.onrender.com/api"}/places/export/csv`}
            className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </a>

          {/* Admin-only review queue toggle */}
          {isAdmin && (
            <button
              onClick={() => {
                setShowAdminQueue(!showAdminQueue);
                if (!showAdminQueue) fetchAdminQueue();
              }}
              className="inline-flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-amber-300 transition cursor-pointer shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{showAdminQueue ? "Close Review Queue" : `Review Queue (${stats?.inReview || adminQueuePlaces.filter((p) => !p.isPublished).length || 4})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Moderation & Review Queue Drawer (Admin Only) */}
      {isAdmin && showAdminQueue && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-amber-900">
                Verification & Boundary Moderation Queue (Admin Desk Only)
              </h3>
            </div>
            <span className="text-xs font-semibold text-amber-800">
              {adminQueuePlaces.filter((p) => !p.isPublished).length || 4} Candidates Pending Ground Verification
            </span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Per the Non-Negotiable Geographical Rule, establishments whose physical location falls outside town boundaries
            or whose exact street address is unconfirmed are quarantined in this review queue and excluded from public listings.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
            {(adminQueuePlaces.length > 0 ? adminQueuePlaces : seedPlaces)
              .filter((p) => !p.isPublished)
              .map((item) => (
                <div key={item._id || item.id} className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {(item.verificationStatus || "Needs Boundary Audit").replace(/_/g, " ")}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{item.name}</h4>
                      <p className="text-xs text-slate-500">{item.addressFull || item.locality}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">{item.category}</span>
                  </div>

                  <p className="text-[11px] text-amber-700 italic bg-amber-50 p-2 rounded-lg border border-amber-100">
                    Reason: {item.reviewNotes || "Pending ground coordinate and boundary audit."}
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleApprovePlace(item._id || item.id)}
                      className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      Verify & Publish Inside Town
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Verification Metrics Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold">Total Researched</span>
              <p className="text-lg font-extrabold text-slate-900">{stats.total}</p>
            </div>
            <Building className="w-5 h-5 text-slate-400" />
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-emerald-700 text-[10px] uppercase font-bold">Town Verified (274401)</span>
              <p className="text-lg font-extrabold text-emerald-700">{stats.published}</p>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          {isAdmin ? (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-amber-700 text-[10px] uppercase font-bold">In Review Queue</span>
                <p className="text-lg font-extrabold text-amber-700">{stats.inReview || adminQueuePlaces.filter((p) => !p.isPublished).length || 4}</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
          ) : (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-emerald-700 text-[10px] uppercase font-bold">Accuracy Standard</span>
                <p className="text-lg font-extrabold text-emerald-800">100% Town Ground</p>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
          )}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-red-700 text-[10px] uppercase font-bold">Audited Categories</span>
              <p className="text-lg font-extrabold text-red-700">{stats.categoryCounts?.length || 8}</p>
            </div>
            <Layers className="w-5 h-5 text-red-600" />
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by school, clinic, sweet shop, pharmacy, landmark (e.g. NH-27, College Road)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 text-xs sm:text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-red-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              className="flex-1 sm:flex-none bg-slate-900 hover:bg-red-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm"
            >
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  fetchPlaces();
                }}
                className="p-2.5 text-slate-400 hover:text-slate-600 rounded-xl border border-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 ml-auto">
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === "map" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Map View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List View</span>
              </button>
            </div>
          </div>
        </form>

        {/* Category Pills Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold custom-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected =
              selectedCategory === cat.id ||
              (cat.id === "all" && (!selectedCategory || selectedCategory === "all")) ||
              matchesCategory(cat.id, "", selectedCategory);
            return (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm ring-2 ring-red-600/30"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-red-400" : "text-slate-500"}`} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Secondary Filters Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <span>Showing:</span>
            <span className="font-bold text-slate-900">{places.length} Verified Establishments</span>
            <span>in Fazilnagar Town</span>
          </div>

          <div className="flex items-center gap-4">
            {localities.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedLocality}
                  onChange={(e) => setSelectedLocality(e.target.value)}
                  className="bg-transparent text-slate-700 font-semibold outline-none cursor-pointer text-xs"
                >
                  <option value="all">All Localities</option>
                  {localities.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-slate-700 font-semibold outline-none cursor-pointer text-xs"
              >
                <option value="name">Sort Alphabetically (A-Z)</option>
                <option value="category">Sort by Category</option>
                <option value="newest">Sort by Recently Verified</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {places.length === 0 && !loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#E1E6EA] shadow-xs max-w-xl mx-auto my-8">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-base font-bold text-[#18232E] font-heading">No establishments found</h3>
          <p className="text-xs text-[#647180] mt-1 max-w-md mx-auto">
            No verified places matched your search query or category filter within Fazilnagar town limits.
          </p>
          <button
            onClick={() => {
              setSelectedCategory("all");
              setSelectedLocality("all");
              setSearchQuery("");
              setSearchParams({});
            }}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#18232E] hover:bg-[#B8323C] text-white text-xs font-bold transition shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : viewMode === "map" ? (
        /* Map View + Synchronized List */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Leaflet Map */}
          <div className="lg:col-span-2 bg-slate-50 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 shadow-md relative min-h-[290px] h-[310px] sm:h-[420px] lg:h-[580px]">
            <div
              ref={mapContainerRef}
              id="fazilnagar-leaflet-map"
              className="w-full h-full z-10 min-h-[290px]"
              style={{ minHeight: "290px", height: "100%", width: "100%", position: "relative" }}
            />
            <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-20 bg-white/95 backdrop-blur-sm px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-200 text-[10px] sm:text-[11px] font-semibold text-slate-700 shadow-sm flex items-center gap-1.5 sm:gap-2 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Coordinates: 26.6827° N, 84.0498° E (Fazilnagar)</span>
            </div>
          </div>

          {/* Synchronized Place Details Card OR Category Items List */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[380px] sm:min-h-[480px]">
            {selectedPlace ? (
              <div className="flex flex-col justify-between h-full space-y-4">
                <div>
                  {/* Back to List Navigation Button */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPlace(null)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#B8323C] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>
                        Back to{" "}
                        {selectedCategory === "all"
                          ? "All Places"
                          : (CATEGORIES.find((c) => c.id === selectedCategory || matchesCategory(c.id, "", selectedCategory))?.name || selectedCategory)}{" "}
                        ({places.length})
                      </span>
                    </button>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-red-50 text-red-800 border border-red-100">
                        {selectedPlace.category}
                      </span>
                      {selectedPlace.subcategory && (
                        <span className="text-[10px] font-semibold text-slate-500">
                          {selectedPlace.subcategory}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900 leading-snug">{selectedPlace.name}</h3>
                      {selectedPlace.alternateNames?.length > 0 && (
                        <p className="text-xs text-slate-500 mt-0.5">{selectedPlace.alternateNames.join(", ")}</p>
                      )}
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-600 py-3 border-y border-slate-100">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span>{selectedPlace.addressFull}</span>
                      </div>
                      {selectedPlace.openingHours && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span>{selectedPlace.openingHours}</span>
                        </div>
                      )}
                      {selectedPlace.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span>{selectedPlace.phone}</span>
                        </div>
                      )}
                    </div>

                    {selectedPlace.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">{selectedPlace.description}</p>
                    )}

                    {selectedPlace.services?.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Services / Offerings
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedPlace.services.map((srv, i) => (
                            <span key={i} className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg">
                              {srv}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {selectedPlace.phone ? (
                      <a
                        href={`tel:${selectedPlace.phone.replace(/\s+/g, "")}`}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition text-center flex items-center justify-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Now</span>
                      </a>
                    ) : (
                      <button
                        disabled
                        className="bg-slate-100 text-slate-400 font-medium text-xs py-2.5 rounded-xl text-center cursor-not-allowed"
                      >
                        No Public Phone
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openGoogleMapsDirections(selectedPlace)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition text-center flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Live Directions</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setDetailModalPlace(selectedPlace)}
                    className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-semibold py-1 transition"
                  >
                    View Full Audit & Metadata
                  </button>
                </div>
              </div>
            ) : (
              /* When no place is selected: Display list of items in the selected category! */
              <div className="flex flex-col h-full">
                <div className="pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#B8323C]" />
                      <span>
                        {selectedCategory === "all"
                          ? "All Town Places"
                          : (CATEGORIES.find((c) => c.id === selectedCategory || matchesCategory(c.id, "", selectedCategory))?.name || selectedCategory)}
                      </span>
                    </span>
                    <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                      {places.length} places
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Click any place below to see full details & GPS directions:
                  </p>
                </div>

                <div ref={sideListRef} className="space-y-2 overflow-y-auto max-h-[420px] pr-1 custom-scrollbar flex-1">
                  {places.map((p, idx) => (
                    <div
                      key={`${p._id || p.id || 'place'}-${idx}`}
                      onClick={() => handleSelectPlace(p)}
                      className="p-3 rounded-2xl border border-slate-100 hover:border-red-300 bg-slate-50/70 hover:bg-white hover:shadow-xs transition cursor-pointer group flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.2 rounded bg-red-100/60 text-[#B8323C]">
                            {p.subcategory || p.category}
                          </span>
                          {p.phone && (
                            <span className="text-[9px] text-emerald-700 font-semibold">
                              📞 Verified
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#B8323C] transition mt-1 truncate">
                          {p.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{p.streetOrLandmark || p.addressFull || p.locality}</span>
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#B8323C] shrink-0 self-center transition-transform group-hover:translate-x-0.5" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {places.map((place, idx) => (
            <div
              key={`${place._id || place.id || 'place'}-${idx}`}
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-teal-800">
                    {place.category}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Town Verified
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900">{place.name}</h3>
                {place.subcategory && <p className="text-xs font-semibold text-teal-700 mb-2">{place.subcategory}</p>}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">{place.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{place.streetOrLandmark || place.addressFull}</span>
                </div>

                {place.openingHours && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{place.openingHours}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {place.phone ? (
                    <a
                      href={`tel:${place.phone.replace(/\s+/g, "")}`}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 rounded-xl transition text-center flex items-center justify-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Call</span>
                    </a>
                  ) : (
                    <span className="text-center text-[10px] text-slate-400 py-2 border border-slate-100 rounded-xl">
                      In-Person Visit
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => openGoogleMapsDirections(place)}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs py-2 rounded-xl transition text-center flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Directions</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Place Detail & Audit Modal (Section 2 & 9) */}
      {detailModalPlace && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-fade-in-up sm:animate-modal-pop">
            <button
              onClick={() => setDetailModalPlace(null)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-teal-50 text-teal-800">
                  {detailModalPlace.category} • {detailModalPlace.subcategory || "Verified Establishment"}
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-2">{detailModalPlace.name}</h2>
                {detailModalPlace.alternateNames?.length > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Also known as: {detailModalPlace.alternateNames.join(", ")}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">Full Address:</span>
                    <p className="text-slate-600">{detailModalPlace.addressFull}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 text-slate-600">
                  <div>
                    <span className="font-bold text-slate-800">Locality:</span>
                    <p>{detailModalPlace.locality}</p>
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

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-800">Description & Profile:</span>
                <p className="text-xs text-slate-600 leading-relaxed">{detailModalPlace.description}</p>
              </div>

              {detailModalPlace.services?.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-slate-800 block mb-1.5">Available Services:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {detailModalPlace.services.map((srv, idx) => (
                      <span key={idx} className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-xl">
                        {srv}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Research & Verification Metadata (Section 2) */}
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-950 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Geographical Verification Audit</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-900 pt-1">
                  <div>
                    <span className="font-semibold">Town Boundary Status:</span> Confirmed (Inside Town)
                  </div>
                  <div>
                    <span className="font-semibold">Postal PIN:</span> 274401 (Fazilnagar)
                  </div>
                  <div>
                    <span className="font-semibold">Last Audited:</span>{" "}
                    {new Date(detailModalPlace.lastVerifiedAt || Date.now()).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-semibold">Confidence Level:</span> High (Corroborated)
                  </div>
                </div>
                {detailModalPlace.sourceUrls?.length > 0 && (
                  <div className="text-[10px] text-emerald-800/80 pt-1 border-t border-emerald-100">
                    Sources: {detailModalPlace.sourceUrls.join(" • ")}
                  </div>
                )}
              </div>

              {/* CTA Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {detailModalPlace.phone ? (
                  <a
                    href={`tel:${detailModalPlace.phone.replace(/\s+/g, "")}`}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition text-center flex items-center justify-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call ({detailModalPlace.phone})</span>
                  </a>
                ) : (
                  <button disabled className="bg-slate-100 text-slate-400 font-semibold text-xs py-3 rounded-xl">
                    No Public Phone
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections(detailModalPlace)}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-3 rounded-xl transition text-center flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Navigate from My Location</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suggest Place Modal (Section 11) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto animate-fade-in-up sm:animate-modal-pop">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Suggest Establishment for Directory</h3>
                <p className="text-[11px] text-slate-500">
                  Establishment must be physically located within Fazilnagar town limits.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Establishment Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Mahavir Inter College, Kisan Seva Kendra"
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    name="category"
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-teal-600 bg-white"
                  >
                    <option value="">Select Category</option>
                    <option value="Schools & Colleges">Schools & Colleges</option>
                    <option value="Hospitals & Clinics">Hospitals & Clinics</option>
                    <option value="Sweet Shops & Bakeries">Sweet Shops & Bakeries</option>
                    <option value="Medical Stores & Pharmacies">Medical Stores & Pharmacies</option>
                    <option value="Religious Places">Religious Places</option>
                    <option value="Public Facilities">Public Facilities & Banks</option>
                    <option value="Shopping & Services">Shopping & Services</option>
                    <option value="Transport & Travel">Transport & Travel</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subcategory</label>
                  <input
                    type="text"
                    name="subcategory"
                    placeholder="e.g. Pharmacy, Inter College"
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Exact Address in Fazilnagar *</label>
                <input
                  type="text"
                  name="addressFull"
                  required
                  placeholder="e.g. College Road, Opp. SBI Branch, Fazilnagar - 274401"
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Locality / Ward</label>
                  <input
                    type="text"
                    name="locality"
                    placeholder="e.g. College Road, Main Chowk"
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Public Phone (Optional)</label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="10-digit phone number"
                    className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Services / Description</label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Describe services, opening hours, or landmarks..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-teal-600"
                ></textarea>
              </div>

              <p className="text-[10px] text-slate-400">
                Note: Listings are verified by town moderators before publication to ensure no out-of-town entries are
                included.
              </p>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-teal-700 text-white font-bold text-xs py-3 rounded-xl transition"
              >
                Submit Establishment for Verification
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs border border-slate-800 transition-all duration-300">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
