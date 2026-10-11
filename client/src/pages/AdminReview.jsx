import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Trash2,
  Clock,
  Store,
  Calendar,
  AlertTriangle,
  Newspaper,
  RefreshCw,
  Search,
  Filter,
  User,
  Phone,
  MapPin,
  ExternalLink,
  ChevronRight,
  Lock,
  LogIn,
} from "lucide-react";

export default function AdminReview({ user: propUser }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(propUser || null);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "news" | "business" | "correction" | "event"
  const [statusFilter, setStatusFilter] = useState("pending"); // "pending" | "approved" | "rejected" | "all"

  const [submissions, setSubmissions] = useState([]);
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // Login form state if not authenticated as admin
  const [adminEmail, setAdminEmail] = useState("admin@fazilnagar.com");
  const [adminPassword, setAdminPassword] = useState("Admin@Fazilnagar2026");
  const [loginError, setLoginError] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  useEffect(() => {
    // Sync current user from localStorage
    const saved = localStorage.getItem("user");
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {}
    }
  }, [propUser]);

  const isAdmin = currentUser?.role === "admin";

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const fetchData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    const token = localStorage.getItem("token");

    try {
      // 1. Fetch Citizen Corner Submissions
      const subRes = await API.get(`/submissions?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmissions(Array.isArray(subRes.data) ? subRes.data : []);

      // 2. Fetch News (all status)
      const newsRes = await API.get(`/news?all=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allNews = Array.isArray(newsRes.data) ? newsRes.data : [];
      setNewsList(allNews);
    } catch (err) {
      console.error("Admin fetch error:", err);
      showToast("Error loading review items. Please re-authenticate.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, statusFilter]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginSubmitting(true);
    setLoginError("");

    try {
      const res = await API.post("/auth/login", {
        email: adminEmail.trim(),
        password: adminPassword,
      });

      if (res.data?.token && res.data?.user) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.setItem("isLoggedIn", "true");
        setCurrentUser(res.data.user);
        window.dispatchEvent(new Event("auth-change"));
        window.dispatchEvent(new Event("storage"));
        showToast("Logged in successfully as Administrator.");
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || "Invalid Admin ID or Password.");
    } finally {
      setLoginSubmitting(false);
    }
  };

  // Moderation: Handle Submissions (Business, Correction, Event)
  const handleSubmissionStatus = async (id, newStatus) => {
    setActionLoadingId(id);
    const token = localStorage.getItem("token");
    try {
      const res = await API.patch(
        `/submissions/${id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubmissions((prev) =>
        prev.map((item) => (item._id === id ? { ...item, status: newStatus } : item))
      );
      showToast(res.data?.message || `Submission marked as ${newStatus}.`);
    } catch (err) {
      showToast("Failed to update submission status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteSubmission = async (id) => {
    if (!window.confirm("Are you sure you want to delete this submission?")) return;
    setActionLoadingId(id);
    const token = localStorage.getItem("token");
    try {
      await API.delete(`/submissions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmissions((prev) => prev.filter((item) => item._id !== id));
      showToast("Submission deleted successfully.");
    } catch (err) {
      showToast("Failed to delete submission.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Moderation: Handle News Status
  const handleNewsStatus = async (id, newStatus) => {
    setActionLoadingId(id);
    const token = localStorage.getItem("token");
    try {
      const res = await API.patch(
        `/news/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewsList((prev) =>
        prev.map((item) => (item._id === id ? { ...item, status: newStatus } : item))
      );
      showToast(res.data?.message || `News status updated to ${newStatus}.`);
    } catch (err) {
      showToast("Failed to update news status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteNews = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this news bulletin?")) return;
    setActionLoadingId(id);
    const token = localStorage.getItem("token");
    try {
      await API.delete(`/news/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewsList((prev) => prev.filter((item) => item._id !== id));
      showToast("News article deleted.");
    } catch (err) {
      showToast("Failed to delete news.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Calculate pending counts
  const pendingNewsCount = newsList.filter((n) => n.status === "pending").length;
  const pendingBusinessCount = submissions.filter((s) => s.type === "business" && s.status === "pending").length;
  const pendingCorrectionCount = submissions.filter((s) => s.type === "correction" && s.status === "pending").length;
  const pendingEventCount = submissions.filter((s) => s.type === "event" && s.status === "pending").length;
  const totalPending = pendingNewsCount + pendingBusinessCount + pendingCorrectionCount + pendingEventCount;

  // Filtered lists
  const filteredNews = newsList.filter((n) => {
    if (statusFilter === "all") return true;
    return n.status === statusFilter || (!n.status && statusFilter === "approved");
  });

  const filteredSubmissions = submissions.filter((s) => {
    if (activeTab !== "all" && s.type !== activeTab) return false;
    return true;
  });

  // If not logged in as Admin, show the Admin Login Panel
  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 sm:p-8 bg-white rounded-3xl border border-[#E1E6EA] shadow-xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-red-50 text-[#B8323C] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-red-100 shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#B8323C]">
            Restricted Access
          </span>
          <h1 className="text-2xl font-extrabold text-[#18232E] mt-1 font-heading">
            Fazilnagar Admin Review Portal
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sign in with the fixed Administrator credentials to review and moderate Citizen Corner submissions and news bulletins.
          </p>
        </div>

        {/* Credentials Reminder Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 text-xs text-slate-700 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-[#18232E]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Fixed Admin Credentials:</span>
          </div>
          <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-slate-500">Email ID:</span>
            <code className="font-mono font-bold text-[#18232E]">admin@fazilnagar.com</code>
          </div>
          <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-slate-500">Password:</span>
            <code className="font-mono font-bold text-[#18232E]">Admin@Fazilnagar2026</code>
          </div>
        </div>

        {loginError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl mb-4 font-semibold text-center">
            {loginError}
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#18232E] mb-1">Admin Email Address</label>
            <input
              type="email"
              required
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#E1E6EA] focus:border-[#B8323C] outline-none text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-[#18232E] mb-1">Admin Secret Password</label>
            <input
              type="password"
              required
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#E1E6EA] focus:border-[#B8323C] outline-none text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loginSubmitting}
            className="w-full bg-[#18232E] hover:bg-[#B8323C] text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{loginSubmitting ? "Authenticating Admin..." : "Unlock Admin Review Desk"}</span>
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-slate-500 hover:text-[#B8323C] font-semibold">
            ← Return to Fazilnagar Town Portal
          </Link>
        </div>
      </div>
    );
  }

  // Logged-in Admin Review Dashboard
  return (
    <div className="space-y-6 pb-16">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-slate-900 to-[#18232E] text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-red-950/80 border border-red-700/50 text-red-300 px-3 py-1 rounded-full text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
            <span>Moderator Control Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
            Review & Moderation Desk (समीक्षा पोर्टल)
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Review and accept/reject citizen-submitted businesses, error reports, community events, and news articles.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Queue</span>
          </button>
          <div className="bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{totalPending} Items Pending</span>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E1E6EA] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500">News Articles</span>
            <h3 className="text-xl font-extrabold text-[#18232E]">{pendingNewsCount} Pending</h3>
            <span className="text-[11px] text-slate-400">{newsList.length} total bulletins</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Newspaper className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E1E6EA] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500">Suggested Shops</span>
            <h3 className="text-xl font-extrabold text-[#18232E]">{pendingBusinessCount} Pending</h3>
            <span className="text-[11px] text-slate-400">Citizen place listings</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-[#B8323C] flex items-center justify-center font-bold">
            <Store className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E1E6EA] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500">Error Reports</span>
            <h3 className="text-xl font-extrabold text-[#18232E]">{pendingCorrectionCount} Pending</h3>
            <span className="text-[11px] text-slate-400">Phone/location corrections</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E1E6EA] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500">Local Events</span>
            <h3 className="text-xl font-extrabold text-[#18232E]">{pendingEventCount} Pending</h3>
            <span className="text-[11px] text-slate-400">Community announcements</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#168568] flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E1E6EA] shadow-xs">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "all" ? "bg-[#18232E] text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Submissions
          </button>
          <button
            onClick={() => setActiveTab("news")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "news" ? "bg-[#18232E] text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>📰 News ({pendingNewsCount})</span>
          </button>
          <button
            onClick={() => setActiveTab("business")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "business" ? "bg-[#18232E] text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>🏬 Places ({pendingBusinessCount})</span>
          </button>
          <button
            onClick={() => setActiveTab("correction")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "correction" ? "bg-[#18232E] text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>⚠️ Reports ({pendingCorrectionCount})</span>
          </button>
          <button
            onClick={() => setActiveTab("event")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "event" ? "bg-[#18232E] text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>📅 Events ({pendingEventCount})</span>
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-bold bg-[#F5F7F8] border border-[#E1E6EA] rounded-xl px-3 py-1.5 text-[#18232E] outline-none"
          >
            <option value="pending">⏳ Pending Review</option>
            <option value="approved">✅ Approved</option>
            <option value="rejected">❌ Rejected</option>
            <option value="all">🔍 Show All</option>
          </select>
        </div>
      </div>

      {/* Main Review Lists */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-[#E1E6EA] text-center text-xs text-slate-500">
          <div className="w-8 h-8 border-3 border-[#B8323C] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span>Loading moderation queue...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION A: NEWS MODERATION (If activeTab === "all" or "news") */}
          {(activeTab === "all" || activeTab === "news") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-[#18232E] flex items-center gap-2 font-heading">
                  <Newspaper className="w-4 h-4 text-blue-600" />
                  <span>News & Bulletin Moderation ({filteredNews.length})</span>
                </h2>
              </div>

              {filteredNews.length === 0 ? (
                <div className="bg-white p-6 rounded-2xl border border-[#E1E6EA] text-center text-xs text-slate-400">
                  No news articles matching current filter ({statusFilter}).
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredNews.map((item) => (
                    <div
                      key={item._id}
                      className="bg-white p-5 rounded-2xl border border-[#E1E6EA] shadow-xs flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase">
                            {item.category || "General"}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                              item.status === "approved"
                                ? "bg-emerald-50 text-emerald-700"
                                : item.status === "rejected"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {item.status || "approved"}
                          </span>
                        </div>

                        {item.image && (
                          <div className="h-32 w-full rounded-xl overflow-hidden bg-slate-100">
                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                          </div>
                        )}

                        <h3 className="text-sm font-bold text-[#18232E] line-clamp-2">{item.title}</h3>
                        {item.titleHi && (
                          <p className="text-xs text-slate-500 font-serif line-clamp-1">{item.titleHi}</p>
                        )}
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{item.description}</p>

                        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span>By: {item.author?.name || "Local Citizen"}</span>
                          <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-3 border-t border-[#E1E6EA] flex items-center justify-end gap-2 text-xs">
                        {item.status !== "approved" && (
                          <button
                            onClick={() => handleNewsStatus(item._id, "approved")}
                            disabled={actionLoadingId === item._id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Accept & Publish</span>
                          </button>
                        )}
                        {item.status !== "rejected" && (
                          <button
                            onClick={() => handleNewsStatus(item._id, "rejected")}
                            disabled={actionLoadingId === item._id}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteNews(item._id)}
                          disabled={actionLoadingId === item._id}
                          className="bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-bold p-2 rounded-xl transition cursor-pointer"
                          title="Delete News"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION B: CITIZEN CORNER SUBMISSIONS */}
          {(activeTab === "all" || activeTab !== "news") && (
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-[#18232E] flex items-center gap-2 font-heading">
                  <Store className="w-4 h-4 text-[#B8323C]" />
                  <span>Citizen Corner Submissions ({filteredSubmissions.length})</span>
                </h2>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="bg-white p-6 rounded-2xl border border-[#E1E6EA] text-center text-xs text-slate-400">
                  No submissions matching current filter ({statusFilter}).
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSubmissions.map((sub) => (
                    <div
                      key={sub._id}
                      className="bg-white p-5 rounded-2xl border border-[#E1E6EA] shadow-xs flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                              sub.type === "business"
                                ? "bg-red-50 text-[#B8323C]"
                                : sub.type === "correction"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-[#168568]"
                            }`}
                          >
                            {sub.type === "business"
                              ? "🏬 Suggest Business"
                              : sub.type === "correction"
                              ? "⚠️ Error Correction"
                              : "📅 Local Event"}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                              sub.status === "approved"
                                ? "bg-emerald-50 text-emerald-700"
                                : sub.status === "rejected"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {sub.status}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-[#18232E]">{sub.title}</h3>

                        {sub.category && (
                          <p className="text-xs text-slate-500 font-semibold">Category: {sub.category}</p>
                        )}
                        {sub.phone && (
                          <p className="text-xs text-slate-600 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{sub.phone}</span>
                          </p>
                        )}
                        {sub.landmark && (
                          <p className="text-xs text-slate-600 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{sub.landmark}</span>
                          </p>
                        )}
                        {sub.venue && (
                          <p className="text-xs text-slate-600">Venue: <strong>{sub.venue}</strong></p>
                        )}
                        {sub.eventDate && (
                          <p className="text-xs text-slate-600">Date: <strong>{sub.eventDate}</strong></p>
                        )}
                        {sub.organizer && (
                          <p className="text-xs text-slate-600">Organizer: <strong>{sub.organizer}</strong></p>
                        )}
                        {sub.details && (
                          <div className="bg-[#F5F7F8] p-3 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                            {sub.details}
                          </div>
                        )}

                        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span>Submitted by: {sub.submittedBy?.name || "Local Resident"}</span>
                          <span>{sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : ""}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-3 border-t border-[#E1E6EA] flex items-center justify-end gap-2 text-xs">
                        {sub.status !== "approved" && (
                          <button
                            onClick={() => handleSubmissionStatus(sub._id, "approved")}
                            disabled={actionLoadingId === sub._id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>
                              {sub.type === "business"
                                ? "Accept & Add to Directory"
                                : sub.type === "event"
                                ? "Accept & Publish Event"
                                : "Mark Resolved"}
                            </span>
                          </button>
                        )}
                        {sub.status !== "rejected" && (
                          <button
                            onClick={() => handleSubmissionStatus(sub._id, "rejected")}
                            disabled={actionLoadingId === sub._id}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSubmission(sub._id)}
                          disabled={actionLoadingId === sub._id}
                          className="bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-bold p-2 rounded-xl transition cursor-pointer"
                          title="Delete Submission"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#18232E] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs border border-slate-700">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
