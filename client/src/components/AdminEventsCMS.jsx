import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import PageHeader from "./admin/PageHeader";
import SearchAndFilters from "./admin/SearchAndFilters";
import DataTable from "./admin/DataTable";
import StatusBadge from "./admin/StatusBadge";
import ImageUploader from "./admin/ImageUploader";
import MediaPicker from "./admin/MediaPicker";
import ConfirmDialog from "./admin/ConfirmDialog";
import ToastNotification from "./admin/ToastNotification";
import EmptyState from "./admin/EmptyState";
import {
  Calendar,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  Eye,
  EyeOff,
  Search,
  Filter,
  X,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  Star,
  CalendarDays,
  LayoutGrid,
  List,
} from "lucide-react";

export default function AdminEventsCMS() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [dateFilter, setDateFilter] = useState("all"); // "all" | "upcoming" | "past"
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"
  const [toast, setToast] = useState({ message: "", type: "success" });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formTitleHi, setFormTitleHi] = useState("");
  const [formCategory, setFormCategory] = useState("Religious Festival");
  const [formSummary, setFormSummary] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formVenue, setFormVenue] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formLat, setFormLat] = useState("26.6827");
  const [formLng, setFormLng] = useState("84.0498");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formTimeString, setFormTimeString] = useState("Morning / Evening");
  const [formOrganizer, setFormOrganizer] = useState("");
  const [formOrganizerContact, setFormOrganizerContact] = useState("");
  const [formBannerImage, setFormBannerImage] = useState("");
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formIsPublished, setFormIsPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Media Picker state
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Delete dialog
  const [deleteEventId, setDeleteEventId] = useState(null);

  const categories = [
    "All",
    "Religious Festival",
    "Aarti & Puja",
    "Mela & Fair",
    "Jagran & Kirtan",
    "Civic & Cultural",
    "Public Notice",
    "Sports & Youth",
    "Other Community Event",
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const token = getAuthToken();
    try {
      const res = await API.get("/events/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success && Array.isArray(res.data?.events)) {
        setEvents(res.data.events);
      }
    } catch (err) {
      console.warn("Failed to fetch events:", err);
      showToast("Could not load events & melas.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormTitle("");
    setFormTitleHi("");
    setFormCategory("Religious Festival");
    setFormSummary("");
    setFormDescription("");
    setFormVenue("Mahavira Mandir / Pawapuri Dham, Fazilnagar");
    setFormAddress("Fazilnagar, Kushinagar, UP - 274401");
    setFormLat("26.6827");
    setFormLng("84.0498");
    setFormStartDate(new Date().toISOString().split("T")[0]);
    setFormEndDate("");
    setFormTimeString("06:00 AM – 08:00 PM");
    setFormOrganizer("Fazilnagar Mela & Utsav Samiti");
    setFormOrganizerContact("+91 5564 222102");
    setFormBannerImage("");
    setFormIsFeatured(false);
    setFormIsPublished(true);
    setModalOpen(true);
  };

  const openEditModal = (evt) => {
    setEditingEvent(evt);
    setFormTitle(evt.title || "");
    setFormTitleHi(evt.titleHi || "");
    setFormCategory(evt.category || "Religious Festival");
    setFormSummary(evt.summary || "");
    setFormDescription(evt.description || "");
    setFormVenue(evt.venue || "");
    setFormAddress(evt.address || "");
    setFormLat(evt.location?.coordinates?.[1] ? String(evt.location.coordinates[1]) : "26.6827");
    setFormLng(evt.location?.coordinates?.[0] ? String(evt.location.coordinates[0]) : "84.0498");
    setFormStartDate(evt.startDate ? evt.startDate.split("T")[0] : "");
    setFormEndDate(evt.endDate ? evt.endDate.split("T")[0] : "");
    setFormTimeString(evt.timeString || "All Day");
    setFormOrganizer(evt.organizer || "");
    setFormOrganizerContact(evt.organizerContact || "");
    setFormBannerImage(evt.bannerImage || "");
    setFormIsFeatured(Boolean(evt.isFeatured));
    setFormIsPublished(evt.isPublished !== false);
    setModalOpen(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const token = getAuthToken();

    const lat = parseFloat(formLat);
    const lng = parseFloat(formLng);

    const payload = {
      title: formTitle.trim(),
      titleHi: formTitleHi.trim(),
      category: formCategory,
      summary: formSummary.trim(),
      description: formDescription.trim(),
      venue: formVenue.trim(),
      address: formAddress.trim(),
      startDate: formStartDate,
      endDate: formEndDate || formStartDate,
      timeString: formTimeString.trim(),
      organizer: formOrganizer.trim(),
      organizerContact: formOrganizerContact.trim(),
      bannerImage: formBannerImage.trim(),
      isFeatured: formIsFeatured,
      isPublished: formIsPublished,
      location: {
        type: "Point",
        coordinates: [!isNaN(lng) ? lng : 84.0498, !isNaN(lat) ? lat : 26.6827],
      },
    };

    try {
      if (editingEvent && editingEvent._id) {
        const res = await API.put(`/events/${editingEvent._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.success) {
          setEvents((prev) =>
            prev.map((evt) => (evt._id === editingEvent._id ? res.data.event : evt))
          );
          showToast("Event updated successfully!");
        }
      } else {
        const res = await API.post("/events", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.success) {
          setEvents((prev) => [res.data.event, ...prev]);
          showToast("New community event added!");
        }
      }
      setModalOpen(false);
    } catch (err) {
      console.error("Save event error:", err);
      showToast("Error: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (evt) => {
    const token = getAuthToken();
    try {
      const nextPub = !evt.isPublished;
      await API.patch(
        `/events/${evt._id}/publish`,
        { isPublished: nextPub },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEvents((prev) =>
        prev.map((e) => (e._id === evt._id ? { ...e, isPublished: nextPub } : e))
      );
      showToast(`Event ${nextPub ? "published live" : "unpublished"}.`);
    } catch (err) {
      showToast("Failed to toggle status: " + err.message, "error");
    }
  };

  const handleToggleFeature = async (evt) => {
    const token = getAuthToken();
    try {
      const nextFeat = !evt.isFeatured;
      await API.patch(
        `/events/${evt._id}/feature`,
        { isFeatured: nextFeat },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEvents((prev) =>
        prev.map((e) => (e._id === evt._id ? { ...e, isFeatured: nextFeat } : e))
      );
      showToast(`Event ${nextFeat ? "marked featured" : "unfeatured"}.`);
    } catch (err) {
      showToast("Failed to toggle featured: " + err.message, "error");
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventId) return;
    const token = getAuthToken();
    try {
      await API.delete(`/events/${deleteEventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvents((prev) => prev.filter((e) => e._id !== deleteEventId));
      showToast("Event deleted.");
      setDeleteEventId(null);
    } catch (err) {
      showToast("Failed to delete event: " + err.message, "error");
    }
  };

  // Filtered dataset
  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      !search.trim() ||
      (evt.title && evt.title.toLowerCase().includes(search.toLowerCase())) ||
      (evt.titleHi && evt.titleHi.includes(search)) ||
      (evt.venue && evt.venue.toLowerCase().includes(search.toLowerCase())) ||
      (evt.organizer && evt.organizer.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategory === "All" || evt.category === selectedCategory;

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "published"
        ? evt.isPublished
        : !evt.isPublished;

    const now = new Date();
    const evtDate = evt.endDate ? new Date(evt.endDate) : evt.startDate ? new Date(evt.startDate) : null;

    let matchesDate = true;
    if (dateFilter === "upcoming" && evtDate) {
      matchesDate = evtDate >= now;
    } else if (dateFilter === "past" && evtDate) {
      matchesDate = evtDate < now;
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesDate;
  });

  // Columns for Table View
  const tableColumns = [
    {
      key: "title",
      label: "Event & Mela",
      render: (_, evt) => (
        <div className="flex items-center gap-3">
          {evt.bannerImage ? (
            <img
              src={evt.bannerImage}
              alt={evt.title}
              className="w-10 h-10 rounded-lg object-cover bg-slate-900 border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 text-xs font-bold border border-amber-200">
              📅
            </div>
          )}
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              {evt.isFeatured && (
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
              )}
              <span className="font-extrabold text-[#18232E] text-xs truncate max-w-xs">
                {evt.title}
              </span>
            </div>
            {evt.venue && (
              <p className="text-[11px] text-slate-500 truncate max-w-xs flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{evt.venue}</span>
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (cat) => (
        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
          {cat || "Festival"}
        </span>
      ),
    },
    {
      key: "startDate",
      label: "Schedule",
      render: (_, evt) => (
        <div className="text-[11px] space-y-0.5">
          <span className="font-bold text-slate-800 block">
            {evt.startDate ? new Date(evt.startDate).toLocaleDateString() : "TBD"}
          </span>
          <span className="text-slate-400 block truncate max-w-[120px]">
            {evt.timeString || "All Day"}
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
      key: "actions",
      label: "Actions",
      align: "right",
      render: (_, evt) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => handleToggleFeature(evt)}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              evt.isFeatured
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700"
            }`}
            title={evt.isFeatured ? "Unpin featured" : "Pin as featured"}
          >
            <Star className={`w-3.5 h-3.5 ${evt.isFeatured ? "fill-current" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => handleTogglePublish(evt)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              evt.isPublished
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {evt.isPublished ? "Unpublish" : "Publish"}
          </button>

          <button
            type="button"
            onClick={() => openEditModal(evt)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
            title="Edit Event Details"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setDeleteEventId(evt._id)}
            className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
            title="Delete Event"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Events & Melas CMS"
        description="Schedule religious festivals, town fairs, cultural events, and public notices with coordinates and cover posters."
        icon={Calendar}
        badge={
          <StatusBadge
            status="active"
            label={`${events.filter((e) => e.isPublished).length} Published Events`}
          />
        }
        actions={
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === "cards"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Cards view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === "table"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={openCreateModal}
              className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Event</span>
            </button>
          </div>
        }
      />

      {/* Search and Filters */}
      <SearchAndFilters
        searchQuery={search}
        onSearchChange={setSearch}
        placeholder="Search events by title, venue, or organizer..."
        filters={[
          {
            id: "category",
            label: "Category",
            value: selectedCategory,
            onChange: setSelectedCategory,
            options: categories.map((c) => ({ label: c, value: c })),
          },
          {
            id: "date",
            label: "Timeline",
            value: dateFilter,
            onChange: setDateFilter,
            options: [
              { label: "All Dates", value: "all" },
              { label: "Upcoming Events", value: "upcoming" },
              { label: "Past Events", value: "past" },
            ],
          },
          {
            id: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All Statuses", value: "all" },
              { label: "Published Live", value: "published" },
              { label: "Draft / Hidden", value: "draft" },
            ],
          },
        ]}
        totalCount={events.length}
        filteredCount={filteredEvents.length}
        onReset={() => {
          setSearch("");
          setSelectedCategory("All");
          setDateFilter("all");
          setStatusFilter("all");
        }}
      />

      {/* Content Rendering: Table vs Cards */}
      {viewMode === "table" ? (
        <DataTable
          columns={tableColumns}
          data={filteredEvents}
          loading={loading}
          emptyState={
            <EmptyState
              icon={Calendar}
              title="No Events Found"
              description="No community events match the current filter criteria."
              action={
                <button
                  onClick={openCreateModal}
                  className="bg-[#2563EB] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-700 transition"
                >
                  + Create Event
                </button>
              }
            />
          }
        />
      ) : (
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="h-40 bg-slate-100 animate-pulse rounded-xl" />
                  <div className="h-4 bg-slate-100 animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-slate-100 animate-pulse rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
              <EmptyState
                icon={Calendar}
                title="No Events Found"
                description="No festivals or melas match the selected filters."
                action={
                  <button
                    onClick={openCreateModal}
                    className="bg-[#2563EB] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-700 transition"
                  >
                    + Add New Event
                  </button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvents.map((evt) => (
                <div
                  key={evt._id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
                >
                  <div className="space-y-3">
                    {/* Poster Cover Image */}
                    {evt.bannerImage ? (
                      <div className="h-40 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 relative group">
                        <img
                          src={evt.bannerImage}
                          alt={evt.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        {evt.isFeatured && (
                          <div className="absolute top-2 left-2 bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md">
                            <Star className="w-3 h-3 fill-current" />
                            <span>Featured Mela</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-32 w-full rounded-xl bg-gradient-to-tr from-amber-50 to-orange-50 border border-amber-200 flex flex-col items-center justify-center text-amber-700 space-y-1">
                        <Calendar className="w-7 h-7" />
                        <span className="text-[11px] font-bold">Community Event</span>
                      </div>
                    )}

                    {/* Category & Status */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        {evt.category || "Religious Festival"}
                      </span>
                      <StatusBadge
                        status={evt.isPublished ? "published" : "draft"}
                        label={evt.isPublished ? "Published" : "Draft"}
                        size="sm"
                      />
                    </div>

                    <h4 className="text-sm font-extrabold text-[#18232E] leading-snug line-clamp-2">
                      {evt.title}
                    </h4>

                    {evt.venue && (
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{evt.venue}</span>
                      </p>
                    )}

                    {evt.summary && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {evt.summary}
                      </p>
                    )}

                    <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{evt.startDate ? new Date(evt.startDate).toLocaleDateString() : "TBD"}</span>
                      </span>
                      <span className="truncate max-w-[130px]">{evt.timeString || "All Day"}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleFeature(evt)}
                        className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                          evt.isFeatured
                            ? "bg-amber-50 border-amber-300 text-amber-700"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700"
                        }`}
                        title={evt.isFeatured ? "Unpin featured" : "Pin as featured"}
                      >
                        <Star className={`w-3.5 h-3.5 ${evt.isFeatured ? "fill-current" : ""}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePublish(evt)}
                        className={`font-bold px-2.5 py-1.5 rounded-xl text-[11px] transition cursor-pointer ${
                          evt.isPublished
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        {evt.isPublished ? "Unpublish" : "Publish"}
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(evt)}
                        className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                        title="Edit Event"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteEventId(evt._id)}
                        className="p-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Delete Event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Event Modal */}
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
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-[#18232E]">
                  {editingEvent ? "Edit Event / Mela" : "Schedule New Event / Mela"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Titles and Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Event Title (English) *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Mahavira Nirvana Mahotsav & Annual Mela"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1 font-hindi">
                    Event Title (हिंदी)
                  </label>
                  <input
                    type="text"
                    value={formTitleHi}
                    onChange={(e) => setFormTitleHi(e.target.value)}
                    placeholder="जैसे: भगवान महावीर निर्वाण महोत्सव एवं वार्षिक मेला"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-hindi focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">
                    Event Category *
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

              {/* Dates & Timings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    End Date (If multi-day)
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Daily Timings
                  </label>
                  <input
                    type="text"
                    value={formTimeString}
                    onChange={(e) => setFormTimeString(e.target.value)}
                    placeholder="06:00 AM – 08:00 PM"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Venue & Coordinates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Venue Name *
                  </label>
                  <input
                    type="text"
                    value={formVenue}
                    onChange={(e) => setFormVenue(e.target.value)}
                    placeholder="Mahavira Mandir / Pawapuri Dham"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Address / Landmark
                  </label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Pawapuri Road, Fazilnagar, Kushinagar, UP - 274401"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Map Latitude (26.xxxx)
                  </label>
                  <input
                    type="text"
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    placeholder="26.6827"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Map Longitude (84.xxxx)
                  </label>
                  <input
                    type="text"
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    placeholder="84.0498"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Event Summary / Highlights
                  </label>
                  <input
                    type="text"
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    placeholder="Annual gathering, cultural procession, and spiritual discourse."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Detailed Event Narrative & Schedule
                  </label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Complete schedule of pujas, community meals, cultural programs, and arrangements."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Organizer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Organizer Committee / Authority
                  </label>
                  <input
                    type="text"
                    value={formOrganizer}
                    onChange={(e) => setFormOrganizer(e.target.value)}
                    placeholder="Fazilnagar Mela & Utsav Samiti"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Organizer Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formOrganizerContact}
                    onChange={(e) => setFormOrganizerContact(e.target.value)}
                    placeholder="+91 5564 222102"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Cover Poster Image */}
              <div className="pt-2 border-t border-slate-100">
                <ImageUploader
                  value={formBannerImage}
                  onChange={setFormBannerImage}
                  onOpenMediaPicker={() => setMediaPickerOpen(true)}
                  label="Event Poster / Banner Image"
                  helpText="Upload event invitation or poster (max 10MB)"
                  aspectRatio="banner"
                />
              </div>

              {/* Publication Status & Featured Toggles */}
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

              {/* Actions */}
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
                  <span>{editingEvent ? "Update Event" : "Save Event"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      <MediaPicker
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => {
          setFormBannerImage(url);
          setMediaPickerOpen(false);
        }}
        title="Select Event Poster / Cover Image"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteEventId)}
        title="Delete Community Event?"
        message="Are you sure you want to permanently delete this event or mela from the calendar?"
        confirmText="Delete Event"
        confirmVariant="danger"
        onConfirm={handleDeleteEvent}
        onCancel={() => setDeleteEventId(null)}
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
