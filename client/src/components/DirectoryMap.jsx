import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { openGoogleMapsDirections } from "../utils/directions";
import { Compass, Maximize2, Minimize2, Lock } from "lucide-react";

export default function DirectoryMap({
  places = [],
  selectedPlace = null,
  onSelectPlace,
  isMapExpanded = false,
  onToggleExpand,
  isMapActive = false,
  onSetActive,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const placesRef = useRef(places);
  const selectedPlaceRef = useRef(selectedPlace);

  useEffect(() => {
    placesRef.current = places;
  }, [places]);

  useEffect(() => {
    selectedPlaceRef.current = selectedPlace;
  }, [selectedPlace]);

  const isSamePlace = (a, b) => {
    if (!a || !b) return false;
    const aId = a._id || a.id || a.slug;
    const bId = b._id || b.id || b.slug;
    if (aId && bId) return String(aId) === String(bId);
    return Boolean(a.name && b.name && a.name === b.name);
  };

  const createMarkerIcon = (isSelected) => {
    const color = isSelected ? "#2563EB" : "#C92F3D";
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

  const createClusterIcon = (count) => {
    const size = 32;
    const svgHtml = `
      <div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;background:#087F62;border:2.5px solid #FFFFFF;border-radius:50%;color:#FFFFFF;font-size:12px;font-weight:800;font-family:system-ui,sans-serif;box-shadow:0 3px 8px rgba(8,127,98,0.45);cursor:pointer;transition:transform 0.15s ease;">
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

  const createCenterMarkerIcon = () => {
    const size = 32;
    const height = 40;
    const svgHtml = `
      <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;filter:drop-shadow(0 3px 6px rgba(201,47,61,0.4));">
        <svg viewBox="0 0 24 24" width="${size}" height="${height}" fill="#C92F3D" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <polygon points="12,5.5 13.1,8.4 16.2,8.4 13.7,10.2 14.6,13.1 12,11.3 9.4,13.1 10.3,10.2 7.8,8.4 10.9,8.4" fill="#ffffff" stroke="none"/>
        </svg>
        <span style="background:#111A2E;color:#ffffff;font-size:9.5px;font-weight:700;padding:1.5px 6px;border-radius:4px;margin-top:-6px;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);letter-spacing:0.3px;border:1px solid rgba(255,255,255,0.25);">
          Fazilnagar Centre
        </span>
      </div>
    `;
    return L.divIcon({
      html: svgHtml,
      className: "fazilnagar-centre-marker",
      iconSize: [110, height + 18],
      iconAnchor: [55, height],
      popupAnchor: [0, -height],
    });
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
          <span style="font-size: 9px; font-weight: 800; color: #087F62; text-transform: uppercase; letter-spacing: 0.5px;">${place.category}</span>
          <span style="font-size: 8px; font-weight: 700; color: ${isVerified ? '#087F62' : '#B45309'}; background: ${isVerified ? '#E8F5E9' : '#FEF3C7'}; padding: 1px 5px; border-radius: 999px; border: 1px solid ${isVerified ? '#A7F3D0' : '#FDE68A'};">
            ${isVerified ? '✓ Verified' : '⚠ Needs Verification'}
          </span>
        </div>
        <h4 style="margin: 2px 0 3px; font-size: 13px; font-weight: 800; color: #111A2E; line-height: 1.2;">${place.name}</h4>
        <p style="margin: 0; font-size: 11px; color: #71819B; line-height: 1.3;">${place.streetOrLandmark || place.addressFull || place.locality}</p>
        <div style="display: flex; justify-content: space-between; font-size: 9px; color: #94A3B8; margin-top: 4px; padding-top: 3px; border-top: 1px dashed #E2E8F0;">
          <span>ID: ${recordId}</span>
          <span>${place.latitude}, ${place.longitude}</span>
        </div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #E3EAF1; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <button type="button" class="leaflet-popup-directions-btn" style="color: #087F62; background: none; border: none; padding: 0; font-weight: 700; font-size: 11px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;">
            <span>🧭 Directions</span>
          </button>
          ${place.phone ? `<a href="tel:${place.phone.replace(/\\s+/g, '')}" style="color: #111A2E; text-decoration: none; font-weight: 700; font-size: 11px;">📞 Call</a>` : ''}
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
      if (onSelectPlace) onSelectPlace(place);
    });

    if (isSelected) {
      setTimeout(() => {
        if (marker.openPopup) marker.openPopup();
      }, 150);
    }

    markersRef.current.push(marker);
  };

  const renderMapMarkers = (items) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => {
      map.removeLayer(m);
    });
    markersRef.current = [];

    // Prominent Fazilnagar Centre Marker
    const townLat = 26.6827;
    const townLng = 84.0498;
    const centerMarker = L.marker([townLat, townLng], {
      icon: createCenterMarkerIcon(),
      title: "Fazilnagar Centre (PIN 274401)",
      zIndexOffset: 500,
    }).addTo(map);

    centerMarker.bindPopup(`
      <div style="font-size: 12px; font-family: Inter, system-ui, sans-serif; padding: 2px;">
        <span style="font-size: 9px; font-weight: 800; color: #C92F3D; text-transform: uppercase;">Town Anchor</span>
        <h4 style="margin: 2px 0 2px; font-size: 13px; font-weight: 800; color: #111A2E;">Fazilnagar Centre</h4>
        <p style="margin: 0; font-size: 11px; color: #71819B;">PIN 274401 • NH-27 Corridor, Kushinagar, UP</p>
      </div>
    `);
    markersRef.current.push(centerMarker);

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

    if (currentZoom >= 16 || currSelected || itemsWithCoords.length <= 8) {
      itemsWithCoords.forEach((place) => {
        createSinglePlaceMarker(place);
      });
    } else {
      const clusters = [];
      const threshold = 0.0018;

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

  // Initialize Leaflet
  useEffect(() => {
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
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        zoomControl: false, // We render clean, custom styled controls
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      mapInstanceRef.current = map;

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
  }, [places]);

  // Clean up Leaflet on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map interaction state
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

  // Invalidate map size on expand/collapse
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [isMapExpanded]);

  // Recenter / zoom when selectedPlace changes
  useEffect(() => {
    if (selectedPlace && selectedPlace.latitude && selectedPlace.longitude && mapInstanceRef.current) {
      const lat = parseFloat(selectedPlace.latitude);
      const lng = parseFloat(selectedPlace.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
        renderMapMarkers(placesRef.current || places);
      }
    }
  }, [selectedPlace]);

  return (
    <div
      className={`w-full bg-[#F5F8FA] rounded-2xl sm:rounded-3xl overflow-hidden border border-[#E3EAF1] shadow-xs relative transition-all duration-300 group ${
        isMapExpanded ? "h-[440px] sm:h-[500px] lg:h-[580px]" : "h-[300px] sm:h-[380px] lg:h-[440px]"
      }`}
      onClick={() => {
        if (!isMapActive && onSetActive) onSetActive(true);
      }}
      onMouseLeave={() => {
        if (isMapActive && onSetActive) onSetActive(false);
      }}
    >
      <div
        ref={mapContainerRef}
        id="fazilnagar-leaflet-map"
        className="w-full h-full z-10"
        style={{ height: "100%", width: "100%", position: "relative" }}
      />

      {/* Top Left Info Badge */}
      <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-[#E3EAF1] text-[11px] font-semibold text-[#182338] shadow-2xs flex items-center gap-1.5 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-[#087F62] animate-pulse"></span>
        <span>Fazilnagar Map • PIN 274401</span>
      </div>

      {/* Map Control Buttons: Zoom In, Zoom Out, Centre, Expand */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
          }}
          className="w-8 h-8 rounded-lg bg-white/95 hover:bg-white text-[#182338] border border-[#E3EAF1] flex items-center justify-center font-bold text-base shadow-2xs transition cursor-pointer active:scale-95"
          title="Zoom in"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
          }}
          className="w-8 h-8 rounded-lg bg-white/95 hover:bg-white text-[#182338] border border-[#E3EAF1] flex items-center justify-center font-bold text-base shadow-2xs transition cursor-pointer active:scale-95"
          title="Zoom out"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView([26.6827, 84.0498], 15, { animate: true });
            }
          }}
          className="w-8 h-8 rounded-lg bg-white/95 hover:bg-white text-[#182338] border border-[#E3EAF1] flex items-center justify-center shadow-2xs transition cursor-pointer active:scale-95"
          title="Center on Fazilnagar"
          aria-label="Center on Fazilnagar"
        >
          <Compass className="w-4 h-4 text-[#087F62]" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleExpand) onToggleExpand();
          }}
          className="w-8 h-8 rounded-lg bg-white/95 hover:bg-white text-[#182338] border border-[#E3EAF1] flex items-center justify-center shadow-2xs transition cursor-pointer active:scale-95"
          title={isMapExpanded ? "Compact map" : "Expand map"}
          aria-label={isMapExpanded ? "Compact map" : "Expand map"}
        >
          {isMapExpanded ? (
            <Minimize2 className="w-4 h-4 text-slate-600" />
          ) : (
            <Maximize2 className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>

      {/* Interaction Mode Activator Overlay */}
      {!isMapActive && (
        <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center pointer-events-none">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onSetActive) onSetActive(true);
            }}
            className="pointer-events-auto bg-[#111A2E]/95 hover:bg-[#111A2E] text-white text-xs font-semibold px-3.5 py-1.5 rounded-full shadow-lg border border-slate-700/80 backdrop-blur-md flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tap map to interact</span>
          </button>
        </div>
      )}

      {/* Active Interaction Badge: Allows User to Lock Map & Resume Page Scrolling */}
      {isMapActive && (
        <div className="absolute bottom-3 right-3 z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onSetActive) onSetActive(false);
            }}
            className="bg-[#087F62] hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg border border-emerald-400 backdrop-blur-md flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
          >
            <Lock className="w-3 h-3" />
            <span>Lock map</span>
          </button>
        </div>
      )}
    </div>
  );
}
