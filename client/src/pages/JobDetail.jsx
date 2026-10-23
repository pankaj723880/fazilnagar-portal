import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import API from "../api";
import { usePageSEO } from "../utils/seo";
import { getAuthUser } from "../utils/authStorage";
import ApplyJobModal from "../components/ApplyJobModal";
import ContactCandidateModal from "../components/ContactCandidateModal";
import ReportListingModal from "../components/ReportListingModal";
import {
  Briefcase,
  Users,
  MapPin,
  Building,
  Calendar,
  Clock,
  Award,
  GraduationCap,
  Languages,
  Eye,
  Share2,
  AlertTriangle,
  MessageSquare,
  Send,
  CheckCircle2,
  Pencil,
  Trash2,
  ArrowLeft,
  Loader2,
  Phone,
  ShieldCheck,
  Sparkles,
  FileText,
} from "lucide-react";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getAuthUser();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationData, setApplicationData] = useState(null);

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Dynamic SEO
  usePageSEO({
    title: listing
      ? `${listing.title || listing.desiredRole} | Fazilnagar Jobs`
      : "Job Details | Fazilnagar Jobs",
    description: listing
      ? `${listing.company || listing.displayName} in Fazilnagar: ${listing.description?.slice(0, 150)}...`
      : "Explore local employment opportunities in Fazilnagar.",
    canonicalPath: `/jobs/${id}`,
  });

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadData() {
      try {
        const res = await API.get(`/jobs/${id}`);
        if (isMounted && res.data?.listing) {
          setListing(res.data.listing);
        }

        // Check if user has applied (if authenticated)
        if (user?.id || user?._id) {
          const appRes = await API.get(`/jobs/${id}/application-status`).catch(() => null);
          if (isMounted && appRes?.data?.hasApplied) {
            setHasApplied(true);
            setApplicationData(appRes.data.application);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || "Failed to load listing details.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [id, user?.id, user?._id]);

  const isOwner =
    user && listing?.owner?._id && String(user.id || user._id) === String(listing.owner._id);
  const isAdmin = user?.role === "admin";

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title || listing.desiredRole,
          text: `Check out this listing on Fazilnagar Jobs: ${listing.title || listing.desiredRole}`,
          url,
        });
        return;
      } catch {}
    }

    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDirectChat = async () => {
    if (!user) {
      navigate("/login", {
        state: {
          from: `/jobs/${id}`,
          message: "Please log in to chat with the listing owner.",
        },
      });
      return;
    }

    try {
      const res = await API.post("/messages/conversations/direct", {
        recipientId: listing.owner._id,
      });
      if (res.data?.success && res.data.conversation) {
        navigate(`/messages?conv=${res.data.conversation._id || res.data.conversation.id}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to start conversation.");
    }
  };

  const handleToggleStatus = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to change the status to "${newStatus}"?`)) return;
    setActionLoading(true);
    try {
      const res = await API.patch(`/jobs/${id}/status`, { status: newStatus });
      if (res.data?.success) {
        setListing((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteListing = async () => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this listing? All associated application records will also be removed."
      )
    )
      return;

    setActionLoading(true);
    try {
      const res = await API.delete(`/jobs/${id}`);
      if (res.data?.success) {
        alert("Listing deleted successfully.");
        navigate("/jobs");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete listing.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#0F172A] py-12 px-4 flex justify-center items-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#A83D32] animate-spin" />
          <p className="text-xs text-slate-500 font-bold">Loading listing details...</p>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#0F172A] py-16 px-4">
        <div className="max-w-md mx-auto text-center bg-white dark:bg-[#1E293B] p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Listing Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {error || "This job listing may have been filled, deleted, or expired."}
          </p>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#A83D32] text-white rounded-xl text-xs font-bold transition hover:bg-[#873027]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Fazilnagar Jobs
          </Link>
        </div>
      </div>
    );
  }

  const isVacancy = listing.type === "job";

  return (
    <div className="w-full min-h-screen bg-[#FDFBF7] dark:bg-[#0F172A] font-sans pb-32 transition-colors duration-200">
      {/* ------------------------------------------------------
          Breadcrumbs & Top Bar
          ------------------------------------------------------ */}
      <div className="border-b border-[#E8DFC8] dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 flex items-center justify-between gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 truncate">
            <Link to="/jobs" className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-bold">
              <ArrowLeft className="w-3.5 h-3.5" /> Jobs
            </Link>
            <span>/</span>
            <span className="truncate max-w-[200px] sm:max-w-md text-slate-800 dark:text-slate-200 font-semibold">
              {isVacancy ? listing.title : listing.desiredRole}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleShare}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? "Link Copied!" : "Share"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Report listing"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------
          Main Content Layout
          ------------------------------------------------------ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Details breakdown */}
          <div className="lg:col-span-8 space-y-6">
            {/* Header Card */}
            <div className="bg-white dark:bg-[#1E293B] p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                    {isVacancy ? listing.employmentType : listing.availability || "Looking for work"}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Category: <strong>{listing.category}</strong>
                  </span>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      listing.status === "open" || listing.status === "looking_for_work"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    Status: {listing.status?.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {/* Title & Employer / Candidate */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight font-heading">
                  {isVacancy ? listing.title : listing.desiredRole}
                </h1>
                <p className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-300 mt-2 flex items-center gap-2">
                  {isVacancy ? (
                    <>
                      <Building className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{listing.company}</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{listing.displayName || "Local Candidate"}</span>
                    </>
                  )}
                </p>
              </div>

              {/* Key Highlights Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Salary / Wages</span>
                  <span className="font-extrabold text-[#A83D32] dark:text-[#C45A4C] text-sm mt-0.5 block">
                    {listing.salaryText || listing.expectedSalary || "Negotiable"}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Location</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 block truncate">
                    {listing.location || listing.preferredLocation || "Fazilnagar Town"}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Experience</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 block truncate">
                    {listing.experience || listing.experienceLevel || "Any / Fresher"}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    {isVacancy ? "Openings" : "Availability"}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 block truncate">
                    {isVacancy ? `${listing.openings || 1} Openings` : listing.availability || "Immediate"}
                  </span>
                </div>
              </div>

              {/* Views and Posted Date */}
              <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> {listing.views || 1} views
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Posted{" "}
                  {new Date(listing.createdAt).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                {isVacancy && listing.deadline && (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                    <Clock className="w-3.5 h-3.5" /> Apply before{" "}
                    {new Date(listing.deadline).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Description Section */}
            <div className="bg-white dark:bg-[#1E293B] p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-heading">
                {isVacancy ? "Job Description & Overview" : "About Candidate & Background"}
              </h2>
              <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                {listing.description || listing.bio}
              </div>

              {/* Responsibilities (for vacancies) */}
              {isVacancy && listing.responsibilities && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white font-heading">
                    Key Responsibilities
                  </h3>
                  <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {listing.responsibilities}
                  </div>
                </div>
              )}

              {/* Qualifications */}
              {listing.qualifications && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white font-heading">
                    Education &amp; Qualifications
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {listing.qualifications}
                  </p>
                </div>
              )}

              {/* Education (for seekers) */}
              {!isVacancy && listing.education && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white font-heading">
                    Education &amp; Academic Background
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {listing.education}
                  </p>
                </div>
              )}

              {/* Working Hours */}
              {isVacancy && listing.workingHours && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white font-heading">
                    Working Hours &amp; Shift Details
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {listing.workingHours}
                  </p>
                </div>
              )}

              {/* Skills Tags */}
              {listing.skills && listing.skills.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white font-heading">
                    Required Skills &amp; Competencies
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {listing.skills.map((s) => (
                      <span
                        key={s}
                        className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages (for seekers) */}
              {!isVacancy && listing.languages && listing.languages.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white font-heading flex items-center gap-1.5">
                    <Languages className="w-4 h-4 text-slate-400" /> Languages Spoken
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {listing.languages.map((l) => (
                      <span
                        key={l}
                        className="px-3 py-1 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Anti-Fraud Notice */}
            <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs">
              <ShieldCheck className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold">Trust &amp; Safety Notice</h4>
                <p className="leading-relaxed text-[11px] text-amber-800 dark:text-amber-300">
                  Fazilnagar Jobs is an open community board. Never send money, security deposits, or pay for interviews. If anyone asks for payment, please report the listing immediately.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Action Card */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
            {/* Primary Action Box */}
            <div className="bg-white dark:bg-[#1E293B] p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {isVacancy ? "Apply or Contact Employer" : "Connect with Candidate"}
              </h3>

              {isVacancy ? (
                <>
                  {hasApplied ? (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Application Sent to Employer</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleDirectChat}
                        className="w-full py-3 bg-[#A83D32] hover:bg-[#873027] text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" /> Open Conversation in Chat
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => setShowApplyModal(true)}
                        className="w-full py-3.5 bg-[#A83D32] hover:bg-[#873027] text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                      >
                        <Send className="w-4 h-4" /> Apply Now (Instant Chat)
                      </button>

                      <button
                        type="button"
                        onClick={handleDirectChat}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" /> Message Employer
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setShowContactModal(true)}
                    className="w-full py-3.5 bg-[#A83D32] hover:bg-[#873027] text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" /> Contact Candidate
                  </button>

                  <button
                    type="button"
                    onClick={handleDirectChat}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" /> Message Candidate
                  </button>

                  {listing.showPhone && listing.phone && (
                    <a
                      href={`tel:${listing.phone}`}
                      className="w-full py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2"
                    >
                      <Phone className="w-4 h-4 text-emerald-600" /> Call {listing.phone}
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Listing Owner Management Panel (Requirement 8) */}
            {(isOwner || isAdmin) && (
              <div className="bg-amber-50/60 dark:bg-slate-800/80 p-5 rounded-3xl border border-amber-200/80 dark:border-slate-700 space-y-3">
                <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-400 tracking-wider">
                  Listing Management
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-tight">
                  You are the owner of this post. Manage applications and status:
                </p>

                <div className="space-y-2 pt-1 text-xs">
                  {isVacancy ? (
                    <>
                      {listing.status === "open" ? (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleToggleStatus("filled")}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition cursor-pointer"
                        >
                          Mark Vacancy as Filled
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleToggleStatus("open")}
                          className="w-full py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold transition cursor-pointer"
                        >
                          Reopen Vacancy
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {listing.status === "looking_for_work" ? (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleToggleStatus("hired")}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition cursor-pointer"
                        >
                          Mark as Hired / Employed
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleToggleStatus("looking_for_work")}
                          className="w-full py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold transition cursor-pointer"
                        >
                          Reactivate Looking for Work
                        </button>
                      )}
                    </>
                  )}

                  <Link
                    to="/jobs/my"
                    className="w-full py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white rounded-xl font-bold transition flex items-center justify-center gap-1.5"
                  >
                    View Applications Dashboard
                  </Link>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleDeleteListing}
                    className="w-full py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Listing
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------
          Modals
          ------------------------------------------------------ */}
      {showApplyModal && (
        <ApplyJobModal
          job={listing}
          onClose={() => setShowApplyModal(false)}
          onAppliedSuccess={(jobId, convId) => {
            setHasApplied(true);
            setListing((prev) => ({
              ...prev,
              applicationsCount: (prev.applicationsCount || 0) + 1,
            }));
          }}
        />
      )}

      {showContactModal && (
        <ContactCandidateModal
          candidate={listing}
          onClose={() => setShowContactModal(false)}
        />
      )}

      {showReportModal && (
        <ReportListingModal
          listing={listing}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
