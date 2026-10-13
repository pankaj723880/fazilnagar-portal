import { useState, useEffect, useRef } from "react";
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
  Fuel,
  Image as ImageIcon,
  Save,
  Navigation,
} from "lucide-react";

const CATEGORIES = [
  { id: "Schools & Colleges", name: "Schools & Colleges", icon: GraduationCap },
  { id: "Hospitals & Clinics", name: "Hospitals & Clinics", icon: Stethoscope },
  { id: "Petrol Pumps", name: "Petrol Pumps", icon: Fuel },
];

const LOCALITIES = [
  "Hospital Road",
  "College Road",
  "Highway Corridor",
  "Main Chowk",
  "Main Market",
  "Garahiya More",
  "Pawanagar Marg",
  "Block Road",
  "Town Center",
  "Block Outskirts",
];

const PRESETS = [
  { name: "Hospital Road (Near CHC & Hermitage)", lat: 26.6806, lng: 84.0470 },
  { name: "College Road (Inter & Degree College)", lat: 26.6878, lng: 84.0512 },
  { name: "Main Chowk (Town Center)", lat: 26.6828, lng: 84.0498 },
  { name: "Garahiya More (Block Road Junction)", lat: 26.6835, lng: 84.0458 },
  { name: "NH-27 Highway West (IOCL / Amawa)", lat: 26.6825, lng: 84.0440 },
  { name: "NH-27 Highway East (HP / Bankata)", lat: 26.6820, lng: 84.0555 },
];

export default function AdminPlaceEditModal({ isOpen, onClose, place, onSave, onDelete }) {
  const isEditMode = Boolean(place && (place.id || place._id));

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Schools & Colleges");
  const [subcategory, setSubcategory] = useState("");
  const [addressFull, setAddressFull] = useState("");
  const [locality, setLocality] = useState("College Road");
  const [streetOrLandmark, setStreetOrLandmark] = useState("");
  const [phone, setPhone] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState(26.6827);
  const [longitude, setLongitude] = useState(84.0498);
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Prepopulate form when place changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      setImageFile(null);
      if (place) {
        setName(place.name || "");
        setCategory(place.category || "Schools & Colleges");
        setSubcategory(place.subcategory || "");
        setAddressFull(place.addressFull || "");
        setLocality(place.locality || "College Road");
        setStreetOrLandmark(place.streetOrLandmark || "");
        setPhone(place.phone || "");
        setOpeningHours(place.openingHours || "");
        setDescription(place.description || "");
        setLatitude(place.latitude ? Number(place.latitude) : 26.6827);
        setLongitude(place.longitude ? Number(place.longitude) : 84.0498);
        setImageUrl(place.imageUrl || "");
        setImagePreview(place.imageUrl || "");
      } else {
        setName("");
        setCategory("Schools & Colleges");
        setSubcategory("");
        setAddressFull("");
        setLocality("College Road");
        setStreetOrLandmark("");
        setPhone("");
        setOpeningHours("");
        setDescription("");
        setLatitude(26.6827);
        setLongitude(84.0498);
        setImageUrl("");
        setImagePreview("");
      }
    }
  }, [isOpen, place]);

  // Leaflet map setup for interactive pin placement
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      const initLat = latitude && !isNaN(latitude) ? Number(latitude) : 26.6827;
      const initLng = longitude && !isNaN(longitude) ? Number(longitude) : 84.0498;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [initLat, initLng],
          zoom: 16,
          attributionControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        const customIcon = L.divIcon({
          className: "custom-leaflet-marker",
          html: `<div style="background:#0D5E49;color:#fff;padding:6px;border-radius:50%;box-shadow:0 0 10px rgba(0,0,0,0.5);border:2px solid #fff;display:flex;align-items:center;justify-content:center;width:32px;height:32px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        const marker = L.marker([initLat, initLng], {
          icon: customIcon,
          draggable: true,
        }).addTo(map);

        marker.on("dragend", (e) => {
          const pos = e.target.getLatLng();
          setLatitude(Number(pos.lat.toFixed(6)));
          setLongitude(Number(pos.lng.toFixed(6)));
        });

        map.on("click", (e) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setLatitude(Number(lat.toFixed(6)));
          setLongitude(Number(lng.toFixed(6)));
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([initLat, initLng], 16);
        if (markerRef.current) {
          markerRef.current.setLatLng([initLat, initLng]);
        }
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Sync marker position when numeric coordinates change
  const handleCoordChange = (newLat, newLng) => {
    setLatitude(newLat);
    setLongitude(newLng);
    if (mapInstanceRef.current && markerRef.current && !isNaN(newLat) && !isNaN(newLng)) {
      markerRef.current.setLatLng([newLat, newLng]);
      mapInstanceRef.current.panTo([newLat, newLng]);
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Please enter the establishment name.");
      return;
    }
    if (!addressFull.trim()) {
      setErrorMsg("Please enter the full address.");
      return;
    }

    try {
      setSaving(true);
      let finalImageUrl = imageUrl;

      // If user selected a new file, upload it first
      if (imageFile) {
        setIsUploading(true);
        const token = getAuthToken();
        const formData = new FormData();
        formData.append("primaryPhoto", imageFile);

        const uploadRes = await API.post("/submissions/upload-images", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (uploadRes.data?.primaryUrl) {
          finalImageUrl = uploadRes.data.primaryUrl;
          setImageUrl(finalImageUrl);
        }
      }

      const payload = {
        name: name.trim(),
        category,
        subcategory: subcategory.trim(),
        addressFull: addressFull.trim(),
        locality,
        streetOrLandmark: streetOrLandmark.trim(),
        phone: phone.trim(),
        openingHours: openingHours.trim(),
        description: description.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        imageUrl: finalImageUrl,
        isPublished: true,
        verificationStatus: "verified",
        townBoundaryStatus: "confirmed",
      };

      let resultPlace = null;
      if (isEditMode) {
        const placeId = place.id || place._id || place.slug;
        const res = await API.put(`/places/${placeId}`, payload);
        resultPlace = res.data?.place || { ...place, ...payload };
      } else {
        const res = await API.post("/places", payload);
        resultPlace = res.data?.place || payload;
      }

      if (onSave) onSave(resultPlace);
      onClose();
    } catch (err) {
      console.error("Save place error:", err);
      setErrorMsg(err.response?.data?.message || err.message || "Failed to save place.");
    } finally {
      setSaving(false);
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}" from the town directory?`)) {
      return;
    }

    try {
      setSaving(true);
      const placeId = place.id || place._id || place.slug;
      await API.delete(`/places/${placeId}`);
      if (onDelete) onDelete(placeId);
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to delete place.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-[#18232E] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0D5E49] flex items-center justify-center text-white">
              {isEditMode ? <Building className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">
                {isEditMode ? `Edit Place: ${place.name}` : "Add New Place to Directory"}
              </h2>
              <p className="text-[11px] text-slate-300">
                {isEditMode
                  ? "Update exact GPS coordinates, photos, contact & institution details"
                  : "Add verified School, Hospital, or Petrol Pump to Fazilnagar town directory"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Column: Place Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Establishment Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sanskar Central Academy, CHC Fazilnagar"
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0D5E49] bg-slate-50 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0D5E49] bg-slate-50 focus:bg-white transition font-medium"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Subcategory</label>
                  <input
                    type="text"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="e.g. CBSE Senior Secondary, ICU Hospital"
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0D5E49] bg-slate-50 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Full Address *</label>
                <input
                  type="text"
                  required
                  value={addressFull}
                  onChange={(e) => setAddressFull(e.target.value)}
                  placeholder="e.g. Hospital Road, Near Sarkari Hospital, Fazilnagar - 274401"
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0D5E49] bg-slate-50 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Town Locality</label>
                  <select
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0D5E49] bg-slate-50 focus:bg-white transition"
                  >
                    {LOCALITIES.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Street / Landmark</label>
                  <input
                    type="text"
                    value={streetOrLandmark}
                    onChange={(e) => setStreetOrLandmark(e.target.value)}
                    placeholder="e.g. Near Durga Bhawan, NH-27"
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0D5E49] bg-slate-50 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 94520 89540"
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0D5E49] bg-slate-50 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Opening Hours</label>
                  <input
                    type="text"
                    value={openingHours}
                    onChange={(e) => setOpeningHours(e.target.value)}
                    placeholder="e.g. 24/7 Open or 08:00 AM – 02:30 PM"
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0D5E49] bg-slate-50 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Description / Services</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key facilities, streams, departments, or amenities offered..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0D5E49] bg-slate-50 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Right Column: Location Map & Photos */}
            <div className="space-y-4">
              {/* Interactive Location Picker */}
              <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <MapPin className="w-3.5 h-3.5 text-[#0D5E49]" />
                    <span>Exact Map Location (Click or Drag Pin)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          handleCoordChange(
                            Number(pos.coords.latitude.toFixed(6)),
                            Number(pos.coords.longitude.toFixed(6))
                          );
                        });
                      }
                    }}
                    className="text-[10px] font-semibold text-[#0D5E49] hover:underline flex items-center gap-1"
                  >
                    <Compass className="w-3 h-3" /> GPS Here
                  </button>
                </div>

                {/* Map viewport */}
                <div
                  ref={mapContainerRef}
                  className="w-full h-44 rounded-xl border border-slate-300 overflow-hidden shadow-inner bg-slate-100"
                />

                {/* Coordinates manual inputs */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={latitude}
                      onChange={(e) => handleCoordChange(parseFloat(e.target.value) || 0, longitude)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={longitude}
                      onChange={(e) => handleCoordChange(latitude, parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 font-mono bg-white"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="pt-1">
                  <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                    Quick Landmark Presets:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => handleCoordChange(p.lat, p.lng)}
                        className="text-[10px] bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 px-2 py-0.5 rounded-md transition"
                      >
                        {p.name.split(" ")[0]} ({p.lat}, {p.lng})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Photo & Image Section */}
              <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/70 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <ImageIcon className="w-3.5 h-3.5 text-[#0D5E49]" />
                  <span>Establishment Photo & Image</span>
                </div>

                <div className="flex items-center gap-3">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-20 h-20 rounded-xl object-cover border border-slate-300 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-200 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-6 h-6 mb-1 opacity-60" />
                      <span className="text-[9px]">No Photo</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                        Upload Image File
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-[#0D5E49] file:text-white hover:file:bg-emerald-800 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                        Or Image URL
                      </label>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => {
                          setImageUrl(e.target.value);
                          setImagePreview(e.target.value);
                        }}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            {isEditMode ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-bold px-3 py-2 rounded-xl hover:bg-red-50 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Place</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-5 py-2.5 rounded-xl bg-[#0D5E49] hover:bg-emerald-800 text-white shadow-md hover:shadow-lg transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? (isUploading ? "Uploading..." : "Saving...") : isEditMode ? "Save Changes" : "Add Place"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
