import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  REGIONAL_LOCATIONS,
  FAZILNAGAR_CENTRE,
} from "../data/regionalLocations";
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
} from "lucide-react";

export default function RegionalConnectivityMap() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const connectionLineRef = useRef(null);
  const pulseMarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const animStartTimeRef = useRef(null);

  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'village' | 'town' | 'city'
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [hoveredLocation, setHoveredLocation] = useState(null);
  const [isMapActive, setIsMapActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(11);
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);

  // The location currently highlighted (hovered has transient priority, fallback to selected)
  const currentHighlight = hoveredLocation || selectedLocation;

  // Filtered dataset based on category tab & search query
  const filteredLocations = useMemo(() => {
    return REGIONAL_LOCATIONS.filter((loc) => {
      // Always keep Fazilnagar Hub
      if (loc.id === FAZILNAGAR_CENTRE.id) return true;

      // Filter by category
      if (activeFilter !== "all" && loc.type !== activeFilter) {
        return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = loc.name.toLowerCase().includes(q);
        const matchHindi = loc.hindiName && loc.hindiName.includes(q);
        const matchBlock = loc.block && loc.block.toLowerCase().includes(q);
        const matchType = loc.type && loc.type.toLowerCase().includes(q);
        return matchName || matchHindi || matchBlock || matchType;
      }

      return true;
    });
  }, [activeFilter, searchQuery]);

  // Instant Search Suggestions dropdown
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return REGIONAL_LOCATIONS.filter((loc) => {
      if (loc.id === FAZILNAGAR_CENTRE.id) return false;
      const matchName = loc.name.toLowerCase().includes(q);
      const matchHindi = loc.hindiName && loc.hindiName.includes(q);
      const matchBlock = loc.block && loc.block.toLowerCase().includes(q);
      const matchType = loc.type && loc.type.toLowerCase().includes(q);
      return matchName || matchHindi || matchBlock || matchType;
    }).slice(0, 7);
  }, [searchQuery]);

  // Counts by category
  const counts = useMemo(() => {
    const villages = REGIONAL_LOCATIONS.filter((l) => l.type === "village").length;
    const towns = REGIONAL_LOCATIONS.filter((l) => l.type === "town").length;
    const cities = REGIONAL_LOCATIONS.filter((l) => l.type === "city").length;
    return {
      all: REGIONAL_LOCATIONS.length,
      village: villages,
      town: towns,
      city: cities,
    };
  }, []);

  // Open Google Maps Directions in new tab
  const handleOpenDirections = (dest) => {
    if (!dest) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${FAZILNAGAR_CENTRE.lat},${FAZILNAGAR_CENTRE.lng}&destination=${dest.lat},${dest.lng}&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

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
      const html = `
        <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-200 ${scale}" style="width: 36px; height: 36px;">
          ${isHighlighted ? '<div class="absolute inset-0 rounded-full bg-red-500 opacity-40 animate-ping"></div>' : ""}
          <div class="relative z-10 w-8 h-8 rounded-xl bg-[${bg}] border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-black">
            🏢
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#18232E] text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow">
            ${loc.name}
          </div>
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
      const html = `
        <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-200 ${scale}" style="width: 32px; height: 32px;">
          ${isHighlighted ? '<div class="absolute inset-0 rounded-full bg-red-500 opacity-40 animate-ping"></div>' : ""}
          <div class="relative z-10 w-7 h-7 rounded-xl bg-[${bg}] border-2 border-white shadow-md flex items-center justify-center text-white text-[11px] font-black">
            📍
          </div>
          <div class="absolute -bottom-4.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#18232E] text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow">
            ${loc.name}
          </div>
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
    // When zoomed in (zoom >= 13), show readable label directly under marker
    // When zoomed out (zoom < 11), use micro-dots to avoid marker overlap
    const isZoomedIn = zoom >= 13;
    const isZoomedOut = zoom < 11;
    const color = isHighlighted ? "#B8323C" : "#1E293B";
    const size = isHighlighted ? 18 : isZoomedOut ? 8 : 12;
    const border = isHighlighted
      ? "border-2 border-white ring-2 ring-red-500/50"
      : isZoomedOut
      ? "border-1 border-white"
      : "border-1.5 border-white";

    const labelHtml = (isZoomedIn || isHighlighted)
      ? `<div class="absolute -bottom-4.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-white text-[9px] font-semibold px-1 py-0.2 rounded shadow-xs border border-white/20 pointer-events-none">${loc.name}</div>`
      : "";

    const html = `
      <div class="relative flex items-center justify-center cursor-pointer" style="width: ${size}px; height: ${size}px;">
        ${isHighlighted ? '<div class="absolute -inset-1 rounded-full bg-red-500 opacity-50 animate-ping"></div>' : ""}
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

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapContainerRef.current._leaflet_id && !mapInstanceRef.current) {
      delete mapContainerRef.current._leaflet_id;
    }

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [FAZILNAGAR_CENTRE.lat, FAZILNAGAR_CENTRE.lng],
        zoom: 11,
        minZoom: 9,
        maxZoom: 16,
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
      });

      // CartoDB Voyager Basemap with CARTO API key
      const cartoKey = import.meta.env.VITE_CARTO_API_KEY || "cb1_4mno_1_8619f278442c92595b7dec16";
      const tileUrl = cartoKey
        ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${cartoKey}`
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

      L.tileLayer(tileUrl, {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
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

    const t = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      clearTimeout(t);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map interactive state (prevent accidental scroll hijack)
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

  // Render markers when filteredLocations, highlighted location, or zoom changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    filteredLocations.forEach((loc) => {
      const isHub = loc.id === FAZILNAGAR_CENTRE.id;
      const isHighlighted = currentHighlight && currentHighlight.id === loc.id;

      const icon = isHub
        ? createHubIcon()
        : createLocationIcon(loc, isHighlighted, currentZoom);

      const marker = L.marker([loc.lat, loc.lng], {
        icon,
        zIndexOffset: isHub ? 1000 : isHighlighted ? 800 : loc.type === "city" ? 500 : loc.type === "town" ? 400 : 100,
      });

      // Tooltip for quick context
      if (!isHub) {
        marker.bindTooltip(
          `<strong>${loc.name}</strong>${loc.hindiName ? ` (${loc.hindiName})` : ""}<br/><span style="font-size:10px;color:#94A3B8;">${loc.distanceKm} km from Fazilnagar Hub (${loc.compassDirection})</span>`,
          {
            direction: "top",
            offset: [0, -10],
            opacity: 0.95,
          }
        );
      }

      // Click / Tap Handler
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
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
  }, [filteredLocations, currentHighlight, currentZoom]);

  // Select location and smoothly frame connection
  const handleSelectLocation = useCallback((loc) => {
    setSelectedLocation(loc);
    setHoveredLocation(null);
    setShowSuggestions(false);
    if (mapInstanceRef.current) {
      const bounds = L.latLngBounds(
        [FAZILNAGAR_CENTRE.lat, FAZILNAGAR_CENTRE.lng],
        [loc.lat, loc.lng]
      );
      mapInstanceRef.current.fitBounds(bounds.pad(0.35), {
        animate: true,
        duration: 0.8,
        maxZoom: 14,
      });
    }
  }, []);

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

    const startCoords = [FAZILNAGAR_CENTRE.lat, FAZILNAGAR_CENTRE.lng];
    const endCoords = [currentHighlight.lat, currentHighlight.lng];

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
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
      {/* Top Controls Bar */}
      <div className="p-4 sm:p-5 bg-slate-900/95 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          <button
            type="button"
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
              placeholder="Search village, town or city..."
              className="w-full bg-slate-800/90 text-white placeholder-slate-400 text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-700/80 focus:outline-hidden focus:border-[#B8323C] focus:ring-1 focus:ring-[#B8323C] transition"
              aria-label="Search village, town or city"
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
                        <span>{sug.name}</span>
                        {sug.hindiName && (
                          <span className="text-[10px] text-slate-400 font-normal">({sug.hindiName})</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{sug.block} Block</span>
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
            title="Browse all 126 villages & towns directory"
          >
            <ListFilter className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Directory</span>
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

      {/* Map Viewport Area */}
      <div className="relative w-full h-[460px] sm:h-[540px] lg:h-[580px] bg-slate-950">
        <div
          ref={mapContainerRef}
          className="w-full h-full z-0 cursor-crosshair"
          onClick={() => {
            if (!isMapActive) setIsMapActive(true);
            if (showSuggestions) setShowSuggestions(false);
          }}
        />

        {/* Scroll Protection Overlay (Click to Activate) */}
        {!isMapActive && (
          <div
            onClick={() => setIsMapActive(true)}
            className="absolute inset-0 z-10 bg-slate-950/20 backdrop-blur-[0.5px] flex items-center justify-center cursor-pointer transition hover:bg-slate-950/10 group"
          >
            <div className="bg-slate-900/90 border border-slate-700 text-white text-xs font-bold px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 group-hover:scale-105 transition">
              <Navigation className="w-4 h-4 text-[#B8323C] animate-pulse" />
              <span>Tap or Click to Interact with Map / नेविगेट करें</span>
            </div>
          </div>
        )}

        {/* Custom Map Floating Controls (Top Left & Top Right) */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 shadow-lg">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-xl bg-slate-900/90 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 transition cursor-pointer shadow-md"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-xl bg-slate-900/90 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 transition cursor-pointer shadow-md"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Verified Count Badge (Top Right) */}
        <div className="absolute top-4 right-4 z-20 hidden sm:flex items-center gap-2 bg-slate-900/90 border border-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{filteredLocations.length} Verified Locations Mapped</span>
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
                    {currentHighlight.type}
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {currentHighlight.distanceKm} km from Hub
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

            <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
              {currentHighlight.description ||
                `Part of ${currentHighlight.block} Block, ${currentHighlight.district} district. Verified via ${currentHighlight.source || "Census of India 2011"}.`}
            </p>

            <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-mono">
                <Compass className="w-3.5 h-3.5 text-[#B8323C]" />
                <span>Direction: {currentHighlight.compassDirection}</span>
              </span>

              <button
                type="button"
                onClick={() => handleOpenDirections(currentHighlight)}
                className="inline-flex items-center gap-1 text-[#B8323C] hover:text-red-400 font-bold transition cursor-pointer"
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
            <span>Towns</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4338CA]"></span>
            <span>Cities</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span>Villages (126)</span>
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
                  Fazilnagar Block &amp; Regional Directory
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  126 Verified Villages, 7 Towns, and 3 Cities
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBrowseOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-slate-800/60 custom-scrollbar">
              {REGIONAL_LOCATIONS.filter((l) => l.id !== FAZILNAGAR_CENTRE.id).map((loc) => (
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
                      <span>{loc.name}</span>
                      {loc.hindiName && (
                        <span className="text-[10px] text-slate-400 font-normal">({loc.hindiName})</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {loc.block} Block &bull; {loc.district}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                      loc.type === "city" ? "bg-indigo-900 text-indigo-200" :
                      loc.type === "town" ? "bg-emerald-900 text-emerald-200" :
                      "bg-slate-800 text-slate-300"
                    }`}>
                      {loc.type}
                    </span>
                    <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                      {loc.distanceKm} km {loc.compassDirection}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center text-xs text-slate-400">
              Tap any location to trace animated connectivity to Fazilnagar Hub
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
