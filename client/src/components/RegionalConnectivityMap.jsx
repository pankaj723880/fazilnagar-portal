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
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [hoveredLocation, setHoveredLocation] = useState(null);
  const [isMapActive, setIsMapActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  // Helper: Create custom icon for Towns / Cities / Villages
  const createLocationIcon = (loc, isHighlighted = false) => {
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

    // Standard Village Dot Marker
    const color = isHighlighted ? "#B8323C" : "#1E293B";
    const size = isHighlighted ? 18 : 12;
    const border = isHighlighted ? "border-2 border-white ring-2 ring-red-500/50" : "border-1.5 border-white";
    const html = `
      <div class="relative flex items-center justify-center cursor-pointer" style="width: ${size}px; height: ${size}px;">
        ${isHighlighted ? '<div class="absolute -inset-1 rounded-full bg-red-500 opacity-50 animate-ping"></div>' : ""}
        <div class="w-full h-full rounded-full bg-[${color}] ${border} shadow-sm transition-all duration-200"></div>
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

      // CartoDB Positron / OSM Basemap
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

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

  // Render markers when filteredLocations or highlighted location changes
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
        : createLocationIcon(loc, isHighlighted);

      const marker = L.marker([loc.lat, loc.lng], {
        icon,
        zIndexOffset: isHub ? 1000 : isHighlighted ? 800 : loc.type === "city" ? 500 : loc.type === "town" ? 400 : 100,
      });

      // Tooltip for quick context
      if (!isHub) {
        marker.bindTooltip(
          `<strong>${loc.name}</strong>${loc.hindiName ? ` (${loc.hindiName})` : ""}<br/><span style="font-size:10px;color:#64748B;">${loc.distanceKm} km from Fazilnagar</span>`,
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
          map.flyTo([FAZILNAGAR_CENTRE.lat, FAZILNAGAR_CENTRE.lng], 12, { duration: 0.8 });
          setSelectedLocation(null);
        } else {
          setSelectedLocation(loc);
          map.panTo([loc.lat, loc.lng], { animate: true, duration: 0.6 });
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
  }, [filteredLocations, currentHighlight]);

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

        {/* Search Input and Reset Action */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search village, town or city..."
              className="w-full bg-slate-800/90 text-white placeholder-slate-400 text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-700/80 focus:outline-hidden focus:border-[#B8323C] transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleResetView}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700/80 shrink-0"
            title="Reset Map to Fazilnagar Centre"
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
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-xl bg-slate-900/90 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 transition cursor-pointer shadow-md"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Verified Count Badge (Top Right) */}
        <div className="absolute top-4 right-4 z-20 hidden sm:flex items-center gap-2 bg-slate-900/90 border border-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{filteredLocations.length} Verified Locations Mapped</span>
        </div>

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
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
              {currentHighlight.description ||
                `Part of ${currentHighlight.block} Block, ${currentHighlight.district} district. Verified via Census of India.`}
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
    </div>
  );
}
