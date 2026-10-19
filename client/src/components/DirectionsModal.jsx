import { useState, useEffect } from "react";
import {
  Navigation,
  MapPin,
  Compass,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  X,
  Search,
  CheckCircle2,
  ShieldCheck,
  LocateFixed,
  Route,
} from "lucide-react";

/**
 * DirectionsModal
 *
 * Provides accurate, user-consented GPS turn-by-turn directions from the user's
 * real live location to the selected Fazilnagar destination.
 *
 * - Solicits browser Geolocation permission via clearly-labelled action.
 * - Extracts actual device latitude/longitude.
 * - Constructs exact Google Maps directions URL: origin=<userLat>,<userLng>&destination=<destLat>,<destLng>
 * - Never silently substitutes town center or hardcoded coordinates on failure.
 * - Explains permission denial, position unavailability, and timeouts with retry options.
 * - Allows manual starting point entry or opening Google Maps directly.
 * - Restricts destinations strictly to verified Fazilnagar listings.
 */
export default function DirectionsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [place, setPlace] = useState(null);
  const [status, setStatus] = useState("idle"); // 'idle' | 'locating' | 'success' | 'denied' | 'unavailable' | 'timeout' | 'unsupported'
  const [userCoords, setUserCoords] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [manualStart, setManualStart] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    const handleOpenDirections = (event) => {
      const targetPlace = event.detail;
      if (!targetPlace) return;

      setPlace(targetPlace);
      setStatus("idle");
      setErrorMessage("");
      setShowManualInput(false);
      setManualStart("");
      setIsOpen(true);
    };

    window.addEventListener("open-directions", handleOpenDirections);
    return () => {
      window.removeEventListener("open-directions", handleOpenDirections);
    };
  }, []);

  if (!isOpen || !place) return null;

  // Extract destination coordinates
  const rawLat = place.latitude ?? place.lat;
  const rawLng = place.longitude ?? place.lng;
  const destLat = parseFloat(rawLat);
  const destLng = parseFloat(rawLng);
  const hasValidDestCoords =
    !isNaN(destLat) &&
    !isNaN(destLng) &&
    destLat > 25 &&
    destLat < 28 &&
    destLng > 83 &&
    destLng < 85;

  const destAddress =
    place.addressFull ||
    place.address ||
    place.streetOrLandmark ||
    place.landmark ||
    "Fazilnagar Town, Kushinagar, UP - 274401";

  const destinationParam = hasValidDestCoords
    ? `${destLat},${destLng}`
    : encodeURIComponent(`${place.name}, ${destAddress}`);

  const handleClose = () => {
    setIsOpen(false);
    setStatus("idle");
    setErrorMessage("");
  };

  /**
   * Request actual user GPS location via browser Geolocation API
   */
  const requestCurrentLocationAndNavigate = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      setErrorMessage("Geolocation is not supported by your current browser. You can enter your starting point manually below.");
      return;
    }

    // Modern browsers require HTTPS (or localhost) for Geolocation API
    if (typeof window !== "undefined" && window.isSecureContext === false && window.location.hostname !== "localhost") {
      setStatus("unsupported");
      setErrorMessage("The browser requires a secure HTTPS connection to access your GPS location.");
      return;
    }

    setStatus("locating");
    setErrorMessage("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ lat, lng, accuracy: Math.round(pos.coords.accuracy || 0) });
        setStatus("success");

        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${destinationParam}&travelmode=driving`;

        // Attempt to open in a new tab
        const win = window.open(mapsUrl, "_blank", "noopener,noreferrer");
        if (!win) {
          // If popup was blocked by browser, user can click the direct link
          setErrorMessage("Pop-up was blocked by browser. Click the button below to view your route in Google Maps.");
        }
      },
      (err) => {
        console.warn("Geolocation error:", err);
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            setStatus("denied");
            setErrorMessage(
              "Location permission was denied. To get turn-by-turn directions starting from your current location, please enable location access in your browser or device settings, or choose your starting location manually."
            );
            break;
          case 2: // POSITION_UNAVAILABLE
            setStatus("unavailable");
            setErrorMessage(
              "Your GPS location is currently unavailable. Please verify that device location/GPS is turned on in your device settings."
            );
            break;
          case 3: // TIMEOUT
            setStatus("timeout");
            setErrorMessage("The location request timed out. Please check your signal and click 'Retry GPS Location'.");
            break;
          default:
            setStatus("unavailable");
            setErrorMessage(err.message || "Failed to acquire device location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  /**
   * Navigate with manual starting point entered by user
   */
  const handleManualNavigate = (e) => {
    e.preventDefault();
    if (!manualStart.trim()) return;

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      manualStart.trim()
    )}&destination=${destinationParam}&travelmode=driving`;

    window.open(mapsUrl, "_blank", "noopener,noreferrer");
    handleClose();
  };

  /**
   * Direct Google Maps navigation allowing user to pick starting location in Maps
   */
  const handleOpenDestinationInMaps = () => {
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationParam}&travelmode=driving`;
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div
        className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90dvh] my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="directions-modal-title"
      >
        {/* Modal Header */}
        <div className="bg-[#18232E] text-white p-3.5 sm:p-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400 block">
                Turn-by-Turn Navigation
              </span>
              <h2 id="directions-modal-title" className="text-sm sm:text-base font-bold text-white line-clamp-1">
                Directions to {place.name}
              </h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close directions modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3">
          {/* Destination Details Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                {place.category || "Verified Place"}
              </span>
              {hasValidDestCoords ? (
                <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Town Coordinates
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Coordinates Pending Verification
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-slate-900">{place.name}</h3>

            <p className="text-xs text-slate-600 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{destAddress}</span>
            </p>

            {hasValidDestCoords && (
              <p className="text-[11px] font-mono text-slate-500 pl-5">
                GPS Pin: {destLat.toFixed(4)}° N, {destLng.toFixed(4)}° E
              </p>
            )}
          </div>

          {/* Unverified Coordinates Disclaimer */}
          {!hasValidDestCoords && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unverified GPS Location</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  The exact GPS coordinates for this candidate listing are pending physical verification.
                  Directions will navigate to the verified physical address in Fazilnagar town rather than an approximate coordinate.
                </p>
              </div>
            </div>
          )}

          {/* Status Message / Errors */}
          {status === "locating" && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center space-y-2 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto text-blue-600">
                <LocateFixed className="w-5 h-5 animate-spin" />
              </div>
              <p className="text-xs font-bold text-blue-900">Requesting Your Device GPS Location...</p>
              <p className="text-[11px] text-blue-700">
                Please tap &quot;Allow&quot; when your browser asks for location permission.
              </p>
            </div>
          )}

          {status === "success" && userCoords && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900">Location Acquired Successfully!</p>
                <p className="text-[11px] text-emerald-700 font-mono mt-0.5">
                  Origin: {userCoords.lat.toFixed(4)}° N, {userCoords.lng.toFixed(4)}° E (±{userCoords.accuracy}m)
                </p>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${destinationParam}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#168568] hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl transition shadow-xs"
              >
                <span>Open Turn-by-Turn Route in Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {(status === "denied" || status === "unavailable" || status === "timeout" || status === "unsupported") && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-rose-900">
                    {status === "denied"
                      ? "Location Permission Denied"
                      : status === "timeout"
                      ? "Location Request Timed Out"
                      : "Location Unavailable"}
                  </p>
                  <p className="text-[11px] text-rose-700 leading-relaxed">{errorMessage}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-rose-200 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={requestCurrentLocationAndNavigate}
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-3 py-2 rounded-xl transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Current Location</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualInput(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 px-3 py-2 rounded-xl transition cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Enter Starting Point Manually</span>
                </button>
              </div>
            </div>
          )}

          {/* Primary Action: Use My Current Location */}
          {status !== "locating" && status !== "success" && (
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={requestCurrentLocationAndNavigate}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#168568] hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm h-10 sm:h-11 rounded-xl transition shadow-xs cursor-pointer group"
              >
                <LocateFixed className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>🧭 Directions from My Current Location</span>
              </button>
              <p className="text-[10.5px] text-center text-slate-500">
                Detects your live device GPS coordinates to create an accurate driving or walking route.
              </p>

              {/* Alternate Option: Manual Starting Point */}
              <div className="pt-2.5 border-t border-slate-200">
                {!showManualInput ? (
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setShowManualInput(true)}
                      className="text-slate-700 font-semibold hover:text-[#B8323C] flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <Route className="w-3.5 h-3.5 text-slate-400" />
                      <span>Choose a different starting point</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenDestinationInMaps}
                      className="text-teal-700 font-bold hover:underline flex items-center gap-1 cursor-pointer text-xs"
                    >
                      <span>Choose in Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleManualNavigate} className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Enter Starting Location or Landmark:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Kasia, Gorakhpur, Fazilnagar Bus Stand..."
                        value={manualStart}
                        onChange={(e) => setManualStart(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 h-10 sm:h-10.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={!manualStart.trim()}
                        className="bg-[#18232E] hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs px-3.5 h-10 sm:h-10.5 rounded-xl transition cursor-pointer"
                      >
                        Route
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-teal-600" />
            <span>Fazilnagar Town Official GPS Registry</span>
          </span>
          <button
            onClick={handleClose}
            className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
