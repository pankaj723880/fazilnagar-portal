import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../api";
import { usePageSEO } from "../utils/seo";
import { getCachedSettings, getSiteSettings, subscribeToCMSLiveUpdates } from "../services/cmsService";
import {
  FileText,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Upload,
  ExternalLink,
  ArrowLeft,
  Send,
  Loader2,
  Building,
  Info,
  Check,
  Compass,
  Globe,
} from "lucide-react";

export default function PublicContributionForm() {
  const { slug } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Synchronize site settings for hideNavbarAndFooter layout & return buttons
  const [siteSettings, setSiteSettings] = useState(() => getCachedSettings());
  useEffect(() => {
    getSiteSettings().then((s) => {
      if (s) setSiteSettings(s);
    });
    return subscribeToCMSLiveUpdates(() => {
      getSiteSettings().then((s) => {
        if (s) setSiteSettings(s);
      });
    });
  }, []);

  const hideNavbarAndFooter = Boolean(siteSettings?.contributionFormSettings?.hideNavbarAndFooter);

  // Submitter Form State
  const [formData, setFormData] = useState({});
  const [submitterName, setSubmitterName] = useState("");
  const [submitterContact, setSubmitterContact] = useState("");
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Errors & Submission
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);

  // Google Maps Helper
  const [extractSuccess, setExtractSuccess] = useState(false);

  usePageSEO({
    title: form ? `${form.title} | Fazilnagar Town Portal` : "Public Contribution | Fazilnagar",
    description: form?.description || "Contribute or suggest corrections to Fazilnagar town records.",
    canonicalPath: `/contribute/${slug}`,
  });

  // Load Public Form
  useEffect(() => {
    let isMounted = true;
    const fetchForm = async () => {
      setLoading(true);
      setFetchError("");
      try {
        const res = await API.get(`/forms/public/${slug}`);
        if (isMounted) {
          setForm(res.data);
          // Initialize form data defaults
          const initial = {};
          if (res.data.fields) {
            res.data.fields.forEach((f) => {
              initial[f.name] = f.defaultValue || "";
            });
          }
          setFormData(initial);
        }
      } catch (err) {
        if (isMounted) {
          setFetchError(
            err.response?.data?.message ||
              "This contribution form is not available, disabled, or does not exist."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (slug) {
      fetchForm();
    }
    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Scroll to first invalid field with focus
  const scrollToFirstError = (errorsObj) => {
    if (!errorsObj || Object.keys(errorsObj).length === 0) return;
    const errorKeys = Object.keys(errorsObj);
    const matchingField = form?.fields?.find((f) => errorsObj[f.name]);
    const targetKey = matchingField ? matchingField.name : errorKeys[0];

    const targetEl =
      document.getElementById(`contrib-field-${targetKey}`) ||
      document.getElementById(`contrib-container-${targetKey}`);

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof targetEl.focus === "function") {
        targetEl.focus({ preventScroll: true });
      }
      return;
    }

    const summaryEl = document.getElementById("form-validation-summary");
    if (summaryEl) {
      summaryEl.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Handle Input Changes
  const handleInputChange = (fieldName, value) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    if (formErrors[fieldName] || formErrors._server || formErrors._general) {
      setFormErrors((prev) => {
        const cp = { ...prev };
        delete cp[fieldName];
        delete cp._server;
        delete cp._general;
        return cp;
      });
    }
  };

  // Google Maps coordinate extraction helper
  const handleExtractCoordsFromMapsLink = () => {
    const mapsField = form?.fields?.find((f) => f.type === "googleMapsUrl" || f.name === "googleMapsUrl")?.name || "googleMapsUrl";
    const mapsUrl = formData[mapsField] || "";
    if (!mapsUrl.trim()) return;

    // Pattern 1: /@26.7095,84.0507,17z
    let lat = null;
    let lng = null;

    const pathMatch = mapsUrl.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (pathMatch) {
      lat = parseFloat(pathMatch[1]);
      lng = parseFloat(pathMatch[2]);
    } else {
      const queryMatch = mapsUrl.match(/[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
      if (queryMatch) {
        lat = parseFloat(queryMatch[1]);
        lng = parseFloat(queryMatch[2]);
      } else {
        const protoMatch = mapsUrl.match(/!3d(-?\d+(?:\.\d+)?)[^!]*!4d(-?\d+(?:\.\d+)?)/);
        if (protoMatch) {
          lat = parseFloat(protoMatch[1]);
          lng = parseFloat(protoMatch[2]);
        }
      }
    }

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      const latField = form?.fields?.find((f) => f.type === "latitude" || f.name === "latitude")?.name || "latitude";
      const lngField = form?.fields?.find((f) => f.type === "longitude" || f.name === "longitude")?.name || "longitude";
      setFormData((prev) => ({
        ...prev,
        [latField]: lat,
        [lngField]: lng,
      }));
      setExtractSuccess(true);
      setTimeout(() => setExtractSuccess(false), 3000);
    } else {
      alert("Could not automatically extract numeric coordinates from this link. Please enter latitude and longitude manually.");
    }
  };

  // Handle File Uploads
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxFiles = form?.attachmentsConfig?.maxFiles || 3;
    const maxSizeMb = form?.attachmentsConfig?.maxSizeMb || 5;

    if (attachments.length + files.length > maxFiles) {
      alert(`You can upload a maximum of ${maxFiles} attachments.`);
      return;
    }

    for (const f of files) {
      if (f.size > maxSizeMb * 1024 * 1024) {
        alert(`File "${f.name}" exceeds the maximum allowed size of ${maxSizeMb}MB.`);
        return;
      }
    }

    setUploadingFiles(true);
    try {
      const uploadFormData = new FormData();
      files.forEach((f) => uploadFormData.append("attachments", f));

      const res = await API.post("/contributions/upload", uploadFormData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (Array.isArray(res.data?.urls)) {
        setAttachments((prev) => [...prev, ...res.data.urls]);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to upload attachments.");
    } finally {
      setUploadingFiles(false);
    }
  };

  // Client-side Validation and Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form || submitting) return;

    const errors = {};

    // Validate configured fields
    form.fields.forEach((field) => {
      const val = formData[field.name];
      if (field.required) {
        if (val === undefined || val === null || String(val).trim() === "") {
          errors[field.name] = `${field.label} is required.`;
          return;
        }
      }

      if (val !== undefined && val !== null && String(val).trim() !== "") {
        if (field.type === "latitude" || field.name === "latitude") {
          const num = parseFloat(val);
          if (isNaN(num) || num < -90 || num > 90) {
            errors[field.name] = "Latitude must be a valid decimal coordinate between -90 and 90.";
          }
        } else if (field.type === "longitude" || field.name === "longitude") {
          const num = parseFloat(val);
          if (isNaN(num) || num < -180 || num > 180) {
            errors[field.name] = "Longitude must be a valid decimal coordinate between -180 and 180.";
          }
        } else if (field.name === "googleMapsUrl" || field.type === "googleMapsUrl") {
          const trimmed = String(val).trim();
          const disallowed = [
            /openstreetmap\.org/i,
            /osm\.org/i,
            /bing\.com\/maps/i,
            /maps\.apple\.com/i,
            /here\.com/i,
            /mapbox\.com/i,
            /yandex\.[a-z.]+\/maps/i,
            /mapquest\.com/i,
          ];
          let isDisallowed = false;
          for (const pat of disallowed) {
            if (pat.test(trimmed)) {
              errors[field.name] = "Alternative map providers (like OpenStreetMap, Bing, or Apple Maps) are not permitted. Only Google Maps links are accepted.";
              isDisallowed = true;
              break;
            }
          }
          if (!isDisallowed) {
            const isGoogleMaps = [
              /^https?:\/\/(?:www\.)?google\.[a-z.]+\/maps/i,
              /^https?:\/\/maps\.google\.[a-z.]+/i,
              /^https?:\/\/maps\.app\.goo\.gl\/[a-zA-Z0-9_\-]+/i,
              /^https?:\/\/goo\.gl\/maps\/[a-zA-Z0-9_\-]+/i,
            ].some((pat) => pat.test(trimmed));
            if (!isGoogleMaps) {
              errors[field.name] = "Please enter an authentic Google Maps location link (e.g. https://www.google.com/maps/... or https://maps.app.goo.gl/...).";
            }
          }
        }
      }
    });

    // Cross-field coordinate pairing validation
    const latVal = formData.latitude;
    const lngVal = formData.longitude;
    const hasLatVal = latVal !== undefined && latVal !== null && String(latVal).trim() !== "";
    const hasLngVal = lngVal !== undefined && lngVal !== null && String(lngVal).trim() !== "";

    if (hasLatVal && !hasLngVal) {
      const hasLngField = form.fields.some((f) => f.name === "longitude" || f.type === "longitude");
      if (hasLngField) {
        errors.longitude = "Longitude coordinate is required when latitude is entered.";
      } else {
        errors.latitude = "Both Latitude and Longitude are required together.";
      }
    } else if (hasLngVal && !hasLatVal) {
      const hasLatField = form.fields.some((f) => f.name === "latitude" || f.type === "latitude");
      if (hasLatField) {
        errors.latitude = "Latitude coordinate is required when longitude is entered.";
      } else {
        errors.longitude = "Both Latitude and Longitude are required together.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setTimeout(() => scrollToFirstError(errors), 50);
      return;
    }

    setSubmitting(true);
    setFormErrors({});

    try {
      const payload = {
        submissionType: form.purpose === "correction" ? "correction" : "new_entity",
        targetEntityId: form.targetEntity?.id || null,
        submittedData: formData,
        evidenceNotes,
        attachments,
        submitterName,
        submitterContact,
      };

      const res = await API.post(`/forms/public/${slug}/submit`, payload);
      setSubmissionSuccess({
        referenceId: res.data.referenceId,
        message: res.data.message,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.errors && typeof respData.errors === "object" && Object.keys(respData.errors).length > 0) {
        setFormErrors(respData.errors);
        setTimeout(() => scrollToFirstError(respData.errors), 50);
      } else {
        const errorMsg = respData?.message || "Failed to submit contribution proposal. Please try again.";
        const serverErrMap = { _server: errorMsg };
        setFormErrors(serverErrMap);
        setTimeout(() => scrollToFirstError(serverErrMap), 50);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#0D5E49] animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Loading contribution form...</p>
        </div>
      </div>
    );
  }

  if (fetchError || !form) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 font-heading">Form Not Available</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{fetchError}</p>
          {!hideNavbarAndFooter && (
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Town Portal</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Link */}
        {!hideNavbarAndFooter && (
          <Link
            to={form.targetModule === "map" ? "/#regional-connectivity-section" : "/directory"}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {form.targetModule === "map" ? "Town Map" : "Directory"}</span>
          </Link>
        )}

        {/* Success Confirmation Card */}
        {submissionSuccess ? (
          <div className="bg-white rounded-3xl border border-emerald-200 shadow-xl p-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full inline-block">
              Submission Received &bull; Verification Pending
            </span>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
              Thank You for Your Contribution!
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Your proposal has been submitted to the Fazilnagar Town Portal administration. To ensure highest data integrity, live records will only be updated after an authorized administrator verifies the information and Google Maps coordinates.
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 max-w-sm mx-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Your Submission Reference ID:
              </span>
              <span className="font-mono text-base font-black text-slate-900 select-all block mt-1">
                {submissionSuccess.referenceId}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Save this reference code for your records or follow-up.
              </span>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSubmissionSuccess(null);
                  setFormData({});
                  setEvidenceNotes("");
                  setAttachments([]);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
              >
                Submit Another Contribution
              </button>

              {!hideNavbarAndFooter && (
                <Link
                  to="/"
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#0D5E49] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
                >
                  Return to Town Portal
                </Link>
              )}
            </div>
          </div>
        ) : (
          /* Contribution Form Card */
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
            {/* Form Hero Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-[#0D5E49] text-white px-2.5 py-0.5 rounded-full">
                  {form.targetModule === "map" ? "🗺️ Town Map Contribution" : "🏢 Directory Contribution"}
                </span>
                <span className="text-[10px] font-bold text-slate-300">
                  Fazilnagar Town Portal
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black font-heading tracking-tight">{form.title}</h1>
              {form.description && (
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  {form.description}
                </p>
              )}

              {/* Instructions Callout */}
              {form.instructions && (
                <div className="mt-4 p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 text-xs text-slate-200 leading-relaxed flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-white font-bold mb-0.5">Contributor Instructions:</strong>
                    {form.instructions}
                  </div>
                </div>
              )}
            </div>

            {/* Target Record Context Card (for corrections) */}
            {form.targetEntity && (
              <div className="p-4 bg-emerald-50/70 border-b border-emerald-100 flex items-start gap-3">
                <Building className="w-5 h-5 text-[#0D5E49] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider block">
                    Correction Target:
                  </span>
                  <strong className="text-slate-900 font-extrabold text-sm block">
                    {form.targetEntity.name} {form.targetEntity.hindiName ? `(${form.targetEntity.hindiName})` : ""}
                  </strong>
                  <span className="text-slate-600 text-[11px] block mt-0.5">
                    {form.targetEntity.addressFull || form.targetEntity.locality} &bull; Category: {form.targetEntity.category}
                  </span>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              {Object.keys(formErrors).length > 0 && (
                <div
                  id="form-validation-summary"
                  role="alert"
                  tabIndex={-1}
                  className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl text-xs text-red-900 space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center gap-2 font-extrabold text-red-800 text-sm">
                    <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0" />
                    <span>
                      {Object.keys(formErrors).length === 1
                        ? "Please check and correct the 1 highlighted field below:"
                        : `Please check and correct the ${Object.keys(formErrors).length} highlighted fields below:`}
                    </span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-700 text-xs">
                    {Object.entries(formErrors).map(([key, msg]) => {
                      const matchingField = form.fields.find((f) => f.name === key);
                      const label = matchingField ? matchingField.label : key === "_server" ? "Server Notice" : key === "_general" ? "Notice" : key;
                      return (
                        <li key={key}>
                          <button
                            type="button"
                            onClick={() => {
                              const target =
                                document.getElementById(`contrib-field-${key}`) ||
                                document.getElementById(`contrib-container-${key}`);
                              if (target) {
                                target.scrollIntoView({ behavior: "smooth", block: "center" });
                                if (typeof target.focus === "function") {
                                  target.focus({ preventScroll: true });
                                }
                              }
                            }}
                            className="text-left text-red-700 hover:text-red-900 hover:underline font-semibold cursor-pointer"
                          >
                            <strong className="text-slate-900">{label}:</strong> {msg}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="space-y-4">
                {form.fields.map((field) => {
                  const errorMsg = formErrors[field.name];
                  const isLatitude = field.type === "latitude" || field.name === "latitude";
                  const isLongitude = field.type === "longitude" || field.name === "longitude";
                  const isGoogleMaps = field.type === "googleMapsUrl" || field.name === "googleMapsUrl";
                  const isLocationField = isLatitude || isLongitude || isGoogleMaps;

                  return (
                    <div
                      key={field.name}
                      id={`contrib-container-${field.name}`}
                      className={
                        errorMsg
                          ? "p-4 rounded-2xl border-2 border-red-500 bg-red-50/50 shadow-xs space-y-2.5 transition-all ring-2 ring-red-200"
                          : isLocationField
                          ? `p-4 rounded-2xl border space-y-2.5 transition ${
                              isLatitude
                                ? "bg-emerald-50/50 border-emerald-200"
                                : isLongitude
                                ? "bg-blue-50/50 border-blue-200"
                                : "bg-rose-50/40 border-rose-200"
                            }`
                          : "space-y-1"
                      }
                    >
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <label
                          htmlFor={`contrib-field-${field.name}`}
                          className="block text-xs font-bold text-slate-800 flex items-center gap-1.5"
                        >
                          {isLatitude && <Globe className="w-3.5 h-3.5 text-emerald-600" />}
                          {isLongitude && <Compass className="w-3.5 h-3.5 text-blue-600" />}
                          {isGoogleMaps && <MapPin className="w-3.5 h-3.5 text-rose-600" />}
                          <span>{field.label}</span>
                          {field.required && <span className="text-red-500 font-bold">*</span>}
                        </label>

                        {isGoogleMaps && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                            📍 Google Maps Only
                          </span>
                        )}
                        {isLatitude && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                            🌐 Range: -90° to 90°
                          </span>
                        )}
                        {isLongitude && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                            🧭 Range: -180° to 180°
                          </span>
                        )}
                      </div>

                      {field.description && (
                        <p className="text-[11px] text-slate-500">{field.description}</p>
                      )}

                      {/* Location Helper Instructions for Google Maps URL */}
                      {isGoogleMaps && (
                        <div className="p-3 bg-white/90 border border-rose-200 rounded-xl text-[11px] text-slate-700 space-y-1 shadow-2xs">
                          <p className="font-bold flex items-center gap-1 text-rose-900">
                            <span>🧭 How to get your Google Maps Share Link:</span>
                          </p>
                          <ol className="list-decimal pl-4 space-y-0.5 text-slate-600">
                            <li>Open Google Maps on your phone or web browser.</li>
                            <li>Search or drop a pin at the exact location.</li>
                            <li>Tap <strong>Share</strong> &rarr; <strong>Copy Link</strong> and paste the link below.</li>
                          </ol>
                          <p className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-2 py-1 rounded border border-amber-200/80 mt-1">
                            Note: Google Maps is strictly the only permitted location source. Links from other map services are rejected.
                          </p>
                        </div>
                      )}

                      {/* Field Inputs */}
                      {field.type === "textarea" ? (
                        <textarea
                          id={`contrib-field-${field.name}`}
                          name={field.name}
                          aria-invalid={Boolean(errorMsg)}
                          aria-describedby={errorMsg ? `error-${field.name}` : undefined}
                          rows={3}
                          value={formData[field.name] || ""}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          className={`w-full px-3.5 py-2.5 bg-white border ${
                            errorMsg
                              ? "border-red-500 ring-2 ring-red-300 bg-red-50/40 text-red-950 font-medium"
                              : "border-slate-300 text-slate-800"
                          } rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                        />
                      ) : field.type === "select" ? (
                        <select
                          id={`contrib-field-${field.name}`}
                          name={field.name}
                          aria-invalid={Boolean(errorMsg)}
                          aria-describedby={errorMsg ? `error-${field.name}` : undefined}
                          value={formData[field.name] || ""}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          className={`w-full px-3.5 py-2.5 bg-white border ${
                            errorMsg
                              ? "border-red-500 ring-2 ring-red-300 bg-red-50/40 text-red-950 font-medium"
                              : "border-slate-300 text-slate-800"
                          } rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                        >
                          <option value="">-- Select an option --</option>
                          {(field.options || []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="space-y-1.5">
                          <input
                            id={`contrib-field-${field.name}`}
                            name={field.name}
                            aria-invalid={Boolean(errorMsg)}
                            aria-describedby={errorMsg ? `error-${field.name}` : undefined}
                            type={isLatitude || isLongitude ? "number" : field.type === "number" ? "number" : "text"}
                            step={isLatitude || isLongitude ? "any" : undefined}
                            min={isLatitude ? -90 : isLongitude ? -180 : undefined}
                            max={isLatitude ? 90 : isLongitude ? 180 : undefined}
                            value={formData[field.name] ?? ""}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                            placeholder={
                              isGoogleMaps
                                ? "https://maps.app.goo.gl/... or https://www.google.com/maps/..."
                                : isLatitude
                                ? "e.g. 26.7095 (between -90 and 90)"
                                : isLongitude
                                ? "e.g. 84.0507 (between -180 and 180)"
                                : `Enter ${field.label.toLowerCase()}...`
                            }
                            className={`w-full px-3.5 py-2.5 bg-white border ${
                              errorMsg
                                ? "border-red-500 ring-2 ring-red-300 bg-red-50/40 text-red-950 font-medium"
                                : "border-slate-300 text-slate-800"
                            } rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                          />

                          {/* Quick helper button under Google Maps link */}
                          {isGoogleMaps && formData[field.name] && (
                            <button
                              type="button"
                              onClick={handleExtractCoordsFromMapsLink}
                              className="text-[11px] font-bold text-[#0D5E49] hover:underline flex items-center gap-1 cursor-pointer pt-0.5"
                            >
                              <Compass className="w-3.5 h-3.5" />
                              <span>Auto-extract Latitude &amp; Longitude coordinates from this link</span>
                              {extractSuccess && <span className="text-emerald-600 font-extrabold">✓ Coordinates Extracted!</span>}
                            </button>
                          )}
                        </div>
                      )}

                      {errorMsg && (
                        <p
                          id={`error-${field.name}`}
                          role="alert"
                          className="text-[11px] font-bold text-red-600 mt-1.5 flex items-center gap-1.5"
                        >
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                          <span>{errorMsg}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Attachments Section */}
              {form.attachmentsConfig?.enabled && (
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800">
                    Supporting Documents / Place Photos
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Upload photos, shop board images, or official document proofs (up to {form.attachmentsConfig.maxFiles} images, max {form.attachmentsConfig.maxSizeMb}MB each).
                  </p>

                  <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl text-center space-y-2">
                    <input
                      type="file"
                      id="contrib-file-input"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="contrib-file-input"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition cursor-pointer shadow-2xs"
                    >
                      {uploadingFiles ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-emerald-600" />
                          <span>Choose Photos to Attach</span>
                        </>
                      )}
                    </label>

                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center mt-3">
                        {attachments.map((url, idx) => (
                          <div
                            key={idx}
                            className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5"
                          >
                            <span>✓ Attached Photo #{idx + 1}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submitter Details & Evidence Notes */}
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-slate-800">Your Contact &amp; Verification Note</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name (Optional)</label>
                    <input
                      type="text"
                      value={submitterName}
                      onChange={(e) => setSubmitterName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone / Email (Optional)</label>
                    <input
                      type="text"
                      value={submitterContact}
                      onChange={(e) => setSubmitterContact(e.target.value)}
                      placeholder="For verification follow-up if needed"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Evidence / Comments</label>
                  <textarea
                    rows={2}
                    value={evidenceNotes}
                    onChange={(e) => setEvidenceNotes(e.target.value)}
                    placeholder="Provide any details that will help the administrator verify your proposed coordinates or information (e.g. 'I am the shop owner', 'Census 2011 code', etc.)"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-[#0D5E49] hover:bg-emerald-800 text-white text-sm font-extrabold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Proposal for Review...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit Contribution for Admin Approval</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-slate-500 text-center mt-2">
                  Submissions are reviewed by town administrators. Live data will update once verified.
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
