import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import PageHeader from "./admin/PageHeader";
import SearchAndFilters from "./admin/SearchAndFilters";
import DataTable from "./admin/DataTable";
import StatusBadge from "./admin/StatusBadge";
import FormSection from "./admin/FormSection";
import ConfirmDialog from "./admin/ConfirmDialog";
import ToastNotification from "./admin/ToastNotification";
import EmptyState from "./admin/EmptyState";
import {
  Landmark,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  Star,
  FileCheck,
  Building,
  Clock,
  IndianRupee,
  Phone,
  Globe,
  X,
  FileText,
  Search,
  ChevronRight,
} from "lucide-react";

export default function AdminServicesCMS() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState({ message: "", type: "success" });

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

  // Delete dialog
  const [deleteServiceId, setDeleteServiceId] = useState(null);

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
      showToast("Could not load public services.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const openCreateModal = () => {
    setEditingService(null);
    setFormTitle("");
    setFormTitleHi("");
    setFormCategory("Certificates & Revenue");
    setFormDescription("");
    setFormEligibility("");
    setFormDocs("");
    setFormInstructions("");
    setFormOfficeName("Tehsil / Nagar Panchayat Office, Fazilnagar");
    setFormOfficeAddress("Main Market Road, Fazilnagar, Kushinagar, UP - 274401");
    setFormContactPhone("+91 5564 222102");
    setFormApplicationUrl("https://edistrict.up.gov.in");
    setFormFee("Government portal nominal fee (e.g. ₹30)");
    setFormProcessingTime("7 to 15 working days");
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
    setFormDocs(Array.isArray(svc.requiredDocuments) ? svc.requiredDocuments.join(", ") : svc.requiredDocuments || "");
    setFormInstructions(svc.applicationProcess || "");
    setFormOfficeName(svc.officeName || "");
    setFormOfficeAddress(svc.officeAddress || "");
    setFormContactPhone(svc.contactPhone || "");
    setFormApplicationUrl(svc.applicationUrl || "");
    setFormFee(svc.fees || "");
    setFormProcessingTime(svc.processingTime || "");
    setFormIsPublished(svc.isPublished !== false);
    setFormIsFeatured(Boolean(svc.isFeatured));
    setModalOpen(true);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const token = getAuthToken();

    const payload = {
      title: formTitle.trim(),
      titleHi: formTitleHi.trim(),
      category: formCategory,
      description: formDescription.trim(),
      eligibility: formEligibility.trim(),
      requiredDocuments: formDocs.split(",").map((s) => s.trim()).filter(Boolean),
      applicationProcess: formInstructions.trim(),
      officeName: formOfficeName.trim(),
      officeAddress: formOfficeAddress.trim(),
      contactPhone: formContactPhone.trim(),
      applicationUrl: formApplicationUrl.trim(),
      fees: formFee.trim(),
      processingTime: formProcessingTime.trim(),
      isPublished: formIsPublished,
      isFeatured: formIsFeatured,
    };

    try {
      if (editingService && editingService._id) {
        const res = await API.put(`/services/${editingService._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.success) {
          setServices((prev) =>
            prev.map((s) => (s._id === editingService._id ? res.data.service : s))
          );
          showToast("Service updated successfully!");
        }
      } else {
        const res = await API.post("/services", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.success) {
          setServices((prev) => [res.data.service, ...prev]);
          showToast("New civic service added!");
        }
      }
      setModalOpen(false);
    } catch (err) {
      console.error("Save service error:", err);
      showToast("Error: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (svc) => {
    const token = getAuthToken();
    try {
      const nextPub = !svc.isPublished;
      await API.patch(
        `/services/${svc._id}/publish`,
        { isPublished: nextPub },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setServices((prev) =>
        prev.map((s) => (s._id === svc._id ? { ...s, isPublished: nextPub } : s))
      );
      showToast(`Service ${nextPub ? "published live" : "unpublished"}.`);
    } catch (err) {
      showToast("Failed to toggle status: " + err.message, "error");
    }
  };

  const handleToggleFeature = async (svc) => {
    const token = getAuthToken();
    try {
      const nextFeat = !svc.isFeatured;
      await API.patch(
        `/services/${svc._id}/feature`,
        { isFeatured: nextFeat },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setServices((prev) =>
        prev.map((s) => (s._id === svc._id ? { ...s, isFeatured: nextFeat } : s))
      );
      showToast(`Service ${nextFeat ? "marked featured" : "unfeatured"}.`);
    } catch (err) {
      showToast("Failed to toggle featured: " + err.message, "error");
    }
  };

  const handleDeleteService = async () => {
    if (!deleteServiceId) return;
    const token = getAuthToken();
    try {
      await API.delete(`/services/${deleteServiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServices((prev) => prev.filter((s) => s._id !== deleteServiceId));
      showToast("Public service deleted.");
      setDeleteServiceId(null);
    } catch (err) {
      showToast("Failed to delete service: " + err.message, "error");
    }
  };

  // Filtered dataset
  const filteredServices = services.filter((svc) => {
    const matchesSearch =
      !search.trim() ||
      (svc.title && svc.title.toLowerCase().includes(search.toLowerCase())) ||
      (svc.titleHi && svc.titleHi.includes(search)) ||
      (svc.description && svc.description.toLowerCase().includes(search.toLowerCase())) ||
      (svc.officeName && svc.officeName.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategory === "All" || svc.category === selectedCategory;

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "published"
        ? svc.isPublished
        : !svc.isPublished;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Columns for DataTable
  const tableColumns = [
    {
      key: "title",
      label: "Service Name",
      render: (_, svc) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            {svc.isFeatured && (
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
            )}
            <span className="font-extrabold text-[#18232E] text-xs">
              {svc.title}
            </span>
          </div>
          {svc.titleHi && (
            <p className="text-[11px] text-slate-500 font-hindi truncate max-w-xs">
              {svc.titleHi}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (cat) => (
        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
          {cat || "General"}
        </span>
      ),
    },
    {
      key: "fees",
      label: "Fee & Time",
      render: (_, svc) => (
        <div className="text-[11px] space-y-0.5">
          <span className="font-bold text-slate-800 block truncate max-w-[120px]">
            {svc.fees || "Free / Nominal"}
          </span>
          <span className="text-slate-400 block truncate max-w-[120px]">
            {svc.processingTime || "Standard"}
          </span>
        </div>
      ),
    },
    {
      key: "isPublished",
      label: "Status",
      render: (pub) => (
        <StatusBadge
          status={pub ? "published" : "draft"}
          label={pub ? "Published" : "Draft"}
          size="sm"
        />
      ),
    },
    {
      key: "updatedAt",
      label: "Last Updated",
      render: (dt) => (
        <span className="text-[11px] text-slate-400">
          {dt ? new Date(dt).toLocaleDateString() : "Recent"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (_, svc) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => handleToggleFeature(svc)}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              svc.isFeatured
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700"
            }`}
            title={svc.isFeatured ? "Unpin featured" : "Pin as featured"}
          >
            <Star className={`w-3.5 h-3.5 ${svc.isFeatured ? "fill-current" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => handleTogglePublish(svc)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              svc.isPublished
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {svc.isPublished ? "Unpublish" : "Publish"}
          </button>

          {svc.applicationUrl && (
            <a
              href={svc.applicationUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition"
              title="Open Official Portal Link"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={() => openEditModal(svc)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
            title="Edit Service Details"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setDeleteServiceId(svc._id)}
            className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
            title="Delete Service"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 4.1 Primary Grid Controls: Bold sub-page header with amber-tint [+ Add Service] CTA */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-heading">
              Public Civic Services
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {services.filter((s) => s.isPublished).length} Live on Portal
            </span>
          </div>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Certifications, UP e-District schemes, eligibility rules, and official departmental desks.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="h-10 px-3.5 sm:px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Service</span>
        </button>
      </div>

      {/* 4.2 Inline Search & subtle filter pill segment */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services by title, eligibility, or office..."
            className="w-full h-10 pl-10 pr-4 text-xs rounded-xl border border-slate-200/90 bg-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-2xs"
          />
        </div>

        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { id: "all", label: "All Statuses" },
              { id: "published", label: "Published" },
              { id: "draft", label: "Draft" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer active:scale-95 ${
                  statusFilter === st.id
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-bold text-slate-500 shrink-0">
            Showing {filteredServices.length} records
          </span>
        </div>
      </div>

      {/* 4.3 Tile-Based Services Feed (No Desktop Tables on phone viewports) */}
      <div className="block md:hidden space-y-2">
        {filteredServices.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="No Services Found"
            description="No municipal or civic services match your search."
            action={
              <button
                onClick={openCreateModal}
                className="bg-amber-500 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl"
              >
                + Add Service
              </button>
            }
          />
        ) : (
          filteredServices.map((svc) => (
            <div
              key={svc._id}
              onClick={() => openEditModal(svc)}
              className="w-full bg-white rounded-2xl border border-slate-100 p-3.5 space-y-2 mb-2 flex items-center justify-between hover:border-slate-300 transition shadow-xs cursor-pointer active:scale-98"
            >
              <div className="space-y-1 min-w-0 pr-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-semibold text-[13px] text-slate-900 leading-snug">
                    {svc.title} {svc.titleHi ? `(${svc.titleHi})` : ""}
                  </h3>
                  {svc.isFeatured && (
                    <span className="text-amber-500 text-xs" title="Featured">★</span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-blue-600 bg-blue-50 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100/60">
                    {svc.category || "Certificates & Revenue"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {svc.fees || "Free / Nominal standard fee"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View Table (hidden on mobile, table-based on md+) */}
      <div className="hidden md:block">
        <DataTable
          columns={tableColumns}
          data={filteredServices}
          loading={loading}
          emptyState={
            <EmptyState
              icon={Landmark}
              title="No Services Found"
              description="No municipal or civic services match the current filter criteria."
              action={
                <button
                  onClick={openCreateModal}
                  className="bg-[#2563EB] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-700 transition"
                >
                  + Create New Service
                </button>
              }
            />
          }
        />
      </div>

      {/* Add / Edit Service Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150"
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-[#18232E]">
                  {editingService ? "Edit Public Service" : "Add Public Civic Service"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Service Name (English) *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Income Certificate (आय प्रमाण पत्र)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1 font-hindi">
                    Service Name (हिंदी)
                  </label>
                  <input
                    type="text"
                    value={formTitleHi}
                    onChange={(e) => setFormTitleHi(e.target.value)}
                    placeholder="जैसे: आय प्रमाण पत्र"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-hindi focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">
                    Service Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold focus:bg-white focus:border-blue-500 outline-none"
                  >
                    {categories.filter((c) => c !== "All").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description & Eligibility */}
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Service Summary & Description *
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Brief description of who needs this certificate and how it is issued."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Eligibility Criteria
                  </label>
                  <input
                    type="text"
                    value={formEligibility}
                    onChange={(e) => setFormEligibility(e.target.value)}
                    placeholder="e.g. Resident of Fazilnagar Tehsil / UP domicile holder."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Required Documents (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={formDocs}
                    onChange={(e) => setFormDocs(e.target.value)}
                    placeholder="Aadhaar Card, Ration Card, Salary slip, Passport photo"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Step-by-Step Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={formInstructions}
                    onChange={(e) => setFormInstructions(e.target.value)}
                    placeholder="1. Visit UP eDistrict portal or CSC Centre. 2. Submit documents. 3. Verification by Lekhpal/Tehsildar."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Office & Portal URL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Department / Office Name
                  </label>
                  <input
                    type="text"
                    value={formOfficeName}
                    onChange={(e) => setFormOfficeName(e.target.value)}
                    placeholder="Tehsil / Nagar Panchayat Office, Fazilnagar"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formContactPhone}
                    onChange={(e) => setFormContactPhone(e.target.value)}
                    placeholder="+91 5564 222102"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">
                    Official Portal Application URL
                  </label>
                  <input
                    type="url"
                    value={formApplicationUrl}
                    onChange={(e) => setFormApplicationUrl(e.target.value)}
                    placeholder="https://edistrict.up.gov.in"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Official Processing Fee
                  </label>
                  <input
                    type="text"
                    value={formFee}
                    onChange={(e) => setFormFee(e.target.value)}
                    placeholder="₹30 government fee"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Processing Time
                  </label>
                  <input
                    type="text"
                    value={formProcessingTime}
                    onChange={(e) => setFormProcessingTime(e.target.value)}
                    placeholder="7 to 15 working days"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Status & Featured Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800">Publish Live</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsPublished}
                      onChange={(e) => setFormIsPublished(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563EB]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800">Pin as Featured</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsFeatured}
                      onChange={(e) => setFormIsFeatured(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingService ? "Update Service" : "Add Service"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteServiceId)}
        title="Delete Civic Service?"
        message="Are you sure you want to permanently delete this public service listing from the portal?"
        confirmText="Delete Service"
        confirmVariant="danger"
        onConfirm={handleDeleteService}
        onCancel={() => setDeleteServiceId(null)}
      />

      {/* Toast Notification */}
      {toast.message && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "success" })}
        />
      )}
    </div>
  );
}
