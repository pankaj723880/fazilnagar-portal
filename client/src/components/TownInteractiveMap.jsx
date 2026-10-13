import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { openGoogleMapsDirections } from "../utils/directions";
import { Compass, Lock } from "lucide-react";

export default function TownInteractiveMap({
  places = [],
  mapFilter = "all",
  selectedPlace = null,
  onSelectPlace,
  matchesCategory,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [isMapActive, setIsMapActive] = useState(false);

  // Helper to create vector SVG map pin icon (Standard Red vs Active Highlight Blue)
  const createTownMarkerIcon = (placeName, isSelected = false) => {
    const color = isSelected ? "#2563EB" : "#B8323C";
    const size = isSelected ? 34 : 28;
    const height = isSelected ? 44 : 36;
    const strokeWidth = isSelected ? 2.2 : 1.8;
    const shadow = isSelected ? "0 4px 10px rgba(37,99,235,0.5)" : "0 2px 4px rgba(0,0,0,0.3)";

    const svgHtml = `
      <div role="img" aria-label="${placeName || "Town place pin"}" style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${height}px;cursor:pointer;filter:drop-shadow(${shadow});transition:transform 0.2s;">
        <svg viewBox="0 0 24 24" width="${size}" height="${height}" fill="${color}" stroke="#ffffff" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="${isSelected ? 3.2 : 2.8}" fill="#ffffff" />
        </svg>
      </div>
    `;
    return L.divIcon({
      html: svgHtml,
      className: isSelected ? "townportal-custom-pin-selected" : "townportal-custom-pin",
      iconSize: [size, height],
      iconAnchor: [size / 2, height],
      popupAnchor: [0, -height + 2],
    });
  };

  // Initialize Leaflet Map (Locked by default on both desktop and mobile to prevent scroll capture)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapContainerRef.current._leaflet_id && !mapInstanceRef.current) {
      delete mapContainerRef.current._leaflet_id;
    }

    if (!mapInstanceRef.current) {
      const townCenterLat = 26.6827;
      const townCenterLng = 84.0498;

      const map = L.map(mapContainerRef.current, {
        center: [townCenterLat, townCenterLng],
        zoom: 15,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map interaction state: lock scroll until user actively interacts
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

  // Update markers when places or filter changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(({ marker }) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(marker);
      }
    });
    markersRef.current = [];

    let filtered = places;
    if (mapFilter !== "all" && matchesCategory) {
      filtered = places.filter((p) =>
        matchesCategory(p.category, p.subcategory, mapFilter)
      );
    }

    filtered.forEach((place) => {
      const lat = place.lat || place.latitude;
      const lng = place.lng || place.longitude;
      if (!lat || !lng) return;

      const isSelected = selectedPlace && (
        (selectedPlace.id && selectedPlace.id === (place.id || place._id)) ||
        (selectedPlace._id && selectedPlace._id === (place._id || place.id)) ||
        selectedPlace.name === place.name
      );

      const marker = L.marker([lat, lng], {
        icon: createTownMarkerIcon(place.name, isSelected),
        title: place.name,
        alt: `${place.name} map pin`,
        zIndexOffset: isSelected ? 1000 : 0,
      }).addTo(mapInstanceRef.current);

      marker.on("add", () => {
        const el = marker.getElement();
        if (el) {
          el.setAttribute("aria-label", place.name);
          el.setAttribute("title", place.name);
        }
      });

      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; font-size: 12px; min-width: 200px; color: #18232E; padding: 2px;">
          <span style="font-size: 9px; font-weight: 800; color: #B8323C; text-transform: uppercase; letter-spacing: 0.5px;">${place.category}</span>
          <h3 style="margin: 2px 0 4px; font-size: 13px; font-weight: 700; color: #18232E;">${place.name}</h3>
          <p style="margin: 0; font-size: 11px; color: #647180;">${place.landmark || place.address || ""}</p>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #E1E6EA; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <button type="button" class="townportal-popup-directions-btn" style="color: #0D5E49; background: none; border: none; padding: 0; font-weight: 700; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;">
              <span>🧭 Live Directions</span>
            </button>
            ${place.phone ? `<a href="tel:${place.phone.replace(/\\s+/g, '')}" style="color: #18232E; text-decoration: none; font-weight: 700; font-size: 11px;">📞 Call</a>` : ''}
          </div>
        </div>
      `);

      marker.on("popupopen", (e) => {
        const btn = e.popup.getElement()?.querySelector(".townportal-popup-directions-btn");
        if (btn) {
          btn.onclick = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            openGoogleMapsDirections(place);
          };
        }
      });

      marker.on("click", () => {
        if (onSelectPlace) onSelectPlace(place);
      });

      markersRef.current.push({ marker, place });
    });
  }, [places, mapFilter, matchesCategory, onSelectPlace]);

  // Handle instant little zoom, focus, pin color change, and popup open when selectedPlace changes
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedPlace) return;

    const lat = parseFloat(selectedPlace.lat || selectedPlace.latitude);
    const lng = parseFloat(selectedPlace.lng || selectedPlace.longitude);

    if (!isNaN(lat) && !isNaN(lng)) {
      // Instant little zoom to 17 and focus on pinned location
      mapInstanceRef.current.setView([lat, lng], 17, { animate: true });

      // Update pins: Highlight the selected pin in Electric Blue, reset all others to Red
      markersRef.current.forEach(({ marker, place }) => {
        const isMatch =
          (selectedPlace.id && selectedPlace.id === (place.id || place._id)) ||
          (selectedPlace._id && selectedPlace._id === (place._id || place.id)) ||
          selectedPlace.name === place.name;

        marker.setIcon(createTownMarkerIcon(place.name, isMatch));
        if (isMatch) {
          marker.setZIndexOffset(1000);
          marker.openPopup();
        } else {
          marker.setZIndexOffset(0);
        }
      });
    }
  }, [selectedPlace]);

  return (
    <div
      className="relative w-full h-full min-h-[290px] overflow-hidden rounded-2xl group"
      onClick={() => {
        if (!isMapActive) setIsMapActive(true);
      }}
      onMouseLeave={() => {
        // Disengage scroll wheel when mouse leaves map container to allow seamless page scrolling
        if (isMapActive) setIsMapActive(false);
      }}
    >
      <div ref={mapContainerRef} className="w-full h-full min-h-[290px] z-10" />

      {/* Interaction Mode Activator Overlay (Prevents wheel capturing page scroll until clicked) */}
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

      {/* Active Interaction Badge: Allows User to Lock Map & Resume Normal Page Scrolling */}
      {isMapActive && (
        <div className="absolute top-3 right-3 z-20">
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
  );
}
