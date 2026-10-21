import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  REGIONAL_LOCATIONS,
  FAZILNAGAR_CENTRE,
} from "../data/regionalLocations";
import API from "../api";
import { getSocket } from "../socket";
import {
  Compass,
  Search,
  Filter,
  RotateCcw,
  Plus,
  Minus,
  MapPin,
  ExternalLink,
  X,
  Layers,
  CheckCircle2,
  Navigation,
  ListFilter,
  ArrowUpRight,
  Map as MapIcon,
  Globe,
} from "lucide-react";

const FILTER_BANDS = [
  { id: "all", label: "All Distances / सभी दूरियाँ" },
  { id: "le20km", label: "≤ 20 km (Local Area)" },
  { id: "le100km", label: "≤ 100 km (Regional Belt)" },
  { id: "0-5km", label: "0–5 km" },
  { id: "5-12km", label: "5–12 km" },
  { id: "12-20km", label: "12–20 km" },
  { id: "15-35km", label: "15–35 km" },
  { id: "35-60km", label: "35–60 km" },
  { id: "60-100km", label: "60–100 km" },
  { id: "100plus", label: "100+ km" },
];

export default function RegionalConnectivityMap() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const connectionLineRef = useRef(null);
  const pulseMarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const animStartTimeRef = useRef(null);

  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'village' | 'town' | 'city'
  const [activeDistanceBand, setActiveDistanceBand] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerSearchQuery, setDrawerSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [hoveredLocation, setHoveredLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(11);
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const [showTouchHint, setShowTouchHint] = useState(false);
  const [locations, setLocations] = useState(REGIONAL_LOCATIONS);
  const touchHintTimeoutRef = useRef(null);
  const touchStartPosRef = useRef(null);
  const twoFingerCenterRef = useRef(null);

  // Synchronize dynamic entities from backend API with fallback to static dataset
  useEffect(() => {
    let isMounted = true;
    const fetchEntities = async () => {
      try {
        let resData = null;
        try {
          const apiRes = await API.get("/places/map-entities");
          resData = apiRes.data;
        } catch (_) {
          const res = await fetch("/api/places/map-entities");
          if (res.ok) {
            resData = await res.json();
          }
        }
        const rawList = Array.isArray(resData)
          ? resData
          : Array.isArray(resData?.data)
          ? resData.data
          : null;

        if (isMounted && rawList && rawList.length > 0) {
          const hub =
            rawList.find(
              (d) =>
                d.id === "fazilnagar-hub" ||
                d.slug === "fazilnagar-hub" ||
                d.sno === 1 ||
                (d.name && d.name.toLowerCase().includes("fazilnagar centre"))
            ) || FAZILNAGAR_CENTRE;
          const others = rawList.filter(
            (d) => d.id !== hub.id && d.slug !== hub.slug && d.sno !== 1
          );
          const fullList = [hub, ...others];
          setLocations(fullList);

          // Update currently selected location in place so marker popup reflects updates immediately
          setSelectedLocation((currentSelected) => {
            if (!currentSelected) return null;
            const currentId = currentSelected.id || currentSelected._id || currentSelected.slug;
            const updated = fullList.find(
              (loc) =>
                (loc.id && currentId && String(loc.id) === String(currentId)) ||
                (loc._id && currentId && String(loc._id) === String(currentId)) ||
                (loc.slug && currentId && String(loc.slug) === String(currentId)) ||
                (loc.name && currentSelected.name && loc.name === currentSelected.name)
            );
            return updated || currentSelected;
          });
        }
      } catch (err) {
        console.warn("Using fallback static regional locations:", err);
      }
    };

    fetchEntities();

    const handlePlaceUpdate = () => {
      fetchEntities();
    };

    const handleStorageUpdate = (e) => {
      if (e.key === "fazilnagar_last_place_update") {
        fetchEntities();
      }
    };

    window.addEventListener("fazilnagar-place-updated", handlePlaceUpdate);
    window.addEventListener("storage", handleStorageUpdate);

    let socket = null;
    try {
      socket = getSocket();
      if (socket) {
        socket.on("places_updated", handlePlaceUpdate);
      }
    } catch (_) {}

    return () => {
      isMounted = false;
      window.removeEventListener("fazilnagar-place-updated", handlePlaceUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
      if (socket) {
        socket.off("places_updated", handlePlaceUpdate);
      }
    };
  }, []);

  // Geographic Straight-Line Distance Calculation via Haversine Formula
  const getHaversineDistance = useCallback((loc) => {
    if (loc?.calculatedDistanceKm !== undefined && loc?.calculatedDistanceKm !== null && !isNaN(loc.calculatedDistanceKm)) {
      return Number(loc.calculatedDistanceKm);
    }
    if (loc?.calculatedStraightLineKm !== undefined && loc?.calculatedStraightLineKm !== null && !isNaN(loc.calculatedStraightLineKm)) {
      return Number(loc.calculatedStraightLineKm);
    }
    if (loc?.distanceKm !== undefined && loc?.distanceKm !== null && !isNaN(loc.distanceKm)) {
      return Number(loc.distanceKm);
    }
    const lat = Number(loc?.latitude ?? loc?.lat);
    const lng = Number(loc?.longitude ?? loc?.lng);
    const oLat = Number(FAZILNAGAR_CENTRE?.latitude ?? FAZILNAGAR_CENTRE?.lat);
    const oLng = Number(FAZILNAGAR_CENTRE?.longitude ?? FAZILNAGAR_CENTRE?.lng);
    if (!isNaN(lat) && !isNaN(lng) && !isNaN(oLat) && !isNaN(oLng)) {
      const R = 6371; // Earth radius in km
      const dLat = ((lat - oLat) * Math.PI) / 180;
      const dLon = ((lng - oLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((oLat * Math.PI) / 180) *
          Math.cos((lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c * 10) / 10;
    }
    return null;
  }, []);

  // The location currently highlighted (hovered has transient priority, fallback to selected)
  const currentHighlight = hoveredLocation || selectedLocation;

  // Filtered dataset based on category tab, distance band, & search query
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      // Always keep Fazilnagar Hub visible
      const isHub = loc.id === "fazilnagar-hub" || loc.id === FAZILNAGAR_CENTRE.id || loc.slug === "fazilnagar-hub" || loc.sno === 1 || (loc.name && loc.name.toLowerCase().includes("fazilnagar centre"));
      if (isHub) return true;

      // Filter by category
      if (activeFilter !== "all" && loc.type !== activeFilter) {
        return false;
      }

      // Filter by distance band using actual straight-line Haversine distance
      const dist = loc.calculatedStraightLineKm ?? loc.calculatedDistanceKm ?? loc.distanceKm ?? 0;
      if (activeDistanceBand === "le20km") {
        if (dist > 20) return false;
      } else if (activeDistanceBand === "le100km") {
        if (dist > 100) return false;
      } else if (activeDistanceBand === "0-5km") {
        if (dist > 5) return false;
      } else if (activeDistanceBand === "5-12km") {
        if (dist <= 5 || dist > 12) return false;
      } else if (activeDistanceBand === "12-20km") {
        if (dist <= 12 || dist > 20) return false;
      } else if (activeDistanceBand === "15-35km") {
        if (dist < 15 || dist > 35) return false;
      } else if (activeDistanceBand === "35-60km") {
        if (dist <= 35 || dist > 60) return false;
      } else if (activeDistanceBand === "60-100km") {
        if (dist <= 60 || dist > 100) return false;
      } else if (activeDistanceBand === "100plus") {
        if (dist <= 100) return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = loc.name?.toLowerCase().includes(q);
        const matchHindi = loc.hindiName && loc.hindiName.includes(q);
        const matchBlock = loc.block && loc.block.toLowerCase().includes(q);
        const matchType = loc.type && loc.type.toLowerCase().includes(q);
        const matchCategory = loc.sourceCategory && loc.sourceCategory.toLowerCase().includes(q);
        const matchDistrict = loc.district && loc.district.toLowerCase().includes(q);
        const matchState = loc.state && loc.state.toLowerCase().includes(q);
        const matchSno = String(loc.sno) === q;
        return matchName || matchHindi || matchBlock || matchType || matchCategory || matchDistrict || matchState || matchSno;
      }

      return true;
    });
  }, [activeFilter, activeDistanceBand, searchQuery, locations]);

  // Instant Search Suggestions dropdown
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return locations.filter((loc) => {
      const isHub = loc.id === "fazilnagar-hub" || loc.id === FAZILNAGAR_CENTRE.id || loc.slug === "fazilnagar-hub" || loc.sno === 1 || (loc.name && loc.name.toLowerCase().includes("fazilnagar centre"));
      if (isHub) return false;
      const matchName = loc.name?.toLowerCase().includes(q);
      const matchHindi = loc.hindiName && loc.hindiName.includes(q);
      const matchBlock = loc.block && loc.block.toLowerCase().includes(q);
      const matchType = loc.type && loc.type.toLowerCase().includes(q);
      const matchCategory = loc.sourceCategory && loc.sourceCategory.toLowerCase().includes(q);
      const matchSno = String(loc.sno) === q;
      return matchName || matchHindi || matchBlock || matchType || matchCategory || matchSno;
    }).slice(0, 8);
  }, [searchQuery, locations]);

  // Drawer Locations (All supplied locations filtered by drawer search query)
  const drawerLocations = useMemo(() => {
    let list = locations.filter((l) => {
      return !(l.id === "fazilnagar-hub" || l.id === FAZILNAGAR_CENTRE.id || l.slug === "fazilnagar-hub" || l.sno === 1 || (l.name && l.name.toLowerCase().includes("fazilnagar centre")));
    });
    if (drawerSearchQuery.trim()) {
      const q = drawerSearchQuery.toLowerCase().trim();
      list = list.filter((loc) => {
        const matchName = loc.name?.toLowerCase().includes(q);
        const matchHindi = loc.hindiName && loc.hindiName.includes(q);
        const matchCategory = loc.sourceCategory && loc.sourceCategory.toLowerCase().includes(q);
        const matchType = loc.type && loc.type.toLowerCase().includes(q);
        const matchSno = String(loc.sno) === q || String(loc.sno).includes(q);
        const matchBand = loc.distanceBand && loc.distanceBand.toLowerCase().includes(q);
        return matchName || matchHindi || matchCategory || matchType || matchSno || matchBand;
      });
    }
    return list;
  }, [drawerSearchQuery, locations]);

  // Counts by category and verification status
  const counts = useMemo(() => {
    const villages = locations.filter((l) => l.type === "village").length;
    const towns = locations.filter((l) => l.type === "town").length;
    const cities = locations.filter((l) => l.type === "city").length;
    const verified = locations.filter((l) => l.verificationStatus === "verified").length;
    const unverified = locations.filter((l) => l.verificationStatus === "needs_verification" || l.verificationStatus === "unverified").length;
    return {
      all: locations.length,
      village: villages,
      town: towns,
      city: cities,
      verified,
      unverified,
    };
  }, [locations]);

  // Open Google Maps using exact saved numeric coordinates: https://www.google.com/maps/search/?api=1&query=LATITUDE%2CLONGITUDE
  const handleOpenDirections = useCallback((dest) => {
    if (!dest) return;
    const lat = Number(dest.latitude ?? dest.lat);
    const lng = Number(dest.longitude ?? dest.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  // Helper: Create custom icon for Fazilnagar Hub
  const createHubIcon = () => {
    const html = `
      <div class="relative flex items-center justify-center cursor-pointer select-none" style="width: 48px; height: 48px;">
        <div class="absolute inset-0 rounded-full bg-[#B8323C] opacity-40 animate-ping"></div>
        <div class="absolute -inset-1 rounded-full bg-amber-400 opacity-20 filter blur-xs animate-pulse"></div>
        <div class="relative z-10 w-9 h-9 rounded-full bg-[#B8323C] border-2 border-white shadow-lg flex items-center justify-center text-white font-black text-xs">
          ★
        </div>
        <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#18232E] text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-white/20 shadow-md">
          Fazilnagar Centre
        </div>
      </div>
    `;
    return L.divIcon({
      html,
      className: "fazilnagar-hub-icon-wrap",
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });
  };

  // Helper: Create custom icon for Towns / Cities / Villages with Zoom-Aware Density
  const createLocationIcon = (loc, isHighlighted = false, zoom = 11) => {
    const isCity = loc.type === "city";
    const isTown = loc.type === "town";

    if (isCity) {
      const bg = isHighlighted ? "#B8323C" : "#4338CA";
      const scale = isHighlighted ? "scale-110" : "scale-100";
      const showLabel = zoom >= 5 || isHighlighted;
      const html = `
        <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-200 ${scale}" style="width: 36px; height: 36px;">
          ${isHighlighted ? '<div class="absolute inset-0 rounded-full bg-red-500 opacity-40 animate-ping"></div>' : ""}
          <div class="relative z-10 w-8 h-8 rounded-xl bg-[${bg}] border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-black">
            🏢
          </div>
          ${showLabel ? `
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#18232E] text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow border border-slate-700/60 pointer-events-none">
              ${loc.name}
            </div>
          ` : ""}
        </div>
      `;
      return L.divIcon({
        html,
        className: "reg-city-icon",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
    }

    if (isTown) {
      const bg = isHighlighted ? "#B8323C" : "#0D5E49";
      const scale = isHighlighted ? "scale-110" : "scale-100";
      const showLabel = zoom >= 7 || isHighlighted;
      const html = `
        <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-200 ${scale}" style="width: 32px; height: 32px;">
          ${isHighlighted ? '<div class="absolute inset-0 rounded-full bg-red-500 opacity-40 animate-ping"></div>' : ""}
          <div class="relative z-10 w-7 h-7 rounded-xl bg-[${bg}] border-2 border-white shadow-md flex items-center justify-center text-white text-[11px] font-black">
            📍
          </div>
          ${showLabel ? `
            <div class="absolute -bottom-4.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#18232E] text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow border border-slate-700/60 pointer-events-none">
              ${loc.name}
            </div>
          ` : ""}
        </div>
      `;
      return L.divIcon({
        html,
        className: "reg-town-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
    }

    // Zoom-Dependent Village Density Strategy:
    // When zoomed in (zoom >= 14), show readable label directly under marker
    // When zoomed out (zoom < 14), render micro-dots to eliminate visual label collision
    // Individual names are always revealed via hover / tap tooltips or upon selection
    const isZoomedIn = zoom >= 14;
    const isZoomedOut = zoom < 11;
    const isNeedsVerification = loc.verificationStatus === "needs_verification";
    const color = isHighlighted ? "#B8323C" : isNeedsVerification ? "#D97706" : "#475569";
    const size = isHighlighted ? 18 : isZoomedOut ? 6 : 8;
    const border = isHighlighted
      ? "border-2 border-white ring-2 ring-red-500/50"
      : isNeedsVerification
      ? "border-1 border-amber-300 ring-1 ring-amber-500/40"
      : isZoomedOut
      ? "border-1 border-slate-900"
      : "border-1 border-white/60";

    const labelHtml = (isZoomedIn || isHighlighted)
      ? `<div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/95 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md border ${isNeedsVerification ? "border-amber-500/80" : "border-slate-700/80"} pointer-events-none z-10">${loc.name}${isNeedsVerification ? " ⚠️" : ""}</div>`
      : "";

    const html = `
      <div class="relative flex items-center justify-center cursor-pointer" style="width: ${size}px; height: ${size}px;">
        ${isHighlighted ? '<div class="absolute -inset-1.5 rounded-full bg-red-500 opacity-60 animate-ping"></div>' : ""}
        <div class="w-full h-full rounded-full bg-[${color}] ${border} shadow-sm transition-all duration-200"></div>
        ${labelHtml}
      </div>
    `;
    return L.divIcon({
      html,
      className: "reg-village-dot-icon",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  // Initialize Map with 2-finger mobile gestures and desktop dragging
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    if (container._leaflet_id && !mapInstanceRef.current) {
      delete container._leaflet_id;
    }

    if (!mapInstanceRef.current) {
      const map = L.map(container, {
        center: [FAZILNAGAR_CENTRE.lat, FAZILNAGAR_CENTRE.lng],
        zoom: 11,
        minZoom: 1,
        maxZoom: 18,
        worldCopyJump: true,
        zoomControl: false,
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: false,
        tap: true,
      });

      // CartoDB Voyager Basemap with CARTO API key
      const cartoKey = import.meta.env.VITE_CARTO_API_KEY || "cb1_4mno_1_8619f278442c92595b7dec16";
      const tileUrl = cartoKey
        ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${cartoKey}`
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

      map.setMinZoom(1);
      map.setMaxZoom(18);

      L.tileLayer(tileUrl, {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        minZoom: 0,
        maxZoom: 19,
        noWrap: false,
      }).addTo(map);

      // Track zoom level for density-adaptive rendering
      map.on("zoomend", () => {
        setCurrentZoom(map.getZoom());
      });

      // Create dedicated marker layer
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;
      setIsLoading(false);
    }

    // Touch event listeners for 1-finger page scroll vs 2-finger map pan
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        // 1 finger: allow normal page scrolling, record initial point
        touchStartPosRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        twoFingerCenterRef.current = null;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.dragging.disable();
        }
      } else if (e.touches.length >= 2) {
        // 2 fingers: prepare for 2-finger map panning and pinch zooming
        touchStartPosRef.current = null;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        twoFingerCenterRef.current = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };
        if (touchHintTimeoutRef.current) clearTimeout(touchHintTimeoutRef.current);
        setShowTouchHint(false);
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 1) {
        // Single finger moving: check if user is attempting to drag the map
        if (touchStartPosRef.current) {
          const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
          const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
          if (dx > 12 || dy > 12) {
            setShowTouchHint(true);
            if (touchHintTimeoutRef.current) clearTimeout(touchHintTimeoutRef.current);
            touchHintTimeoutRef.current = setTimeout(() => {
              setShowTouchHint(false);
            }, 2500);
          }
        }
        // Do NOT call e.preventDefault(); normal page scroll continues
      } else if (e.touches.length >= 2) {
        // 2 fingers: prevent page scrolling and pan the map
        if (e.cancelable) e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const curCenter = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };

        if (twoFingerCenterRef.current && mapInstanceRef.current) {
          const deltaX = curCenter.x - twoFingerCenterRef.current.x;
          const deltaY = curCenter.y - twoFingerCenterRef.current.y;
          if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
            mapInstanceRef.current.panBy([-deltaX, -deltaY], { animate: false });
          }
        }
        twoFingerCenterRef.current = curCenter;
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        twoFingerCenterRef.current = null;
      }
      if (e.touches.length === 0) {
        touchStartPosRef.current = null;
      }
    };

    const handleMouseDown = () => {
      // Re-enable dragging for desktop mouse interaction
      if (mapInstanceRef.current) {
        mapInstanceRef.current.dragging.enable();
      }
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    container.addEventListener("mousedown", handleMouseDown);

    const t = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      clearTimeout(t);
      if (touchHintTimeoutRef.current) clearTimeout(touchHintTimeoutRef.current);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
      container.removeEventListener("mousedown", handleMouseDown);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Select location and smoothly frame connection
  const handleSelectLocation = useCallback((loc) => {
    setSelectedLocation(loc);
    setHoveredLocation(null);
    setShowSuggestions(false);
    if (mapInstanceRef.current) {
      const oLat = Number(FAZILNAGAR_CENTRE.latitude ?? FAZILNAGAR_CENTRE.lat);
      const oLng = Number(FAZILNAGAR_CENTRE.longitude ?? FAZILNAGAR_CENTRE.lng);
      const dLat = Number(loc.latitude ?? loc.lat);
      const dLng = Number(loc.longitude ?? loc.lng);
      const bounds = L.latLngBounds(
        [oLat, oLng],
        [dLat, dLng]
      );
      mapInstanceRef.current.fitBounds(bounds.pad(0.35), {
        animate: true,
        duration: 0.8,
        maxZoom: 14,
      });
    }
  }, []);

  // Render markers when filteredLocations, highlighted location, or zoom changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    filteredLocations.forEach((loc) => {
      const isHub =
        loc.id === "fazilnagar-hub" ||
        loc.id === FAZILNAGAR_CENTRE.id ||
        loc.slug === "fazilnagar-hub" ||
        loc.sno === 1 ||
        (loc.name && loc.name.toLowerCase().includes("fazilnagar centre"));
      const isHighlighted =
        currentHighlight &&
        (currentHighlight.id === loc.id ||
          (currentHighlight.sno && currentHighlight.sno === loc.sno));

      // At low zoom levels (zoom < 8) and without active filter/search, declutter villages to keep subcontinent clear
      const isFilteredActive = activeFilter !== "all" || activeDistanceBand !== "all" || Boolean(searchQuery.trim());
      if (loc.type === "village" && currentZoom < 8 && !isHighlighted && !isFilteredActive) {
        return;
      }

      const icon = isHub
        ? createHubIcon()
        : createLocationIcon(loc, isHighlighted, currentZoom);

      const lat = Number(loc.latitude ?? loc.lat);
      const lng = Number(loc.longitude ?? loc.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return;
      }

      const marker = L.marker([lat, lng], {
        icon,
        zIndexOffset: isHub ? 1000 : isHighlighted ? 900 : loc.type === "city" ? 500 : loc.type === "town" ? 400 : 100,
      });

      // Animated Preview Tooltip on Hover / Focus with Haversine distance
      if (!isHub) {
        const dist = getHaversineDistance(loc);
        const distText = dist !== null ? `${dist} km from Fazilnagar Centre` : "";
        const typeBadge = loc.type === "city" ? "City / शहर" : loc.type === "town" ? "Town / कस्बा" : "Village / गाँव";
        const badgeColor = loc.type === "city" ? "#6366F1" : loc.type === "town" ? "#10B981" : "#64748B";
        const isVerified = loc.verificationStatus === "verified";

        const tooltipHtml = `
          <div style="font-family: inherit; min-width: 140px; text-align: left;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 1px 6px; border-radius: 4px; background: ${badgeColor}; color: #fff;">
                ${typeBadge}
              </span>
              ${dist !== null ? `<span style="font-size: 11px; font-weight: 800; color: #FBBF24; font-family: monospace;">${dist} km</span>` : ""}
            </div>
            <div style="font-size: 12px; font-weight: 800; color: #FFFFFF; line-height: 1.25;">
              ${loc.name}
            </div>
            ${loc.hindiName ? `<div style="font-size: 10px; color: #94A3B8; margin-top: 1px;">${loc.hindiName}</div>` : ""}
            <div style="margin-top: 4px; font-size: 9px; font-weight: 700; color: ${isVerified ? '#4ADE80' : '#FBBF24'};">
              ${isVerified ? '✓ Verified Settlement' : '⚠️ Candidate (Verification Pending)'}
            </div>
            ${distText ? `<div style="font-size: 9px; color: #CBD5E1; margin-top: 3px; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 3px;">📍 ${distText}</div>` : ""}
          </div>
        `;

        marker.bindTooltip(tooltipHtml, {
          direction: "top",
          offset: [0, -12],
          opacity: 1,
          className: "custom-location-preview-tooltip",
        });

        // Informative Leaflet Popup (Accessible on mobile tap and desktop click)
        const statusBadge = isVerified
          ? `<span style="font-size: 8px; font-weight: 800; text-transform: uppercase; padding: 1px 5px; border-radius: 4px; background: #DCFCE7; color: #15803D; border: 1px solid #86EFAC;">✓ Verified Settlement</span>`
          : `<span style="font-size: 8px; font-weight: 800; text-transform: uppercase; padding: 1px 5px; border-radius: 4px; background: #FEF3C7; color: #B45309; border: 1px solid #FCD34D;">⚠️ Candidate (Needs Verification)</span>`;

        const distanceInfo = loc.suppliedDistanceKm !== undefined && loc.calculatedDistanceKm !== undefined && loc.suppliedDistanceKm !== loc.calculatedDistanceKm
          ? `<div><strong>Distances:</strong> ${loc.calculatedDistanceKm} km straight-line (Supplied: ${loc.suppliedDistanceKm} km)</div>`
          : `<div><strong>Distance:</strong> ${dist} km straight-line (${loc.compassDirection} from Hub)</div>`;

        const popupContent = `
          <div style="font-family: inherit; font-size: 11px; color: #0f172a; max-width: 260px; line-height: 1.35; padding: 2px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: ${badgeColor}; color: #fff;">
                ${loc.type} &bull; SNO #${loc.sno}
              </span>
              <span style="font-size: 11px; font-weight: 800; color: #b45309; font-family: monospace;">
                ${dist} km
              </span>
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px;">
              ${loc.name}
            </div>
            ${loc.hindiName ? `<div style="font-size: 11px; color: #475569; font-weight: 600;">${loc.hindiName}</div>` : ""}
            <div style="margin-top: 4px;">${statusBadge}</div>
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #334155; display: flex; flex-direction: column; gap: 3px;">
              <div><strong>Category:</strong> ${loc.sourceCategory || loc.type}</div>
              <div><strong>Coordinates:</strong> ${loc.sourceLatStr || loc.lat + '° N'}, ${loc.sourceLngStr || loc.lng + '° E'}</div>
              <div><strong>Source:</strong> ${loc.coordinateSource || loc.source || 'Regional Dataset'}</div>
              ${distanceInfo}
              <div><strong>Band:</strong> ${loc.distanceBand} &bull; ${loc.section}</div>
            </div>
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
              <a href="https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; background: #B8323C; color: #ffffff; font-size: 10px; font-weight: 700; text-decoration: none;">
                Open in Google Maps ↗
              </a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          autoPan: true,
          autoPanPadding: [15, 15],
          closeButton: true,
          maxWidth: 290,
          className: "fazilnagar-custom-leaflet-popup",
        });
      } else {
        const hubPopupContent = `
          <div style="font-family: inherit; font-size: 11px; color: #0f172a; max-width: 250px; line-height: 1.35; padding: 2px;">
            <div style="margin-bottom: 4px;">
              <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: #B8323C; color: #fff;">
                Central Hub &bull; SNO #1
              </span>
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a;">
              Fazilnagar Centre (फाजिलनगर)
            </div>
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #334155; display: flex; flex-direction: column; gap: 3px;">
              <div><strong>Category:</strong> कस्बा / ब्लॉक मुख्यालय</div>
              <div><strong>Coordinates:</strong> 26.6827° N, 84.0498° E</div>
              <div><strong>Role:</strong> Configured Town Center &amp; Zero-Km Reference Point</div>
            </div>
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
              <a href="https://www.google.com/maps/search/?api=1&query=26.6827%2C84.0498" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; background: #B8323C; color: #ffffff; font-size: 10px; font-weight: 700; text-decoration: none;">
                Open in Google Maps ↗
              </a>
            </div>
          </div>
        `;

        marker.bindPopup(hubPopupContent, {
          autoPan: true,
          autoPanPadding: [15, 15],
          closeButton: true,
          maxWidth: 280,
          className: "fazilnagar-custom-leaflet-popup",
        });
      }

      // Click / Tap Handler
      marker.on("click", (e) => {
        if (isHub) {
          map.flyTo([FAZILNAGAR_CENTRE.lat, FAZILNAGAR_CENTRE.lng], 11, { duration: 0.8 });
          setSelectedLocation(null);
        } else {
          handleSelectLocation(loc);
        }
      });

      // Desktop Hover Handlers
      marker.on("mouseover", () => {
        if (!isHub) setHoveredLocation(loc);
      });
      marker.on("mouseout", () => {
        setHoveredLocation(null);
      });

      marker.addTo(layer);
    });
  }, [filteredLocations, currentHighlight, currentZoom, getHaversineDistance, handleSelectLocation]);

  // Handle Animated Connection Line & Traveling Dot
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing line and pulse marker
    if (connectionLineRef.current) {
      map.removeLayer(connectionLineRef.current);
      connectionLineRef.current = null;
    }
    if (pulseMarkerRef.current) {
      map.removeLayer(pulseMarkerRef.current);
      pulseMarkerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (!currentHighlight || currentHighlight.id === FAZILNAGAR_CENTRE.id) {
      return;
    }

    const startCoords = [
      Number(FAZILNAGAR_CENTRE.latitude ?? FAZILNAGAR_CENTRE.lat),
      Number(FAZILNAGAR_CENTRE.longitude ?? FAZILNAGAR_CENTRE.lng)
    ];
    const endCoords = [
      Number(currentHighlight.latitude ?? currentHighlight.lat),
      Number(currentHighlight.longitude ?? currentHighlight.lng)
    ];

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 1. Draw Leaflet Polyline connecting Fazilnagar Hub to Destination
    const polyline = L.polyline([startCoords, endCoords], {
      color: "#B8323C",
      weight: 3.5,
      opacity: 0.88,
      className: prefersReducedMotion ? "fazilnagar-static-line" : "fazilnagar-flow-line",
      lineCap: "round",
    }).addTo(map);

    connectionLineRef.current = polyline;

    if (prefersReducedMotion) return;

    // 2. Animated Pulse Dot traveling along the connection path
    const pulseDotIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center pointer-events-none" style="width: 16px; height: 16px;">
          <div class="absolute inset-0 rounded-full bg-white opacity-75 animate-ping"></div>
          <div class="w-3 h-3 rounded-full bg-white border-2 border-[#B8323C] shadow-md"></div>
        </div>
      `,
      className: "fazilnagar-traveling-dot-wrap",
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const pulseMarker = L.marker(startCoords, {
      icon: pulseDotIcon,
      zIndexOffset: 999,
      interactive: false,
    }).addTo(map);

    pulseMarkerRef.current = pulseMarker;

    // Animation loop (1.2s travel duration from origin to destination)
    const duration = 1200;
    animStartTimeRef.current = performance.now();

    const animateDot = (time) => {
      const elapsed = time - animStartTimeRef.current;
      const progress = (elapsed % duration) / duration; // 0 to 1

      const curLat = startCoords[0] + (endCoords[0] - startCoords[0]) * progress;
      const curLng = startCoords[1] + (endCoords[1] - startCoords[1]) * progress;

      if (pulseMarkerRef.current) {
        pulseMarkerRef.current.setLatLng([curLat, curLng]);
      }

      animFrameRef.current = requestAnimationFrame(animateDot);
    };

    animFrameRef.current = requestAnimationFrame(animateDot);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [currentHighlight]);

  // Reset Map View to Center
  const handleResetView = () => {
    setSelectedLocation(null);
    setHoveredLocation(null);
    setSearchQuery("");
    setShowSuggestions(false);
    setActiveFilter("all");
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [FAZILNAGAR_CENTRE.lat, FAZILNAGAR_CENTRE.lng],
        11,
        { duration: 0.8 }
      );
    }
  };

  // Zoom In / Zoom Out
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      if (mapInstanceRef.current.getMinZoom() > 1) {
        mapInstanceRef.current.setMinZoom(1);
      }
      mapInstanceRef.current.zoomOut();
    }
  };

  // World View (Full Globe Zoom-Out)
  const handleWorldView = () => {
    setSelectedLocation(null);
    setHoveredLocation(null);
    setSearchQuery("");
    setShowSuggestions(false);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMinZoom(1);
      try {
        mapInstanceRef.current.flyTo([20, 0], 1, {
          duration: 1.2,
        });
      } catch (e) {
        mapInstanceRef.current.setView([20, 0], 1);
      }
    }
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
      {/* Top Controls Bar */}
      <div className="p-4 sm:p-5 bg-slate-900/95 border-b border-slate-800 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            <button
              type="button"
              aria-pressed={activeFilter === "all"}
              onClick={() => setActiveFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeFilter === "all"
                  ? "bg-[#B8323C] text-white shadow-xs"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <span>All Places</span>
              <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full">
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={activeFilter === "village"}
              onClick={() => setActiveFilter("village")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeFilter === "village"
                  ? "bg-[#B8323C] text-white shadow-xs"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <span>Villages / गाँव</span>
              <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full">
                {counts.village}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={activeFilter === "town"}
              onClick={() => setActiveFilter("town")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeFilter === "town"
                  ? "bg-[#B8323C] text-white shadow-xs"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <span>Towns / कस्बे</span>
              <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full">
                {counts.town}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={activeFilter === "city"}
              onClick={() => setActiveFilter("city")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeFilter === "city"
                  ? "bg-[#B8323C] text-white shadow-xs"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <span>Cities / शहर</span>
              <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full">
                {counts.city}
              </span>
            </button>
          </div>

          {/* Search Input, Directory Button, and Reset Action */}
          <div className="flex items-center gap-2 w-full md:w-auto relative">
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search village, town, city, or SNO..."
                className="w-full bg-slate-800/90 text-white placeholder-slate-400 text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-700/80 focus:outline-hidden focus:border-[#B8323C] focus:ring-1 focus:ring-[#B8323C] transition"
                aria-label="Search village, town, city, or SNO"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setShowSuggestions(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Instant Suggestions Dropdown */}
              {showSuggestions && searchQuery.trim() && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-800/80 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1.5 bg-slate-800/60 text-[10px] font-bold text-slate-400 flex items-center justify-between">
                    <span>Matching Locations</span>
                    <span>{searchSuggestions.length} found</span>
                  </div>
                  {searchSuggestions.map((sug) => (
                    <button
                      key={sug.id}
                      type="button"
                      onClick={() => handleSelectLocation(sug)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-800/90 flex items-center justify-between gap-2 transition cursor-pointer text-xs"
                    >
                      <div className="truncate">
                        <div className="font-bold text-white truncate flex items-center gap-1.5">
                          <span className="text-[10px] text-amber-400 font-mono">#{sug.sno}</span>
                          <span>{sug.name}</span>
                          {sug.hindiName && (
                            <span className="text-[10px] text-slate-400 font-normal">({sug.hindiName})</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">{sug.sourceCategory || sug.block}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                          sug.type === "city" ? "bg-indigo-900 text-indigo-200" :
                          sug.type === "town" ? "bg-emerald-900 text-emerald-200" :
                          "bg-slate-800 text-slate-300"
                        }`}>
                          {sug.type}
                        </span>
                        <div className="text-[10px] font-mono font-bold text-amber-400 mt-0.5">
                          {sug.distanceKm} km
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Browse Directory Button */}
            <button
              type="button"
              onClick={() => setIsBrowseOpen(true)}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700/80 flex items-center gap-1.5 text-xs font-bold shrink-0"
              title="Browse all 117 supplied locations directory"
            >
              <ListFilter className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Directory</span>
            </button>

            {/* World View / पूरी दुनिया Button */}
            <button
              type="button"
              onClick={handleWorldView}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700/80 flex items-center gap-1.5 text-xs font-bold shrink-0"
              title="World View / पूरी दुनिया (Zoom out to entire world)"
              aria-label="World View / पूरी दुनिया"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">World View / पूरी दुनिया</span>
            </button>

            {/* Reset Map View */}
            <button
              type="button"
              onClick={handleResetView}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700/80 shrink-0"
              title="Reset Map to Fazilnagar Centre"
              aria-label="Reset Map View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Distance Band Filter Pills Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs border-t border-slate-800/80 pt-2.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
            <Compass className="w-3 h-3 text-[#B8323C]" />
            Radius:
          </span>
          {FILTER_BANDS.map((band) => (
            <button
              key={band.id}
              type="button"
              onClick={() => setActiveDistanceBand(band.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition whitespace-nowrap cursor-pointer ${
                activeDistanceBand === band.id
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-xs"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent"
              }`}
            >
              {band.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map Viewport Area */}
      <div className="relative w-full h-[460px] sm:h-[540px] lg:h-[580px] bg-slate-950">
        <style>{`
          .custom-location-preview-tooltip {
            background: rgba(15, 23, 42, 0.96) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            border: 1px solid rgba(255, 255, 255, 0.16) !important;
            border-radius: 12px !important;
            padding: 8px 12px !important;
            color: #fff !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6) !important;
            animation: previewTooltipFadeScale 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
            pointer-events: none !important;
          }
          .custom-location-preview-tooltip::before {
            border-top-color: rgba(15, 23, 42, 0.96) !important;
          }
          .fazilnagar-custom-leaflet-popup .leaflet-popup-content-wrapper {
            background: #ffffff !important;
            border-radius: 16px !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2) !important;
            padding: 4px 6px !important;
          }
          .fazilnagar-custom-leaflet-popup .leaflet-popup-tip {
            background: #ffffff !important;
          }
          @keyframes previewTooltipFadeScale {
            0% {
              opacity: 0;
              transform: translateY(4px) scale(0.94);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>

        <div
          ref={mapContainerRef}
          className="w-full h-full z-0 cursor-crosshair"
          onClick={() => {
            if (showSuggestions) setShowSuggestions(false);
          }}
        />

        {/* Phase 1: Bilingual Touch Hint Overlay */}
        {showTouchHint && (
          <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-950/95 text-white border border-slate-700/80 shadow-2xl px-5 py-3 rounded-2xl flex items-center gap-3.5 max-w-sm text-left backdrop-blur-md">
              <div className="w-9 h-9 rounded-xl bg-[#B8323C]/20 border border-[#B8323C] text-white flex items-center justify-center shrink-0 text-lg">
                ✌️
              </div>
              <div>
                <p className="text-xs font-bold text-white">Use two fingers to move the map</p>
                <p className="text-[11px] text-slate-300 mt-0.5">मैप चलाने के लिए दो उंगलियों का उपयोग करें</p>
              </div>
            </div>
          </div>
        )}

        {/* Custom Map Floating Controls (Top Left & Top Right) */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 shadow-lg">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8.5 h-8.5 rounded-xl bg-slate-900/95 border border-slate-700/90 text-white flex items-center justify-center hover:bg-slate-800 hover:border-slate-500 transition cursor-pointer shadow-md"
            title="Zoom In / ज़ूम इन"
            aria-label="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8.5 h-8.5 rounded-xl bg-slate-900/95 border border-slate-700/90 text-white flex items-center justify-center hover:bg-slate-800 hover:border-slate-500 transition cursor-pointer shadow-md"
            title="Zoom Out / ज़ूम आउट"
            aria-label="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleWorldView}
            className="px-2 h-8.5 rounded-xl bg-slate-900/95 border border-slate-700/90 text-amber-400 hover:text-white hover:bg-slate-800 hover:border-amber-400/50 transition cursor-pointer shadow-md flex items-center gap-1.5 text-xs font-bold"
            title="World View / पूरी दुनिया (Zoom to entire globe)"
            aria-label="World View / पूरी दुनिया"
          >
            <Globe className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="hidden sm:inline text-[10px] font-semibold text-slate-200">World View / पूरी दुनिया</span>
          </button>
        </div>

        {/* Verified & Candidate Count Badge (Top Right) */}
        <div className="absolute top-4 right-4 z-20 hidden sm:flex items-center gap-2 bg-slate-900/90 border border-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{counts.verified} Verified &bull; {counts.unverified} Candidate</span>
        </div>

        {/* Empty Search Result State Overlay */}
        {filteredLocations.length <= 1 && searchQuery.trim() && (
          <div className="absolute inset-x-4 top-16 z-20 mx-auto max-w-sm bg-slate-900/95 border border-slate-700/90 rounded-2xl p-4 text-center shadow-2xl backdrop-blur-md animate-in fade-in">
            <div className="w-9 h-9 rounded-full bg-slate-800 text-amber-400 mx-auto flex items-center justify-center text-sm font-bold mb-2">
              🔍
            </div>
            <h5 className="text-xs font-bold text-white mb-1">No Matching Locations</h5>
            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              No place matches "{searchQuery}" in {activeFilter === "all" ? "the regional directory" : activeFilter + " category"}.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setShowSuggestions(false);
              }}
              className="px-3.5 py-1.5 bg-[#B8323C] hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
            >
              Clear Search &amp; Show All
            </button>
          </div>
        )}

        {/* Selected / Hovered Destination Info Panel (Floating bottom overlay) */}
        {currentHighlight && currentHighlight.id !== FAZILNAGAR_CENTRE.id && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-20 bg-slate-900/95 border border-slate-700/90 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      currentHighlight.type === "city"
                        ? "bg-indigo-600 text-white"
                        : currentHighlight.type === "town"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-700 text-slate-200"
                    }`}
                  >
                    {currentHighlight.type} &bull; SNO #{currentHighlight.sno}
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {currentHighlight.calculatedStraightLineKm ?? currentHighlight.distanceKm} km from Hub
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-extrabold text-white">
                  {currentHighlight.name}
                </h4>
                {currentHighlight.hindiName && (
                  <p className="text-xs text-slate-400">
                    {currentHighlight.hindiName}
                  </p>
                )}
              </div>

              {selectedLocation && (
                <button
                  type="button"
                  onClick={() => setSelectedLocation(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  aria-label="Close information card"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Structured Location Metadata Box */}
            <div className="mt-2.5 p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Category:</span>
                <span className="font-semibold text-white truncate max-w-[200px]">{currentHighlight.sourceCategory}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Status:</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  currentHighlight.verificationStatus === "verified"
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-950 text-amber-300 border border-amber-500/40"
                }`}>
                  {currentHighlight.verificationStatus === "verified" ? "✓ Verified Settlement" : "⚠️ Needs Field Verification"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Coordinates:</span>
                <span className="font-mono text-slate-200">
                  {currentHighlight.sourceLatStr || (currentHighlight.latitude ?? currentHighlight.lat) + "° N"}, {currentHighlight.sourceLngStr || (currentHighlight.longitude ?? currentHighlight.lng) + "° E"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Source:</span>
                <span className="text-slate-300 text-[10px] truncate max-w-[190px]" title={currentHighlight.coordinateSource || currentHighlight.source}>
                  {currentHighlight.coordinateSource || currentHighlight.source || "Regional Dataset"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Straight-line:</span>
                <span className="font-mono text-amber-400 font-bold">
                  {currentHighlight.calculatedDistanceKm ?? currentHighlight.calculatedStraightLineKm ?? currentHighlight.distanceKm} km ({currentHighlight.compassDirection})
                </span>
              </div>
              {currentHighlight.suppliedDistanceKm !== undefined && currentHighlight.calculatedDistanceKm !== undefined && currentHighlight.suppliedDistanceKm !== currentHighlight.calculatedDistanceKm && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Supplied Dist:</span>
                  <span className="font-mono text-slate-300">{currentHighlight.suppliedDistanceKm} km</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Band:</span>
                <span className="text-slate-300">{currentHighlight.distanceBand} &bull; {currentHighlight.section}</span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-mono">
                <Compass className="w-3.5 h-3.5 text-[#B8323C]" />
                <span>Bearing: {currentHighlight.compassDirection}</span>
              </span>

              <button
                type="button"
                onClick={() => handleOpenDirections(currentHighlight)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#B8323C] hover:bg-red-700 text-white font-bold transition cursor-pointer shadow-xs"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Legend (Bottom Left) */}
        <div className="absolute bottom-4 left-4 z-20 hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800/90 px-3 py-1.5 rounded-xl text-[11px] text-slate-300 shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B8323C]"></span>
            <span>Fazilnagar Hub</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0D5E49]"></span>
            <span>Towns ({counts.town})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4338CA]"></span>
            <span>Cities ({counts.city})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span>Verified Villages</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 border border-amber-300"></span>
            <span>Candidate Villages ({counts.village})</span>
          </div>
        </div>
      </div>

      {/* Browse All Locations Drawer / Modal */}
      {isBrowseOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Fazilnagar Regional Geospatial Directory
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  117 Verified Locations (Villages, Towns, and Cities)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBrowseOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                aria-label="Close directory modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Search Filter */}
            <div className="p-3 bg-slate-950/60 border-b border-slate-800/80">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={drawerSearchQuery}
                  onChange={(e) => setDrawerSearchQuery(e.target.value)}
                  placeholder="Filter 117 records by name, Hindi, SNO, category, band..."
                  className="w-full bg-slate-800 text-white placeholder-slate-400 text-xs pl-8 pr-8 py-1.5 rounded-xl border border-slate-700/80 focus:outline-hidden focus:border-[#B8323C]"
                />
                {drawerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setDrawerSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Content List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-slate-800/60 custom-scrollbar">
              {drawerLocations.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => {
                    handleSelectLocation(loc);
                    setIsBrowseOpen(false);
                  }}
                  className="w-full pt-2 first:pt-0 pb-1.5 px-2.5 rounded-xl hover:bg-slate-800/80 text-left flex items-center justify-between gap-3 transition cursor-pointer group"
                >
                  <div className="truncate">
                    <div className="text-xs font-bold text-white group-hover:text-amber-400 transition truncate flex items-center gap-1.5">
                      <span className="text-[10px] text-amber-400 font-mono font-bold shrink-0">#{loc.sno}</span>
                      <span className="truncate">{loc.name}</span>
                      {loc.hindiName && (
                        <span className="text-[10px] text-slate-400 font-normal truncate">({loc.hindiName})</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {loc.sourceCategory} &bull; {loc.sourceLatStr || loc.lat + "° N"}, {loc.sourceLngStr || loc.lng + "° E"}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                      loc.type === "city" ? "bg-indigo-900 text-indigo-200" :
                      loc.type === "town" ? "bg-emerald-900 text-emerald-200" :
                      "bg-slate-800 text-slate-300"
                    }`}>
                      {loc.distanceBand}
                    </span>
                    <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                      {loc.distanceKm} km {loc.compassDirection}
                    </div>
                  </div>
                </button>
              ))}
              {drawerLocations.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">
                  No records match "{drawerSearchQuery}"
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center text-xs text-slate-400 flex items-center justify-between">
              <span>Showing {drawerLocations.length} of {locations.length - 1} locations</span>
              <span className="text-amber-400/90 font-medium">Click any row to trace on map</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
