import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import { getAuthToken, getAuthUser, setAuthSession } from "../utils/authStorage";
import { usePageSEO } from "../utils/seo";
import AdminCommunityPlaces from "../components/AdminCommunityPlaces";
import AdminManageEntities from "../components/AdminManageEntities";
import AdminManageUsers from "../components/AdminManageUsers";
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
  Users,
  Landmark,
  Phone,
  MapPin,
  ExternalLink,
  ChevronRight,
  Lock,
  LogIn,
  Megaphone,
  Sparkles,
  Eye,
  MousePointer,
  TrendingUp,
  Plus,
  Edit,
  Star,
  Upload,
  X,
  Check,
  CalendarDays,
  Globe,
  Sliders,
  HardDrive,
  Copy,
  CheckCheck,
  FolderCheck,
} from "lucide-react";

export default function AdminReview({ user: propUser }) {
  usePageSEO({
    title: "Admin Review Desk | Fazilnagar Town Portal",
    description: "Administrative moderation and content review desk for Fazilnagar Town Portal.",
    canonicalPath: "/admin/review",
    noIndex: true,
  });
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(propUser || null);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "ads" | "news-manage" | "news" | "business" | "correction" | "event"
  const [statusFilter, setStatusFilter] = useState("pending"); // "pending" | "approved" | "rejected" | "all"

  const [submissions, setSubmissions] = useState([]);
  const [newsList, setNewsList] = useState([]);
  const [adsList, setAdsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // Google Drive Cloud Storage state
  const [driveData, setDriveData] = useState(null);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveUploading, setDriveUploading] = useState(false);
  const [copiedFileId, setCopiedFileId] = useState(null);
  const [driveUploadFile, setDriveUploadFile] = useState(null);

  // Login form state if not authenticated as admin
  const [adminEmail, setAdminEmail] = useState("admin@fazilnagar.com");
  const [adminPassword, setAdminPassword] = useState("Admin@Fazilnagar2026");
  const [loginError, setLoginError] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // -------------------------------------------------------------
  // ADVERTISEMENT MANAGEMENT MODAL STATE
  // -------------------------------------------------------------
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [adFormTitle, setAdFormTitle] = useState("");
  const [adFormDesc, setAdFormDesc] = useState("");
  const [adFormFormat, setAdFormFormat] = useState("floating");
  const [adFormPlacement, setAdFormPlacement] = useState("bottom-right");
  const [adFormFrequency, setAdFormFrequency] = useState("once-per-session");
  const [adFormInterval, setAdFormInterval] = useState(60);
  const [adFormCtaText, setAdFormCtaText] = useState("Learn More");
  const [adFormUrl, setAdFormUrl] = useState("");
  const [adFormDestUrl, setAdFormDestUrl] = useState("");
  const [adFormStart, setAdFormStart] = useState("");
  const [adFormEnd, setAdFormEnd] = useState("");
  const [adFormActive, setAdFormActive] = useState(true);
  const [adFormPublished, setAdFormPublished] = useState(false);
  const [adFormIsPermanent, setAdFormIsPermanent] = useState(false);
  const [adFormFile, setAdFormFile] = useState(null);
  const [adFormPreviewUrl, setAdFormPreviewUrl] = useState("");
  const [adFormSubmitting, setAdFormSubmitting] = useState(false);
  const [adDeleteConfirmId, setAdDeleteConfirmId] = useState(null);
  const [adPreviewModalItem, setAdPreviewModalItem] = useState(null);

  // -------------------------------------------------------------
  // NEWS STUDIO MODAL STATE
  // -------------------------------------------------------------
  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [newsFormTitle, setNewsFormTitle] = useState("");
  const [newsFormTitleHi, setNewsFormTitleHi] = useState("");
  const [newsFormSummary, setNewsFormSummary] = useState("");
  const [newsFormContent, setNewsFormContent] = useState("");
  const [newsFormCategory, setNewsFormCategory] = useState("Civic Updates");
  const [newsFormLocation, setNewsFormLocation] = useState("Fazilnagar");
  const [newsFormSource, setNewsFormSource] = useState("Municipal Bureau");
  const [newsFormImageUrl, setNewsFormImageUrl] = useState("");
  const [newsFormFile, setNewsFormFile] = useState(null);
  const [newsFormPreviewUrl, setNewsFormPreviewUrl] = useState("");
  const [newsFormIsFeatured, setNewsFormIsFeatured] = useState(false);
  const [newsFormIsPublished, setNewsFormIsPublished] = useState(true);
  const [newsFormSubmitting, setNewsFormSubmitting] = useState(false);
  const [newsDeleteConfirmId, setNewsDeleteConfirmId] = useState(null);
  const [newsPreviewModalItem, setNewsPreviewModalItem] = useState(null);

  useEffect(() => {
    const resolveUser = () => {
      const u = getAuthUser();
      if (u) {
        setCurrentUser(u);
      } else if (propUser) {
        setCurrentUser(propUser);
      }
    };

    resolveUser();
    window.addEventListener("auth-change", resolveUser);
    window.addEventListener("storage", resolveUser);
    return () => {
      window.removeEventListener("auth-change", resolveUser);
      window.removeEventListener("storage", resolveUser);
    };
  }, [propUser]);

  const isAdmin =
    currentUser?.role === "admin" ||
    currentUser?.email === "admin@fazilnagar.com" ||
    currentUser?.email === "pankaj723880@gmail.com";

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const fetchData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    const token = getAuthToken();

    try {
      // 1. Fetch Citizen Corner Submissions
      const subRes = await API.get(`/submissions?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmissions(Array.isArray(subRes.data) ? subRes.data : []);

      // 2. Fetch News (admin all)
      const newsRes = await API.get(`/news/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(async () => {
        return await API.get(`/news?all=true`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      });
      setNewsList(Array.isArray(newsRes.data) ? newsRes.data : []);

      // 3. Fetch Advertisements (admin)
      const adsRes = await API.get(`/advertisements/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdsList(Array.isArray(adsRes.data) ? adsRes.data : []);
    } catch (err) {
      console.error("Admin fetch error:", err);
      showToast("Error loading review items. Please re-authenticate.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDriveData = async () => {
    setDriveLoading(true);
    try {
      const res = await API.get("/google-drive/inspect");
      setDriveData(res.data);
    } catch (err) {
      console.error("Failed to load Google Drive info:", err);
    } finally {
      setDriveLoading(false);
    }
  };

  const handleUploadToDrive = async (file) => {
    if (!file) return;
    setDriveUploading(true);
    const token = getAuthToken();
    try {
      const formData = new FormData();
      formData.append("file", file);
      await API.post("/google-drive/admin/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      showToast("Media file uploaded successfully to Google Drive 'Fazilnagar Media'!");
      setDriveUploadFile(null);
      await fetchDriveData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to upload file to Google Drive.");
    } finally {
      setDriveUploading(false);
    }
  };

  const handleDeleteDriveFile = async (id) => {
    if (!window.confirm("Permanently delete this file from Google Drive and database?")) return;
    const token = getAuthToken();
    try {
      await API.delete(`/google-drive/media/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Media file deleted from Google Drive.");
      await fetchDriveData();
    } catch (err) {
      showToast("Failed to delete media file.");
    }
  };

  const handleCopyUrl = (url, id) => {
    const fullUrl = url.startsWith("http") ? url : `https://fazilnagar-portal.onrender.com${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedFileId(id);
    showToast("Direct Delivery URL copied to clipboard!");
    setTimeout(() => setCopiedFileId(null), 2500);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
      fetchDriveData();
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
        setAuthSession(res.data.token, res.data.user);
        setCurrentUser(res.data.user);
        showToast("Logged in successfully as Administrator.");
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || "Invalid Admin ID or Password.");
    } finally {
      setLoginSubmitting(false);
    }
  };

  // Moderation: Handle Submissions
  const handleSubmissionStatus = async (id, status) => {
    setActionLoadingId(id);
    const token = getAuthToken();

    try {
      await API.patch(
        `/submissions/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(async () => {
        return await API.patch(
          `/submissions/${id}`,
          { status },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      });
      setSubmissions((prev) => prev.map((s) => (s._id === id ? { ...s, status } : s)));
      showToast(`Submission marked as ${status}.`);
      if (typeof fetchData === "function") fetchData();
    } catch (err) {
      console.error("Submission status error:", err);
      showToast(err.response?.data?.message || "Failed to update status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteSubmission = async (id) => {
    if (!window.confirm("Permanently delete this citizen submission?")) return;
    setActionLoadingId(id);
    const token = getAuthToken();

    try {
      await API.delete(`/submissions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmissions((prev) => prev.filter((s) => s._id !== id));
      showToast("Submission deleted permanently.");
      if (typeof fetchData === "function") fetchData();
    } catch (err) {
      console.error("Delete submission error:", err);
      showToast(err.response?.data?.message || "Failed to delete submission.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Moderation: Handle Citizen Submitted News
  const handleNewsStatus = async (id, status) => {
    setActionLoadingId(id);
    const token = getAuthToken();

    try {
      await API.patch(
        `/news/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewsList((prev) =>
        prev.map((n) =>
          n._id === id
            ? { ...n, status, isPublished: status === "approved" }
            : n
        )
      );
      showToast(`News article marked as ${status}.`);
    } catch (err) {
      console.error("News status error:", err);
      showToast("Failed to update news status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteNews = async (id) => {
    if (!window.confirm("Permanently delete this news article?")) return;
    setActionLoadingId(id);
    const token = getAuthToken();

    try {
      await API.delete(`/news/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewsList((prev) => prev.filter((n) => n._id !== id));
      showToast("News article deleted.");
    } catch (err) {
      console.error("Delete news error:", err);
      showToast("Failed to delete news.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // -------------------------------------------------------------
  // ADVERTISEMENT MANAGEMENT HANDLERS
  // -------------------------------------------------------------
  const openCreateAdModal = (defaultFormat = "floating", isPermanent = false) => {
    setEditingAd(null);
    setAdFormTitle("");
    setAdFormDesc("");
    setAdFormFormat(defaultFormat);
    setAdFormPlacement("bottom-right");
    setAdFormFrequency(isPermanent ? "permanent" : "always");
    setAdFormInterval(60);
    setAdFormCtaText("Learn More");
    setAdFormUrl("");
    setAdFormDestUrl("");
    setAdFormStart("");
    setAdFormEnd("");
    setAdFormActive(true);
    setAdFormPublished(true);
    setAdFormIsPermanent(isPermanent);
    setAdFormFile(null);
    setAdFormPreviewUrl("");
    setAdModalOpen(true);
  };

  const openEditAdModal = (ad) => {
    setEditingAd(ad);
    setAdFormTitle(ad.title || "");
    setAdFormDesc(ad.description || "");
    setAdFormFormat(ad.format || "floating");
    setAdFormPlacement(ad.placement || "bottom-right");
    setAdFormFrequency(ad.frequency || (ad.isPermanent ? "permanent" : "always"));
    setAdFormInterval(ad.redisplayIntervalMinutes || 60);
    setAdFormCtaText(ad.ctaText || "Learn More");
    setAdFormUrl(ad.imageUrl || "");
    setAdFormDestUrl(ad.destinationUrl || "");
    setAdFormStart(ad.startDate ? new Date(ad.startDate).toISOString().slice(0, 16) : "");
    setAdFormEnd(ad.endDate ? new Date(ad.endDate).toISOString().slice(0, 16) : "");
    setAdFormActive(ad.isActive !== false);
    setAdFormPublished(ad.isPublished === true);
    setAdFormIsPermanent(Boolean(ad.isPermanent || ad.frequency === "permanent"));
    setAdFormFile(null);
    setAdFormPreviewUrl(ad.imageUrl || "");
    setAdModalOpen(true);
  };

  const handleSaveAd = async (e) => {
    e.preventDefault();
    if (!adFormTitle.trim()) {
      showToast("Please enter an advertisement title.");
      return;
    }

    if (!adFormFile && !adFormUrl.trim()) {
      showToast("Please provide a banner image or image URL.");
      return;
    }

    setAdFormSubmitting(true);
    const token = getAuthToken();

    try {
      const formData = new FormData();
      formData.append("title", adFormTitle.trim());
      formData.append("description", adFormDesc.trim());
      formData.append("format", adFormFormat);
      formData.append("placement", adFormPlacement);
      formData.append("frequency", adFormFrequency);
      formData.append("redisplayIntervalMinutes", adFormInterval);
      formData.append("ctaText", adFormCtaText.trim() || "Learn More");
      formData.append("destinationUrl", adFormDestUrl.trim());
      if (adFormStart) formData.append("startDate", adFormStart);
      if (adFormEnd) formData.append("endDate", adFormEnd);
      formData.append("isActive", adFormActive);
      formData.append("isPublished", adFormPublished);
      formData.append("isPermanent", adFormIsPermanent);

      if (adFormFile) {
        formData.append("image", adFormFile);
      } else {
        formData.append("imageUrl", adFormUrl.trim());
      }

      if (editingAd) {
        const res = await API.put(`/advertisements/${editingAd._id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        setAdsList((prev) =>
          prev.map((a) => (a._id === editingAd._id ? res.data?.ad || a : a))
        );
        showToast("Advertisement updated successfully.");
      } else {
        const res = await API.post("/advertisements", formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        if (res.data?.ad) {
          setAdsList((prev) => [res.data.ad, ...prev]);
        }
        showToast("Advertisement created successfully.");
      }
      setAdModalOpen(false);
    } catch (err) {
      console.error("Save ad error:", err);
      showToast(err.response?.data?.message || "Failed to save advertisement.");
    } finally {
      setAdFormSubmitting(false);
    }
  };

  const handleToggleAdPublish = async (ad) => {
    const token = getAuthToken();
    const nextVal = !ad.isPublished;
    setActionLoadingId(ad._id);

    try {
      await API.patch(
        `/advertisements/${ad._id}/publish`,
        { isPublished: nextVal },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAdsList((prev) =>
        prev.map((a) => (a._id === ad._id ? { ...a, isPublished: nextVal } : a))
      );
      showToast(`Advertisement ${nextVal ? "published live" : "unpublished"}.`);
    } catch (err) {
      console.error("Toggle ad publish error:", err);
      showToast("Failed to update publication status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleAdActive = async (ad) => {
    const token = getAuthToken();
    const nextVal = !ad.isActive;
    setActionLoadingId(ad._id);

    try {
      await API.patch(
        `/advertisements/${ad._id}/toggle`,
        { isActive: nextVal },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAdsList((prev) =>
        prev.map((a) => (a._id === ad._id ? { ...a, isActive: nextVal } : a))
      );
      showToast(`Advertisement ${nextVal ? "enabled" : "disabled"}.`);
    } catch (err) {
      console.error("Toggle ad active error:", err);
      showToast("Failed to toggle status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteAd = async (id) => {
    const token = getAuthToken();
    setActionLoadingId(id);

    try {
      await API.delete(`/advertisements/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdsList((prev) => prev.filter((a) => a._id !== id));
      setAdDeleteConfirmId(null);
      showToast("Advertisement deleted permanently.");
    } catch (err) {
      console.error("Delete ad error:", err);
      showToast("Failed to delete advertisement.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // -------------------------------------------------------------
  // NEWS STUDIO HANDLERS
  // -------------------------------------------------------------
  const openCreateNewsModal = () => {
    setEditingNews(null);
    setNewsFormTitle("");
    setNewsFormTitleHi("");
    setNewsFormSummary("");
    setNewsFormContent("");
    setNewsFormCategory("Civic Updates");
    setNewsFormLocation("Fazilnagar");
    setNewsFormSource("Municipal Ward Bureau");
    setNewsFormImageUrl("");
    setNewsFormFile(null);
    setNewsFormPreviewUrl("");
    setNewsFormIsFeatured(false);
    setNewsFormIsPublished(true);
    setNewsModalOpen(true);
  };

  const openEditNewsModal = (item) => {
    setEditingNews(item);
    setNewsFormTitle(item.title || "");
    setNewsFormTitleHi(item.titleHi || "");
    setNewsFormSummary(item.summary || item.description || "");
    setNewsFormContent(item.content || item.description || "");
    setNewsFormCategory(item.category || "Civic Updates");
    setNewsFormLocation(item.location || "Fazilnagar");
    setNewsFormSource(item.source || "Town Reporter");
    setNewsFormImageUrl(item.image || "");
    setNewsFormFile(null);
    setNewsFormPreviewUrl(item.image || "");
    setNewsFormIsFeatured(item.isFeatured === true);
    setNewsFormIsPublished(item.isPublished === true || item.status === "approved");
    setNewsModalOpen(true);
  };

  const handleSaveNews = async (e) => {
    e.preventDefault();
    if (!newsFormTitle.trim()) {
      showToast("Please enter headline.");
      return;
    }
    if (!newsFormSummary.trim()) {
      showToast("Please provide a summary for the Reels card.");
      return;
    }

    setNewsFormSubmitting(true);
    const token = getAuthToken();

    try {
      const formData = new FormData();
      formData.append("title", newsFormTitle.trim());
      formData.append("titleHi", newsFormTitleHi.trim());
      formData.append("summary", newsFormSummary.trim());
      formData.append("description", newsFormSummary.trim());
      formData.append("content", newsFormContent.trim() || newsFormSummary.trim());
      formData.append("category", newsFormCategory);
      formData.append("location", newsFormLocation.trim());
      formData.append("source", newsFormSource.trim());
      formData.append("isFeatured", newsFormIsFeatured);
      formData.append("isPublished", newsFormIsPublished);
      formData.append("status", newsFormIsPublished ? "approved" : "draft");

      if (newsFormFile) {
        formData.append("image", newsFormFile);
      } else if (newsFormImageUrl.trim()) {
        formData.append("imageUrl", newsFormImageUrl.trim());
      }

      if (editingNews) {
        const res = await API.put(`/news/${editingNews._id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        setNewsList((prev) =>
          prev.map((n) => (n._id === editingNews._id ? res.data?.article || n : n))
        );
        showToast("Article updated successfully.");
      } else {
        const res = await API.post("/news", formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        if (res.data?._id) {
          setNewsList((prev) => [res.data, ...prev]);
        }
        showToast("Article published to news registry.");
      }
      setNewsModalOpen(false);
    } catch (err) {
      console.error("Save news error:", err);
      showToast(err.response?.data?.message || "Failed to save article.");
    } finally {
      setNewsFormSubmitting(false);
    }
  };

  const handleToggleNewsFeatured = async (story) => {
    const token = getAuthToken();
    const nextVal = !story.isFeatured;
    setActionLoadingId(story._id);

    try {
      await API.patch(
        `/news/${story._id}/feature`,
        { isFeatured: nextVal },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewsList((prev) =>
        prev.map((n) => (n._id === story._id ? { ...n, isFeatured: nextVal } : n))
      );
      showToast(`Article ${nextVal ? "pinned to top ⭐" : "unpinned"}.`);
    } catch (err) {
      console.error("Toggle featured error:", err);
      showToast("Failed to toggle pinned status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleNewsPublish = async (story) => {
    const token = getAuthToken();
    const nextVal = !(story.isPublished || story.status === "approved");
    setActionLoadingId(story._id);

    try {
      await API.patch(
        `/news/${story._id}/publish`,
        { isPublished: nextVal },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewsList((prev) =>
        prev.map((n) =>
          n._id === story._id
            ? { ...n, isPublished: nextVal, status: nextVal ? "approved" : "draft" }
            : n
        )
      );
      showToast(`Article ${nextVal ? "published live" : "moved to drafts"}.`);
    } catch (err) {
      console.error("Toggle publish error:", err);
      showToast("Failed to toggle publish status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Calculations for stats
  const pendingNewsCount = newsList.filter((n) => n.status === "pending").length;
  const pendingBusinessCount = submissions.filter((s) => s.type === "business" && s.status === "pending").length;
  const pendingCorrectionCount = submissions.filter((s) => s.type === "correction" && s.status === "pending").length;
  const pendingEventCount = submissions.filter((s) => s.type === "event" && s.status === "pending").length;
  const totalPending = pendingNewsCount + pendingBusinessCount + pendingCorrectionCount + pendingEventCount;

  // Advertisement stats
  const liveAdsCount = adsList.filter((a) => {
    if (!a.isActive || !a.isPublished) return false;
    const now = new Date();
    if (a.startDate && new Date(a.startDate) > now) return false;
    if (a.endDate && new Date(a.endDate) < now) return false;
    return true;
  }).length;

  const totalAdImpressions = adsList.reduce((acc, a) => acc + (a.impressions || 0), 0);
  const totalAdClicks = adsList.reduce((acc, a) => acc + (a.clicks || 0), 0);
  const totalAdDismissals = adsList.reduce((acc, a) => acc + (a.dismissals || 0), 0);

  // Filtered lists
  const filteredNews = newsList.filter((n) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") return n.status === "pending";
    if (statusFilter === "approved") return n.status === "approved" || n.isPublished === true;
    if (statusFilter === "rejected") return n.status === "rejected";
    return true;
  });

  const filteredSubmissions = submissions.filter((s) => {
    if (activeTab !== "all" && s.type !== activeTab) return false;
    return true;
  });

  // If not logged in as Admin, show Admin Login Panel
  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 sm:p-8 bg-white rounded-3xl border border-[#E1E6EA] shadow-xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-red-50 text-[#B8323C] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-red-100 shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#B8323C]">
            Restricted Admin Area
          </span>
          <h1 className="text-2xl font-extrabold text-[#18232E] mt-1 font-heading">
            Fazilnagar Portal Administration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sign in with authorized administrator credentials to manage advertisements, news reels, citizen submissions, and directory verification.
          </p>
        </div>

        {/* Credentials Reminder Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 text-xs text-slate-700 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-[#18232E]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Administrator Credentials:</span>
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

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#18232E] mb-1">Admin Email Address</label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-[#B8323C] focus:bg-white transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#18232E] mb-1">Admin Password</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-[#B8323C] focus:bg-white transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loginSubmitting}
            className="w-full bg-[#B8323C] hover:bg-[#991B1B] text-white text-xs font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {loginSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>Sign In to Admin Dashboard</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4 sm:px-6">
      
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-slate-900 via-[#18232E] to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 bg-red-950/80 border border-red-700/50 text-red-300 px-3 py-1 rounded-full text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
            <span>Town Portal Admin Desk (प्रशासक नियंत्रण कक्ष)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
            Administration & Editorial Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Private controls for homepage advertisements, Reels-style news articles, community updates, and directory moderation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={openCreateAdModal}
            className="bg-[#B8323C] hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>+ New Ad</span>
          </button>

          <button
            onClick={openCreateNewsModal}
            className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Story</span>
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            title="Refresh All Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
        {/* Manage Entities Stat */}
        <div
          onClick={() => setActiveTab("manage-entities")}
          className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
            activeTab === "manage-entities"
              ? "bg-emerald-50/70 border-emerald-600 shadow-sm"
              : "bg-white border-[#E1E6EA] hover:border-slate-300 shadow-2xs"
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500">Official Places</span>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#18232E]">
              19 Places
            </h3>
            <span className="text-[11px] text-slate-400">Schools & Hospitals</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Landmark className="w-5 h-5" />
          </div>
        </div>

        {/* Manage Users Stat */}
        <div
          onClick={() => setActiveTab("manage-users")}
          className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
            activeTab === "manage-users"
              ? "bg-indigo-50/70 border-indigo-600 shadow-sm"
              : "bg-white border-[#E1E6EA] hover:border-slate-300 shadow-2xs"
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500">Accounts</span>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#18232E]">
              Users
            </h3>
            <span className="text-[11px] text-slate-400">Security & Roles</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Ads Stat */}
        <div
          onClick={() => setActiveTab("ads")}
          className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
            activeTab === "ads"
              ? "bg-red-50/70 border-[#B8323C] shadow-sm"
              : "bg-white border-[#E1E6EA] hover:border-slate-300 shadow-2xs"
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500">Advertisements</span>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#18232E]">
              {liveAdsCount} Live
            </h3>
            <span className="text-[11px] text-slate-400">{adsList.length} total banners</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-100 text-[#B8323C] flex items-center justify-center font-bold">
            <Megaphone className="w-5 h-5" />
          </div>
        </div>

        {/* News Stat */}
        <div
          onClick={() => setActiveTab("news-manage")}
          className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
            activeTab === "news-manage"
              ? "bg-blue-50/70 border-blue-500 shadow-sm"
              : "bg-white border-[#E1E6EA] hover:border-slate-300 shadow-2xs"
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500">Reels Stories</span>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#18232E]">
              {newsList.filter((n) => n.isPublished || n.status === "approved").length} Published
            </h3>
            <span className="text-[11px] text-slate-400">{newsList.length} total entries</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <Newspaper className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Submissions */}
        <div
          onClick={() => setActiveTab("all")}
          className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
            activeTab === "all"
              ? "bg-amber-50/70 border-amber-500 shadow-sm"
              : "bg-white border-[#E1E6EA] hover:border-slate-300 shadow-2xs"
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500">Citizen Queue</span>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#18232E]">
              {totalPending} Pending
            </h3>
            <span className="text-[11px] text-slate-400">Moderation requests</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Suggested Places */}
        <div
          onClick={() => setActiveTab("business")}
          className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
            activeTab === "business"
              ? "bg-emerald-50/70 border-emerald-500 shadow-sm"
              : "bg-white border-[#E1E6EA] hover:border-slate-300 shadow-2xs"
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500">Suggested Places</span>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#18232E]">
              {pendingBusinessCount} Pending
            </h3>
            <span className="text-[11px] text-slate-400">Citizen place listings</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Store className="w-5 h-5" />
          </div>
        </div>

        {/* Error Reports */}
        <div
          onClick={() => setActiveTab("correction")}
          className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
            activeTab === "correction"
              ? "bg-purple-50/70 border-purple-500 shadow-sm"
              : "bg-white border-[#E1E6EA] hover:border-slate-300 shadow-2xs"
          }`}
        >
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500">Error Reports</span>
            <h3 className="text-lg sm:text-xl font-extrabold text-[#18232E]">
              {pendingCorrectionCount} Pending
            </h3>
            <span className="text-[11px] text-slate-400">Corrections needed</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E1E6EA] shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab("manage-entities")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "manage-entities"
                ? "bg-[#0D5E49] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Landmark className="w-3.5 h-3.5 text-emerald-300" />
            <span>Manage Entities (19)</span>
          </button>

          <button
            onClick={() => setActiveTab("manage-users")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "manage-users"
                ? "bg-indigo-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-300" />
            <span>Manage Users</span>
          </button>

          <button
            onClick={() => setActiveTab("ads")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "ads"
                ? "bg-[#B8323C] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Advertisements ({adsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("news-manage")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "news-manage"
                ? "bg-[#18232E] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>News & Reels ({newsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("community-places")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "community-places"
                ? "bg-[#0D5E49] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Store className="w-3.5 h-3.5 text-amber-400" />
            <span>Community Submissions</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("drive");
              fetchDriveData();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "drive"
                ? "bg-emerald-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Google Drive Media ({driveData?.folder?.filesUploadedCount ?? driveData?.mongo?.totalCount ?? 1})</span>
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "all" ? "bg-[#18232E] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Submissions ({submissions.length})
          </button>

          <button
            onClick={() => setActiveTab("business")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "business" ? "bg-[#18232E] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Places ({pendingBusinessCount})
          </button>

          <button
            onClick={() => setActiveTab("correction")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "correction" ? "bg-[#18232E] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Reports ({pendingCorrectionCount})
          </button>

          <button
            onClick={() => setActiveTab("event")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "event" ? "bg-[#18232E] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Events ({pendingEventCount})
          </button>
        </div>

        {/* Status Filter for Citizen Submissions */}
        {activeTab !== "ads" && activeTab !== "news-manage" && activeTab !== "drive" && activeTab !== "manage-entities" && activeTab !== "manage-users" && (
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
        )}
      </div>

      {/* ========================================================
          DEDICATED SECTION 1: MANAGE ALL ENTITIES (FEATURE 4)
          ======================================================== */}
      {activeTab === "manage-entities" && (
        <section aria-label="Manage Official Entities and Listings" className="space-y-4">
          <AdminManageEntities token={getAuthToken()} onStatsChange={fetchData} />
        </section>
      )}

      {/* ========================================================
          DEDICATED SECTION 2: MANAGE REGISTERED USERS (FEATURE 5)
          ======================================================== */}
      {activeTab === "manage-users" && (
        <section aria-label="Manage Registered Users" className="space-y-4">
          <AdminManageUsers token={getAuthToken()} currentAdminUser={currentUser} />
        </section>
      )}

      {/* ========================================================
          COMMUNITY SUBMISSIONS DIRECTORY & MAP PIN VERIFICATION
          ======================================================== */}
      {(activeTab === "community-places" || activeTab === "business") && (
        <section aria-label="Community Place Submissions" className="space-y-4">
          <div className="bg-[#18232E] text-white p-4 sm:p-5 rounded-2xl flex items-center justify-between border border-slate-800 shadow-md">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-[#0D5E49] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-300" /> Ground Verification Desk
                </span>
                <span className="text-[11px] text-slate-400">PIN 274401 Official Registry</span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                Community Directory & Map Pin Verification Desk
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Review community-submitted local businesses, shops, and public places. Audit exact map coordinates, verify storefront photos, and approve or reject submissions before public publication.
              </p>
            </div>
          </div>
          <AdminCommunityPlaces token={getAuthToken()} onStatsChange={fetchData} />
        </section>
      )}

      {/* ========================================================
          TAB 1: ADVERTISEMENT MANAGEMENT (FEATURE 1)
          ======================================================== */}
      {activeTab === "ads" && (
        <section aria-label="Advertisement Management" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#E1E6EA] shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-100 text-[#B8323C] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                  Admin Private
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-[#18232E] font-heading">
                  Homepage Advertisements Registry
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage floating overlay ads, sticky banners, and in-feed sponsor spots across Fazilnagar portal.
              </p>
            </div>

            <button
              onClick={() => openCreateAdModal("floating")}
              className="bg-[#B8323C] hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Advertisement</span>
            </button>
          </div>

          {/* Quick Ad Type Creation Selector Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-[#18232E] to-slate-900 text-white p-4 rounded-2xl border border-slate-700 shadow-md">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="bg-[#B8323C] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Choose Type</span>
                  </span>
                  <h3 className="text-xs sm:text-sm font-extrabold text-white">
                    Select Ad Format to Create (विज्ञापन का प्रकार चुनें)
                  </h3>
                </div>
                <p className="text-[11px] text-slate-300">
                  Click any of the 4 formats below to quickly create and configure:
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openCreateAdModal("floating")}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Screen ke corner mein chota overlay card with Close (✕) button"
                >
                  <span>🪟</span>
                  <span>+ Floating Card Ad</span>
                </button>

                <button
                  type="button"
                  onClick={() => openCreateAdModal("sticky-bottom")}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Screen ke bottom par scrolling ke dauran permanently fixed with Close (✕) button"
                >
                  <span>📌</span>
                  <span>+ Sticky Bottom Ad</span>
                </button>

                <button
                  type="button"
                  onClick={() => openCreateAdModal("sticky-top")}
                  className="bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Screen ke top par (navbar ke niche) fixed with Close (✕) button"
                >
                  <span>📌</span>
                  <span>+ Sticky Top Ad</span>
                </button>

                <button
                  type="button"
                  onClick={() => openCreateAdModal("banner")}
                  className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Homepage content ke beech me standard full-width banner"
                >
                  <span>🖼️</span>
                  <span>+ In-Feed Banner</span>
                </button>

                <button
                  type="button"
                  onClick={() => openCreateAdModal("floating", true)}
                  className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer border border-amber-300"
                  title="स्थाई विज्ञापन - हमेशा दिखेगा, कभी एक्सपायर या गायब नहीं होगा (Never Expires & Always Visible)"
                >
                  <span>⭐</span>
                  <span>+ Permanent Ad (स्थाई)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Ad Analytics Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-[#E1E6EA] shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Impressions</span>
                <h4 className="text-base font-extrabold text-[#18232E]">{totalAdImpressions} views</h4>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E1E6EA] shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <MousePointer className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Genuine Clicks</span>
                <h4 className="text-base font-extrabold text-[#18232E]">{totalAdClicks} clicks</h4>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E1E6EA] shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <X className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Dismissals (✕)</span>
                <h4 className="text-base font-extrabold text-[#18232E]">{totalAdDismissals} closed</h4>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E1E6EA] shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Click-Through Rate</span>
                <h4 className="text-base font-extrabold text-[#18232E]">
                  {totalAdImpressions > 0
                    ? ((totalAdClicks / totalAdImpressions) * 100).toFixed(1) + "%"
                    : "0.0%"}
                </h4>
              </div>
            </div>
          </div>

          {/* Ad Table / Cards */}
          {adsList.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-[#E1E6EA] text-center space-y-3">
              <div className="w-12 h-12 bg-red-50 text-[#B8323C] rounded-2xl flex items-center justify-center mx-auto">
                <Megaphone className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#18232E]">No Advertisements Created Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                The homepage advertisement slot is currently completely collapsed and invisible to public visitors. Click below to create your first sponsor banner.
              </p>
              <button
                onClick={openCreateAdModal}
                className="bg-[#B8323C] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-red-700 transition"
              >
                + Create First Advertisement
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adsList.map((ad) => {
                const now = new Date();
                const isScheduledFuture = ad.startDate && new Date(ad.startDate) > now;
                const isExpired = ad.endDate && new Date(ad.endDate) < now;
                const isLive = ad.isActive && ad.isPublished && !isScheduledFuture && !isExpired;

                return (
                  <div
                    key={ad._id}
                    className="bg-white p-5 rounded-2xl border border-[#E1E6EA] shadow-2xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
                  >
                    <div className="space-y-3">
                      {/* Status Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          {isLive ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                              <span>Live on Homepage</span>
                            </span>
                          ) : isExpired ? (
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                              Expired Schedule
                            </span>
                          ) : isScheduledFuture ? (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                              Scheduled Future
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                              Inactive / Draft
                            </span>
                          )}

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              ad.isPublished
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {ad.isPublished ? "Published" : "Draft (Unpublished)"}
                          </span>

                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              ad.format === "floating"
                                ? "bg-purple-100 text-purple-800"
                                : ad.format === "sticky-bottom"
                                ? "bg-indigo-100 text-indigo-800"
                                : ad.format === "sticky-top"
                                ? "bg-cyan-100 text-cyan-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {ad.format === "floating"
                              ? "🪟 Floating Overlay"
                              : ad.format === "sticky-bottom"
                              ? "📌 Sticky Bottom"
                              : ad.format === "sticky-top"
                              ? "📌 Sticky Top"
                              : "🖼️ In-Feed Banner"}
                          </span>

                          {(ad.isPermanent || ad.frequency === "permanent") && (
                            <span className="bg-gradient-to-r from-amber-200 to-yellow-200 text-amber-950 border border-amber-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                              <span>⭐</span> Permanent Ad (स्थाई)
                            </span>
                          )}
                        </div>

                        {/* Impressions, Clicks & Dismissals */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                          <span>{ad.impressions || 0} imp</span>
                          <span>•</span>
                          <span>{ad.clicks || 0} clicks</span>
                          <span>•</span>
                          <span>{ad.dismissals || 0} dismissed</span>
                        </div>
                      </div>

                      {/* Visual Banner Preview */}
                      {ad.imageUrl && (
                        <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 relative group">
                          <img
                            src={ad.imageUrl}
                            alt={ad.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-sm font-bold text-[#18232E] leading-snug">{ad.title}</h3>
                        {ad.description && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{ad.description}</p>
                        )}
                      </div>

                      {/* Destination URL & CTA */}
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        {ad.destinationUrl ? (
                          <div className="flex items-center gap-1.5 truncate">
                            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <a
                              href={ad.destinationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate"
                            >
                              {ad.destinationUrl}
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No link</span>
                        )}
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md shrink-0">
                          CTA: {ad.ctaText || "Learn More"}
                        </span>
                      </div>

                      {/* Configuration Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                          📍 {ad.placement === "bottom-left" ? "Bottom Left" : "Bottom Right"}
                        </span>
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                          ⏱️ {ad.frequency === "always" ? "Every Visit" : ad.frequency === "interval" ? `Every ${ad.redisplayIntervalMinutes || 60}m` : "Once / Session"}
                        </span>
                      </div>

                      {/* Schedule Info */}
                      {(ad.startDate || ad.endDate) && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center gap-2">
                          <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : "Immediate"} –{" "}
                            {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : "Indefinite"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="pt-3 border-t border-[#E1E6EA] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleAdPublish(ad)}
                          disabled={actionLoadingId === ad._id}
                          className={`font-bold px-3 py-1.5 rounded-xl transition text-[11px] cursor-pointer ${
                            ad.isPublished
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                        >
                          {ad.isPublished ? "Unpublish" : "Publish"}
                        </button>

                        <button
                          onClick={() => handleToggleAdActive(ad)}
                          disabled={actionLoadingId === ad._id}
                          className={`font-bold px-3 py-1.5 rounded-xl transition text-[11px] cursor-pointer ${
                            ad.isActive
                              ? "bg-amber-100 hover:bg-amber-200 text-amber-800"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {ad.isActive ? "Disable" : "Enable"}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setAdPreviewModalItem(ad)}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 p-2 rounded-xl transition cursor-pointer"
                          title="Preview Live Floating Card"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => openEditAdModal(ad)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-xl transition cursor-pointer"
                          title="Edit Advertisement"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setAdDeleteConfirmId(ad._id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-xl transition cursor-pointer"
                          title="Delete Advertisement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================
          TAB 2: NEWS STUDIO & REELS FEED MANAGEMENT (FEATURE 2)
          ======================================================== */}
      {activeTab === "news-manage" && (
        <section aria-label="News Studio and Reels Management" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#E1E6EA] shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                  Editorial Desk
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-[#18232E] font-heading">
                  Fazilnagar News Reels Studio
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Author, preview, pin, and publish vertical mobile-first news stories. Drafts remain strictly hidden from public feeds.
              </p>
            </div>

            <button
              onClick={openCreateNewsModal}
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create News Story</span>
            </button>
          </div>

          {/* Stories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {newsList.map((story) => {
              const isPub = story.isPublished || story.status === "approved";

              return (
                <div
                  key={story._id}
                  className="bg-white p-5 rounded-2xl border border-[#E1E6EA] shadow-2xs flex flex-col justify-between space-y-3 hover:border-slate-300 transition"
                >
                  <div className="space-y-2.5">
                    {/* Media Thumbnail */}
                    {story.image ? (
                      <div className="h-36 w-full rounded-xl overflow-hidden bg-slate-900 relative">
                        <img
                          src={story.image}
                          alt={story.title}
                          className="w-full h-full object-cover"
                        />
                        {story.isFeatured && (
                          <div className="absolute top-2 left-2 bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md">
                            <Star className="w-3 h-3 fill-current" />
                            <span>Pinned</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-28 w-full rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                        No cover image
                      </div>
                    )}

                    {/* Status & Category */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase">
                        {story.category || "General"}
                      </span>

                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                          isPub
                            ? "bg-emerald-50 text-emerald-700"
                            : story.status === "draft"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {isPub ? "Published" : story.status === "draft" ? "Draft" : "Pending"}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#18232E] leading-snug line-clamp-2">
                      {story.title}
                    </h3>

                    {story.summary && (
                      <p className="text-xs text-slate-600 line-clamp-2">{story.summary}</p>
                    )}

                    <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span>{story.location || "Fazilnagar"}</span>
                      <span>{story.publishedAt ? new Date(story.publishedAt).toLocaleDateString() : ""}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-[#E1E6EA] flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleNewsFeatured(story)}
                        className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                          story.isFeatured
                            ? "bg-amber-50 border-amber-300 text-amber-700"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700"
                        }`}
                        title={story.isFeatured ? "Unpin story" : "Pin story to top"}
                      >
                        <Star className={`w-3.5 h-3.5 ${story.isFeatured ? "fill-current" : ""}`} />
                      </button>

                      <button
                        onClick={() => handleToggleNewsPublish(story)}
                        className={`font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition cursor-pointer ${
                          isPub
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        {isPub ? "Unpublish" : "Publish"}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setNewsPreviewModalItem(story)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg transition cursor-pointer"
                        title="Preview Mobile Reel"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => openEditNewsModal(story)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg transition cursor-pointer"
                        title="Edit Story"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setNewsDeleteConfirmId(story._id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-lg transition cursor-pointer"
                        title="Delete Story"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================
          TAB 3: GOOGLE DRIVE CLOUD STORAGE MEDIA
          ======================================================== */}
      {activeTab === "drive" && (
        <section aria-label="Google Drive Cloud Storage" className="space-y-5">
          {/* Top Overview & Connection Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E1E6EA] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    <span>OAuth Connected</span>
                  </span>
                  <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                    drive.file Scope
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-[#18232E] font-heading mt-1.5">
                  Google Drive Cloud Storage Registry
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Media files stored persistently in your dedicated Google Drive account and served via secure CDN-cached proxy.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={fetchDriveData}
                  disabled={driveLoading}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Refresh Drive Files"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${driveLoading ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>

                {driveData?.folder?.folderWebViewLink && (
                  <a
                    href={driveData.folder.folderWebViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#18232E] hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Open in Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Storage Info Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Connected Account</span>
                <span className="font-bold text-[#18232E] truncate block">{driveData?.accountEmail || "pss809352@gmail.com"}</span>
              </div>

              <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Dedicated Folder</span>
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <FolderCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{driveData?.folder?.folderName || "Fazilnagar Media"}</span>
                </span>
              </div>

              <div className="bg-[#F8FAFC] p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Files Stored</span>
                <span className="font-black text-[#18232E]">
                  {driveData?.folder?.filesUploadedCount ?? driveData?.mongo?.totalCount ?? 0} media files
                </span>
              </div>
            </div>
          </div>

          {/* Upload New Image Box */}
          <div className="bg-gradient-to-br from-slate-900 to-[#18232E] text-white p-5 rounded-2xl border border-slate-700 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full inline-block mb-1">
                  Direct Upload
                </span>
                <h3 className="text-sm sm:text-base font-extrabold">Upload Media to Google Drive</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Uploaded files go directly into the <strong className="text-emerald-300">Fazilnagar Media</strong> folder on Google Drive.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl px-4 py-2.5 text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>{driveUploadFile ? driveUploadFile.name : "Choose File"}</span>
                  <input
                    type="file"
                    accept="image/*,video/mp4"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setDriveUploadFile(f);
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => handleUploadToDrive(driveUploadFile)}
                  disabled={!driveUploadFile || driveUploading}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                >
                  {driveUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Upload Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Files Gallery Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#18232E] flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-emerald-700" />
                <span>Uploaded Files in Fazilnagar Media</span>
              </h3>
            </div>

            {driveLoading ? (
              <div className="bg-white p-12 rounded-2xl border border-[#E1E6EA] text-center">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-semibold">Loading files from Google Drive...</p>
              </div>
            ) : (!driveData?.mongo?.recentFiles || driveData.mongo.recentFiles.length === 0) && (!driveData?.folder?.files || driveData.folder.files.length === 0) ? (
              <div className="bg-white p-12 rounded-2xl border border-[#E1E6EA] text-center">
                <FolderCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">No media uploaded yet</p>
                <p className="text-xs text-slate-400 mt-1">Upload an image above to verify Google Drive storage.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(driveData?.mongo?.recentFiles && driveData.mongo.recentFiles.length > 0
                  ? driveData.mongo.recentFiles
                  : driveData?.folder?.files || []
                ).map((file, idx) => {
                  const fileId = file.id || file._id || file.driveFileId;
                  const driveFileId = file.driveFileId || file.id;
                  const fileName = file.fileName || file.name || "Media File";
                  const fileSize = file.fileSize || file.size || 0;
                  const deliveryUrl = file.deliveryUrl || `/api/google-drive/media/${fileId}`;
                  const fullDeliveryUrl = deliveryUrl.startsWith("http")
                    ? deliveryUrl
                    : `https://fazilnagar-portal.onrender.com${deliveryUrl}`;
                  const driveWebLink = file.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`;

                  return (
                    <div
                      key={fileId || idx}
                      className="bg-white rounded-2xl border border-[#E1E6EA] shadow-2xs overflow-hidden flex flex-col justify-between hover:shadow-md transition"
                    >
                      {/* Image Preview Container */}
                      <div className="h-36 bg-slate-900 relative overflow-hidden group flex items-center justify-center">
                        <img
                          src={fullDeliveryUrl}
                          alt={fileName}
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <div className="absolute top-2 right-2">
                          <span className="bg-black/70 backdrop-blur-xs text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                            {file.mimeType || "image"}
                          </span>
                        </div>
                      </div>

                      {/* File Details */}
                      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between text-xs">
                        <div>
                          <h4 className="font-bold text-[#18232E] line-clamp-1 text-xs" title={fileName}>
                            {fileName}
                          </h4>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                            <span>{fileSize > 1024 ? `${Math.round(fileSize / 1024)} KB` : `${fileSize} B`}</span>
                            <span>{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : ""}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyUrl(deliveryUrl, fileId)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-[10px] flex items-center gap-1 transition cursor-pointer"
                            title="Copy delivery URL for articles/banners"
                          >
                            {copiedFileId === fileId ? (
                              <>
                                <CheckCheck className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-500" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-1">
                            <a
                              href={driveWebLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-lg text-[10px] transition"
                              title="Open in Google Drive"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDeleteDriveFile(fileId)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-lg text-[10px] transition cursor-pointer"
                              title="Delete from Google Drive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========================================================
          TABS 4+: CITIZEN CORNER SUBMISSIONS MODERATION
          ======================================================== */}
      {activeTab !== "ads" && activeTab !== "news-manage" && activeTab !== "drive" && activeTab !== "manage-entities" && activeTab !== "manage-users" && (
        <section aria-label="Citizen Submissions Moderation" className="space-y-6">
          {/* SECTION A: CITIZEN NEWS MODERATION (When activeTab === "all" or "news") */}
          {(activeTab === "all" || activeTab === "news") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-[#18232E] flex items-center gap-2 font-heading">
                  <Newspaper className="w-4 h-4 text-blue-600" />
                  <span>Citizen Submitted News ({filteredNews.length})</span>
                </h2>
              </div>

              {filteredNews.length === 0 ? (
                <div className="bg-white p-6 rounded-2xl border border-[#E1E6EA] text-center text-xs text-slate-400">
                  No citizen news articles matching filter ({statusFilter}).
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
                          title="Delete News Article"
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

          {/* SECTION B: CITIZEN SUGGESTED PLACES, CORRECTIONS, EVENTS */}
          {activeTab !== "news" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-[#18232E] flex items-center gap-2 font-heading">
                  <Store className="w-4 h-4 text-emerald-600" />
                  <span>Places, Corrections & Events Submissions ({filteredSubmissions.length})</span>
                </h2>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-[#E1E6EA] text-center text-xs text-slate-400">
                  No citizen submissions currently in queue for this filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSubmissions.map((sub) => (
                    <div
                      key={sub._id}
                      className="bg-white p-5 rounded-2xl border border-[#E1E6EA] shadow-xs flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                              sub.type === "business"
                                ? "bg-red-50 text-[#B8323C]"
                                : sub.type === "correction"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {sub.type === "business"
                              ? "New Place / Shop"
                              : sub.type === "correction"
                              ? "Data Correction"
                              : "Local Event"}
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

                        <h3 className="text-sm font-bold text-[#18232E]">{sub.title}</h3>

                        {sub.category && (
                          <p className="text-xs text-slate-500">Category: <strong>{sub.category}</strong></p>
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
        </section>
      )}

      {/* ========================================================
          CREATE / EDIT ADVERTISEMENT MODAL
          ======================================================== */}
      {adModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-[#B8323C] flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-[#18232E] font-heading">
                  {editingAd ? "Edit Advertisement" : "Create Homepage Advertisement"}
                </h3>
              </div>
              <button
                onClick={() => setAdModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveAd} className="overflow-y-auto p-6 space-y-4 text-xs">
              {/* STEP 1: Select Advertisement Type / Format */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#B8323C] text-white text-[10px] font-black flex items-center justify-center">
                      1
                    </span>
                    <label className="block font-extrabold text-[#18232E] text-xs">
                      Select Advertisement Display Type (विज्ञापन का प्रकार चुनें) <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                    4 Formats Available
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAdFormFormat("floating")}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                      adFormFormat === "floating"
                        ? "border-purple-600 bg-purple-50 ring-2 ring-purple-600/30"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-purple-950 text-xs flex items-center gap-1.5">
                        <span className="text-base">🪟</span> Floating Overlay Ad
                      </span>
                      {adFormFormat === "floating" ? (
                        <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-200 px-1.5 py-0.2 rounded">Selected</span>
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-slate-300"></span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">
                      Screen corner mein chota floating overlay card with Close (✕) button & CTA
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdFormFormat("sticky-bottom")}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                      adFormFormat === "sticky-bottom"
                        ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600/30"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-indigo-950 text-xs flex items-center gap-1.5">
                        <span className="text-base">📌</span> Sticky Bottom Banner
                      </span>
                      {adFormFormat === "sticky-bottom" ? (
                        <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-200 px-1.5 py-0.2 rounded">Selected</span>
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-slate-300"></span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">
                      Screen ke bottom par scrolling ke dauran fixed banner with Close (✕) button
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdFormFormat("sticky-top")}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                      adFormFormat === "sticky-top"
                        ? "border-cyan-600 bg-cyan-50 ring-2 ring-cyan-600/30"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-cyan-950 text-xs flex items-center gap-1.5">
                        <span className="text-base">📌</span> Sticky Top Banner
                      </span>
                      {adFormFormat === "sticky-top" ? (
                        <span className="text-[10px] font-black uppercase text-cyan-700 bg-cyan-200 px-1.5 py-0.2 rounded">Selected</span>
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-slate-300"></span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">
                      Screen ke top (navbar ke niche) fixed banner with Close (✕) button
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdFormFormat("banner")}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                      adFormFormat === "banner"
                        ? "border-[#B8323C] bg-red-50 ring-2 ring-[#B8323C]/30"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                        <span className="text-base">🖼️</span> In-Feed Banner
                      </span>
                      {adFormFormat === "banner" ? (
                        <span className="text-[10px] font-black uppercase text-[#B8323C] bg-red-200 px-1.5 py-0.2 rounded">Selected</span>
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-slate-300"></span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">
                      Homepage content ke beech standard full-width horizontal banner
                    </span>
                  </button>
                </div>

                <div className="text-[11px] font-semibold text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
                  <span className="font-black text-[#B8323C]">Format Active:</span>
                  <span>
                    {adFormFormat === "floating"
                      ? "🪟 Floating Overlay Card — Dismissible corner popup. (Configure placement & cooldown below)"
                      : adFormFormat === "sticky-bottom"
                      ? "📌 Sticky Bottom Banner — Sticks to bottom edge of screen while scrolling."
                      : adFormFormat === "sticky-top"
                      ? "📌 Sticky Top Banner — Sticks just below navbar at top edge."
                      : "🖼️ In-Feed Banner — Embeds between civic directories and civic news updates."}
                  </span>
                </div>
              </div>

              {/* STEP 2: Basic Details */}
              <div>
                <label className="block font-bold text-[#18232E] mb-1">
                  Advertisement Title / Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={adFormTitle}
                  onChange={(e) => setAdFormTitle(e.target.value)}
                  placeholder="e.g. Royal Sweets & Bakery - Special Festive Discount"
                  className="w-full bg-[#F5F7F8] border border-[#E1E6EA] rounded-xl p-3 outline-none focus:border-[#B8323C] focus:bg-white transition text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#18232E] mb-1">
                  Short Description / Offer Text
                </label>
                <textarea
                  rows={2}
                  value={adFormDesc}
                  onChange={(e) => setAdFormDesc(e.target.value)}
                  placeholder="Fresh desi ghee sweets, cakes, and gift packs on NH-27 College Road Crossing..."
                  className="w-full bg-[#F5F7F8] border border-[#E1E6EA] rounded-xl p-3 outline-none focus:border-[#B8323C] focus:bg-white transition text-xs"
                />
              </div>

              {/* Banner Image Upload or URL */}
              <div className="space-y-2">
                <label className="block font-bold text-[#18232E]">
                  Banner Image (Upload or Image Link) <span className="text-red-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="border-2 border-dashed border-slate-300 hover:border-[#B8323C] rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50 transition">
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="font-bold text-[#18232E]">Upload Banner File</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG, WebP up to 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setAdFormFile(file);
                            setAdFormPreviewUrl(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                    {adFormFile && (
                      <p className="text-[11px] text-emerald-600 font-semibold mt-1 truncate">
                        Selected: {adFormFile.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="block font-semibold text-slate-600 mb-1">Or Paste Image URL</span>
                    <input
                      type="url"
                      value={adFormUrl}
                      onChange={(e) => {
                        setAdFormUrl(e.target.value);
                        setAdFormPreviewUrl(e.target.value);
                      }}
                      placeholder="https://example.com/banner.jpg"
                      className="w-full bg-[#F5F7F8] border border-[#E1E6EA] rounded-xl p-3 outline-none focus:border-[#B8323C] focus:bg-white transition text-xs"
                    />
                  </div>
                </div>

                {/* Banner Preview Box */}
                {adFormPreviewUrl && (
                  <div className="mt-2 p-2 bg-slate-100 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Banner Image Preview:
                    </span>
                    <div className="h-28 rounded-lg overflow-hidden bg-slate-900">
                      <img
                        src={adFormPreviewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#18232E] mb-1">
                    Destination URL (Optional Link)
                  </label>
                  <input
                    type="url"
                    value={adFormDestUrl}
                    onChange={(e) => setAdFormDestUrl(e.target.value)}
                    placeholder="https://example.com or https://wa.me/91..."
                    className="w-full bg-[#F5F7F8] border border-[#E1E6EA] rounded-xl p-3 outline-none focus:border-[#B8323C] focus:bg-white transition text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#18232E] mb-1">
                    Call To Action (CTA) Button Text
                  </label>
                  <input
                    type="text"
                    value={adFormCtaText}
                    onChange={(e) => setAdFormCtaText(e.target.value)}
                    placeholder="e.g. Learn More, Book Now, Order Now"
                    className="w-full bg-[#F5F7F8] border border-[#E1E6EA] rounded-xl p-3 outline-none focus:border-[#B8323C] focus:bg-white transition text-xs"
                  />
                </div>
              </div>

              {/* Placement & Frequency Settings (For Floating Ads) */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                  Floating & Dismissal Display Settings
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-[#18232E] mb-1">Card Placement</label>
                    <select
                      value={adFormPlacement}
                      onChange={(e) => setAdFormPlacement(e.target.value)}
                      className="w-full bg-white border border-[#E1E6EA] rounded-xl p-2.5 outline-none focus:border-[#B8323C] text-xs"
                    >
                      <option value="bottom-right">Bottom Right (Default)</option>
                      <option value="bottom-left">Bottom Left</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#18232E] mb-1">Dismissal Behavior</label>
                    <select
                      value={adFormFrequency}
                      onChange={(e) => {
                        setAdFormFrequency(e.target.value);
                        if (e.target.value === "permanent") {
                          setAdFormIsPermanent(true);
                        }
                      }}
                      className="w-full bg-white border border-[#E1E6EA] rounded-xl p-2.5 outline-none focus:border-[#B8323C] text-xs"
                    >
                      <option value="always">Always Show Every Visit (Recommended)</option>
                      <option value="permanent">⭐ Permanent (Never Dismissed / हमेशा दिखेगा)</option>
                      <option value="once-per-session">Once Per Session</option>
                      <option value="interval">Reappear After Interval</option>
                    </select>
                  </div>

                  {adFormFrequency === "interval" ? (
                    <div>
                      <label className="block font-bold text-[#18232E] mb-1">Cooldown (Minutes)</label>
                      <input
                        type="number"
                        min="1"
                        max="10080"
                        value={adFormInterval}
                        onChange={(e) => setAdFormInterval(parseInt(e.target.value, 10) || 60)}
                        className="w-full bg-white border border-[#E1E6EA] rounded-xl p-2.5 outline-none focus:border-[#B8323C] text-xs"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block font-bold text-slate-400 mb-1">Cooldown</label>
                      <div className="p-2.5 bg-slate-100 rounded-xl text-slate-500 text-xs font-semibold">
                        {adFormFrequency === "permanent"
                          ? "⭐ Never Dismissed"
                          : adFormFrequency === "always"
                          ? "Immediate on Reload"
                          : "Entire Browser Session"}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Permanent Advertisement Highlight Box */}
              <div className="p-3.5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-300 rounded-2xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="adFormIsPermanentCheckbox"
                  checked={adFormIsPermanent}
                  onChange={(e) => {
                    setAdFormIsPermanent(e.target.checked);
                    if (e.target.checked) {
                      setAdFormFrequency("permanent");
                    }
                  }}
                  className="mt-0.5 w-4 h-4 text-amber-600 rounded accent-amber-600 cursor-pointer"
                />
                <label htmlFor="adFormIsPermanentCheckbox" className="cursor-pointer select-none">
                  <span className="font-extrabold text-amber-950 block text-xs flex items-center gap-1.5">
                    <span>⭐</span>
                    <span>Permanent Advertisement (स्थाई विज्ञापन - हमेशा दिखेगा)</span>
                  </span>
                  <span className="text-[11px] text-amber-900 leading-tight block mt-0.5">
                    यदि यह चुना जाता है, तो विज्ञापन किसी भी यूजर द्वारा बंद (✕) करने पर हमेशा के लिए नहीं हटेगा। यह हर सेशन और हर पेज पर लगातार दिखाई देगा।
                  </span>
                </label>
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#18232E] mb-1">
                    Start Schedule Date & Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={adFormStart}
                    onChange={(e) => setAdFormStart(e.target.value)}
                    className="w-full bg-[#F5F7F8] border border-[#E1E6EA] rounded-xl p-2.5 outline-none focus:border-[#B8323C] focus:bg-white transition text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#18232E] mb-1">
                    End Schedule Date & Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={adFormEnd}
                    onChange={(e) => setAdFormEnd(e.target.value)}
                    className="w-full bg-[#F5F7F8] border border-[#E1E6EA] rounded-xl p-2.5 outline-none focus:border-[#B8323C] focus:bg-white transition text-xs"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adFormActive}
                    onChange={(e) => setAdFormActive(e.target.checked)}
                    className="w-4 h-4 text-[#B8323C] rounded accent-[#B8323C]"
                  />
                  <span className="font-bold text-[#18232E]">Enable Advertisement (Active)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adFormPublished}
                    onChange={(e) => setAdFormPublished(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded accent-emerald-600"
                  />
                  <span className="font-bold text-emerald-800">
                    Publish Immediately (Show on homepage)
                  </span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAdModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={adFormSubmitting}
                  className="bg-[#B8323C] hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer"
                >
                  {adFormSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{editingAd ? "Save Changes" : "Create Advertisement"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          CREATE / EDIT NEWS STORY MODAL
          ======================================================== */}
      {newsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Newspaper className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-[#18232E] font-heading">
                  {editingNews ? "Edit News Story" : "Create News Article for Reels Feed"}
                </h3>
              </div>
              <button
                onClick={() => setNewsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNews} className="overflow-y-auto p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#18232E] mb-1">
                  News Headline (English) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newsFormTitle}
                  onChange={(e) => setNewsFormTitle(e.target.value)}
                  placeholder="e.g. Major Highway Expansion Project Completed on NH-27 Fazilnagar"
                  className="w-full bg-[#F5F7F8] border border-[#E1E6EA] rounded-xl p-3 outline-none focus:border-[#B8323C] focus:bg-white transition text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#18232E] mb-1">
                  Hindi Headline (हिंदी शीर्षक - Optional)
                </label>
                <input
                  type="text"
                  value={newsFormTitleHi}
                  onChange={(e) => setNewsFormTitleHi(e.target.value)}
                  placeholder="उदा. एनएच-27 फाजिलनगर पर प्रमुख राजमार्ग चौड़ीकरण कार्य पूर्ण"
                  className="w-full bg-[#F5F7F8] border border-[#E1E6EA] rounded-xl p-3 outline-none focus:border-[#B8323C] focus:bg-white transition text-xs font-serif"
                />
              </div>

              <div>
                <label className="block font-bold text-[#18232E] mb-1">
                  Short Summary (Reels Card Hook) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={newsFormSummary}
                  onChange={(e) => setNewsFormSummary(e.target.value)}
                  placeholder="Brief 2-3 sentence overview visible immediately on the vertical reel card..."
                  className="w-full bg-[#F5F7F8] border border-[#E1E6EA] rounded-xl p-3 outline-none focus:border-[#B8323C] focus:bg-white transition text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-[#18232E] mb-1">
                  Full Article Body (Read More Modal Content) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={newsFormContent}
                  onChange={(e) => setNewsFormContent(e.target.value)}
                  placeholder="Detailed multi-paragraph report, background details, quotes from municipal officers..."
                  className="w-full bg-[#F5F7F8] border border-[#E1E6EA] rounded-xl p-3 outline-none focus:border-[#B8323C] focus:bg-white transition text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#18232E] mb-1">Category</label>
                  <select
                    value={newsFormCategory}
                    onChange={(e) => setNewsFormCategory(e.target.value)}
                    className="w-full bg-[#F5F7F8] border border-[#E1E6EA] rounded-xl p-2.5 outline-none focus:border-[#B8323C] focus:bg-white transition text-xs"
                  >
                    <option value="Civic Updates">Civic Updates</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Education">Education</option>
                    <option value="Events">Events</option>
                    <option value="General">General</option>
                    <option value="Public Welfare">Public Welfare</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#18232E] mb-1">Location Tag</label>
                  <input
                    type="text"
                    value={newsFormLocation}
                    onChange={(e) => setNewsFormLocation(e.target.value)}
                    placeholder="e.g. NH-27 Corridor, Fazilnagar"
                    className="w-full bg-[#F5F7F8] border border-[#E1E6EA] rounded-xl p-2.5 outline-none focus:border-[#B8323C] focus:bg-white transition text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#18232E] mb-1">Source / Reporter</label>
                  <input
                    type="text"
                    value={newsFormSource}
                    onChange={(e) => setNewsFormSource(e.target.value)}
                    placeholder="e.g. Municipal Ward Bureau"
                    className="w-full bg-[#F5F7F8] border border-[#E1E6EA] rounded-xl p-2.5 outline-none focus:border-[#B8323C] focus:bg-white transition text-xs"
                  />
                </div>
              </div>

              {/* Cover Image Upload or URL */}
              <div className="space-y-2">
                <label className="block font-bold text-[#18232E]">Cover Image</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50 transition">
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="font-bold text-[#18232E]">Upload Cover File</span>
                      <span className="text-[10px] text-slate-400">JPG, PNG, WebP</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setNewsFormFile(file);
                            setNewsFormPreviewUrl(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div>
                    <span className="block font-semibold text-slate-600 mb-1">Or Image URL</span>
                    <input
                      type="url"
                      value={newsFormImageUrl}
                      onChange={(e) => {
                        setNewsFormImageUrl(e.target.value);
                        setNewsFormPreviewUrl(e.target.value);
                      }}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-[#F5F7F8] border border-[#E1E6EA] rounded-xl p-3 outline-none focus:border-blue-500 focus:bg-white transition text-xs"
                    />
                  </div>
                </div>

                {newsFormPreviewUrl && (
                  <div className="h-28 rounded-xl overflow-hidden bg-slate-900 mt-2">
                    <img src={newsFormPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newsFormIsFeatured}
                    onChange={(e) => setNewsFormIsFeatured(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded accent-amber-500"
                  />
                  <span className="font-bold text-[#18232E] flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                    <span>Pin Story to Top of Feed (Featured)</span>
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newsFormIsPublished}
                    onChange={(e) => setNewsFormIsPublished(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded accent-emerald-600"
                  />
                  <span className="font-bold text-emerald-800">
                    Publish Live (Uncheck to save as Draft)
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setNewsModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={newsFormSubmitting}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer"
                >
                  {newsFormSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{editingNews ? "Update Story" : "Save Story"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          DELETE AD CONFIRMATION MODAL
          ======================================================== */}
      {adDeleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full p-6 rounded-3xl border border-slate-200 shadow-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-[#18232E]">Delete Advertisement?</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to permanently delete this advertisement? If active, it will immediately collapse from the public homepage.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => setAdDeleteConfirmId(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAd(adDeleteConfirmId)}
                className="bg-[#B8323C] hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          DELETE NEWS CONFIRMATION MODAL
          ======================================================== */}
      {newsDeleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full p-6 rounded-3xl border border-slate-200 shadow-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-[#18232E]">Delete Story?</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to permanently delete this news story from the Reels feed?
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                onClick={() => setNewsDeleteConfirmId(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteNews(newsDeleteConfirmId);
                  setNewsDeleteConfirmId(null);
                }}
                className="bg-[#B8323C] hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MOBILE REEL PREVIEW MODAL
          ======================================================== */}
      {newsPreviewModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm h-[640px] rounded-3xl overflow-hidden border-4 border-slate-700 shadow-2xl flex flex-col justify-end bg-black">
            <button
              onClick={() => setNewsPreviewModalItem(null)}
              className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            >
              <X className="w-4 h-4" />
            </button>

            {newsPreviewModalItem.image && (
              <img
                src={newsPreviewModalItem.image}
                alt="Reel Preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

            <div className="relative z-10 p-5 space-y-2 text-white">
              <div className="flex items-center gap-1.5">
                <span className="bg-[#B8323C] text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                  {newsPreviewModalItem.category || "News"}
                </span>
                {newsPreviewModalItem.isFeatured && (
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                    Pinned
                  </span>
                )}
              </div>

              <h3 className="text-base font-extrabold leading-snug">
                {newsPreviewModalItem.title}
              </h3>

              <p className="text-xs text-slate-300 line-clamp-3">
                {newsPreviewModalItem.summary || newsPreviewModalItem.description}
              </p>

              <div className="text-[11px] text-slate-400 pt-2 flex items-center justify-between">
                <span>{newsPreviewModalItem.source || "Fazilnagar Bureau"}</span>
                <span>{newsPreviewModalItem.location || "Fazilnagar"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          FLOATING AD LIVE PREVIEW MODAL
          ======================================================== */}
      {adPreviewModalItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-md w-full rounded-3xl border border-slate-200 shadow-2xl overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-[#18232E]">Live Card Preview</h3>
                  <span className="text-[10px] text-slate-500">
                    Format: {adPreviewModalItem.format} • {adPreviewModalItem.placement || "bottom-right"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAdPreviewModalItem(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Floating Card Display */}
            <div className="p-4 bg-slate-100 rounded-2xl flex items-center justify-center min-h-[220px]">
              <div className="w-72 bg-gradient-to-br from-slate-900 via-[#18232E] to-slate-900 text-white rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-black/40 border-b border-white/10">
                  <span className="inline-flex items-center gap-1 bg-[#B8323C] text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Sponsored</span>
                  </span>
                  <div className="w-5 h-5 rounded-full bg-white/10 text-slate-300 flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </div>
                </div>

                {adPreviewModalItem.imageUrl && (
                  <div className="w-full h-28 overflow-hidden bg-black/60">
                    <img
                      src={adPreviewModalItem.imageUrl}
                      alt={adPreviewModalItem.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-3 space-y-1.5">
                  <h4 className="text-xs font-extrabold text-white leading-snug line-clamp-2">
                    {adPreviewModalItem.title}
                  </h4>
                  {adPreviewModalItem.description && (
                    <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                      {adPreviewModalItem.description}
                    </p>
                  )}
                  <div className="pt-1.5">
                    <div className="w-full text-center bg-white text-[#18232E] text-xs font-bold py-1.5 px-3 rounded-xl shadow-xs flex items-center justify-center gap-1.5">
                      <span>{adPreviewModalItem.ctaText || "Learn More"}</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <div><strong>Placement:</strong> {adPreviewModalItem.placement || "bottom-right"}</div>
              <div><strong>Dismissal Cooldown:</strong> {adPreviewModalItem.frequency === "interval" ? `Reappears after ${adPreviewModalItem.redisplayIntervalMinutes || 60} minutes` : adPreviewModalItem.frequency === "always" ? "Reappears every visit" : "Hidden for current session"}</div>
              {adPreviewModalItem.destinationUrl && (
                <div className="truncate"><strong>Link:</strong> {adPreviewModalItem.destinationUrl}</div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setAdPreviewModalItem(null)}
                className="bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl"
              >
                Close Preview
              </button>
            </div>
          </div>
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
