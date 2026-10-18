import { useState, useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import {
  X,
  MapPin,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Phone,
  Clock,
  Globe,
  Trash2,
  Building,
  GraduationCap,
  Stethoscope,
  ExternalLink,
  Save,
  Navigation,
  Search,
  Check,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

const CATEGORIES = [
  { id: "village", name: "Village / गांव", type: "village" },
  { id: "town", name: "Town / कस्बा", type: "town" },
  { id: "city", name: "City / शहर", type: "city" },
  { id: "landmark", name: "Landmark / लैंडमार्क", type: "landmark" },
  { id: "locality", name: "Locality / मोहल्ला", type: "locality" },
  { id: "Schools & Colleges", name: "Schools & Colleges / शिक्षा", type: "place" },
  { id: "Hospitals & Clinics", name: "Hospitals & Clinics / चिकित्सा", type: "place" },
  { id: "Commercial & Business", name: "Commercial & Business / व्यापार", type: "place" },
  { id: "other", name: "Other / अन्य", type: "other" },
];

const LOCALITIES = [
  "Fazilnagar Town",
  "Hospital Road",
  "College Road",
  "Highway Corridor (NH-27)",
  "Main Chowk",
  "Main Market",
  "Garahiya More",
  "Pawanagar Marg",
  "Block Road",
  "Town Center",
  "Fazilnagar Block Outskirts",
  "Tamkuhi Raj Tehsil",
  "Kasya Tehsil",
  "Kushinagar District",
];

const DEFAULT_MAP_CENTER = { lat: 26.6827, lng: 84.0498 };

function parseCoordinate(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export default function AdminPlaceEditModal({
  isOpen,
  onClose,
  place,
  onSave,
  onDelete,
  allEntities = [],
}) {
  const isEditMode = Boolean(place && (place.id || place._id));

  const [name, setName] = useState("");
  const [hindiName, setHindiName] = useState("");
  const [category, setCategory] = useState("village");
  const [entityType, setEntityType] = useState("village");
  const [subcategory, setSubcategory] = useState("");
  const [addressFull, setAddressFull] = useState("");
  const [locality, setLocality] = useState("Fazilnagar Town");
  const [district, setDistrict] = useState("Kushinagar");
  const [state, setState] = useState("Uttar Pradesh");
  const [country, setCountry] = useState("India");
  const [streetOrLandmark, setStreetOrLandmark] = useState("");
  const [phone, setPhone] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("verified");
  const [coordinateSource, setCoordinateSource] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Prepopulate form when place changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      setImageFile(null);
      setHasUnsavedChanges(false);

      if (place) {
        setName(place.name || "");
        setHindiName(place.hindiName || "");
        setCategory(place.category || place.type || "village");
        setEntityType(place.entityType || place.type || "village");
        setSubcategory(place.subcategory || "");
        setAddressFull(place.addressFull || "");
        setLocality(place.locality || "Fazilnagar Town");
        setDistrict(place.district || "Kushinagar");
        setState(place.state || "Uttar Pradesh");
        setCountry(place.country || "India");
        setStreetOrLandmark(place.streetOrLandmark || "");
        setPhone(place.phone || "");
        setOpeningHours(place.openingHours || "");
        setDescription(place.description || "");
        setVerificationStatus(place.verificationStatus || "verified");
        setCoordinateSource(place.coordinateSource || place.source || "");
        setLatitude(parseCoordinate(place.latitude ?? place.lat) ?? "");
        setLongitude(parseCoordinate(place.longitude ?? place.lng) ?? "");
        setImageUrl(place.imageUrl || place.image || "");
        setImagePreview(place.imageUrl || place.image || "");
      } else {
        setName("");
        setHindiName("");
        setCategory("village");
        setEntityType("village");
        setSubcategory("");
        setAddressFull("");
        setLocality("Fazilnagar Town");
        setDistrict("Kushinagar");
        setState("Uttar Pradesh");
        setCountry("India");
        setStreetOrLandmark("");
        setPhone("");
        setOpeningHours("");
        setDescription("");
        setVerificationStatus("verified");
        setCoordinateSource("Admin Map Management");
        setLatitude(DEFAULT_MAP_CENTER.lat);
        setLongitude(DEFAULT_MAP_CENTER.lng);
        setImageUrl("");
        setImagePreview("");
      }
    }
  }, [isOpen, place]);

  // Leaflet map setup for interactive pin placement & dragging
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      const initLat = parseCoordinate(latitude) ?? DEFAULT_MAP_CENTER.lat;
      const initLng = parseCoordinate(longitude) ?? DEFAULT_MAP_CENTER.lng;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [initLat, initLng],
          zoom: 14,
          attributionControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        const customIcon = L.divIcon({
          className: "custom-leaflet-marker",
          html: `<div style="background:#B8323C;color:#fff;padding:6px;border-radius:50%;box-shadow:0 0 10px rgba(0,0,0,0.5);border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;width:34px;height:34px;cursor:grab;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 34],
        });

        const marker = L.marker([initLat, initLng], {
          icon: customIcon,
          draggable: true,
          title: "Drag to adjust entity coordinates",
        }).addTo(map);

        marker.on("dragend", (e) => {
          const pos = e.target.getLatLng();
          setLatitude(Number(pos.lat.toFixed(6)));
          setLongitude(Number(pos.lng.toFixed(6)));
          setHasUnsavedChanges(true);
        });

        map.on("click", (e) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setLatitude(Number(lat.toFixed(6)));
          setLongitude(Number(lng.toFixed(6)));
          setHasUnsavedChanges(true);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([initLat, initLng], 14);
        if (markerRef.current) {
          markerRef.current.setLatLng([initLat, initLng]);
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen]);

  // Synchronize map marker when manual lat/lng inputs change
  useEffect(() => {
    const latNum = parseCoordinate(latitude);
    const lngNum = parseCoordinate(longitude);

    if (
      latNum !== null &&
      lngNum !== null &&
      markerRef.current &&
      mapInstanceRef.current &&
      latNum >= -90 &&
      latNum <= 90 &&
      lngNum >= -180 &&
      lngNum <= 180
    ) {
      markerRef.current.setLatLng([latNum, lngNum]);
      mapInstanceRef.current.panTo([latNum, lngNum], { animate: true });
    }
  }, [latitude, longitude]);

  // Duplicate name check against allEntities
  const duplicateEntity = useMemo(() => {
    if (!name.trim()) return null;
    const clean = name.trim().toLowerCase();
    const currentId = place?.id || place?._id;
    return allEntities.find((e) => {
      const eId = e.id || e._id;
      if (currentId && String(eId) === String(currentId)) return false;
      return e.name?.toLowerCase().trim() === clean;
    });
  }, [name, place, allEntities]);

  // Coordinate Validation
  const latNum = parseCoordinate(latitude);
  const lngNum = parseCoordinate(longitude);
  const isValidCoordinates =
    latNum !== null &&
    lngNum !== null &&
    latNum >= -90 &&
    latNum <= 90 &&
    lngNum >= -180 &&
    lngNum <= 180;

  // Google Maps preview link
  const googleMapsUrl = isValidCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${latNum}%2C${lngNum}`
    : "";

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("Image size exceeds 5MB limit.");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setHasUnsavedChanges(true);
    }
  };

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    setCategory(val);
    const matched = CATEGORIES.find((c) => c.id === val);
    if (matched) {
      setEntityType(matched.type);
    }
    setHasUnsavedChanges(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Entity name is required.");
      return;
    }

    if (!isValidCoordinates) {
      setErrorMsg("Latitude must be between -90 and 90, and longitude between -180 and 180.");
      return;
    }

    setSaving(true);

    try {
      let finalImageUrl = imageUrl;

      // Handle image upload if user selected a new file
      if (imageFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("image", imageFile);

        const uploadRes = await API.post("/places/upload-image", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${getAuthToken()}`,
          },
        });

        const uploadedUrl =
          uploadRes.data?.imageUrl ||
          uploadRes.data?.primaryImage ||
          uploadRes.data?.url ||
          (Array.isArray(uploadRes.data?.images) && uploadRes.data.images[0]);

        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
          setImageUrl(finalImageUrl);
        }
      }

      const payload = {
        name: name.trim(),
        hindiName: hindiName.trim(),
        category,
        entityType,
        subcategory: subcategory.trim(),
        addressFull: addressFull.trim() || `${name.trim()}, ${locality}, ${district}, ${state}`,
        locality: locality.trim(),
        district: district.trim(),
        state: state.trim(),
        country: country.trim(),
        streetOrLandmark: streetOrLandmark.trim(),
        phone: phone.trim(),
        openingHours: openingHours.trim(),
        description: description.trim(),
        latitude: latNum,
        longitude: lngNum,
        verificationStatus,
        coordinateSource: coordinateSource.trim() || "Admin Verified",
        imageUrl: finalImageUrl,
        isPublished: true,
        townBoundaryStatus: "confirmed",
        force: true, // Allow save even if warning was displayed
      };

      let resultPlace = null;
      if (isEditMode) {
        const placeId = place._id || place.id || place.slug;
        const res = await API.put(`/places/${placeId}`, payload, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        });
        resultPlace = res.data?.place || { ...place, ...payload };
      } else {
        const res = await API.post("/places", payload, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        });
        resultPlace = res.data?.place || payload;
      }

      setHasUnsavedChanges(false);

      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem("fazilnagar_cached_places");
          sessionStorage.removeItem("fazilnagar_cached_places_stats");
          localStorage.setItem("fazilnagar_last_place_update", String(Date.now()));
        } catch (_) {}
        window.dispatchEvent(
          new CustomEvent("fazilnagar-place-updated", { detail: { place: resultPlace } })
        );
      }

      if (onSave) onSave(resultPlace);
      onClose();
    } catch (err) {
      console.error("Save entity error:", err);
      setErrorMsg(err.response?.data?.message || err.message || "Failed to save map entity.");
    } finally {
      setSaving(false);
      setIsUploading(false);
    }
  };

  const handleSafeClose = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to discard them?")) {
        return;
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-[#18232E] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#B8323C] flex items-center justify-center text-white">
              {isEditMode ? <Building className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold leading-tight">
                  {isEditMode ? `Edit Entity: ${place.name}` : "Create New Map Entity"}
                </h2>
                {hasUnsavedChanges && (
                  <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded">
                    Unsaved Changes
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">
                {isEditMode
                  ? "Update exact GPS coordinates, local Hindi name, and category details"
                  : "Add village, locality, town, city, landmark, or establishment to Fazilnagar map"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSafeClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-50 border-b border-red-200 px-5 py-2.5 flex items-center gap-2 text-xs font-semibold text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Duplicate Warning Alert */}
        {duplicateEntity && !isEditMode && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 flex items-center justify-between text-xs text-amber-800">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                <strong>Notice:</strong> An entity named "<strong>{duplicateEntity.name}</strong>" already exists in {duplicateEntity.category} ({duplicateEntity.locality}).
              </span>
            </div>
            <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-mono">
              ID: {duplicateEntity.id || duplicateEntity._id}
            </span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column: Entity Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Entity Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g. Lavkush Purab Patti, Kasya, CHC Fazilnagar"
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#B8323C] bg-slate-50 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Hindi / Local Language Name (वैकल्पिक स्थानीय नाम)
                </label>
                <input
                  type="text"
                  value={hindiName}
                  onChange={(e) => {
                    setHindiName(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="उदा. लवकुश पूरब पट्टी, करमैनी"
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#B8323C] bg-slate-50 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Category / Type *</label>
                  <select
                    value={category}
                    onChange={handleCategoryChange}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#B8323C] bg-slate-50 focus:bg-white transition font-medium"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Verification Status</label>
                  <select
                    value={verificationStatus}
                    onChange={(e) => {
                      setVerificationStatus(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#B8323C] bg-slate-50 focus:bg-white transition font-medium"
                  >
                    <option value="verified">✓ Verified Settlement</option>
                    <option value="needs_verification">⚠️ Needs Field Review</option>
                    <option value="unverified">⚪ Unverified Candidate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Coordinate Source / Reference
                </label>
                <input
                  type="text"
                  value={coordinateSource}
                  onChange={(e) => {
                    setCoordinateSource(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g. Census of India 2011 / LGD Code 189499"
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#B8323C] bg-slate-50 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Locality / Block</label>
                  <input
                    type="text"
                    value={locality}
                    onChange={(e) => {
                      setLocality(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g. Fazilnagar, Tamkuhi Raj"
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#B8323C] bg-slate-50 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">District & State</label>
                  <input
                    type="text"
                    value={`${district}, ${state}`}
                    onChange={(e) => {
                      const parts = e.target.value.split(",");
                      setDistrict(parts[0]?.trim() || "Kushinagar");
                      setState(parts[1]?.trim() || "Uttar Pradesh");
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Kushinagar, Uttar Pradesh"
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#B8323C] bg-slate-50 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Full Address / Location Description</label>
                <input
                  type="text"
                  value={addressFull}
                  onChange={(e) => {
                    setAddressFull(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g. Lavkush Purab Patti, Fazilnagar Block, Kushinagar, UP"
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#B8323C] bg-slate-50 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Enter details, landmarks, historical significance, or demographic information..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#B8323C] bg-slate-50 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Right Column: Interactive Map & Coordinates */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Geographical Coordinates (Lat / Lng) *
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Click map or drag pin to set
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 block mb-0.5">Latitude (-90 to 90)</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={latitude}
                      onChange={(e) => {
                        setLatitude(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="e.g. 26.7095"
                      className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#B8323C] bg-slate-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 block mb-0.5">Longitude (-180 to 180)</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={longitude}
                      onChange={(e) => {
                        setLongitude(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="e.g. 84.0507"
                      className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#B8323C] bg-slate-50 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Interactive Leaflet Mini-Map */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100">
                <div
                  ref={mapContainerRef}
                  className="h-56 w-full z-0"
                  style={{ minHeight: "220px" }}
                />

                <div className="absolute top-2 left-2 z-10 bg-slate-900/90 text-white text-[10px] px-2.5 py-1 rounded-lg backdrop-blur-xs font-semibold flex items-center gap-1.5 shadow-md">
                  <MapPin className="w-3 h-3 text-[#B8323C]" />
                  <span>Click to Reposition / Drag Pin</span>
                </div>

                {isValidCoordinates && (
                  <div className="absolute bottom-2 right-2 z-10">
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-white/95 hover:bg-white text-slate-800 text-[10px] font-bold px-2 py-1 rounded-lg shadow-md border border-slate-200 transition"
                      title="Open destination directly in Google Maps"
                    >
                      <span>Google Maps Preview</span>
                      <ExternalLink className="w-3 h-3 text-[#B8323C]" />
                    </a>
                  </div>
                )}
              </div>

              {/* Location Verification & Destination Confirmation */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Destination Status:</span>
                  <span className={`font-bold flex items-center gap-1 ${isValidCoordinates ? 'text-emerald-700' : 'text-red-600'}`}>
                    {isValidCoordinates ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Valid GPS Coordinates</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Coordinates Required (-90..90, -180..180)</span>
                      </>
                    )}
                  </span>
                </div>

                {isValidCoordinates && (
                  <div className="font-mono text-[11px] text-slate-500 truncate">
                    Google Maps Link: <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{googleMapsUrl}</a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <div>
              {isEditMode && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(place)}
                  disabled={saving || place.id === "fazilnagar-hub"}
                  className="px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Delete Entity
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleSafeClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || isUploading || !name.trim() || !isValidCoordinates}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold text-white bg-[#B8323C] hover:bg-red-700 active:bg-red-800 rounded-xl transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isEditMode ? "Save Changes" : "Create Entity"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
