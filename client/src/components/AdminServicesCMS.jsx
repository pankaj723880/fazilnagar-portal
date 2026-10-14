import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import {
  Landmark,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  CheckCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Search,
  Filter,
  X,
  Save,
  FileCheck,
} from "lucide-react";

export default function AdminServicesCMS() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [toast, setToast] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formTitleHi, setFormTitleHi] = useState("");
  const [formCategory, setFormCategory] = useState("Certificates & Revenue");
  const [formDescription, setFormDescription] = useState("");
  const [formEligibility, setFormEligibility] = useState("");
  const [formDocs, setFormDocs] = useState("");
  const [formInstructions, setFormInstructions] = useState("");
  const [formOfficeName, setFormOfficeName] = useState("");
  const [formOfficeAddress, setFormOfficeAddress] = useState("");
  const [formContactPhone, setFormContactPhone] = useState("");
  const [formApplicationUrl, setFormApplicationUrl] = useState("");
  const [formFee, setFormFee] = useState("");
  const [formProcessingTime, setFormProcessingTime] = useState("");
  const [formIsPublished, setFormIsPublished] = useState(true);
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    "All",
    "Certificates & Revenue",
    "Aadhaar & Ration Card",
    "Electricity & Utilities",
    "Panchayat & Municipal",
    "Welfare Schemes & Pensions",
    "Police & Administration",
    "Other Civic Services",
  ];

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    const token = getAuthToken();
    try {
      const res = await API.get("/services/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success && Array.isArray(res.data?.services)) {
        setServices(res.data.services);
      }
    } catch (err) {
      console.warn("Failed to fetch services:", err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const openCreateModal = () => {
    setEditingService(null);
    setFormTitle("");
    setFormTitleHi("");
    setFormCategory("Certificates & Revenue");
    setFormDescription("");
    setFormEligibility("All eligible residents of Fazilnagar.");
    setFormDocs("Aadhaar Card, Ration Card, Passport photo");
    setFormInstructions("Visit designated office or apply via UP e-District portal.");
    setFormOfficeName("Tehsil / Nagar Panchayat Office, Fazilnagar");
    setFormOfficeAddress("Main Market Road, Fazilnagar, Kushinagar");
    setFormContactPhone("+91 5564 222102");
    setFormApplicationUrl("https://edistrict.up.gov.in");
    setFormFee("Rs. 30");
    setFormProcessingTime("7 to 15 days");
    setFormIsPublished(true);
    setFormIsFeatured(false);
    setModalOpen(true);
  };

  const openEditModal = (svc) => {
    setEditingService(svc);
    setFormTitle(svc.title || "");
    setFormTitleHi(svc.titleHi || "");
    setFormCategory(svc.category || "Certificates & Revenue");
    setFormDescription(svc.description || "");
    setFormEligibility(svc.eligibility || "");
    setFormDocs(Array.isArray(svc.requiredDocuments) ? svc.requiredDocuments.join(", ") : "");
    setFormInstructions(svc.instructions || "");
    setFormOfficeName(svc.officeName || "");
    setFormOfficeAddress(svc.officeAddress || "");
    setFormContactPhone(svc.contactPhone || "");
    setFormApplicationUrl(svc.applicationUrl || "");
    setFormFee(svc.feeStructure || "");
    setFormProcessingTime(svc.processingTimeDays || "");
    setFormIsPublished(svc.isPublished !== false);
    setFormIsFeatured(svc.isFeatured === true);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) {
      showToast("Service title and description are required.");
      return;
    }

    setSubmitting(true);
    const token = getAuthToken();
    const payload = {
      title: formTitle,
      titleHindi: formTitleHi,
      category: formCategory,
      description: formDescription,
      eligibility: formEligibility,
      requiredDocuments: formDocs.split(",").map((s) => s.trim()).filter(Boolean),
      instructions: formInstructions,
      officeName: formOfficeName,
      officeAddress: formOfficeAddress,
      contactPhone: formContactPhone,
      applicationUrl: formApplicationUrl,
      feeStructure: formFee,
      processingTimeDays: formProcessingTime,
      isPublished: formIsPublished,
      isFeatured: formIsFeatured,
    };

    try {
      if (editingService && editingService._id) {
        const res = await API.put(`/services/${editingService._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.service) {
          setServices((prev) =>
            prev.map((s) => (s._id === editingService._id ? res.data.service : s))
          );
          showToast("Service updated successfully.");
        }
      } else {
        const res = await API.post("/services", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.service) {
          setServices((prev) => [res.data.service, ...prev]);
          showToast("Public service created successfully.");
        }
      }
      setModalOpen(false);
    } catch (err) {
      showToast("Error saving service: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (svc) => {
    const token = getAuthToken();
    try {
      const res = await API.patch(
        `/services/${svc._id}/publish`,
        { isPublished: !svc.isPublished },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setServices((prev) =>
        prev.map((s) => (s._id === svc._id ? { ...s, isPublished: !svc.isPublished } : s))
      );
      showToast(`Service ${!svc.isPublished ? "published" : "unpublished"}.`);
    } catch (err) {
      showToast("Error updating status: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this public service?")) return;
    const token = getAuthToken();
    try {
      await API.delete(`/services/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServices((prev) => prev.filter((s) => s._id !== id));
      showToast("Public service deleted.");
    } catch (err) {
      showToast("Delete failed: " + err.message);
    }
  };

  const filtered = services.filter((s) => {
    const matchesCat = selectedCategory === "All" || s.category === selectedCategory;
    const matchesSearch =
      !search.trim() ||
      s.title?.toLowerCase().includes(search.toLowerCase()) ||
      s.titleHindi?.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-4">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold mb-1">
            <Landmark className="w-3.5 h-3.5" />
            <span>Civic & Government Services</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#18232E]">
            Public Services & Citizen Desk CMS
          </h2>
          <p className="text-xs text-slate-500">
            Manage official certificates, revenue procedures, municipal applications, and external govt links.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Public Service</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services by title or description..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
            <p className="text-xs font-semibold">Loading public services...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-xs font-semibold">No services found matching filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((svc) => (
              <div
                key={svc._id}
                className="p-4 hover:bg-slate-50 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                      {svc.category}
                    </span>
                    {svc.isPublished ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        Published Live
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                        Unpublished / Draft
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-extrabold text-[#18232E]">
                    {svc.title}
                  </h3>
                  {svc.titleHindi && (
                    <p className="text-xs text-slate-500 font-medium">{svc.titleHindi}</p>
                  )}
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{svc.description}</p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2">
                    <span>🏢 {svc.officeName}</span>
                    <span>⏳ {svc.processingTimeDays}</span>
                    <span>💰 {svc.feeStructure}</span>
                    {svc.applicationUrl && (
                      <a
                        href={svc.applicationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Portal Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                  <button
                    onClick={() => handleTogglePublish(svc)}
                    className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                      svc.isPublished
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    title={svc.isPublished ? "Unpublish" : "Publish"}
                  >
                    {svc.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => openEditModal(svc)}
                    className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                    title="Edit Service"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(svc._id)}
                    className="p-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition cursor-pointer"
                    title="Delete Service"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-[#18232E] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">
                {editingService ? "Edit Public Service" : "Add New Public Service"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Service Title (English) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Domicile & Residence Certificate"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Service Title (Hindi - Optional)
                  </label>
                  <input
                    type="text"
                    value={formTitleHi}
                    onChange={(e) => setFormTitleHi(e.target.value)}
                    placeholder="उदा. निवास प्रमाण पत्र"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                >
                  {categories.filter((c) => c !== "All").map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Description & Benefits <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Comprehensive description of this civic service..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Eligibility Criteria</label>
                  <input
                    type="text"
                    value={formEligibility}
                    onChange={(e) => setFormEligibility(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Required Documents (Comma separated)</label>
                  <input
                    type="text"
                    value={formDocs}
                    onChange={(e) => setFormDocs(e.target.value)}
                    placeholder="Aadhaar, Ration Card, Photo"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Office Name</label>
                  <input
                    type="text"
                    value={formOfficeName}
                    onChange={(e) => setFormOfficeName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Office Address</label>
                  <input
                    type="text"
                    value={formOfficeAddress}
                    onChange={(e) => setFormOfficeAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formContactPhone}
                    onChange={(e) => setFormContactPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official Portal URL</label>
                  <input
                    type="text"
                    value={formApplicationUrl}
                    onChange={(e) => setFormApplicationUrl(e.target.value)}
                    placeholder="https://edistrict.up.gov.in"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Processing Time</label>
                  <input
                    type="text"
                    value={formProcessingTime}
                    onChange={(e) => setFormProcessingTime(e.target.value)}
                    placeholder="7 to 15 days"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formIsPublished}
                    onChange={(e) => setFormIsPublished(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Publish live on public portal</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Feature on homepage</span>
                </label>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{editingService ? "Update Service" : "Create Service"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
