import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import {
  FAZILNAGAR_AREAS,
  COMMUNITY_ALLOWED_CATEGORIES,
  REVIEW_FLAG_AREAS,
  isWithinTownBoundary,
} from "../constants/areas";
import { addTrackedSubmission } from "../utils/notificationService";
import {
  X,
  MapPin,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Search,
  Phone,
  Store,
  Clock,
  Globe,
  Camera,
  Trash2,
  ShieldCheck,
  Info,
  Check,
} from "lucide-react";

export default function CommunityPlaceModal({ isOpen, onClose, onSuccess }) {
  const navigate = useNavigate();
  // Wizard steps: 1 = Basic Info, 2 = Map Pinning, 3 = Photos, 4 = Consent & Submit
  const [currentStep, setCurrentStep] = useState(1);

  // Form Fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [locality, setLocality] = useState("");
  const [addressFull, setAddressFull] = useState("");
  const [streetOrLandmark, setStreetOrLandmark] = useState("");
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [services, setServices] = useState("");

  // Map Coordinates & Pin
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [pinConfirmed, setPinConfirmed] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [geoSearchQuery, setGeoSearchQuery] = useState("");
  const [isGeoSearching, setIsGeoSearching] = useState(false);
  const [geoSearchResults, setGeoSearchResults] = useState([]);

  // Photos State
  const [primaryFile, setPrimaryFile] = useState(null);
  const [primaryPreview, setPrimaryPreview] = useState("");
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Consent
  const [consentAccuracy, setConsentAccuracy] = useState(false);
  const [consentAuthorized, setConsentAuthorized] = useState(false);
  const [consentPublicDisplay, setConsentPublicDisplay] = useState(false);
  const [consentReviewNotice, setConsentReviewNotice] = useState(false);

  // Submission Status
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [submittedData, setSubmittedData] = useState(null);

  // Leaflet references
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Default Town Center coordinates
  const DEFAULT_LAT = 26.6827;
  const DEFAULT_LNG = 84.0498;

  // Reset modal state when closed
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setName("");
      setCategory("");
      setLocality("");
      setAddressFull("");
      setStreetOrLandmark("");
      setDescription("");
      setOwnerName("");
      setPhone("");
      setAlternatePhone("");
      setWhatsapp("");
      setWebsite("");
      setOpeningHours("");
      setServices("");
      setLatitude(null);
      setLongitude(null);
      setPinConfirmed(false);
      setPrimaryFile(null);
      setPrimaryPreview("");
      setGalleryFiles([]);
      setGalleryPreviews([]);
      setConsentAccuracy(false);
      setConsentAuthorized(false);
      setConsentPublicDisplay(false);
      setConsentReviewNotice(false);
      setSubmitError("");
      setDuplicateWarning(null);
      setSubmittedData(null);
      setUploadProgress(0);
    }
  }, [isOpen]);

  // Marker icon builder
  const createDraggableIcon = () => {
    const svgHtml = `
      <div style="display:flex;align-items:center;justify-content:center;width:38px;height:48px;cursor:grab;filter:drop-shadow(0 4px 10px rgba(184,50,60,0.5));">
        <svg viewBox="0 0 24 24" width="38" height="48" fill="#B8323C" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="3.5" fill="#ffffff" />
        </svg>
      </div>
    `;
    return L.divIcon({
      html: svgHtml,
      className: "fazilnagar-draggable-marker",
      iconSize: [38, 48],
      iconAnchor: [19, 48],
      popupAnchor: [0, -48],
    });
  };

  // Initialize Leaflet Map when step 2 is active
  useEffect(() => {
    if (!isOpen || currentStep !== 2) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (mapContainerRef.current._leaflet_id && !mapInstanceRef.current) {
        delete mapContainerRef.current._leaflet_id;
      }

      const initialLat = latitude || DEFAULT_LAT;
      const initialLng = longitude || DEFAULT_LNG;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: 16,
          dragging: true,
          touchZoom: true,
          scrollWheelZoom: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        mapInstanceRef.current = map;

        // If coordinates already exist, place marker
        if (latitude && longitude) {
          placeOrMoveMarker(latitude, longitude, map);
        }

        // Click to place / relocate pin
        map.on("click", (e) => {
          const { lat, lng } = e.latlng;
          const numLat = parseFloat(lat.toFixed(6));
          const numLng = parseFloat(lng.toFixed(6));
          setLatitude(numLat);
          setLongitude(numLng);
          setPinConfirmed(true);
          placeOrMoveMarker(numLat, numLng, map);
        });
      } else {
        mapInstanceRef.current.invalidateSize();
        if (latitude && longitude) {
          placeOrMoveMarker(latitude, longitude, mapInstanceRef.current);
          mapInstanceRef.current.setView([latitude, longitude], 17);
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen, currentStep]);

  const placeOrMoveMarker = (lat, lng, mapInstance = mapInstanceRef.current) => {
    if (!mapInstance) return;

    if (!markerRef.current) {
      const marker = L.marker([lat, lng], {
        icon: createDraggableIcon(),
        draggable: true,
        autoPan: true,
      }).addTo(mapInstance);

      marker.on("dragend", (event) => {
        const position = event.target.getLatLng();
        const numLat = parseFloat(position.lat.toFixed(6));
        const numLng = parseFloat(position.lng.toFixed(6));
        setLatitude(numLat);
        setLongitude(numLng);
        setPinConfirmed(true);
      });

      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;font-size:12px;font-weight:700;color:#18232E;">
          📍 Selected Place Entrance<br/>
          <span style="font-size:10px;color:#647180;font-weight:500;">Drag marker to adjust exact entrance</span>
        </div>
      `).openPopup();

      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.openPopup();
    }
  };

  // Browser Geolocation: "Use My Current Location"
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingUser(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setPinConfirmed(true);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 17);
          placeOrMoveMarker(lat, lng, mapInstanceRef.current);
        }
      },
      (err) => {
        setIsLocatingUser(false);
        alert(`Location permission denied or unavailable: ${err.message}. Please click directly on the map to set your pin.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // OpenStreetMap Nominatim search around Fazilnagar
  const handleGeocodingSearch = async (e) => {
    if (e) e.preventDefault();
    if (!geoSearchQuery.trim()) return;

    setIsGeoSearching(true);
    setGeoSearchResults([]);
    try {
      const query = `${geoSearchQuery.trim()}, Fazilnagar, Kushinagar, Uttar Pradesh`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=84.02,26.72,84.09,26.65&bounded=0&limit=5`;
      const res = await fetch(url, { headers: { "Accept-Language": "en,hi" } });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setGeoSearchResults(data);
      } else {
        alert("No exact matches found for that landmark. Please click on the map near your location.");
      }
    } catch (err) {
      console.warn("Geocoding search failed:", err);
    } finally {
      setIsGeoSearching(false);
    }
  };

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(parseFloat(result.lat).toFixed(6));
    const lng = parseFloat(parseFloat(result.lon).toFixed(6));
    setLatitude(lat);
    setLongitude(lng);
    setPinConfirmed(true);
    setGeoSearchResults([]);
    setGeoSearchQuery(result.display_name.split(",")[0]);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 17);
      placeOrMoveMarker(lat, lng, mapInstanceRef.current);
    }
  };

  // Primary image selection & compression preview
  const handlePrimaryImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      alert("Invalid file format. Please upload a JPEG, PNG, or WebP photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image exceeds 5MB limit. Please select a smaller photo or compress it.");
      return;
    }

    setPrimaryFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPrimaryPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Gallery images selection (up to 4)
  const handleGalleryImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const validFiles = [];
    const newPreviews = [];

    for (const f of files) {
      if (!allowed.includes(f.type)) {
        alert(`File ${f.name} skipped: Only JPEG, PNG, and WebP are allowed.`);
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        alert(`File ${f.name} skipped: Exceeds 5MB limit.`);
        continue;
      }
      if (galleryFiles.length + validFiles.length >= 4) {
        alert("Maximum 4 additional gallery photos allowed.");
        break;
      }
      validFiles.push(f);
      newPreviews.push(URL.createObjectURL(f));
    }

    setGalleryFiles((prev) => [...prev, ...validFiles]);
    setGalleryPreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveGalleryImage = (index) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Form Validation per step
  const canProceedStep1 = () => {
    const cleanPhone = phone.replace(/\D/g, "");
    return (
      name.trim().length >= 2 &&
      category &&
      locality &&
      addressFull.trim().length >= 5 &&
      cleanPhone.length >= 10
    );
  };

  const canProceedStep2 = () => {
    return latitude !== null && longitude !== null && pinConfirmed;
  };

  const canProceedStep3 = () => {
    return Boolean(primaryFile || primaryPreview);
  };

  const canSubmitFinal = () => {
    return (
      canProceedStep1() &&
      canProceedStep2() &&
      canProceedStep3() &&
      consentAccuracy &&
      consentAuthorized &&
      consentPublicDisplay &&
      consentReviewNotice
    );
  };

  // Submit Community Place Listing
  const handleFinalSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!canSubmitFinal()) return;

    const activeToken = getAuthToken();
    if (!activeToken) {
      setSubmitError("Authentication required: Please log in to submit a place to the town directory.");
      navigate("/login", {
        state: {
          from: "/directory?add=true",
          message: "Please log in to submit a place listing.",
        },
      });
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setDuplicateWarning(null);
    setUploadProgress(15);

    try {
      // 1. Upload Images to Backend
      let uploadedPrimary = primaryPreview || "";
      let uploadedGallery = [];

      if (primaryFile || galleryFiles.length > 0) {
        const uploadFormData = new FormData();
        if (primaryFile) {
          uploadFormData.append("primaryImage", primaryFile);
          uploadFormData.append("images", primaryFile);
        }
        galleryFiles.forEach((file) => {
          uploadFormData.append("additionalImages", file);
          uploadFormData.append("images", file);
        });

        setUploadProgress(35);
        const uploadRes = await API.post("/submissions/upload-images", uploadFormData, {
          // Do NOT set Content-Type for FormData — browser auto-generates multipart boundary
          timeout: 30000,
        });

        uploadedPrimary =
          uploadRes.data?.primaryImage ||
          uploadRes.data?.primaryImageUrl ||
          uploadedPrimary;
        uploadedGallery =
          uploadRes.data?.images ||
          uploadRes.data?.additionalImageUrls ||
          [];
      }
      setUploadProgress(70);

      // 2. Submit Place Data
      const payload = {
        name: name.trim(),
        category,
        locality,
        addressFull: addressFull.trim(),
        streetOrLandmark: streetOrLandmark.trim(),
        description: description.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim(),
        whatsapp: whatsapp.trim(),
        website: website.trim(),
        openingHours: openingHours.trim(),
        services: services ? services.split(",").map((s) => s.trim()).filter(Boolean) : [],
        latitude,
        longitude,
        primaryImage: uploadedPrimary,
        images: uploadedGallery,
        consentConfirmed: true,
      };

      setUploadProgress(85);
      const res = await API.post("/submissions/place", payload);
      setUploadProgress(100);

      if (res.data?.success || res.data?.referenceId || res.data?.submission) {
        const subData = res.data.submission || { ...payload, referenceId: res.data.referenceId };
        const refId = res.data.referenceId || subData?.referenceId;
        addTrackedSubmission(refId, payload.phone);
        setSubmittedData(subData);
        if (onSuccess) onSuccess(subData);
      } else {
        setSubmitError(res.data?.message || "Failed to submit entity. Please try again.");
      }
    } catch (err) {
      console.error("Community Submission Error:", err);
      const msg = err.response?.data?.message || "Server error while processing submission.";
      setSubmitError(msg);
      if (err.response?.data?.duplicateWarning) {
        setDuplicateWarning(err.response.data.duplicateWarning);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentToken = getAuthToken();
  if (!currentToken) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Store className="w-7 h-7 text-amber-700" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900">Sign in to Add a Place</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Registration and login are required to suggest or submit places to the Fazilnagar Town Directory. This helps ensure authentic community data and accountability.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              onClick={() => {
                onClose();
                navigate("/login", {
                  state: {
                    from: "/directory?add=true",
                    message: "Please log in to add a place to the town directory.",
                  },
                });
              }}
              className="flex-1 bg-[#0D5E49] hover:bg-emerald-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
            >
              Sign In to Continue
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90dvh] my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#18232E] text-white px-4 sm:px-5 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0D5E49] flex items-center justify-center text-white shadow-xs shrink-0">
              <Store className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold leading-tight">
                Add Your Business / Place
              </h2>
              <p className="text-[10.5px] text-slate-300">
                Fazilnagar Town Directory &amp; Official Map Pinning
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close form"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Screen */}
        {submittedData ? (
          <div className="p-6 sm:p-8 text-center space-y-4 overflow-y-auto">
            <div className="w-16 h-16 bg-emerald-100 text-[#0D5E49] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-[#0D5E49] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Submission Received
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-2">
                Thank you for listing your establishment!
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Your listing for <strong className="text-slate-900">{submittedData.name}</strong> has been received and queued for administrative verification.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Tracking Reference:</span>
                <span className="font-mono font-bold text-[#B8323C] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  {submittedData.referenceId}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Current Status:</span>
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase text-[10px]">
                  Pending Admin Verification
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Selected Pin:</span>
                <span className="font-mono text-slate-700">
                  {submittedData.latitude?.toFixed(5)}, {submittedData.longitude?.toFixed(5)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Locality:</span>
                <span className="font-semibold text-slate-800">{submittedData.locality}</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900 max-w-md mx-auto flex items-start gap-2 text-left">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                To ensure location accuracy, every community place is audited against satellite imagery before appearing on the public town map and directory.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-[#18232E] hover:bg-[#B8323C] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
              >
                Done & Return to Directory
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Step Indicators */}
            <div className="bg-slate-50 px-4 sm:px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600 shrink-0 overflow-x-auto">
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    currentStep === 1
                      ? "bg-[#B8323C] text-white"
                      : currentStep > 1
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {currentStep > 1 ? "✓" : "1"}
                </span>
                <span className={currentStep === 1 ? "text-slate-900 font-extrabold" : ""}>
                  Details
                </span>
              </div>
              <span className="text-slate-300">→</span>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    currentStep === 2
                      ? "bg-[#B8323C] text-white"
                      : currentStep > 2
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {currentStep > 2 ? "✓" : "2"}
                </span>
                <span className={currentStep === 2 ? "text-slate-900 font-extrabold" : ""}>
                  Map Location
                </span>
              </div>
              <span className="text-slate-300">→</span>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    currentStep === 3
                      ? "bg-[#B8323C] text-white"
                      : currentStep > 3
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {currentStep > 3 ? "✓" : "3"}
                </span>
                <span className={currentStep === 3 ? "text-slate-900 font-extrabold" : ""}>
                  Images
                </span>
              </div>
              <span className="text-slate-300">→</span>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    currentStep === 4
                      ? "bg-[#B8323C] text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  4
                </span>
                <span className={currentStep === 4 ? "text-slate-900 font-extrabold" : ""}>
                  Review & Submit
                </span>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Submission Notice:</span> {submitError}
                  </div>
                </div>
              )}

              {/* STEP 1: Basic Info */}
              {currentStep === 1 && (
                <div className="space-y-3.5 text-xs">
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 text-[11px] flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Official Civic Institutions Notice:</strong> Hospitals, Colleges, Schools, and Medical Stores are maintained by the municipal directory verification board and cannot be submitted via this community form.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-800 mb-1">
                        Business or Entity Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Gupta General Store, Hotel Milan, Sharma Electronics"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 sm:h-10.5 outline-none focus:border-[#B8323C] focus:bg-white text-xs font-medium"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 sm:h-10.5 outline-none focus:border-[#B8323C] focus:bg-white text-xs font-medium cursor-pointer"
                        required
                      >
                        <option value="">Select Category...</option>
                        {COMMUNITY_ALLOWED_CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} ({cat.hint})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Ward / Locality <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={locality}
                        onChange={(e) => setLocality(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 sm:h-10.5 outline-none focus:border-[#B8323C] focus:bg-white text-xs font-medium cursor-pointer"
                        required
                      >
                        <option value="">Select Ward / Area (26 town options)...</option>
                        {FAZILNAGAR_AREAS.map((area) => (
                          <option key={area} value={area}>
                            {area} {REVIEW_FLAG_AREAS.includes(area) ? "(Requires Area Review)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-800 mb-1">
                        Full Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Shop No. 12, Main Market, Opp. SBI Link Road, Fazilnagar - 274401"
                        value={addressFull}
                        onChange={(e) => setAddressFull(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 sm:h-10.5 outline-none focus:border-[#B8323C] focus:bg-white text-xs font-medium"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Street or Nearby Landmark
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Near Bus Stand, Opp. Pawanagar Gate"
                        value={streetOrLandmark}
                        onChange={(e) => setStreetOrLandmark(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 sm:h-10.5 outline-none focus:border-[#B8323C] focus:bg-white text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Owner or Contact Person Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Ramesh Kumar Gupta"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 sm:h-10.5 outline-none focus:border-[#B8323C] focus:bg-white text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 sm:h-10.5 outline-none focus:border-[#B8323C] focus:bg-white text-xs font-medium"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        WhatsApp Number (Optional)
                      </label>
                      <input
                        type="tel"
                        placeholder="WhatsApp contact"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 sm:h-10.5 outline-none focus:border-[#B8323C] focus:bg-white text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Opening Hours (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 09:00 AM – 08:30 PM (Sunday Closed)"
                        value={openingHours}
                        onChange={(e) => setOpeningHours(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 sm:h-10.5 outline-none focus:border-[#B8323C] focus:bg-white text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Website or Social Link (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 sm:h-10.5 outline-none focus:border-[#B8323C] focus:bg-white text-xs font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-800 mb-1">
                        Short Description
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Tell visitors about your products, specialty, or services..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-[#B8323C] focus:bg-white text-xs font-medium resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Exact Location on Map */}
              {currentStep === 2 && (
                <div className="space-y-3 text-xs">
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-950 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-[#B8323C] text-sm">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span>Map par apni entity ki exact location pin karein.</span>
                    </div>
                    <p className="text-[11px] text-slate-700">
                      Tap or click anywhere on the town map to drop a pin, then <strong>drag the pin</strong> to your exact shop front or building entrance. Coordinates are never fabricated from addresses.
                    </p>
                  </div>

                  {/* Geocode Search & Location Button */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <form onSubmit={handleGeocodingSearch} className="flex-1 flex gap-1.5">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search landmark or road in Fazilnagar..."
                          value={geoSearchQuery}
                          onChange={(e) => setGeoSearchQuery(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-[#B8323C] focus:bg-white"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isGeoSearching}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer"
                      >
                        {isGeoSearching ? "Searching..." : "Search"}
                      </button>
                    </form>

                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isLocatingUser}
                      className="bg-[#0D5E49] hover:bg-emerald-800 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      <Compass className={`w-3.5 h-3.5 ${isLocatingUser ? "animate-spin" : ""}`} />
                      <span>{isLocatingUser ? "Acquiring GPS..." : "Use My Current Location"}</span>
                    </button>
                  </div>

                  {/* Geocode Search Results */}
                  {geoSearchResults.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 px-1">
                        Matching Landmarks (Tap to place pin):
                      </div>
                      {geoSearchResults.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSearchResult(item)}
                          className="w-full text-left p-2 rounded-lg hover:bg-slate-50 text-xs flex items-center justify-between text-slate-800 transition"
                        >
                          <span className="truncate pr-2">{item.display_name}</span>
                          <span className="text-[#0D5E49] font-bold text-[11px] shrink-0">Select</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Leaflet Map Embed */}
                  <div className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden border-2 border-slate-200 shadow-inner">
                    <div ref={mapContainerRef} className="w-full h-full z-10" />
                  </div>

                  {/* Selected Coordinates Readout & Boundary Status */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 font-semibold">Selected Coordinates: </span>
                      {latitude && longitude ? (
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {latitude.toFixed(6)}, {longitude.toFixed(6)}
                        </span>
                      ) : (
                        <span className="text-red-600 font-bold">No pin selected yet</span>
                      )}
                    </div>

                    {latitude && longitude && (
                      <div>
                        {isWithinTownBoundary(latitude, longitude) ? (
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[10px] flex items-center gap-1 border border-emerald-300">
                            ✓ Within Verified Town Boundary
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-full text-[10px] flex items-center gap-1 border border-amber-300">
                            ⚠️ Outskirts / Border Area (Flagged for Admin Review)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Photos Upload */}
              {currentStep === 3 && (
                <div className="space-y-4 text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-700">
                    <span className="font-bold text-slate-900">Photo Requirements:</span>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-600">
                      <li>One primary facade/storefront photo required.</li>
                      <li>Up to 4 additional optional gallery photos (interior, menu, products).</li>
                      <li>Supported formats: JPEG, PNG, WebP (Max 5MB each).</li>
                    </ul>
                  </div>

                  {/* Primary Photo Section */}
                  <div>
                    <label className="block font-bold text-slate-900 mb-1.5">
                      Storefront / Primary Photo <span className="text-red-500">* (Required)</span>
                    </label>
                    {primaryPreview ? (
                      <div className="relative w-full h-44 rounded-xl overflow-hidden border-2 border-emerald-400 group">
                        <img
                          src={primaryPreview}
                          alt="Primary Storefront Preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                          <label className="bg-white text-slate-800 px-3 py-1.5 rounded-lg font-bold text-xs shadow-md cursor-pointer hover:bg-slate-100">
                            Replace Photo
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handlePrimaryImageChange}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 hover:border-[#B8323C] rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 hover:bg-red-50/20 transition">
                        <Camera className="w-8 h-8 text-slate-400" />
                        <span className="font-bold text-slate-700">Tap to upload Storefront Photo</span>
                        <span className="text-[10px] text-slate-400">JPEG, PNG, WebP up to 5MB</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handlePrimaryImageChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Additional Gallery Photos */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-bold text-slate-900">
                        Additional Gallery Photos (Optional, up to 4)
                      </label>
                      <span className="text-[11px] text-slate-400">{galleryPreviews.length} / 4 added</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {galleryPreviews.map((previewUrl, idx) => (
                        <div
                          key={idx}
                          className="relative h-24 rounded-xl overflow-hidden border border-slate-200 group"
                        >
                          <img
                            src={previewUrl}
                            alt={`Gallery ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition shadow-xs cursor-pointer"
                            title="Remove Photo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {galleryPreviews.length < 4 && (
                        <label className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl h-24 flex flex-col items-center justify-center gap-1 cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
                          <Upload className="w-4 h-4 text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-600">+ Add Photo</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={handleGalleryImagesChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Consent & Privacy Notice */}
              {currentStep === 4 && (
                <div className="space-y-4 text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#0D5E49]" />
                      Submission Review & Privacy Declarations
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Please confirm all four legal statements before submitting. Submissions are reviewed by our civic moderation team before any data appears publicly.
                    </p>
                  </div>

                  {/* 4 Consent Checkboxes */}
                  <div className="space-y-2.5">
                    <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentAccuracy}
                        onChange={(e) => setConsentAccuracy(e.target.checked)}
                        className="mt-0.5 rounded text-[#B8323C] focus:ring-red-500 cursor-pointer"
                        required
                      />
                      <span className="text-slate-800 leading-snug">
                        <strong>Accuracy:</strong> The information and selected map location are accurate to the best of my knowledge.
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentAuthorized}
                        onChange={(e) => setConsentAuthorized(e.target.checked)}
                        className="mt-0.5 rounded text-[#B8323C] focus:ring-red-500 cursor-pointer"
                        required
                      />
                      <span className="text-slate-800 leading-snug">
                        <strong>Authority:</strong> I am authorized by the owner or management to submit this listing for Fazilnagar town.
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentPublicDisplay}
                        onChange={(e) => setConsentPublicDisplay(e.target.checked)}
                        className="mt-0.5 rounded text-[#B8323C] focus:ring-red-500 cursor-pointer"
                        required
                      />
                      <span className="text-slate-800 leading-snug">
                        <strong>Public Display:</strong> Submitted photos and business information may be displayed publicly on the town map and directory upon admin approval.
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentReviewNotice}
                        onChange={(e) => setConsentReviewNotice(e.target.checked)}
                        className="mt-0.5 rounded text-[#B8323C] focus:ring-red-500 cursor-pointer"
                        required
                      />
                      <span className="text-slate-800 leading-snug">
                        <strong>Moderation Desk:</strong> I understand that submission does not guarantee immediate publication and requires verification.
                      </span>
                    </label>
                  </div>

                  {/* Summary Overview */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
                    <div className="font-bold text-slate-800">Submission Summary:</div>
                    <div className="grid grid-cols-2 gap-1 text-slate-600">
                      <div><strong>Name:</strong> {name}</div>
                      <div><strong>Category:</strong> {category}</div>
                      <div><strong>Area:</strong> {locality}</div>
                      <div><strong>Coordinates:</strong> {latitude?.toFixed(5)}, {longitude?.toFixed(5)}</div>
                      <div><strong>Primary Photo:</strong> {primaryFile ? primaryFile.name : "Selected"}</div>
                      <div><strong>Gallery Photos:</strong> {galleryFiles.length} photos</div>
                    </div>
                  </div>

                  {submitting && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600">
                        <span>Uploading photos & registering record...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0D5E49] transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="bg-slate-50 px-4 sm:px-5 py-2.5 border-t border-slate-200 flex items-center justify-between shrink-0">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  disabled={submitting}
                  className="px-3.5 h-9 sm:h-10 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                >
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 h-9 sm:h-10 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep === 1 && !canProceedStep1()) {
                      alert("Please fill all required fields: Name, Category, Locality, Full Address, and a 10-digit Mobile number.");
                      return;
                    }
                    if (currentStep === 2 && !canProceedStep2()) {
                      alert("Please select and confirm the exact map location pin.");
                      return;
                    }
                    if (currentStep === 3 && !canProceedStep3()) {
                      alert("Please upload at least 1 storefront primary photo.");
                      return;
                    }
                    setCurrentStep((prev) => prev + 1);
                  }}
                  className="px-4.5 h-9 sm:h-10 rounded-xl text-xs font-bold text-white bg-[#18232E] hover:bg-[#B8323C] transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>Continue</span>
                  <span>→</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={!canSubmitFinal() || submitting}
                  className="px-5 h-9 sm:h-10 rounded-xl text-xs font-bold text-white bg-[#0D5E49] hover:bg-emerald-800 transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting for Verification...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Submit for Verification</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
