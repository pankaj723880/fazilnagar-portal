import { useState, useEffect, useMemo, useCallback } from "react";
import API from "../../api";
import { getAuthToken } from "../../utils/authStorage";
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

  // Fetch catalog & forms on mount
  const fetchFormsAndCatalog = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [catRes, formsRes] = await Promise.all([
        API.get("/forms/catalog", { headers: authHeaders }),
        API.get("/forms", { headers: authHeaders }),
      ]);
      setCatalog(catRes.data);
      setForms(Array.isArray(formsRes.data) ? formsRes.data : []);
    } catch (err) {
      console.error("Failed to load forms:", err);
      setError(err.response?.data?.message || "Failed to load form builder data.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchFormsAndCatalog();
  }, [fetchFormsAndCatalog]);

  // Fetch entities when module changes or user searches
  const fetchEntitiesForModule = useCallback(
    async (targetModule, search = "") => {
      setLoadingEntities(true);
      try {
        const res = await API.get(
          `/forms/entities/${targetModule}?search=${encodeURIComponent(search)}`,
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
      fetchEntitiesForModule(formData.targetModule, entitySearch);
    }
  }, [isEditorOpen, formData.targetModule, formData.purpose, entitySearch, fetchEntitiesForModule]);

  // Handle open create modal
  const handleOpenCreate = () => {
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

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0D5E49] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Contribution Form</span>
        </button>
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

      {/* Form Creator / Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold">
                  {editingFormId ? "Edit Contribution Form" : "Create Dynamic Public Form"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveForm} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Basic Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">1. Basic Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Form Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Propose Village Boundary & Coordinates"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Custom URL Slug (Optional)</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="Auto-generated if left blank"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of what this form is collecting"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Public Instructions</label>
                  <textarea
                    rows={2}
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Provide guidance to the public. For coordinates, remind them to verify via Google Maps."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Module & Purpose Target */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">2. Module & Scope</h4>
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="map">🗺️ Map Entities</option>
                      <option value="directory">🏢 Directory</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Entity Type / Category *</label>
                    <select
                      value={formData.entityType}
                      onChange={(e) => setFormData({ ...formData, entityType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {(catalog?.entityTypes?.[formData.targetModule] || []).map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Form Purpose *</label>
                    <select
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="both">Both New & Corrections</option>
                      <option value="correction">Corrections Only</option>
                      <option value="new_entity">New Entities Only</option>
                    </select>
                  </div>
                </div>

                {/* Specific Entity Selection for Correction Forms */}
                {formData.purpose !== "new_entity" && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Specific Existing Record (Optional — for entity-specific correction forms)
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={entitySearch}
                        onChange={(e) => setEntitySearch(e.target.value)}
                        placeholder={`Search ${formData.targetModule === "map" ? "villages/localities" : "directory places"}...`}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <select
                      value={formData.targetEntityId}
                      onChange={(e) => {
                        const chosen = availableEntities.find((ent) => ent.id === e.target.value);
                        setFormData({
                          ...formData,
                          targetEntityId: e.target.value,
                          targetEntityName: chosen ? chosen.name : "",
                        });
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">-- Allow user to select record at submission time --</option>
                      {availableEntities.map((ent) => (
                        <option key={ent.id} value={ent.id}>
                          {ent.name} {ent.hindiName ? `(${ent.hindiName})` : ""} &bull; {ent.category}
                        </option>
                      ))}
                    </select>
                    {formData.targetEntityName && (
                      <p className="text-[11px] text-emerald-700 mt-1 font-semibold">
                        Selected: {formData.targetEntityName} (ID: {formData.targetEntityId})
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic Field Builder */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">3. Configured Fields</h4>
                    <p className="text-[11px] text-slate-500">
                      Configure field types, labels, decimal boundaries, and ordering for {formData.targetModule}.
                    </p>
                  </div>

                  {/* Add Field Dropdown */}
                  <div className="flex items-center gap-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddField(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold focus:outline-none cursor-pointer"
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
                <div className="p-3 bg-gradient-to-r from-emerald-50/60 via-blue-50/40 to-rose-50/50 rounded-xl border border-slate-200/80 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0D5E49]" />
                    <span>Quick-Add Location Fields:</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleAddField("latitude")}
                    disabled={formData.fields.some((f) => f.name === "latitude")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-bold text-[11px] shadow-2xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Add Latitude field (-90 to 90 degrees)"
                  >
                    <Globe className="w-3 h-3 text-emerald-600" />
                    <span>+ Latitude (-90 to 90)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddField("longitude")}
                    disabled={formData.fields.some((f) => f.name === "longitude")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 rounded-lg font-bold text-[11px] shadow-2xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Add Longitude field (-180 to 180 degrees)"
                  >
                    <Compass className="w-3 h-3 text-blue-600" />
                    <span>+ Longitude (-180 to 180)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddField("googleMapsUrl")}
                    disabled={formData.fields.some((f) => f.name === "googleMapsUrl")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-800 border border-rose-200 rounded-lg font-bold text-[11px] shadow-2xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Add Google Maps Location Link field (Google Maps only)"
                  >
                    <MapPin className="w-3 h-3 text-rose-600" />
                    <span>+ Google Maps Location Link</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {formData.fields.map((field, idx) => (
                    <div
                      key={field.name}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition ${
                        field.type === "latitude"
                          ? "bg-emerald-50/40 border-emerald-200"
                          : field.type === "longitude"
                          ? "bg-blue-50/40 border-blue-200"
                          : field.type === "googleMapsUrl"
                          ? "bg-rose-50/40 border-rose-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-bold">
                            #{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => handleFieldChange(idx, "label", e.target.value)}
                            className="font-bold text-slate-800 bg-white border border-slate-300 rounded px-2 py-0.5 text-xs w-44 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            placeholder="Field Label"
                          />
                          <span className="text-[10px] text-slate-500 font-mono">({field.name})</span>

                          {/* Configurable Field Type Selector */}
                          <select
                            value={field.type}
                            onChange={(e) => handleFieldChange(idx, "type", e.target.value)}
                            className={`text-[11px] font-bold px-2 py-0.5 rounded border focus:outline-none cursor-pointer ${
                              field.type === "latitude"
                                ? "bg-emerald-100/80 text-emerald-900 border-emerald-300"
                                : field.type === "longitude"
                                ? "bg-blue-100/80 text-blue-900 border-blue-300"
                                : field.type === "googleMapsUrl"
                                ? "bg-rose-100/80 text-rose-900 border-rose-300"
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
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                              Bounds: -90° to 90°
                            </span>
                          )}
                          {field.type === "longitude" && (
                            <span className="text-[10px] font-semibold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">
                              Bounds: -180° to 180°
                            </span>
                          )}
                          {field.type === "googleMapsUrl" && (
                            <span className="text-[10px] font-semibold text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded">
                              Google Maps Only
                            </span>
                          )}
                        </div>

                        <input
                          type="text"
                          value={field.description}
                          onChange={(e) => handleFieldChange(idx, "description", e.target.value)}
                          placeholder="Field help text / instructions for contributors"
                          className="w-full text-[11px] text-slate-600 bg-white border border-slate-200 rounded px-2 py-0.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => handleFieldChange(idx, "required", e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-0"
                          />
                          <span>Required</span>
                        </label>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Move Field Up"
                            disabled={idx === 0}
                            onClick={() => handleMoveField(idx, -1)}
                            className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Move Field Down"
                            disabled={idx === formData.fields.length - 1}
                            onClick={() => handleMoveField(idx, 1)}
                            className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Remove Field"
                            onClick={() => handleRemoveField(idx)}
                            className="p-1 rounded bg-white border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments Configuration */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">4. Attachments & Evidence</h4>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.attachmentsConfig.enabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          attachmentsConfig: { ...formData.attachmentsConfig, enabled: e.target.checked },
                        })
                      }
                      className="rounded text-emerald-600 focus:ring-0"
                    />
                    <span>Allow public users to upload photos / proof documents</span>
                  </label>

                  {formData.attachmentsConfig.enabled && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Max Files</label>
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
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Max File Size (MB)</label>
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
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2 pt-4 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700">Initial Status</label>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="published"
                      checked={formData.status === "published"}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="text-emerald-600"
                    />
                    <span>Published (Accepting Submissions)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="draft"
                      checked={formData.status === "draft"}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="text-slate-600"
                    />
                    <span>Draft (Admin Only)</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0D5E49] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
                >
                  {editingFormId ? "Save Changes" : "Create & Publish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comprehensive Public Form Share Modal */}
      {shareForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                    <Share2 className="w-4 h-4" />
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Share Public Contribution Form
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {shareForm.title} &bull; <span className="font-semibold capitalize">{shareForm.targetModule}</span> ({shareForm.entityType})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShareForm(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning Banner if form is not published */}
            {shareForm.status !== "published" && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Form Submissions Closed ({shareForm.status.toUpperCase()})</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Visitors opening this link will see that this form is not currently accepting entries. Enable submissions by publishing the form.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleToggleStatus(shareForm);
                      setShareForm((prev) => (prev ? { ...prev, status: "published" } : null));
                    }}
                    className="mt-2 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold rounded-lg transition shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Publish Form Now</span>
                  </button>
                </div>
              </div>
            )}

            {/* Native Share Notification / Feedback Alert */}
            {nativeShareNotification && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{nativeShareNotification}</span>
              </div>
            )}

            {/* Section 1: Permanent Public Form Link */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                1. Permanent Public Form URL
              </label>
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <input
                  type="text"
                  readOnly
                  value={getPublicFormUrl(shareForm.slug)}
                  className="w-full bg-transparent text-xs font-mono text-slate-800 outline-none select-all truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLinkOnly}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                    copiedLink
                      ? "bg-emerald-600 text-white"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Copy permanent link"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>Direct, login-free citizen access</span>
                <a
                  href={getPublicFormUrl(shareForm.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold hover:underline"
                >
                  <span>Open Public Form in New Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Section 2: Editable Invitation Message */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  2. Ready-to-Share Invitation Message
                </label>
                <button
                  type="button"
                  onClick={handleResetInviteMessage}
                  className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
                  title="Reset to default template"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>
              </div>

              <textarea
                rows={5}
                value={customInviteMessage}
                onChange={(e) => setCustomInviteMessage(e.target.value)}
                placeholder="Edit your personalized community message..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition leading-relaxed"
              />

              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400">
                  {customInviteMessage.length} characters &bull; Editable for WhatsApp, SMS or Instagram DMs
                </span>
                <button
                  type="button"
                  onClick={handleCopyInviteMessage}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                    copiedMessage
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
                  }`}
                >
                  {copiedMessage ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Message Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Invitation Message</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Section 3: Direct Sharing Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800">
                3. Instant Social & Device Sharing
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* WhatsApp Share */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(customInviteMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Share via WhatsApp</span>
                </a>

                {/* Native Device Web Share API */}
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer ${
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
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>📸 Instagram & Facebook Sharing</span>
              </label>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="space-y-1 text-slate-600 text-[11px] leading-relaxed">
                  <p>
                    <strong>Instagram Stories:</strong> Tap the <strong>Sticker</strong> icon in your Story, choose <strong>LINK</strong>, and paste the URL.
                  </p>
                  <p>
                    <strong>Instagram Bio &amp; DMs:</strong> Paste into your profile bio or send directly in DM chats.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyInstagramLink}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5 ${
                      copiedInstagram
                        ? "bg-pink-600 text-white"
                        : "bg-white border border-pink-300 text-pink-700 hover:bg-pink-50"
                    }`}
                  >
                    {copiedInstagram ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Link Copied for Instagram!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
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
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Share on Facebook</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold">Public Form Preview</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewForm(null)}
                className="text-slate-400 hover:text-white"
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
      )}
    </div>
  );
}
