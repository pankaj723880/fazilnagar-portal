import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import API from "../api";
import { usePageSEO } from "../utils/seo";
import { getAuthUser } from "../utils/authStorage";
import { JOB_CATEGORIES, EMPLOYMENT_TYPES, LOCAL_JOB_LOCATIONS } from "../constants/jobs";
import ApplyJobModal from "../components/ApplyJobModal";
import ContactCandidateModal from "../components/ContactCandidateModal";
import ReportListingModal from "../components/ReportListingModal";
import {
  Briefcase,
  Users,
  Search,
  MapPin,
  Building,
  PlusCircle,
  Filter,
  DollarSign,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  Send,
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
  X,
  Loader2,
  Calendar,
  Award,
  Layers,
} from "lucide-react";

export default function Jobs() {
  usePageSEO({
    title: "Fazilnagar Jobs | Local Employment & Talent Marketplace",
    description: "Connecting local talent with local opportunities in Fazilnagar. Browse town vacancies, hire skilled candidates, or find your next career role.",
    canonicalPath: "/jobs",
  });

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = getAuthUser();

  // Active Category Tab: "job" (Find a Job) vs "job_seeker" (Find Talent)
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") === "talent" ? "job_seeker" : "job"
  );

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("cat") || "All");
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get("loc") || "All");
  const [selectedType, setSelectedType] = useState(searchParams.get("type") || "All");
  const [fresherOnly, setFresherOnly] = useState(searchParams.get("fresher") === "true");
  const [sortBy, setSortBy] = useState("recent");

  // Mobile Filter Drawer State
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Data & Pagination
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Modal interactions
  const [selectedJobForApply, setSelectedJobForApply] = useState(null);
  const [selectedCandidateForContact, setSelectedCandidateForContact] = useState(null);
  const [reportingListing, setReportingListing] = useState(null);

  // User's applied job IDs tracking
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());

  // Fetch user's existing applications if logged in
  useEffect(() => {
    if (user?.id || user?._id) {
      API.get("/jobs/my")
        .then((res) => {
          if (res.data?.myApplications) {
            const ids = new Set(
              res.data.myApplications
                .map((a) => a.listing?._id || a.listing?.id || a.listing)
                .filter(Boolean)
                .map(String)
            );
            setAppliedJobIds(ids);
          }
        })
        .catch(() => {});
    }
  }, [user?.id, user?._id]);

  // Load listings from API
  const fetchListings = useCallback(
    async (pageToLoad = 1, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const params = {
          type: activeTab,
          page: pageToLoad,
          limit: 12,
          sort: sortBy,
        };

        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (selectedCategory && selectedCategory !== "All") params.category = selectedCategory;
        if (selectedLocation && selectedLocation !== "All") params.location = selectedLocation;
        if (selectedType && selectedType !== "All") params.employmentType = selectedType;
        if (fresherOnly) params.fresherOnly = true;

        const res = await API.get("/jobs", { params });

        if (res.data?.success) {
          if (append) {
            setListings((prev) => [...prev, ...res.data.listings]);
          } else {
            setListings(res.data.listings);
          }
          setTotalCount(res.data.total || 0);
          setTotalPages(res.data.totalPages || 1);
          setPage(pageToLoad);
        }
      } catch (err) {
        console.error("Fetch jobs error:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeTab, searchQuery, selectedCategory, selectedLocation, selectedType, fresherOnly, sortBy]
  );

  // Trigger search on filter changes
  useEffect(() => {
    fetchListings(1, false);
  }, [fetchListings]);

  // Sync active tab to URL
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (tab === "job_seeker") {
      newParams.set("tab", "talent");
    } else {
      newParams.delete("tab");
    }
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedLocation("All");
    setSelectedType("All");
    setFresherOnly(false);
    setSortBy("recent");
  };

  // Direct Message action (opens or creates direct conversation)
  const handleDirectMessage = async (recipientId, listingTitle = "") => {
    if (!user) {
      navigate("/login", {
        state: {
          from: "/jobs",
          message: "Please log in to send town messages.",
        },
      });
      return;
    }

    try {
      const res = await API.post("/messages/conversations/direct", {
        recipientId,
      });
      if (res.data?.success && res.data.conversation) {
        navigate(`/messages?conv=${res.data.conversation._id || res.data.conversation.id}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to start conversation.");
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== "All" ||
    selectedLocation !== "All" ||
    selectedType !== "All" ||
    fresherOnly ||
    sortBy !== "recent";

  return (
    <div className="w-full min-h-screen bg-[#FDFBF7] dark:bg-[#0F172A] font-sans pb-32 transition-colors duration-200">
      {/* ------------------------------------------------------
          Top Hero & Branding Header
          ------------------------------------------------------ */}
      <section className="border-b border-[#E8DFC8] dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md pt-6 sm:pt-8 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          {/* Top Row: Brand & CTA actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#A83D32] dark:text-[#C45A4C] bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 rounded-full border border-red-200/60 dark:border-red-900/40">
                  Town Employment
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  PIN 274401 • Fazilnagar Hub
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-1.5 tracking-tight font-heading">
                Fazilnagar Jobs
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-xl font-medium">
                “Connecting local talent with local opportunities.”
              </p>
            </div>

            {/* Quick Actions: Post & My Listings */}
            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                to="/jobs/my"
                className="px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Layers className="w-4 h-4 text-slate-500" />
                <span>My Listings &amp; Applications</span>
              </Link>

              <Link
                to="/jobs/post"
                className="px-4 py-2.5 rounded-2xl bg-[#A83D32] hover:bg-[#873027] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs hover:shadow-md cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Post a Listing</span>
              </Link>
            </div>
          </div>

          {/* ------------------------------------------------------
              Notice Against Upfront Recruitment Fees
              ------------------------------------------------------ */}
          <div className="mt-5 p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-2.5 text-amber-900 dark:text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Town Advisory:</strong> Fazilnagar Jobs is a free community service. Never pay registration fees, upfront security deposits, or interview money for local jobs. Report suspicious offers immediately.
            </p>
          </div>

          {/* ------------------------------------------------------
              Two Main Categories: Segmented Category Switcher
              ------------------------------------------------------ */}
          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-slate-200/60 dark:border-slate-800 pt-5">
            <div className="flex bg-slate-200/70 dark:bg-slate-800 p-1.5 rounded-2xl shadow-inner max-w-md w-full sm:w-auto">
              {/* Category A: Find a Job */}
              <button
                type="button"
                onClick={() => handleTabChange("job")}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === "job"
                    ? "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-xs font-black"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Briefcase className="w-4 h-4 text-[#A83D32]" />
                <span>Find a Job</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  Vacancies
                </span>
              </button>

              {/* Category B: Find Talent */}
              <button
                type="button"
                onClick={() => handleTabChange("job_seeker")}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === "job_seeker"
                    ? "bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-xs font-black"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Find Talent</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  Job Seekers
                </span>
              </button>
            </div>

            {/* Total count badge */}
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Showing <strong>{listings.length}</strong> of <strong>{totalCount}</strong>{" "}
              {activeTab === "job" ? "active job vacancies" : "registered candidates looking for work"}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------
          Filter Bar & Search Section
          ------------------------------------------------------ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-6">
        <div className="bg-white dark:bg-[#1E293B] p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          {/* Row 1: Search Keyword + Location + Filter Button */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === "job"
                    ? "Search job title, company, skills (e.g. Accountant, Tally, Teacher)..."
                    : "Search skills, role, candidate (e.g. Electrician, Data Entry, Fresher)..."
                }
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83D32]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Location Selector */}
            <div className="sm:col-span-3 relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#A83D32] appearance-none cursor-pointer"
              >
                <option value="All">All Locations in Town</option>
                {LOCAL_JOB_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort Selector */}
            <div className="sm:col-span-3 relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#A83D32] appearance-none cursor-pointer"
              >
                <option value="recent">Sort: Most Recent</option>
                <option value="salary_desc">Salary: High to Low</option>
                <option value="salary_asc">Salary: Low to High</option>
                <option value="views">Most Viewed</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Row 2: Category Chips (Horizontally Scrollable) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                selectedCategory === "All"
                  ? "bg-[#A83D32] text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              All Categories
            </button>
            {JOB_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-[#A83D32] text-white shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.id}</span>
              </button>
            ))}
          </div>

          {/* Row 3: Secondary Filters (Employment Type + Fresher Friendly Toggle + Clear) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Type:
              </span>
              {["All", ...EMPLOYMENT_TYPES].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedType(t)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    selectedType === t
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {t}
                </button>
              ))}

              <label className="ml-2 inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={fresherOnly}
                  onChange={(e) => setFresherOnly(e.target.checked)}
                  className="rounded text-[#A83D32] focus:ring-[#A83D32]"
                />
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  🌱 Fresher Friendly Only
                </span>
              </label>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset all filters
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------
          Listing Cards Grid
          ------------------------------------------------------ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-[#1E293B] p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 animate-pulse space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-24" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-16" />
                </div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-3/4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/2" />
                <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-2xl w-full" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 bg-red-50 dark:bg-red-950/40 text-[#A83D32] rounded-full flex items-center justify-center mx-auto">
              <Search className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                No matching {activeTab === "job" ? "vacancies" : "candidate profiles"} found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                Try loosening your search keywords, choosing &ldquo;All Locations&rdquo;, or be the first to publish a listing!
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Clear Filters
                </button>
              )}
              <Link
                to="/jobs/post"
                className="px-4 py-2 bg-[#A83D32] hover:bg-[#873027] text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" /> Post a Listing Now
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeTab === "job"
              ? listings.map((job) => {
                  const hasApplied = appliedJobIds.has(String(job._id || job.id));
                  return (
                    <article
                      key={job._id || job.id}
                      className="bg-white dark:bg-[#1E293B] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between space-y-4 group"
                    >
                      {/* Top Badges */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                            {job.employmentType}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            {job.category}
                          </span>
                        </div>

                        {/* Title & Employer */}
                        <Link to={`/jobs/${job._id || job.id}`} className="block group-hover:text-[#A83D32] transition">
                          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug line-clamp-2">
                            {job.title}
                          </h2>
                        </Link>

                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{job.company}</span>
                        </p>
                      </div>

                      {/* Key Details: Salary, Location, Experience */}
                      <div className="py-2.5 border-y border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-black text-[#A83D32] dark:text-[#C45A4C]">
                          <span className="text-sm">💰</span>
                          <span>{job.salaryText || "Competitive salary"}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{job.location}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                          <Briefcase className="w-3.5 h-3.5 shrink-0" />
                          <span>Exp: {job.experience || "Any"}</span>
                          {job.isFresherFriendly && (
                            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                              Fresher Friendly
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Skills Chips */}
                      {job.skills && job.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.skills.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium"
                            >
                              {s}
                            </span>
                          ))}
                          {job.skills.length > 3 && (
                            <span className="text-[10px] text-slate-400 px-1 py-0.5">
                              +{job.skills.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Card Action Buttons (Requirement 4 & 5) */}
                      <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
                        {/* Secondary Actions: Details & Message Employer */}
                        <div className="flex items-center gap-1.5">
                          <Link
                            to={`/jobs/${job._id || job.id}`}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            Details
                          </Link>
                          {job.owner?._id && (
                            <button
                              type="button"
                              onClick={() => handleDirectMessage(job.owner._id, job.title)}
                              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Message Employer"
                              aria-label="Message Employer"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Primary Button: Apply Now */}
                        {hasApplied ? (
                          <button
                            type="button"
                            onClick={() => setSelectedJobForApply(job)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Applied</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedJobForApply(job)}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#A83D32] hover:bg-[#873027] text-white shadow-2xs transition flex items-center gap-1 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Apply Now</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })
              : listings.map((seeker) => (
                  <article
                    key={seeker._id || seeker.id}
                    className="bg-white dark:bg-[#1E293B] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between space-y-4 group"
                  >
                    {/* Top: Availability & Category */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
                          {seeker.availability || "Looking for Work"}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {seeker.category}
                        </span>
                      </div>

                      {/* Candidate Desired Role & Display Name */}
                      <Link to={`/jobs/${seeker._id || seeker.id}`} className="block group-hover:text-[#A83D32] transition">
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug line-clamp-2">
                          {seeker.desiredRole}
                        </h2>
                      </Link>

                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{seeker.displayName || "Local Candidate"}</span>
                      </p>
                    </div>

                    {/* Key Details */}
                    <div className="py-2.5 border-y border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                        <span className="text-sm">💰</span>
                        <span>Expected: <strong>{seeker.expectedSalary || "Negotiable"}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{seeker.preferredLocation || "Fazilnagar Town"}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                        <Award className="w-3.5 h-3.5 shrink-0" />
                        <span>Experience: {seeker.experienceLevel || "Fresher"}</span>
                      </div>
                    </div>

                    {/* Skills Chips */}
                    {seeker.skills && seeker.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {seeker.skills.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium"
                          >
                            {s}
                          </span>
                        ))}
                        {seeker.skills.length > 3 && (
                          <span className="text-[10px] text-slate-400 px-1 py-0.5">
                            +{seeker.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Candidate Actions */}
                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/jobs/${seeker._id || seeker.id}`}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          View Profile
                        </Link>
                        {seeker.owner?._id && (
                          <button
                            type="button"
                            onClick={() => handleDirectMessage(seeker.owner._id, seeker.desiredRole)}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Message Candidate"
                            aria-label="Message Candidate"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedCandidateForContact(seeker)}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#A83D32] hover:bg-[#873027] text-white shadow-2xs transition flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Contact Candidate</span>
                      </button>
                    </div>
                  </article>
                ))}
          </div>
        )}

        {/* ------------------------------------------------------
            Pagination / Load More
            ------------------------------------------------------ */}
        {!loading && page < totalPages && (
          <div className="mt-10 text-center">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => fetchListings(page + 1, true)}
              className="px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-xs hover:shadow-md transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading more listings...
                </>
              ) : (
                <>
                  <span>Load More Listings ({totalCount - listings.length} remaining)</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------
          Modals
          ------------------------------------------------------ */}
      {selectedJobForApply && (
        <ApplyJobModal
          job={selectedJobForApply}
          onClose={() => setSelectedJobForApply(null)}
          onAppliedSuccess={(jobId, conversationId) => {
            setAppliedJobIds((prev) => new Set([...prev, String(jobId)]));
          }}
        />
      )}

      {selectedCandidateForContact && (
        <ContactCandidateModal
          candidate={selectedCandidateForContact}
          onClose={() => setSelectedCandidateForContact(null)}
        />
      )}

      {reportingListing && (
        <ReportListingModal
          listing={reportingListing}
          onClose={() => setReportingListing(null)}
        />
      )}
    </div>
  );
}
