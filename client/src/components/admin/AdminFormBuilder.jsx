import { useState, useEffect, useMemo, useCallback } from "react";
import API from "../../api";
import { getAuthToken } from "../../utils/authStorage";
import { clearCMSCache } from "../../services/cmsService";
import {
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Eye,
  ToggleLeft,
  ToggleRight,
  Share2,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  X,
  FileText,
  MapPin,
  Layers,
  Settings,
  HelpCircle,
  MessageCircle,
  Globe,
  Upload,
  Smartphone,
  RotateCcw,
  Sparkles,
  Compass,
} from "lucide-react";

export const SUPPORTED_MAP_ENTITY_TYPES = [
  "village",
  "locality",
  "town",
  "city",
  "landmark",
  "hub",
  "place",
];

export const SUPPORTED_DIRECTORY_CATEGORIES = [
  "Schools & Colleges",
  "Hospitals & Clinics",
  "Petrol Pumps",
  "Pharmacies",
  "Banks & ATMs",
  "Restaurants",
  "Markets",
  "Hotels",
  "Government",
  "Other Services",
];

export const MAP_ENTITY_META = {
  village: {
    label: "🏡 Village / Gram Panchayat",
    singular: "Village",
    plural: "villages",
    nameLabel: "Village / Gram Panchayat Name",
    nameDesc: "Official recognized name of the village in English",
  },
  locality: {
    label: "📍 Locality / Ward",
    singular: "Locality / Ward",
    plural: "localities / wards",
    nameLabel: "Locality / Ward Name",
    nameDesc: "Official recognized name of the locality or ward in English",
  },
  town: {
    label: "🏛️ Town / Nagar Panchayat",
    singular: "Town",
    plural: "towns",
    nameLabel: "Town / Nagar Panchayat Name",
    nameDesc: "Official recognized name of the town in English",
  },
  city: {
    label: "🏙️ City / Urban Centre",
    singular: "City",
    plural: "cities",
    nameLabel: "City / Urban Centre Name",
    nameDesc: "Official recognized name of the city in English",
  },
  landmark: {
    label: "🚩 Landmark / Heritage Site",
    singular: "Landmark / Heritage Site",
    plural: "landmarks / heritage sites",
    nameLabel: "Landmark / Site Name",
    nameDesc: "Official recognized name of the landmark, monument, or heritage site in English",
  },
  hub: {
    label: "🚦 Transport & Commercial Hub",
    singular: "Hub / Junction",
    plural: "hubs / junctions",
    nameLabel: "Hub / Junction Name",
    nameDesc: "Name of the key transport, crossroads, bus stand, or market hub",
  },
  place: {
    label: "📌 Place / Public Space",
    singular: "Place / Public Space",
    plural: "places",
    nameLabel: "Place Name",
    nameDesc: "Official name of the place in English",
  },
};

export function getEntityDisplayLabel(type, targetModule = "map") {
  if (targetModule === "map" && MAP_ENTITY_META[type]) {
    return MAP_ENTITY_META[type].label;
  }
  return type;
}

export function getEntitySingular(type, targetModule = "map") {
  if (targetModule === "map" && MAP_ENTITY_META[type]) {
    return MAP_ENTITY_META[type].singular;
  }
  return type || "Record";
}

export function getEntityPlural(type, targetModule = "map") {
  if (targetModule === "map" && MAP_ENTITY_META[type]) {
    return MAP_ENTITY_META[type].plural;
  }
  return type ? `${type} listings` : "directory establishments";
}

export default function AdminFormBuilder({ onStatsChange = () => {} }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [catalog, setCatalog] = useState(null);

  // Filters
  const [moduleFilter, setModuleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingFormId, setEditingFormId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    instructions: "",
    targetModule: "map",
    entityType: "village",
    purpose: "both",
    targetEntityId: "",
    targetEntityName: "",
    fields: [],
    attachmentsConfig: {
      enabled: false,
      maxFiles: 3,
      maxSizeMb: 5,
    },
    status: "published",
  });

  // Entity selection for correction forms
  const [availableEntities, setAvailableEntities] = useState([]);
  const [entitySearch, setEntitySearch] = useState("");
  const [loadingEntities, setLoadingEntities] = useState(false);

  // Preview Modal State
  const [previewForm, setPreviewForm] = useState(null);

  // Share Modal State
  const [shareForm, setShareForm] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedInstagram, setCopiedInstagram] = useState(false);
  const [customInviteMessage, setCustomInviteMessage] = useState("");
  const [nativeShareSuccess, setNativeShareSuccess] = useState(false);
  const [nativeShareNotification, setNativeShareNotification] = useState("");

  const token = getAuthToken();
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // Public Form Navbar & Footer Visibility State
  const [hideNavbarAndFooter, setHideNavbarAndFooter] = useState(false);
  const [updatingNavbarSetting, setUpdatingNavbarSetting] = useState(false);

  // Public Form Contact & Verification Note Visibility State
  const [hideContactAndVerification, setHideContactAndVerification] = useState(false);
  const [updatingContactSetting, setUpdatingContactSetting] = useState(false);

  // Fetch catalog & forms on mount
  const fetchFormsAndCatalog = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [catRes, formsRes, settingsRes] = await Promise.all([
        API.get("/forms/catalog", { headers: authHeaders }),
        API.get("/forms", { headers: authHeaders }),
        API.get("/settings").catch(() => ({ data: { settings: {} } })),
      ]);
      setCatalog(catRes.data);
      setForms(Array.isArray(formsRes.data) ? formsRes.data : []);
      if (settingsRes.data?.settings?.contributionFormSettings) {
        setHideNavbarAndFooter(Boolean(settingsRes.data.settings.contributionFormSettings.hideNavbarAndFooter));
        setHideContactAndVerification(Boolean(settingsRes.data.settings.contributionFormSettings.hideContactAndVerification));
      }
    } catch (err) {
      console.error("Failed to load forms:", err);
      setError(err.response?.data?.message || "Failed to load form builder data.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const handleToggleFormNavbar = async () => {
    const nextVal = !hideNavbarAndFooter;
    setUpdatingNavbarSetting(true);
    try {
      const res = await API.put(
        "/settings",
        {
          contributionFormSettings: {
            hideNavbarAndFooter: nextVal,
          },
        },
        { headers: authHeaders }
      );
      if (res.data?.success || res.status === 200) {
        setHideNavbarAndFooter(nextVal);
        clearCMSCache("settings");
        clearCMSCache();
        setSuccessMessage(
          nextVal
            ? "Public Form Navbar, Footer & Return button turned OFF (Hidden on all public forms)."
            : "Public Form Navbar, Footer & Return button turned ON (Visible on all public forms)."
        );
        setTimeout(() => setSuccessMessage(""), 4000);
      }
    } catch (err) {
      console.error("Failed to update form navbar setting:", err);
      setError(err.response?.data?.message || "Failed to update navbar setting.");
      setTimeout(() => setError(""), 4000);
    } finally {
      setUpdatingNavbarSetting(false);
    }
  };

  const handleToggleContactSection = async () => {
    const nextVal = !hideContactAndVerification;
    setUpdatingContactSetting(true);
    try {
      const res = await API.put(
        "/settings",
        {
          contributionFormSettings: {
            hideContactAndVerification: nextVal,
          },
        },
        { headers: authHeaders }
      );
      if (res.data?.success || res.status === 200) {
        setHideContactAndVerification(nextVal);
        clearCMSCache("settings");
        clearCMSCache();
        setSuccessMessage(
          nextVal
            ? "Public Form 'Your Contact & Verification Note' section turned OFF (Hidden on all public forms)."
            : "Public Form 'Your Contact & Verification Note' section turned ON (Visible on all public forms)."
        );
        setTimeout(() => setSuccessMessage(""), 4000);
      }
    } catch (err) {
      console.error("Failed to update contact section setting:", err);
      setError(err.response?.data?.message || "Failed to update contact section setting.");
      setTimeout(() => setError(""), 4000);
    } finally {
      setUpdatingContactSetting(false);
    }
  };

  useEffect(() => {
    fetchFormsAndCatalog();
  }, [fetchFormsAndCatalog]);

  // Fetch entities when module or category changes or user searches
  const fetchEntitiesForModule = useCallback(
    async (targetModule, entityType = "", search = "") => {
      setLoadingEntities(true);
      try {
        const queryParams = new URLSearchParams();
        if (entityType) queryParams.set("entityType", entityType);
        if (search) queryParams.set("search", search);
        const qStr = queryParams.toString() ? `?${queryParams.toString()}` : "";
        const res = await API.get(
          `/forms/entities/${targetModule}${qStr}`,
          { headers: authHeaders }
        );
        setAvailableEntities(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching entities:", err);
      } finally {
        setLoadingEntities(false);
      }
    },
    [authHeaders]
  );

  useEffect(() => {
    if (isEditorOpen && formData.purpose !== "new_entity") {
      fetchEntitiesForModule(formData.targetModule, formData.entityType, entitySearch);
    }
  }, [isEditorOpen, formData.targetModule, formData.entityType, formData.purpose, entitySearch, fetchEntitiesForModule]);

  // Dynamic entity type / category options with fallback to all supported categories
  const entityTypeOptions = useMemo(() => {
    const fromCatalog = catalog?.entityTypes?.[formData.targetModule];
    if (Array.isArray(fromCatalog) && fromCatalog.length > 0) return fromCatalog;
    return formData.targetModule === "map"
      ? SUPPORTED_MAP_ENTITY_TYPES
      : SUPPORTED_DIRECTORY_CATEGORIES;
  }, [catalog, formData.targetModule]);

  // Filter available entities strictly matching selected category
  const filteredAvailableEntities = useMemo(() => {
    if (!Array.isArray(availableEntities)) return [];
    if (!formData.entityType) return availableEntities;
    const cleanType = String(formData.entityType).toLowerCase().trim();
    return availableEntities.filter((ent) => {
      if (formData.targetModule === "map") {
        const entType = String(ent.entityType || ent.category || "").toLowerCase().trim();
        return entType === cleanType;
      }
      return String(ent.category || "").toLowerCase().trim() === cleanType;
    });
  }, [availableEntities, formData.entityType, formData.targetModule]);

  // Handle category change dynamically without wiping unrelated form inputs
  const handleEntityTypeChange = (newEntityType) => {
    setEntitySearch("");
    setFormData((prev) => {
      // If current targetEntityId is incompatible with the new category, clear it gracefully
      let nextTargetId = prev.targetEntityId;
      let nextTargetName = prev.targetEntityName;
      if (nextTargetId && availableEntities.length > 0) {
        const cleanNew = String(newEntityType).toLowerCase().trim();
        const found = availableEntities.find((e) => {
          if (e.id !== nextTargetId) return false;
          const eCat = String(e.category || e.entityType || "").toLowerCase().trim();
          return eCat === cleanNew;
        });
        if (!found) {
          nextTargetId = "";
          nextTargetName = "";
        }
      }

      // Synchronize schema field labels or defaults for the selected map entity type
      const meta = MAP_ENTITY_META[newEntityType];
      const updatedFields = prev.fields.map((f) => {
        if (f.name === "entityType") {
          return { ...f, defaultValue: newEntityType };
        }
        if (prev.targetModule === "map" && f.name === "name" && meta) {
          return {
            ...f,
            label: meta.nameLabel,
            description: meta.nameDesc,
          };
        }
        return f;
      });

      return {
        ...prev,
        entityType: newEntityType,
        targetEntityId: nextTargetId,
        targetEntityName: nextTargetName,
        fields: updatedFields,
      };
    });
  };

  // Handle open create modal
  const handleOpenCreate = () => {
    setShareForm(null);
    setEditingFormId(null);
    const defaultFields =
      catalog?.allowedFields?.map?.slice(0, 5).map((f, idx) => ({
        name: f.name,
        label: f.label,
        type: f.type,
        description: f.description || "",
        required: f.required || false,
        defaultValue: "",
        order: idx,
        isEditableInCorrection: true,
      })) || [];

    setFormData({
      title: "",
      slug: "",
      description: "",
      instructions: "Please enter accurate information. All coordinates and addresses must be referenced via Google Maps.",
      targetModule: "map",
      entityType: "village",
      purpose: "both",
      targetEntityId: "",
      targetEntityName: "",
      fields: defaultFields,
      attachmentsConfig: {
        enabled: true,
        maxFiles: 3,
        maxSizeMb: 5,
      },
      status: "published",
    });
    setEntitySearch("");
    setIsEditorOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (form) => {
    setShareForm(null);
    setEditingFormId(form._id);
    setFormData({
      title: form.title || "",
      slug: form.slug || "",
      description: form.description || "",
      instructions: form.instructions || "",
      targetModule: form.targetModule || "map",
      entityType: form.entityType || "",
      purpose: form.purpose || "both",
      targetEntityId: form.targetEntityId || "",
      targetEntityName: form.targetEntityName || "",
      fields: form.fields ? JSON.parse(JSON.stringify(form.fields)) : [],
      attachmentsConfig: form.attachmentsConfig || {
        enabled: false,
        maxFiles: 3,
        maxSizeMb: 5,
      },
      status: form.status || "published",
    });
    setEntitySearch("");
    setIsEditorOpen(true);
  };

  // Field manipulation helpers
  const handleAddField = (fieldName) => {
    let fieldDef = null;
    if (catalog?.allowedFields?.[formData.targetModule]) {
      fieldDef = catalog.allowedFields[formData.targetModule].find((f) => f.name === fieldName);
    }
    // Dedicated geospatial field definitions for rapid admin configuration
    if (!fieldDef) {
      if (fieldName === "latitude") {
        fieldDef = {
          name: "latitude",
          label: "Latitude (North)",
          type: "latitude",
          description: "Decimal latitude coordinate between -90 and 90 (e.g. 26.7095)",
          required: true,
        };
      } else if (fieldName === "longitude") {
        fieldDef = {
          name: "longitude",
          label: "Longitude (East)",
          type: "longitude",
          description: "Decimal longitude coordinate between -180 and 180 (e.g. 84.0507)",
          required: true,
        };
      } else if (fieldName === "googleMapsUrl") {
        fieldDef = {
          name: "googleMapsUrl",
          label: "Google Maps Location Link",
          type: "googleMapsUrl",
          description: "Authentic Google Maps location or share link (Google Maps only)",
          required: true,
        };
      }
    }
    if (!fieldDef) return;

    if (formData.fields.some((f) => f.name === fieldName)) {
      alert("This field is already added to the form.");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          name: fieldDef.name,
          label: fieldDef.label,
          type: fieldDef.type,
          description: fieldDef.description || "",
          required: fieldDef.required || false,
          defaultValue: "",
          order: prev.fields.length,
          isEditableInCorrection: true,
        },
      ],
    }));
  };

  const handleRemoveField = (index) => {
    setFormData((prev) => {
      const updated = prev.fields.filter((_, i) => i !== index);
      return {
        ...prev,
        fields: updated.map((f, idx) => ({ ...f, order: idx })),
      };
    });
  };

  const handleMoveField = (index, direction) => {
    setFormData((prev) => {
      const newFields = [...prev.fields];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= newFields.length) return prev;

      const temp = newFields[index];
      newFields[index] = newFields[targetIndex];
      newFields[targetIndex] = temp;

      return {
        ...prev,
        fields: newFields.map((f, idx) => ({ ...f, order: idx })),
      };
    });
  };

  const handleFieldChange = (index, key, val) => {
    setFormData((prev) => {
      const newFields = [...prev.fields];
      newFields[index] = { ...newFields[index], [key]: val };
      return { ...prev, fields: newFields };
    });
  };

  // Submit create or edit form
  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Please provide a title for the form.");
      return;
    }
    if (!formData.entityType || !formData.entityType.trim()) {
      alert("Please select a valid Entity Type / Category.");
      return;
    }
    if (formData.fields.length === 0) {
      alert("Please add at least one field to the form.");
      return;
    }

    try {
      if (editingFormId) {
        await API.put(`/forms/${editingFormId}`, formData, { headers: authHeaders });
        setSuccessMessage("Form configuration updated successfully.");
      } else {
        await API.post("/forms", formData, { headers: authHeaders });
        setSuccessMessage("Public contribution form created successfully.");
      }
      setIsEditorOpen(false);
      fetchFormsAndCatalog();
      onStatsChange();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save form configuration.");
    }
  };

  // Toggle status
  const handleToggleStatus = async (form) => {
    const nextStatus = form.status === "published" ? "disabled" : "published";
    try {
      await API.patch(`/forms/${form._id}/status`, { status: nextStatus }, { headers: authHeaders });
      fetchFormsAndCatalog();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status.");
    }
  };

  // Delete form
  const handleDeleteForm = async (formId, formTitle) => {
    if (!window.confirm(`Are you sure you want to delete form "${formTitle}"? Existing submissions will remain recorded.`)) {
      return;
    }
    try {
      await API.delete(`/forms/${formId}`, { headers: authHeaders });
      fetchFormsAndCatalog();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete form.");
    }
  };

  // Copy & Share URL helpers
  const getPublicFormUrl = (slug) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/contribute/${slug}`;
  };

  const getInitialInviteMessage = (form) => {
    if (!form) return "";
    const url = getPublicFormUrl(form.slug);
    const purposeText =
      form.purpose === "new_entity"
        ? "proposing new records"
        : form.purpose === "correction"
        ? `suggesting updates & corrections for ${form.targetEntityName || "records"}`
        : "contributing verified town records and corrections";
    return `Fazilnagar Town Portal — Community Contribution Request\n\nForm: ${form.title}\nPurpose: We are gathering verified information for ${purposeText} on the official Fazilnagar map & directory.\n\nPlease open this public link to contribute directly (no account or login required):\n${url}\n\nYour participation helps maintain accurate local information for our community!`;
  };

  const handleOpenShare = (form) => {
    setIsEditorOpen(false);
    setShareForm(form);
    setCopiedLink(false);
    setCopiedMessage(false);
    setCopiedInstagram(false);
    setNativeShareSuccess(false);
    setNativeShareNotification("");
    setCustomInviteMessage(getInitialInviteMessage(form));
  };

  const handleResetInviteMessage = () => {
    if (shareForm) {
      setCustomInviteMessage(getInitialInviteMessage(shareForm));
    }
  };

  const handleCopyLinkOnly = async () => {
    if (!shareForm) return;
    const url = getPublicFormUrl(shareForm.slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleCopyInviteMessage = async () => {
    if (!customInviteMessage) return;
    try {
      await navigator.clipboard.writeText(customInviteMessage);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleCopyInstagramLink = async () => {
    if (!shareForm) return;
    const url = getPublicFormUrl(shareForm.slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedInstagram(true);
      setTimeout(() => setCopiedInstagram(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleNativeShare = async () => {
    if (!shareForm) return;
    const url = getPublicFormUrl(shareForm.slug);
    setNativeShareNotification("");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareForm.title,
          text: customInviteMessage,
          url: url,
        });
        setNativeShareSuccess(true);
        setTimeout(() => setNativeShareSuccess(false), 3000);
      } catch (err) {
        if (err.name !== "AbortError") {
          // Gracefully fallback to copying the invitation message
          await handleCopyInviteMessage();
          setNativeShareNotification("Native share was not completed. The invitation message was copied to your clipboard!");
          setTimeout(() => setNativeShareNotification(""), 4500);
        }
      }
    } else {
      // Graceful fallback for browsers without Web Share API
      await handleCopyInviteMessage();
      setNativeShareNotification("Native device sharing is not supported on this browser. The full invitation message has been copied to your clipboard!");
      setTimeout(() => setNativeShareNotification(""), 5000);
    }
  };

  // Filtered forms list
  const filteredForms = useMemo(() => {
    return forms.filter((f) => {
      if (moduleFilter !== "all" && f.targetModule !== moduleFilter) return false;
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = f.title?.toLowerCase().includes(q);
        const matchSlug = f.slug?.toLowerCase().includes(q);
        const matchType = f.entityType?.toLowerCase().includes(q);
        return matchTitle || matchSlug || matchType;
      }
      return true;
    });
  }, [forms, moduleFilter, statusFilter, searchQuery]);

  // Reusable Public Form Preview Modal
  const renderPreviewModal = () => {
    if (!previewForm) return null;
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full my-auto max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold">Public Form Preview</h3>
            </div>
            <button
              type="button"
              onClick={() => setPreviewForm(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                {previewForm.targetModule === "map" ? "🗺️ Town Map" : "🏢 Town Directory"}
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 mt-2">{previewForm.title}</h2>
              <p className="text-xs text-slate-600 mt-1">{previewForm.description}</p>
              {previewForm.instructions && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                  ℹ️ <strong>Instructions:</strong> {previewForm.instructions}
                </div>
              )}
            </div>

            <div className="space-y-3.5">
              {previewForm.fields?.map((f) => (
                <div key={f.name}>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </label>
                  {f.description && <p className="text-[10px] text-slate-500 mb-1">{f.description}</p>}
                  {f.type === "textarea" ? (
                    <textarea
                      disabled
                      rows={2}
                      className="w-full bg-slate-100 border border-slate-300 rounded-lg p-2 text-xs opacity-75"
                      placeholder="Citizen input area..."
                    />
                  ) : f.type === "select" ? (
                    <select disabled className="w-full bg-slate-100 border border-slate-300 rounded-lg p-2 text-xs opacity-75">
                      <option>-- Select an option --</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      className="w-full bg-slate-100 border border-slate-300 rounded-lg p-2 text-xs opacity-75"
                      placeholder={f.name === "googleMapsUrl" ? "https://maps.google.com/..." : "Citizen input..."}
                    />
                  )}
                </div>
              ))}

              {previewForm.attachmentsConfig?.enabled && (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-700">Attach Photos or Verification Proof</p>
                  <p className="text-[10px] text-slate-500">
                    Up to {previewForm.attachmentsConfig.maxFiles} files (max {previewForm.attachmentsConfig.maxSizeMb}MB each)
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => setPreviewForm(null)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Close Preview
            </button>

            <button
              type="button"
              onClick={() => {
                const f = previewForm;
                setPreviewForm(null);
                handleOpenShare(f);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0D5E49] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share This Form</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 1. FULL PAGE: Dynamic Form Creator / Generator Page
  if (isEditorOpen) {
    return (
      <div className="space-y-6 pb-24 animate-in fade-in duration-150">
        {/* Top Sticky Header & Action Bar */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs sticky top-0 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsEditorOpen(false)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-xl transition cursor-pointer shrink-0"
              title="Return to forms table"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Forms</span>
            </button>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                <FileText className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 font-heading truncate">
                  {editingFormId ? `Edit Form: ${formData.title || "Untitled"}` : "Create Dynamic Public Form"}
                </h2>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-slate-500 font-medium">
                  <span className="font-semibold text-emerald-700">
                    {formData.targetModule === "map" ? "🗺️ Map Entity Form" : "🏢 Directory Entity Form"}
                  </span>
                  <span>&bull;</span>
                  <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                    {formData.slug ? `/contribute/${formData.slug}` : "Auto-slug on save"}
                  </span>
                  <span>&bull;</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      formData.status === "published"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {formData.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsEditorOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="form-generator-editor-form"
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#0D5E49] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingFormId ? "Save Changes" : "Create & Publish"}</span>
            </button>
          </div>
        </div>

        {/* Full-Page Form Body Container */}
        <form id="form-generator-editor-form" onSubmit={handleSaveForm} className="space-y-6 max-w-5xl mx-auto">
          {/* 1. Basic Details */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700">
                <FileText className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">1. Basic Details</h3>
                <p className="text-xs text-slate-500">Define the form title, URL slug, and public instructions for citizens.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Form Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Propose Village Boundary & Coordinates"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Custom URL Slug (Optional)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="Auto-generated if left blank"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief summary explaining what information this form collects..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Public Instructions</label>
              <textarea
                rows={3}
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Provide helpful instructions for public contributors. Remind them to verify coordinates or places on Google Maps."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition leading-relaxed"
              />
            </div>
          </div>

          {/* 2. Module & Scope */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700">
                <Layers className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">2. Module &amp; Scope</h3>
                <p className="text-xs text-slate-500">Determine whether this form attaches to Town Map entities or Town Directory listings.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Module *</label>
                <select
                  value={formData.targetModule}
                  disabled={Boolean(editingFormId)}
                  onChange={(e) => {
                    const nextMod = e.target.value;
                    const defaultType = nextMod === "map" ? "village" : "Schools & Colleges";
                    const defaultCatalogFields = catalog?.allowedFields?.[nextMod] || [];
                    setFormData({
                      ...formData,
                      targetModule: nextMod,
                      entityType: defaultType,
                      targetEntityId: "",
                      targetEntityName: "",
                      fields: defaultCatalogFields.slice(0, 5).map((f, i) => ({
                        name: f.name,
                        label: f.label,
                        type: f.type,
                        description: f.description || "",
                        required: f.required || false,
                        order: i,
                        isEditableInCorrection: true,
                      })),
                    });
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="map">🗺️ Map Entities</option>
                  <option value="directory">🏢 Directory</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Entity Type / Category *</label>
                <select
                  value={formData.entityType}
                  onChange={(e) => handleEntityTypeChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {entityTypeOptions.map((t) => (
                    <option key={t} value={t}>
                      {getEntityDisplayLabel(t, formData.targetModule)}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Scope: <span className="font-semibold text-emerald-700">{getEntitySingular(formData.entityType, formData.targetModule)}</span> records
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Form Purpose *</label>
                <select
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="both">Both New Records &amp; Corrections</option>
                  <option value="correction">Corrections Only</option>
                  <option value="new_entity">New Records Only</option>
                </select>
              </div>
            </div>

            {/* Specific Entity Selection for Correction Forms */}
            {formData.purpose !== "new_entity" && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Target Specific Existing {getEntitySingular(formData.entityType, formData.targetModule)} (Optional — for record-specific updates)
                  </label>
                  {loadingEntities && (
                    <span className="text-[11px] text-slate-400">Loading {getEntityPlural(formData.entityType, formData.targetModule)}...</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={entitySearch}
                    onChange={(e) => setEntitySearch(e.target.value)}
                    placeholder={`Search existing ${getEntityPlural(formData.entityType, formData.targetModule)}...`}
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {entitySearch && (
                    <button
                      type="button"
                      onClick={() => setEntitySearch("")}
                      className="px-2.5 py-2 text-xs bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 font-semibold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <select
                  value={formData.targetEntityId}
                  onChange={(e) => {
                    const chosen = filteredAvailableEntities.find((ent) => ent.id === e.target.value);
                    setFormData({
                      ...formData,
                      targetEntityId: e.target.value,
                      targetEntityName: chosen ? chosen.name : "",
                    });
                  }}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">
                    -- Allow contributor to select any {getEntitySingular(formData.entityType, formData.targetModule).toLowerCase()} at submission time --
                  </option>
                  {filteredAvailableEntities.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name} {ent.hindiName ? `(${ent.hindiName})` : ""} &bull; {ent.category || ent.entityType}
                    </option>
                  ))}
                </select>

                {filteredAvailableEntities.length === 0 && !loadingEntities && (
                  <p className="text-[11px] text-slate-500 italic">
                    No matching {getEntityPlural(formData.entityType, formData.targetModule)} found. Contributors can submit new records or specify an entity manually.
                  </p>
                )}

                {formData.targetEntityName && (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-[11px] text-emerald-800 font-medium">
                    <span>
                      Selected Target: <strong className="font-bold">{formData.targetEntityName}</strong> (ID: {formData.targetEntityId})
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, targetEntityId: "", targetEntityName: "" })}
                      className="text-emerald-700 hover:text-emerald-900 font-bold underline ml-2 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Dynamic Field Builder */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">3. Configured Fields</h3>
                <p className="text-xs text-slate-500">
                  Build dynamic fields with custom labels, input types, coordinate constraints, and ordering.
                </p>
              </div>

              {/* Add Schema Field Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddField(e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold focus:outline-none cursor-pointer transition shadow-2xs"
                >
                  <option value="">+ Add Schema Field...</option>
                  {(catalog?.allowedFields?.[formData.targetModule] || []).map((f) => (
                    <option
                      key={f.name}
                      value={f.name}
                      disabled={formData.fields.some((ex) => ex.name === f.name)}
                    >
                      {f.label} ({f.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dedicated Geospatial Field Quick-Add Toolbar */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-50/70 via-blue-50/50 to-rose-50/60 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2.5 text-xs">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#0D5E49]" />
                <span>Quick-Add Location Fields:</span>
              </span>

              <button
                type="button"
                onClick={() => handleAddField("latitude")}
                disabled={formData.fields.some((f) => f.name === "latitude")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-bold text-xs shadow-2xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Add Latitude field (-90 to 90 degrees)"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ Latitude (-90 to 90)</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddField("longitude")}
                disabled={formData.fields.some((f) => f.name === "longitude")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 rounded-lg font-bold text-xs shadow-2xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Add Longitude field (-180 to 180 degrees)"
              >
                <Compass className="w-3.5 h-3.5 text-blue-600" />
                <span>+ Longitude (-180 to 180)</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddField("googleMapsUrl")}
                disabled={formData.fields.some((f) => f.name === "googleMapsUrl")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-800 border border-rose-200 rounded-lg font-bold text-xs shadow-2xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Add Google Maps Location Link field (Google Maps only)"
              >
                <MapPin className="w-3.5 h-3.5 text-rose-600" />
                <span>+ Google Maps Location Link</span>
              </button>
            </div>

            {/* Configured Fields List */}
            <div className="space-y-3">
              {formData.fields.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                  No fields added yet. Choose a schema field above or use Quick-Add Location Fields.
                </div>
              ) : (
                formData.fields.map((field, idx) => (
                  <div
                    key={field.name}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition ${
                      field.type === "latitude"
                        ? "bg-emerald-50/40 border-emerald-200"
                        : field.type === "longitude"
                        ? "bg-blue-50/40 border-blue-200"
                        : field.type === "googleMapsUrl"
                        ? "bg-rose-50/40 border-rose-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-700 font-bold">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => handleFieldChange(idx, "label", e.target.value)}
                          className="font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs w-48 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          placeholder="Field Label"
                        />
                        <span className="text-[10px] text-slate-500 font-mono">({field.name})</span>

                        {/* Configurable Field Type Selector */}
                        <select
                          value={field.type}
                          onChange={(e) => handleFieldChange(idx, "type", e.target.value)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                            field.type === "latitude"
                              ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                              : field.type === "longitude"
                              ? "bg-blue-100 text-blue-900 border-blue-300"
                              : field.type === "googleMapsUrl"
                              ? "bg-rose-100 text-rose-900 border-rose-300"
                              : "bg-white text-slate-700 border-slate-300"
                          }`}
                        >
                          <option value="text">Text Input</option>
                          <option value="textarea">Multi-line Text</option>
                          <option value="number">Numeric</option>
                          <option value="latitude">🌐 Latitude (-90 to 90)</option>
                          <option value="longitude">🧭 Longitude (-180 to 180)</option>
                          <option value="googleMapsUrl">📍 Google Maps Link (Strict)</option>
                          <option value="select">Dropdown Select</option>
                          <option value="phone">Phone Number</option>
                          <option value="url">Website URL</option>
                          <option value="address">Address</option>
                          <option value="image">Image Attachment</option>
                        </select>

                        {field.type === "latitude" && (
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Bounds: -90° to 90°
                          </span>
                        )}
                        {field.type === "longitude" && (
                          <span className="text-[10px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                            Bounds: -180° to 180°
                          </span>
                        )}
                        {field.type === "googleMapsUrl" && (
                          <span className="text-[10px] font-semibold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                            Google Maps Only
                          </span>
                        )}
                      </div>

                      <input
                        type="text"
                        value={field.description}
                        onChange={(e) => handleFieldChange(idx, "description", e.target.value)}
                        placeholder="Field help text / instructions for public contributors..."
                        className="w-full text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => handleFieldChange(idx, "required", e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-0 cursor-pointer"
                        />
                        <span>Required</span>
                      </label>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Move Field Up"
                          disabled={idx === 0}
                          onClick={() => handleMoveField(idx, -1)}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition shadow-2xs"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Move Field Down"
                          disabled={idx === formData.fields.length - 1}
                          onClick={() => handleMoveField(idx, 1)}
                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition shadow-2xs"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Remove Field"
                          onClick={() => handleRemoveField(idx)}
                          className="p-1.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer transition shadow-2xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 4. Attachments & Evidence */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="p-1 rounded-lg bg-emerald-50 text-emerald-700">
                <Upload className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">4. Attachments &amp; Evidence</h3>
                <p className="text-xs text-slate-500">Configure photo uploads or document submissions for verification.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 select-none">
                <input
                  type="checkbox"
                  checked={formData.attachmentsConfig.enabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      attachmentsConfig: { ...formData.attachmentsConfig, enabled: e.target.checked },
                    })
                  }
                  className="rounded text-emerald-600 focus:ring-0 cursor-pointer w-4 h-4"
                />
                <span>Allow public contributors to upload photos or verification proof</span>
              </label>

              {formData.attachmentsConfig.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Max Files Allowed</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={formData.attachmentsConfig.maxFiles}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          attachmentsConfig: {
                            ...formData.attachmentsConfig,
                            maxFiles: parseInt(e.target.value, 10) || 1,
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Max File Size (MB)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={formData.attachmentsConfig.maxSizeMb}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          attachmentsConfig: {
                            ...formData.attachmentsConfig,
                            maxSizeMb: parseInt(e.target.value, 10) || 5,
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5. Publication Status */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900">5. Publication Status</h3>
            <p className="text-xs text-slate-500">Published forms are accessible publicly. Draft forms are only viewable by admins.</p>
            <div className="flex flex-wrap items-center gap-6 pt-1 text-xs font-medium text-slate-800">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="status"
                  value="published"
                  checked={formData.status === "published"}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="text-emerald-600 focus:ring-0 cursor-pointer"
                />
                <span className="font-bold text-emerald-800">Published (Accepting public submissions)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={formData.status === "draft"}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="text-slate-600 focus:ring-0 cursor-pointer"
                />
                <span className="font-semibold text-slate-600">Draft (Admin only — submissions closed)</span>
              </label>
            </div>
          </div>

          {/* Bottom Action Footer Bar */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsEditorOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Discard &amp; Return to All Forms
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0D5E49] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingFormId ? "Save Changes" : "Create & Publish Form"}</span>
            </button>
          </div>
        </form>

        {renderPreviewModal()}
      </div>
    );
  }

  // 2. FULL PAGE: Form Sharing & Social Broadcast Page
  if (shareForm) {
    return (
      <div className="space-y-6 pb-24 animate-in fade-in duration-150">
        {/* Top Sticky Header & Action Bar */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs sticky top-0 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShareForm(null)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-xl transition cursor-pointer shrink-0"
              title="Return to forms table"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Forms</span>
            </button>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                <Share2 className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 font-heading truncate">
                  Share Public Contribution Form
                </h2>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-slate-500 font-medium">
                  <span className="font-bold text-slate-800 truncate max-w-[260px]">{shareForm.title}</span>
                  <span>&bull;</span>
                  <span className="font-semibold text-emerald-700 capitalize">{shareForm.targetModule}</span>
                  <span>&bull;</span>
                  <span className="text-slate-600">({shareForm.entityType})</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={getPublicFormUrl(shareForm.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <span>Open Public Form</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => handleOpenEdit(shareForm)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Form</span>
            </button>
          </div>
        </div>

        {/* Full-Page Share Container */}
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Submissions Closed Warning Banner */}
          {shareForm.status !== "published" && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3 shadow-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="font-bold text-sm">Form Submissions Closed ({shareForm.status.toUpperCase()})</p>
                <p className="text-xs text-amber-800">
                  Visitors opening this public link will see that this form is not currently accepting entries. Enable submissions by publishing the form now.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await handleToggleStatus(shareForm);
                      setShareForm((prev) => (prev ? { ...prev, status: "published" } : null));
                    }}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Publish Form Now</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Native Share Notification / Feedback Alert */}
          {nativeShareNotification && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-medium">{nativeShareNotification}</span>
            </div>
          )}

          {/* Section 1: Permanent Public Form Link */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  1. Permanent Public Form URL
                </h4>
                <p className="text-[11px] text-slate-500">Direct, login-free citizen access. Share this URL anywhere across town.</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                Permanent URL
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <input
                type="text"
                readOnly
                value={getPublicFormUrl(shareForm.slug)}
                className="w-full bg-transparent text-xs font-mono text-slate-800 outline-none select-all truncate px-1"
              />
              <button
                type="button"
                onClick={handleCopyLinkOnly}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  copiedLink
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs"
                }`}
                title="Copy permanent link"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
              <span>Anyone with this link can propose or correct town records.</span>
              <a
                href={getPublicFormUrl(shareForm.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-bold hover:underline"
              >
                <span>Open Public Form in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Section 2: Ready-to-Share Invitation Message */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  2. Ready-to-Share Community Invitation Message
                </h4>
                <p className="text-[11px] text-slate-500">Edit or personalize this message before broadcasting to local town groups.</p>
              </div>
              <button
                type="button"
                onClick={handleResetInviteMessage}
                className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 font-semibold cursor-pointer"
                title="Reset to default template"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>
            </div>

            <textarea
              rows={6}
              value={customInviteMessage}
              onChange={(e) => setCustomInviteMessage(e.target.value)}
              placeholder="Edit your personalized community message..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition leading-relaxed font-sans"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-slate-500">
                {customInviteMessage.length} characters &bull; Optimized for WhatsApp, SMS, or Instagram DMs
              </span>
              <button
                type="button"
                onClick={handleCopyInviteMessage}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  copiedMessage
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
                }`}
              >
                {copiedMessage ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Message Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Invitation Message</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section 3: Direct Social & Device Sharing */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                3. Instant Social &amp; Device Sharing
              </h4>
              <p className="text-[11px] text-slate-500">Broadcast directly to local residents in 1 click.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* WhatsApp Share */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(customInviteMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 transition shadow-xs cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Share via WhatsApp</span>
              </a>

              {/* Native Device Web Share API */}
              <button
                type="button"
                onClick={handleNativeShare}
                className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 transition shadow-xs cursor-pointer ${
                  nativeShareSuccess
                    ? "bg-emerald-800 text-white"
                    : "bg-[#0D5E49] hover:bg-emerald-900 text-white"
                }`}
                title="Share using native mobile sheet (iOS, Android, Chrome)"
              >
                <Smartphone className="w-4 h-4" />
                <span>{nativeShareSuccess ? "Shared Successfully!" : "Share via Device (Sheet)"}</span>
              </button>
            </div>
          </div>

          {/* Section 4: Instagram & Facebook Community Guidance */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📸</span>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  4. Instagram Stories, Bio &amp; Facebook Sharing
                </h4>
                <p className="text-[11px] text-slate-500">Reach youth and local community groups on social networks.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 text-xs leading-relaxed">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <p className="font-bold text-slate-800 mb-1">Instagram Stories</p>
                  <p className="text-[11px]">
                    Create a Story, tap the <strong>Sticker</strong> icon, choose <strong>LINK</strong>, and paste the URL.
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <p className="font-bold text-slate-800 mb-1">Instagram Bio &amp; DMs</p>
                  <p className="text-[11px]">
                    Paste directly in your account bio link or DM directly to town group chats and local admins.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopyInstagramLink}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-2 ${
                    copiedInstagram
                      ? "bg-pink-600 text-white shadow-xs"
                      : "bg-white border border-pink-300 text-pink-700 hover:bg-pink-50 shadow-2xs"
                  }`}
                >
                  {copiedInstagram ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Link Copied for Instagram!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Link for Instagram Sticker</span>
                    </>
                  )}
                </button>

                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                    getPublicFormUrl(shareForm.slug)
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2 shadow-2xs cursor-pointer"
                >
                  <Globe className="w-4 h-4" />
                  <span>Share on Facebook</span>
                </a>
              </div>
            </div>
          </div>

          {/* Section 5: Form Status & Summary Overview */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Form Configuration Overview</h4>
              <p className="text-xs text-slate-500">
                Target: <strong className="capitalize text-slate-700">{shareForm.targetModule}</strong> &bull; Entity: <strong className="text-slate-700">{shareForm.entityType}</strong> &bull; Fields: <strong className="text-slate-700">{shareForm.fields?.length || 0}</strong> &bull; Attachments: <strong className="text-slate-700">{shareForm.attachmentsConfig?.enabled ? "Enabled" : "Disabled"}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewForm(shareForm)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Preview Citizen View</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenEdit(shareForm)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Configuration</span>
              </button>
            </div>
          </div>
        </div>

        {renderPreviewModal()}
      </div>
    );
  }

  // 3. MAIN DASHBOARD: Forms Directory & Management Grid
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#0D5E49]/10 text-[#0D5E49]">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 font-heading">
              Dynamic Contribution Form Builder
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Create custom public forms for citizen data contributions and record corrections. All location changes require Google Maps verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Public Form Navbar & Footer Turn ON/OFF Toggle */}
          <button
            type="button"
            id="form-builder-navbar-toggle"
            title="Turn on/off Navbar, Footer & Return button on public contribution forms (/forms/* & /contribute/*)"
            onClick={handleToggleFormNavbar}
            disabled={updatingNavbarSetting}
            className={`px-3 py-2 rounded-xl border transition flex items-center gap-2.5 select-none active:scale-95 cursor-pointer text-left ${
              hideNavbarAndFooter
                ? "bg-amber-50/90 border-amber-300 text-slate-900 shadow-2xs hover:bg-amber-100/70"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            } ${updatingNavbarSetting ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    hideNavbarAndFooter ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                  }`}
                />
                <span className="text-[11px] font-bold">Public Form Navbar &amp; Return:</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    hideNavbarAndFooter
                      ? "bg-amber-200 text-amber-900"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {hideNavbarAndFooter ? "OFF (Hidden)" : "ON (Visible)"}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {hideNavbarAndFooter
                  ? "Navbar, footer & return button hidden"
                  : "Navbar, footer & return button shown"}
              </div>
            </div>

            {/* Switch pill visual */}
            <div
              className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                hideNavbarAndFooter ? "bg-amber-500" : "bg-slate-300"
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-[3px] shadow-xs ${
                  hideNavbarAndFooter ? "left-[19px]" : "left-[3px]"
                }`}
              />
            </div>
          </button>

          {/* Public Form Contact & Verification Note Turn ON/OFF Toggle */}
          <button
            type="button"
            id="form-builder-contact-section-toggle"
            title="Turn on/off 'Your Contact & Verification Note' section on public contribution forms (/forms/* & /contribute/*)"
            onClick={handleToggleContactSection}
            disabled={updatingContactSetting}
            className={`px-3 py-2 rounded-xl border transition flex items-center gap-2.5 select-none active:scale-95 cursor-pointer text-left ${
              hideContactAndVerification
                ? "bg-amber-50/90 border-amber-300 text-slate-900 shadow-2xs hover:bg-amber-100/70"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            } ${updatingContactSetting ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    hideContactAndVerification ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                  }`}
                />
                <span className="text-[11px] font-bold">Contact &amp; Verification Note:</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    hideContactAndVerification
                      ? "bg-amber-200 text-amber-900"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {hideContactAndVerification ? "OFF (Hidden)" : "ON (Visible)"}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {hideContactAndVerification
                  ? "Name, phone/email & note hidden"
                  : "Name, phone/email & note shown"}
              </div>
            </div>

            {/* Switch pill visual */}
            <div
              className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                hideContactAndVerification ? "bg-amber-500" : "bg-slate-300"
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-[3px] shadow-xs ${
                  hideContactAndVerification ? "left-[19px]" : "left-[3px]"
                }`}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0D5E49] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Contribution Form</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search forms by title, slug, or entity type..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Modules</option>
            <option value="map">🗺️ Map Entities</option>
            <option value="directory">🏢 Directory</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="disabled">Disabled</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Forms Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading contribution forms...</div>
      ) : filteredForms.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800">No Contribution Forms Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Get started by creating your first dynamic form to accept public proposals or corrections.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-[#0D5E49] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Create Form
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredForms.map((form) => {
            const isPub = form.status === "published";
            return (
              <div
                key={form._id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        form.targetModule === "map"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : "bg-purple-100 text-purple-800 border border-purple-200"
                      }`}
                    >
                      {form.targetModule === "map" ? "🗺️ Map" : "🏢 Directory"} &bull; {form.entityType}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isPub
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : form.status === "draft"
                          ? "bg-slate-100 text-slate-700 border border-slate-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {form.status}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 line-clamp-1">{form.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 mb-3">
                    {form.description || "Public contribution form for town records."}
                  </p>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Purpose:</span>
                      <span className="font-semibold capitalize text-slate-800">
                        {form.purpose.replace("_", " ")}
                      </span>
                    </div>
                    {form.targetEntityName && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Target Entity:</span>
                        <span className="font-semibold text-slate-800 truncate max-w-[170px]">
                          {form.targetEntityName}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Configured Fields:</span>
                      <span className="font-bold text-slate-800">{form.fields?.length || 0} fields</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Submissions:</span>
                      <span className="font-bold text-slate-800">
                        {form.submissionCount || 0} total
                        {form.pendingCount > 0 && (
                          <span className="ml-1 text-amber-600 font-extrabold">({form.pendingCount} pending)</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenShare(form)}
                      title="Share Form via WhatsApp, Instagram, or Device"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#0D5E49] text-xs font-bold rounded-xl transition border border-emerald-200/90 cursor-pointer shadow-2xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share Form</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewForm(form)}
                      title="Preview Form"
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(form)}
                      title={isPub ? "Disable Submissions" : "Publish Form"}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      {isPub ? (
                        <ToggleRight className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(form)}
                      title="Edit Configuration"
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteForm(form._id, form.title)}
                      title="Delete Form"
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reusable Public Form Preview Modal */}
      {renderPreviewModal()}
    </div>
  );
}
