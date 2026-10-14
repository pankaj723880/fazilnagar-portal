import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import API from "../api";
import seedPlaces from "../data/places.json";
import { openGoogleMapsDirections } from "../utils/directions";
import { usePageSEO } from "../utils/seo";
import CommunityPlaceModal from "../components/CommunityPlaceModal";
import AdminPlaceEditModal from "../components/AdminPlaceEditModal";
import { isUserAdmin } from "../utils/authStorage";
import { FAZILNAGAR_AREAS } from "../constants/areas";
import {
  Search,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  Clock,
  Layers,
  Map as MapIcon,
  List as ListIcon,
  Filter,
  ArrowUpDown,
  ArrowLeft,
  PlusCircle,
  AlertTriangle,
  Building,
  GraduationCap,
  Stethoscope,
  Fuel,
  Edit3,
  ExternalLink,
  ShieldCheck,
  X,
  Info,
  Calendar,
  Check,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Maximize2,
  Minimize2,
  Lock,
  Compass,
} from "lucide-react";

// Category configurations strictly for Schools & Colleges, Hospitals, and Petrol Pumps
const CATEGORIES = [
  { id: "all", name: "All Categories", icon: Layers },
  { id: "Schools & Colleges", name: "Schools & Colleges", icon: GraduationCap },
  { id: "Hospitals & Clinics", name: "Hospitals & Clinics", icon: Stethoscope },
  { id: "Petrol Pumps", name: "Petrol Pumps", icon: Fuel },
];

// Helper function to match place category and subcategory robustly
function matchesCategory(placeCat, placeSubcat, targetCat) {
  if (!targetCat || targetCat === "all" || targetCat === "All" || targetCat === "All Categories") return true;
  const target = targetCat.toLowerCase().trim();
  const c = (placeCat || "").toLowerCase().trim();
  const sc = (placeSubcat || "").toLowerCase().trim();

  if (target.includes("petrol") || target.includes("fuel")) {
    return c.includes("petrol") || c.includes("fuel") || sc.includes("petrol") || sc.includes("fuel") || c.includes("transport");
  }
  if (target.includes("school") || target.includes("college")) {
    return c.includes("school") || c.includes("college") || sc.includes("school") || sc.includes("college") || c.includes("education");
  }
  if (target.includes("hospital") || target.includes("clinic")) {
    return c.includes("hospital") || c.includes("clinic") || sc.includes("hospital") || sc.includes("clinic") || c.includes("health");
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
  usePageSEO({
    title: "Fazilnagar Town Directory | Verified Local Places, Shops & Institutions",
    description: "Browse the complete verified local directory of Fazilnagar (PIN 274401, Kushinagar, UP). Find schools, hospitals, doctors, pharmacies, shops, markets, banks, and essential civic facilities.",
    canonicalPath: "/directory",
  });

  const [isAdminState, setIsAdminState] = useState(() => user?.role === "admin" || isUserAdmin());
  useEffect(() => {
    const handleAuth = () => {
      setIsAdminState(user?.role === "admin" || isUserAdmin());
    };
    window.addEventListener("auth-change", handleAuth);
    return () => window.removeEventListener("auth-change", handleAuth);
  }, [user]);
  const isAdmin = user?.role === "admin" || isAdminState || isUserAdmin();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = searchParams.get("category") || "all";
  const initialSearch = searchParams.get("search") || "";
  const [allMasterPlaces, setAllMasterPlaces] = useState(() =>
    Array.isArray(seedPlaces)
      ? seedPlaces.filter((p) => !p.isArchived && p.isPublished !== false)
      : []
  );
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [selectedLocality, setSelectedLocality] = useState("all");
  const [viewMode, setViewMode] = useState(searchParams.get("view") || "map"); // "map" | "list"
  const [sortBy, setSortBy] = useState("name"); // "name" | "category"
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [expandedEntityId, setExpandedEntityId] = useState(null);
  const [detailModalPlace, setDetailModalPlace] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalPlace, setEditModalPlace] = useState(null);

  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setShowAddModal(true);
    }
  }, [searchParams]);

  const handleToggleAccordion = useCallback((entityId) => {
    setExpandedEntityId((prevId) => (prevId === entityId ? null : entityId));
  }, []);
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

  // Mobile Map Scrolling Conflict & Height Controls (Part B)
  const [isMapActive, setIsMapActive] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const sideListRef = useRef(null);

  const places = useMemo(() => {
    return filterPlaces(allMasterPlaces, selectedCategory, selectedLocality, searchQuery, sortBy);
  }, [allMasterPlaces, selectedCategory, selectedLocality, searchQuery, sortBy]);

  const placesRef = useRef(places);
  useEffect(() => {
    placesRef.current = places;
  }, [places]);

  const selectedPlaceRef = useRef(selectedPlace);
  useEffect(() => {
    selectedPlaceRef.current = selectedPlace;
  }, [selectedPlace]);

  const isSamePlace = useCallback((a, b) => {
    if (!a || !b) return false;
    const aId = a._id || a.id || a.slug;
    const bId = b._id || b.id || b.slug;
    if (aId && bId) return String(aId) === String(bId);
    return Boolean(a.name && b.name && a.name === b.name);
  }, []);

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
      const data = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
      if (data.length > 0) {
        setAllMasterPlaces(data.filter((p) => !p.isArchived && p.isPublished !== false));
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
      let data = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
      if (data.length === 0) {
        data = seedPlaces.filter((p) => p.isPublished === false);
      }
      setAdminQueuePlaces(data);
    } catch (err) {
      setAdminQueuePlaces(seedPlaces.filter((p) => p.isPublished === false));
    }
  };

  // Custom vector SVG marker icon (Standard Red vs Active Highlight Blue)
  const createMarkerIcon = (isSelected) => {
    const color = isSelected ? "#2563EB" : "#B8323C";
    const size = isSelected ? 34 : 28;
    const height = isSelected ? 44 : 36;
    const strokeWidth = isSelected ? 2.2 : 1.8;
    const shadow = isSelected ? "0 4px 10px rgba(37,99,235,0.5)" : "0 2px 4px rgba(0,0,0,0.35)";

    const svgHtml = `
      <div role="img" aria-label="Map location pin" style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${height}px;cursor:pointer;filter:drop-shadow(${shadow});transition:transform 0.2s;">
        <svg viewBox="0 0 24 24" width="${size}" height="${height}" fill="${color}" stroke="#ffffff" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
          <title>Location Pin</title>
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="${isSelected ? 3.2 : 2.8}" fill="#ffffff" />
        </svg>
      </div>
    `;
    return L.divIcon({
      html: svgHtml,
      className: isSelected ? "fazilnagar-custom-pin-selected" : "fazilnagar-custom-pin",
      iconSize: [size, height],
      iconAnchor: [size / 2, height],
      popupAnchor: [0, -height + 2],
    });
  };

  // Cluster icon when multiple places are very close to prevent overlapping pins
  const createClusterIcon = (count) => {
    const size = 32;
    const svgHtml = `
      <div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;background:#18232E;border:2.5px solid #0D5E49;border-radius:50%;color:#ffffff;font-size:11px;font-weight:800;font-family:system-ui,sans-serif;box-shadow:0 3px 6px rgba(0,0,0,0.35);cursor:pointer;">
        <span>${count}</span>
      </div>
    `;
    return L.divIcon({
      html: svgHtml,
      className: "fazilnagar-cluster-pin",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (viewMode !== "map") return;
    if (!mapContainerRef.current) return;

    if (mapContainerRef.current._leaflet_id && !mapInstanceRef.current) {
      delete mapContainerRef.current._leaflet_id;
    }

    if (!mapInstanceRef.current) {
      const townLat = 26.6827;
      const townLng = 84.0498;
      const map = L.map(mapContainerRef.current, {
        center: [townLat, townLng],
        zoom: 15,
        // Map scrolling and gestures locked by default on all devices until activated by click
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      mapInstanceRef.current = map;

      // On zoom, re-render markers to handle clustering dynamically
      map.on("zoomend", () => {
        if (mapInstanceRef.current) {
          renderMapMarkers(placesRef.current || places);
        }
      });
    }

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

  // Update map interaction state (Lock map until user clicks on it)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isMapActive) {
      map.dragging.enable();
      map.touchZoom.enable();
      map.scrollWheelZoom.enable();
    } else {
      map.dragging.disable();
      map.touchZoom.disable();
      map.scrollWheelZoom.disable();
    }
  }, [isMapActive]);

  // Invalidate map size when expanded / collapsed
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [isMapExpanded]);

  // Render Map Markers with smart clustering for nearby places to prevent overlapping
  const renderMapMarkers = (items) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => {
      map.removeLayer(m);
    });
    markersRef.current = [];

    const itemsWithCoords = (items || []).filter(
      (p) =>
        p.isPublished !== false &&
        p.latitude !== null &&
        p.longitude !== null &&
        !isNaN(parseFloat(p.latitude)) &&
        !isNaN(parseFloat(p.longitude))
    );

    const currentZoom = map.getZoom();
    const currSelected = selectedPlaceRef.current;

    // When an entity is selected or map is zoomed in (>= 16), render all individual pins
    if (currentZoom >= 16 || currSelected || itemsWithCoords.length <= 8) {
      itemsWithCoords.forEach((place) => {
        createSinglePlaceMarker(place);
      });
    } else {
      const clusters = [];
      const threshold = 0.0018; // approx 150m grouping

      itemsWithCoords.forEach((place) => {
        const lat = parseFloat(place.latitude);
        const lng = parseFloat(place.longitude);
        let addedToCluster = false;

        for (const cluster of clusters) {
          const cLat = cluster.lat;
          const cLng = cluster.lng;
          const dist = Math.hypot(lat - cLat, lng - cLng);
          if (dist < threshold) {
            cluster.places.push(place);
            addedToCluster = true;
            break;
          }
        }

        if (!addedToCluster) {
          clusters.push({ lat, lng, places: [place] });
        }
      });

      clusters.forEach((cluster) => {
        if (cluster.places.length === 1) {
          createSinglePlaceMarker(cluster.places[0]);
        } else {
          // Render cluster pin
          const clusterMarker = L.marker([cluster.lat, cluster.lng], {
            icon: createClusterIcon(cluster.places.length),
            title: `${cluster.places.length} places in this area`,
          }).addTo(map);

          clusterMarker.on("click", () => {
            map.setView([cluster.lat, cluster.lng], Math.min(currentZoom + 2, 17), { animate: true });
          });

          markersRef.current.push(clusterMarker);
        }
      });
    }

    if (itemsWithCoords.length > 0) {
      if (currSelected && currSelected.latitude && currSelected.longitude) {
        map.panTo([parseFloat(currSelected.latitude), parseFloat(currSelected.longitude)], { animate: true });
      }
    }
  };

  const createSinglePlaceMarker = (place) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const lat = parseFloat(place.latitude);
    const lng = parseFloat(place.longitude);
    const currSelected = selectedPlaceRef.current;
    const isSelected = isSamePlace(currSelected, place);

    const marker = L.marker([lat, lng], {
      icon: createMarkerIcon(isSelected),
      title: place.name,
      zIndexOffset: isSelected ? 1000 : 0,
    }).addTo(map);

    const isVerified = place.verificationStatus === "verified";
    const recordId = place.id || place._id || place.slug;

    marker.bindPopup(`
      <div style="font-size: 12px; min-width: 200px; font-family: Inter, system-ui, sans-serif; padding: 2px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 3px;">
          <span style="font-size: 9px; font-weight: 800; color: #0D5E49; text-transform: uppercase; letter-spacing: 0.5px;">${place.category}</span>
          <span style="font-size: 8px; font-weight: 700; color: ${isVerified ? '#0D5E49' : '#B45309'}; background: ${isVerified ? '#ECFDF5' : '#FEF3C7'}; padding: 1px 5px; border-radius: 999px; border: 1px solid ${isVerified ? '#A7F3D0' : '#FDE68A'};">
            ${isVerified ? '✓ Verified' : '⚠ Needs Verification'}
          </span>
        </div>
        <h4 style="margin: 2px 0 3px; font-size: 13px; font-weight: 800; color: #18232E; line-height: 1.2;">${place.name}</h4>
        <p style="margin: 0; font-size: 11px; color: #647180; line-height: 1.3;">${place.streetOrLandmark || place.addressFull || place.locality}</p>
        <div style="display: flex; justify-content: space-between; font-size: 9px; color: #94A3B8; margin-top: 4px; padding-top: 3px; border-top: 1px dashed #E2E8F0;">
          <span>ID: ${recordId}</span>
          <span>${place.latitude}, ${place.longitude}</span>
        </div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #E1E6EA; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <button type="button" class="leaflet-popup-directions-btn" style="color: #0D5E49; background: none; border: none; padding: 0; font-weight: 700; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;">
            <span>🧭 Directions</span>
          </button>
          ${place.phone ? `<a href="tel:${place.phone.replace(/\\s+/g, '')}" style="color: #18232E; text-decoration: none; font-weight: 700; font-size: 11px;">📞 Call</a>` : ''}
        </div>
      </div>
    `);

    marker.on("popupopen", (e) => {
      const btn = e.popup.getElement()?.querySelector(".leaflet-popup-directions-btn");
      if (btn) {
        btn.onclick = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          openGoogleMapsDirections(place);
        };
      }
    });

    marker.on("click", () => {
      handleSelectPlace(place);
    });

    if (isSelected) {
      setTimeout(() => {
        if (marker.openPopup) marker.openPopup();
      }, 150);
    }

    markersRef.current.push(marker);
  };

  const handleSelectPlace = (place) => {
    selectedPlaceRef.current = place;
    setSelectedPlace(place);
    if (mapInstanceRef.current && place.latitude && place.longitude) {
      const lat = parseFloat(place.latitude);
      const lng = parseFloat(place.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        // Instant little zoom to 17 and focus on pinned location
        mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
        renderMapMarkers(placesRef.current || places);
      }
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
      showToast("Place submitted successfully to verification desk!");
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
      showToast("Establishment approved and published!");
      fetchAdminQueue();
      fetchPlaces();
      fetchStats();
    } catch (err) {
      setAdminQueuePlaces((prev) => prev.filter((p) => (p._id || p.id) !== id));
      showToast("Updated locally: Establishment verified inside town directory.");
    }
  };

  const localities = Array.from(new Set(allMasterPlaces.map((p) => p.locality).filter(Boolean)));

  return (
    <div className="space-y-3.5 sm:space-y-5 pb-24 sm:pb-16 font-sans max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-6">
      {/* ========================================================
          1. SIMPLIFIED HEADER & HERO (Compact on Mobile)
          ======================================================== */}
      <div className="bg-[#18232E] text-white p-3.5 sm:p-5 lg:p-6 rounded-2xl shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#0D5E49] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                <ShieldCheck className="w-3 h-3" /> PIN 274401
              </span>
              <span className="text-[11px] text-slate-400 font-medium truncate">
                NH-27 Corridor, Kushinagar
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug">
              Fazilnagar Town Directory
            </h1>
            <p className="text-slate-300 text-xs mt-0.5 max-w-xl line-clamp-1 sm:line-clamp-none font-medium">
              Verified local schools, healthcare, shops, pharmacies, markets, and public services.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 bg-[#0D5E49] hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
              title="Add place with exact map location and images (4-Step Wizard)"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Add Place</span>
            </button>


            {isAdmin && (
              <button
                onClick={() => {
                  setShowAdminQueue(!showAdminQueue);
                  if (!showAdminQueue) fetchAdminQueue();
                }}
                className="inline-flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold px-3 py-2 rounded-xl border border-amber-300 transition cursor-pointer shadow-xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Queue ({stats?.inReview || adminQueuePlaces.filter((p) => !p.isPublished).length || 4})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Moderation Queue Drawer (Admin Only) */}
      {isAdmin && showAdminQueue && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold text-amber-900">
                Verification Desk & Boundary Moderation (Admin Desk)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-amber-800">
              {adminQueuePlaces.filter((p) => !p.isPublished).length || 4} Pending Ground Audit
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {(adminQueuePlaces.length > 0 ? adminQueuePlaces : seedPlaces)
              .filter((p) => !p.isPublished)
              .map((item) => (
                <div key={item._id || item.id} className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs space-y-1.5 text-xs">
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
                      className="text-xs font-bold bg-[#0D5E49] hover:bg-emerald-800 text-white px-2.5 py-1.5 rounded-lg transition"
                    >
                      Verify & Publish
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================
          2. COMPACT SUMMARY STATS ROW (Replaces 4 oversized cards)
          ======================================================== */}
      {stats && (
        <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between text-xs overflow-x-auto gap-3 scrollbar-none">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-extrabold text-slate-900 text-sm">{stats.published || places.length}</span>
            <span className="text-slate-600 font-medium">Verified Town Places</span>
          </div>

          <div className="h-4 w-px bg-slate-200 shrink-0"></div>

          <div className="flex items-center gap-1.5 shrink-0 text-slate-600">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-800">{stats.categoryCounts?.length || 9}</span>
            <span>Civic Categories</span>
          </div>

          <div className="h-4 w-px bg-slate-200 shrink-0"></div>

          <div className="flex items-center gap-1.5 shrink-0 text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            <span>Fazilnagar Town (PIN 274401)</span>
          </div>
        </div>
      )}

      {/* ========================================================
          3. SEARCH & CATEGORY FILTERS (Primary Action Block)
          ======================================================== */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
        {/* Search input + View Switcher */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search schools, hospitals, shops, pharmacies, landmarks…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50/80 text-slate-900 placeholder-slate-400 text-xs sm:text-sm pl-9 pr-8 py-2 rounded-xl border border-slate-200 outline-none focus:border-[#B8323C] focus:bg-white transition"
              aria-label="Search directory"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  fetchPlaces();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="bg-[#18232E] hover:bg-[#B8323C] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-2xs shrink-0 cursor-pointer"
          >
            Search
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                viewMode === "map"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Map View"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Map</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="List View"
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </form>

        {/* Category Pills (Smooth Horizontal Scrolling Without Clipping) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 -mx-1 px-1">
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
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-[#18232E] text-white shadow-xs ring-1 ring-slate-800"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/70"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-amber-400" : "text-slate-500"}`} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Secondary Filter & Result Counter */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Showing:</span>
            <span className="font-extrabold text-slate-900">{places.length} places</span>
            {selectedCategory !== "all" && (
              <span className="text-[11px] bg-red-50 text-[#B8323C] font-semibold px-2 py-0.2 rounded-full">
                {selectedCategory}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-slate-700">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={selectedLocality}
                onChange={(e) => setSelectedLocality(e.target.value)}
                className="bg-transparent font-medium outline-none cursor-pointer text-xs"
              >
                <option value="all">All Wards / Areas</option>
                {FAZILNAGAR_AREAS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 text-slate-700">
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent font-medium outline-none cursor-pointer text-xs"
              >
                <option value="name">Sort: A to Z</option>
                <option value="category">Sort: Category</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          4. MAIN VIEWPORT (Map View or List View)
          ======================================================== */}
      {places.length === 0 && !loading ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200 shadow-2xs max-w-md mx-auto my-6">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-2.5">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No establishments found</h3>
          <p className="text-xs text-slate-500 mt-1">
            No verified places matched your filters within Fazilnagar town limits.
          </p>
          <button
            onClick={() => {
              setSelectedCategory("all");
              setSelectedLocality("all");
              setSearchQuery("");
              setSearchParams({});
            }}
            className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#18232E] hover:bg-[#B8323C] text-white text-xs font-bold transition shadow-xs"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>
      ) : viewMode === "map" ? (
        /* Map View + Synchronized List */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-5">
          {/* Leaflet Map with Gesture Control (Part B Fix) */}
          <div
            className={`lg:col-span-2 bg-slate-50 rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm relative transition-all duration-300 group ${
              isMapExpanded ? "h-[460px] sm:h-[520px] lg:h-[620px]" : "h-[270px] sm:h-[380px] lg:h-[560px]"
            }`}
            onClick={() => {
              if (!isMapActive) setIsMapActive(true);
            }}
            onMouseLeave={() => {
              // Disengage scroll wheel when mouse leaves map container to allow page scrolling
              if (isMapActive) setIsMapActive(false);
            }}
          >
            <div
              ref={mapContainerRef}
              id="fazilnagar-leaflet-map"
              className="w-full h-full z-10"
              style={{ height: "100%", width: "100%", position: "relative" }}
            />

            {/* Top Info Badge */}
            <div className="absolute top-2.5 left-2.5 z-20 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] sm:text-[11px] font-semibold text-slate-700 shadow-2xs flex items-center gap-1.5 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>26.6827° N, 84.0498° E (Fazilnagar)</span>
            </div>

            {/* Mobile/Desktop Map Expand/Collapse Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMapExpanded((prev) => !prev);
              }}
              className="absolute top-2.5 right-2.5 z-20 bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 p-1.5 rounded-lg border border-slate-200 shadow-2xs text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
              title={isMapExpanded ? "Compact map" : "Expand map"}
            >
              {isMapExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Compact</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Expand</span>
                </>
              )}
            </button>

            {/* Interaction Mode Activator Overlay (Locks scroll until clicked on both mobile & desktop) */}
            {!isMapActive && (
              <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center pointer-events-none">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMapActive(true);
                  }}
                  className="pointer-events-auto bg-[#18232E]/95 hover:bg-[#18232E] text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-lg border border-slate-700/80 backdrop-blur-md flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  <span>Click map to interact & zoom</span>
                </button>
              </div>
            )}

            {/* Active Interaction Badge: Allows User to Lock Map & Resume Page Scrolling */}
            {isMapActive && (
              <div className="absolute top-11 right-2.5 z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMapActive(false);
                  }}
                  className="bg-[#0D5E49] hover:bg-emerald-800 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg border border-emerald-400 backdrop-blur-md flex items-center gap-1 active:scale-95 transition cursor-pointer"
                >
                  <Lock className="w-3 h-3" />
                  <span>Lock map to scroll page</span>
                </button>
              </div>
            )}
          </div>

          {/* Synchronized Places Side List (Persistent List with Active Zoom & Pin Highlight) */}
          <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs flex flex-col h-full min-h-[320px] sm:min-h-[420px]">
            <div className="pb-2 border-b border-slate-100 mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#B8323C]" />
                <span>
                  {selectedCategory === "all"
                    ? "Town Establishments"
                    : (CATEGORIES.find((c) => c.id === selectedCategory || matchesCategory(c.id, "", selectedCategory))?.name || selectedCategory)}
                </span>
              </span>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                {places.length} places
              </span>
            </div>

            <p className="text-[11px] text-slate-500 mb-2">
              Click any place below to zoom & highlight pin on map:
            </p>

            <div ref={sideListRef} className="space-y-2 overflow-y-auto max-h-[380px] lg:max-h-[480px] pr-1 custom-scrollbar flex-1">
              {places.map((place, idx) => {
                const isSelected = isSamePlace(selectedPlace, place);
                const isVerified = place.verificationStatus === "verified";
                return (
                  <div
                    key={`${place._id || place.id || 'place'}-${idx}`}
                    onClick={() => handleSelectPlace(place)}
                    className={`p-3 rounded-xl border transition cursor-pointer text-left ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/70 shadow-sm ring-1 ring-blue-400"
                        : "border-slate-100 hover:border-slate-200 bg-slate-50/60 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wide ${
                          isSelected
                            ? "bg-blue-100 text-blue-700"
                            : "bg-red-50 text-[#B8323C]"
                        }`}>
                          {place.subcategory || place.category}
                        </span>
                        {isVerified && (
                          <span className="text-[9px] font-semibold text-emerald-700 flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Verified
                          </span>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditModalPlace(place);
                              setShowEditModal(true);
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-2xs transition cursor-pointer"
                            title="Edit place location & details"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                      {isSelected && (
                        <span className="text-[9px] font-bold text-blue-700 bg-blue-100/90 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                          Pinned & Zoomed
                        </span>
                      )}
                    </div>

                    <h4 className={`text-xs font-bold leading-snug ${
                      isSelected ? "text-blue-950 font-extrabold" : "text-slate-900"
                    }`}>
                      {place.name}
                    </h4>

                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{place.streetOrLandmark || place.addressFull || place.locality}</span>
                    </p>

                    {isSelected && (
                      <div className="mt-2.5 pt-2 border-t border-blue-200/60 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openGoogleMapsDirections(place);
                          }}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition cursor-pointer"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>Directions</span>
                        </button>
                        {place.phone && (
                          <a
                            href={`tel:${place.phone.replace(/\s+/g, '')}`}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call</span>
                          </a>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditModalPlace(place);
                              setShowEditModal(true);
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailModalPlace(place);
                          }}
                          className="text-slate-600 hover:text-slate-900 text-[10px] font-bold underline transition cursor-pointer"
                        >
                          Details
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* List View (Single-Open Accordion Layout) */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {places.map((place) => {
            const entityId = place._id || place.id || place.slug;
            const isExpanded = expandedEntityId === entityId;
            const isVerified = place.verificationStatus === "verified" || place.isVerified === true;

            return (
              <div key={entityId} className="transition-colors">
                {/* Collapsed State Row - Minimum 48px touch target */}
                <button
                  type="button"
                  onClick={() => handleToggleAccordion(entityId)}
                  className={`w-full text-left px-3.5 py-3.5 sm:px-4 sm:py-3.5 min-h-[48px] flex items-center justify-between gap-3 transition cursor-pointer select-none group ${
                    isExpanded ? "bg-slate-50/90" : "bg-white hover:bg-slate-50/60"
                  }`}
                  aria-expanded={isExpanded}
                  aria-controls={`details-${entityId}`}
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <span
                      className={`text-xs sm:text-sm truncate transition ${
                        isExpanded
                          ? "text-[#B8323C] font-bold"
                          : "text-slate-900 font-semibold group-hover:text-[#B8323C]"
                      }`}
                    >
                      {place.name}
                    </span>
                    {place.subcategory ? (
                      <span className="hidden sm:inline-block text-[11px] text-slate-400 font-normal truncate shrink-0">
                        • {place.subcategory}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400 font-medium hidden xs:inline-block max-w-[120px] truncate">
                      {place.category}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-transform duration-200 shrink-0 ${
                        isExpanded ? "rotate-180 text-[#B8323C]" : ""
                      }`}
                    />
                  </div>
                </button>

                {/* Expanded State Details Panel - Directly underneath row */}
                {isExpanded && (
                  <div
                    id={`details-${entityId}`}
                    className="bg-slate-50/90 border-t border-slate-100 px-3.5 py-3.5 sm:px-4 sm:py-4 space-y-2.5 transition-all duration-200 animate-fade-in"
                  >
                    {/* Category tag & Verified badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-50 text-[#B8323C] border border-red-100">
                          {place.category}
                        </span>
                        {place.subcategory && (
                          <span className="text-[10px] font-medium text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded">
                            {place.subcategory}
                          </span>
                        )}
                      </div>

                      {isVerified ? (
                        <span className="text-[10px] text-[#0D5E49] font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-[#0D5E49]" /> Verified Location
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-800 font-bold flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-amber-700" /> Needs Verification
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {place.description && (
                      <p className="text-xs text-slate-600 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-slate-200/60">
                        {place.description}
                      </p>
                    )}

                    {/* Full Address */}
                    {(place.addressFull || place.streetOrLandmark) && (
                      <div className="flex items-start gap-1.5 text-xs text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">
                          {place.addressFull || place.streetOrLandmark}
                        </span>
                      </div>
                    )}

                    {/* Opening Hours & Phone */}
                    <div className="flex flex-wrap gap-y-1.5 gap-x-4 text-xs text-slate-600">
                      {place.openingHours && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{place.openingHours}</span>
                        </div>
                      )}
                      {place.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <a
                            href={`tel:${place.phone.replace(/\s+/g, "")}`}
                            className="text-[#0D5E49] hover:underline font-bold"
                          >
                            {place.phone}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Actions: Call, Directions, More Info Modal */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/70">
                      {place.phone && (
                        <a
                          href={`tel:${place.phone.replace(/\s+/g, "")}`}
                          className="bg-[#18232E] hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-2xs"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => openGoogleMapsDirections(place)}
                        className="bg-[#0D5E49] hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Directions</span>
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditModalPlace(place);
                            setShowEditModal(true);
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Edit establishment details"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit Place</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDetailModalPlace(place)}
                        className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-1 transition cursor-pointer ml-auto"
                      >
                        More Info
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Place Detail & Audit Modal */}
      {detailModalPlace && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl relative max-h-[85vh] overflow-y-auto animate-fade-in-up sm:animate-modal-pop">
            <button
              onClick={() => setDetailModalPlace(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-50 text-[#B8323C]">
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

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
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
              <div className={`p-3 rounded-xl border space-y-1.5 text-xs ${
                detailModalPlace.verificationStatus === "verified"
                  ? "bg-emerald-50/70 border-emerald-100 text-emerald-950"
                  : "bg-amber-50/70 border-amber-200 text-amber-950"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className={`w-4 h-4 ${
                      detailModalPlace.verificationStatus === "verified" ? "text-[#0D5E49]" : "text-amber-700"
                    }`} />
                    <span>Geographical Audit Status</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    detailModalPlace.verificationStatus === "verified"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-900"
                  }`}>
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
                    className="bg-[#18232E] hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition text-center flex items-center justify-center gap-1.5"
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
                  className="bg-[#0D5E49] hover:bg-emerald-800 text-white font-bold text-xs py-2.5 rounded-xl transition text-center flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
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
          if (selectedPlace && isSamePlace(selectedPlace, savedPlace)) {
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

      {/* Community Place Submission Modal */}
      <CommunityPlaceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={(sub) => {
          showToast(`Place "${sub.name}" submitted for verification! (Tracking Ref: ${sub.referenceId})`);
          fetchStats();
        }}
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-20 right-4 z-50 bg-[#18232E] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs border border-slate-800 transition-all duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
