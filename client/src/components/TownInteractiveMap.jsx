import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { openGoogleMapsDirections } from "../utils/directions";

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

  // Initialize Leaflet Map
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
        scrollWheelZoom: true,
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

  // Update markers when places or filter changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((m) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(m);
      }
    });
    markersRef.current = [];

    let filtered = places;
    if (mapFilter !== "all" && matchesCategory) {
      filtered = places.filter((p) =>
        matchesCategory(p.category, p.subcategory, mapFilter)
      );
    }

    const createTownMarkerIcon = (placeName) => {
      const svgHtml = `
        <div role="img" aria-label="${placeName || "Town place pin"}" style="display:flex;align-items:center;justify-content:center;width:28px;height:36px;cursor:pointer;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          <svg viewBox="0 0 24 24" width="28" height="36" fill="#B8323C" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.8" fill="#ffffff" />
          </svg>
        </div>
      `;
      return L.divIcon({
        html: svgHtml,
        className: "townportal-custom-pin",
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -34],
      });
    };

    filtered.forEach((place) => {
      if (!place.lat || !place.lng) return;
      const marker = L.marker([place.lat, place.lng], {
        icon: createTownMarkerIcon(place.name),
        title: place.name,
        alt: `${place.name} map pin`,
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
          <p style="margin: 0; font-size: 11px; color: #647180;">${place.landmark || place.address}</p>
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

      markersRef.current.push(marker);
    });
  }, [places, mapFilter, matchesCategory, onSelectPlace]);

  // Handle selected place flyTo
  useEffect(() => {
    if (selectedPlace && mapInstanceRef.current && selectedPlace.lat && selectedPlace.lng) {
      mapInstanceRef.current.flyTo([selectedPlace.lat, selectedPlace.lng], 16, {
        duration: 1.2,
      });
    }
  }, [selectedPlace]);

  return <div ref={mapContainerRef} className="w-full h-full min-h-[290px] z-10" />;
}
