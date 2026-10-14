import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import {
  Calendar,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  CheckCircle,
  Eye,
  EyeOff,
  Search,
  Filter,
  X,
  Save,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function AdminEventsCMS() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [toast, setToast] = useState("");

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
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
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
    const today = new Date().toISOString().split("T")[0];
    setFormStartDate(today);
    setFormEndDate("");
    setFormTimeString("06:00 AM – 09:00 PM");
    setFormOrganizer("Fazilnagar Utsav Samiti");
    setFormOrganizerContact("+91 5564 222102");
    setFormBannerImage("https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80");
    setFormIsFeatured(false);
    setFormIsPublished(true);
    setModalOpen(true);
  };

  const openEditModal = (evt) => {
    setEditingEvent(evt);
    setFormTitle(evt.title || "");
    setFormTitleHi(evt.titleHindi || "");
    setFormCategory(evt.category || "Religious Festival");
    setFormSummary(evt.summary || "");
    setFormDescription(evt.description || "");
    setFormVenue(evt.venue || "");
    setFormAddress(evt.address || "");
    setFormLat(evt.latitude ? String(evt.latitude) : "26.6827");
    setFormLng(evt.longitude ? String(evt.longitude) : "84.0498");
    setFormStartDate(evt.startDate ? new Date(evt.startDate).toISOString().split("T")[0] : "");
    setFormEndDate(evt.endDate ? new Date(evt.endDate).toISOString().split("T")[0] : "");
    setFormTimeString(evt.timeString || "");
    setFormOrganizer(evt.organizer || "");
    setFormOrganizerContact(evt.organizerContact || "");
    setFormBannerImage(evt.bannerImage || "");
    setFormIsFeatured(evt.isFeatured === true);
    setFormIsPublished(evt.isPublished !== false);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim() || !formVenue.trim() || !formStartDate) {
      showToast("Title, Description, Venue, and Start Date are required.");
      return;
    }

    setSubmitting(true);
    const token = getAuthToken();
    const payload = {
      title: formTitle,
      titleHindi: formTitleHi,
      category: formCategory,
      summary: formSummary,
      description: formDescription,
      venue: formVenue,
      address: formAddress,
      latitude: parseFloat(formLat) || 26.6827,
      longitude: parseFloat(formLng) || 84.0498,
      startDate: new Date(formStartDate).toISOString(),
      endDate: formEndDate ? new Date(formEndDate).toISOString() : null,
      timeString: formTimeString,
      organizer: formOrganizer,
      organizerContact: formOrganizerContact,
      bannerImage: formBannerImage,
      isFeatured: formIsFeatured,
      isPublished: formIsPublished,
    };

    try {
      if (editingEvent && editingEvent._id) {
        const res = await API.put(`/events/${editingEvent._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.event) {
          setEvents((prev) =>
            prev.map((e) => (e._id === editingEvent._id ? res.data.event : e))
          );
          showToast("Event updated successfully.");
        }
      } else {
        const res = await API.post("/events", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.event) {
          setEvents((prev) => [res.data.event, ...prev]);
          showToast("Event created successfully.");
        }
      }
      setModalOpen(false);
    } catch (err) {
      showToast("Error saving event: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (evt) => {
    const token = getAuthToken();
    try {
      await API.patch(
        `/events/${evt._id}/publish`,
        { isPublished: !evt.isPublished },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEvents((prev) =>
        prev.map((e) => (e._id === evt._id ? { ...e, isPublished: !evt.isPublished } : e))
      );
      showToast(`Event ${!evt.isPublished ? "published" : "unpublished"}.`);
    } catch (err) {
      showToast("Status update failed: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this event notice?")) return;
    const token = getAuthToken();
    try {
      await API.delete(`/events/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvents((prev) => prev.filter((e) => e._id !== id));
      showToast("Event deleted successfully.");
    } catch (err) {
      showToast("Delete failed: " + err.message);
    }
  };

  const filtered = events.filter((e) => {
    const matchesCat = selectedCategory === "All" || e.category === selectedCategory;
    const matchesSearch =
      !search.trim() ||
      e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.titleHindi?.toLowerCase().includes(search.toLowerCase()) ||
      e.venue?.toLowerCase().includes(search.toLowerCase());
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
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold mb-1">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Festivals, Melas & Events CMS</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#18232E]">
            Local Events, Melas & Religious Notices
          </h2>
          <p className="text-xs text-slate-500">
            Publish upcoming community gatherings, religious festivals, aartis, fairs, and civic dates in Fazilnagar.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Community Event</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events by title, venue or Hindi name..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mb-2" />
            <p className="text-xs font-semibold">Loading events...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-xs font-semibold">No events found matching filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((evt) => (
              <div
                key={evt._id}
                className="p-4 hover:bg-slate-50 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {evt.bannerImage ? (
                    <img
                      src={evt.bannerImage}
                      alt={evt.title}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 text-amber-600">
                      <Calendar className="w-7 h-7" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                        {evt.category}
                      </span>
                      {evt.isFeatured && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Featured
                        </span>
                      )}
                      {evt.isPublished ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          Live
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                          Draft
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-extrabold text-[#18232E]">
                      {evt.title}
                    </h3>
                    {evt.titleHindi && (
                      <p className="text-xs text-amber-900 font-semibold">{evt.titleHindi}</p>
                    )}
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {evt.summary || evt.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2">
                      <span className="flex items-center gap-1 text-slate-600 font-semibold">
                        <Clock className="w-3 h-3 text-amber-600" />
                        {new Date(evt.startDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        • {evt.timeString}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3 h-3 text-red-500" /> {evt.venue}
                      </span>
                      {evt.organizer && <span>👤 {evt.organizer}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                  <button
                    onClick={() => handleTogglePublish(evt)}
                    className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                      evt.isPublished
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    title={evt.isPublished ? "Unpublish" : "Publish"}
                  >
                    {evt.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => openEditModal(evt)}
                    className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                    title="Edit Event"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(evt._id)}
                    className="p-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition cursor-pointer"
                    title="Delete Event"
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
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>{editingEvent ? "Edit Community Event" : "Create Community Event"}</span>
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
                    Event Title (English) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Mahavira Nirvana Mahotsav & Annual Mela"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Event Title (Hindi)
                  </label>
                  <input
                    type="text"
                    value={formTitleHi}
                    onChange={(e) => setFormTitleHi(e.target.value)}
                    placeholder="उदा. भगवान महावीर निर्वाण महोत्सव"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  >
                    {categories.filter((c) => c !== "All").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Timing String</label>
                  <input
                    type="text"
                    value={formTimeString}
                    onChange={(e) => setFormTimeString(e.target.value)}
                    placeholder="e.g. 06:00 AM – 09:00 PM"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    End Date (Optional for single-day)
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Short Summary (Ticker/Card)</label>
                <input
                  type="text"
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="Brief one-line summary..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Full Description & Schedule <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Details of rituals, programs, speeches, cultural processions..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Venue Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formVenue}
                    onChange={(e) => setFormVenue(e.target.value)}
                    placeholder="e.g. Mahavira Mandir Compound"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Venue Address</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Fazilnagar, Kushinagar, UP"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="text"
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    placeholder="26.6827"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="text"
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    placeholder="84.0498"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Organizer Name</label>
                  <input
                    type="text"
                    value={formOrganizer}
                    onChange={(e) => setFormOrganizer(e.target.value)}
                    placeholder="e.g. Nagar Panchayat & Event Samiti"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Organizer Phone</label>
                  <input
                    type="text"
                    value={formOrganizerContact}
                    onChange={(e) => setFormOrganizerContact(e.target.value)}
                    placeholder="+91 5564 222102"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Banner / Poster Image URL</label>
                <input
                  type="text"
                  value={formBannerImage}
                  onChange={(e) => setFormBannerImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formIsPublished}
                    onChange={(e) => setFormIsPublished(e.target.checked)}
                    className="rounded text-amber-600"
                  />
                  <span>Publish live to public portal</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="rounded text-amber-600"
                  />
                  <span>Feature in homepage events carousel</span>
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
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{editingEvent ? "Update Event" : "Create Event"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
