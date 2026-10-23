import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import { usePageSEO } from "../utils/seo";
import { getAuthUser } from "../utils/authStorage";
import {
  Briefcase,
  Users,
  Eye,
  MessageSquare,
  Clock,
  MapPin,
  Building,
  CheckCircle2,
  Trash2,
  PauseCircle,
  PlayCircle,
  PlusCircle,
  ArrowLeft,
  Loader2,
  Calendar,
  AlertCircle,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export default function MyJobListings() {
  usePageSEO({
    title: "My Listings & Applications | Fazilnagar Jobs",
    description: "Manage your posted job vacancies, candidate profiles, and track active applications on Fazilnagar Jobs.",
    canonicalPath: "/jobs/my",
  });

  const navigate = useNavigate();
  const user = getAuthUser();

  const [activeTab, setActiveTab] = useState("vacancies"); // "vacancies", "candidates", "applications", "received"
  const [loading, setLoading] = useState(true);
  const [myListings, setMyListings] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [receivedApplications, setReceivedApplications] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login", {
        state: {
          from: "/jobs/my",
          message: "Please sign in to view your listings and applications.",
        },
      });
      return;
    }

    let isMounted = true;
    setLoading(true);

    API.get("/jobs/my")
      .then((res) => {
        if (isMounted && res.data?.success) {
          setMyListings(res.data.myListings || []);
          setMyApplications(res.data.myApplications || []);
          setReceivedApplications(res.data.receivedApplications || []);
        }
      })
      .catch((err) => {
        console.error("Load my listings error:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, navigate]);

  const handleToggleStatus = async (id, currentStatus, type) => {
    let newStatus;
    if (type === "job") {
      newStatus = currentStatus === "open" ? "filled" : "open";
    } else {
      newStatus = currentStatus === "looking_for_work" ? "hired" : "looking_for_work";
    }

    setActionLoading(true);
    try {
      const res = await API.patch(`/jobs/${id}/status`, { status: newStatus });
      if (res.data?.success) {
        setMyListings((prev) =>
          prev.map((item) => (item._id === id ? { ...item, status: newStatus } : item))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteListing = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this listing? All applications associated with it will also be removed."
      )
    )
      return;

    setActionLoading(true);
    try {
      const res = await API.delete(`/jobs/${id}`);
      if (res.data?.success) {
        setMyListings((prev) => prev.filter((item) => item._id !== id));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete listing.");
    } finally {
      setActionLoading(false);
    }
  };

  const vacancies = myListings.filter((l) => l.type === "job");
  const candidateProfiles = myListings.filter((l) => l.type === "job_seeker");

  if (!user) return null;

  return (
    <div className="w-full min-h-screen bg-[#FDFBF7] dark:bg-[#0F172A] font-sans pb-32 transition-colors duration-200">
      {/* ------------------------------------------------------
          Top Navigation Bar
          ------------------------------------------------------ */}
      <div className="border-b border-[#E8DFC8] dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 flex items-center justify-between">
          <Link
            to="/jobs"
            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Jobs Marketplace
          </Link>

          <Link
            to="/jobs/post"
            className="px-3.5 py-1.5 bg-[#A83D32] hover:bg-[#873027] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Post New Listing
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">
            My Jobs Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track your job vacancies, candidate profiles, applications, and conversations.
          </p>
        </div>

        {/* ------------------------------------------------------
            Dashboard Tab Switcher
            ------------------------------------------------------ */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("vacancies")}
            className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "vacancies"
                ? "border-[#A83D32] text-[#A83D32] dark:text-[#C45A4C]"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>My Vacancies</span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {vacancies.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("candidates")}
            className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "candidates"
                ? "border-[#A83D32] text-[#A83D32] dark:text-[#C45A4C]"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>My Seeker Profiles</span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {candidateProfiles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("applications")}
            className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "applications"
                ? "border-[#A83D32] text-[#A83D32] dark:text-[#C45A4C]"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Jobs I Applied For</span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {myApplications.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("received")}
            className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "received"
                ? "border-[#A83D32] text-[#A83D32] dark:text-[#C45A4C]"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Applications Received</span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {receivedApplications.length}
            </span>
          </button>
        </div>

        {/* ------------------------------------------------------
            Tab 1: My Vacancies
            ------------------------------------------------------ */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-[#A83D32] animate-spin" />
          </div>
        ) : activeTab === "vacancies" ? (
          vacancies.length === 0 ? (
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800 max-w-md mx-auto space-y-3">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">No Vacancies Posted</h3>
              <p className="text-xs text-slate-500">
                You haven&apos;t posted any job vacancies yet. Need to hire someone in Fazilnagar?
              </p>
              <Link
                to="/jobs/post"
                className="inline-block px-4 py-2 bg-[#A83D32] text-white rounded-xl text-xs font-bold transition"
              >
                Post a Job Vacancy
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {vacancies.map((job) => (
                <div
                  key={job._id}
                  className="bg-white dark:bg-[#1E293B] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          job.status === "open"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {job.status}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">{job.category}</span>
                    </div>

                    <Link
                      to={`/jobs/${job._id}`}
                      className="text-base font-black text-slate-900 dark:text-white hover:text-[#A83D32] block truncate"
                    >
                      {job.title}
                    </Link>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>{job.company}</span>
                      <span>📍 {job.location}</span>
                      <span>💰 {job.salaryText}</span>
                      <span>👥 {job.applicationsCount || 0} Applicants</span>
                      <span>👁️ {job.views || 0} Views</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleToggleStatus(job._id, job.status, "job")}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                    >
                      {job.status === "open" ? "Mark Filled" : "Reopen"}
                    </button>

                    <Link
                      to={`/jobs/${job._id}`}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
                    >
                      View
                    </Link>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleDeleteListing(job._id)}
                      className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      title="Delete Listing"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}

        {/* ------------------------------------------------------
            Tab 2: My Seeker Profiles
            ------------------------------------------------------ */}
        {!loading && activeTab === "candidates" ? (
          candidateProfiles.length === 0 ? (
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800 max-w-md mx-auto space-y-3">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">No Profiles Created</h3>
              <p className="text-xs text-slate-500">
                You haven&apos;t created a job seeker profile yet. Create one to let town employers find and message you.
              </p>
              <Link
                to="/jobs/post"
                className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold transition"
              >
                Create Seeker Profile
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {candidateProfiles.map((seeker) => (
                <div
                  key={seeker._id}
                  className="bg-white dark:bg-[#1E293B] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          seeker.status === "looking_for_work"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {seeker.status?.replace(/_/g, " ")}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">{seeker.category}</span>
                    </div>

                    <Link
                      to={`/jobs/${seeker._id}`}
                      className="text-base font-black text-slate-900 dark:text-white hover:text-[#A83D32] block truncate"
                    >
                      {seeker.desiredRole}
                    </Link>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>👤 {seeker.displayName}</span>
                      <span>📍 {seeker.preferredLocation}</span>
                      <span>💰 {seeker.expectedSalary}</span>
                      <span>💬 {seeker.inquiriesCount || 0} Inquiries</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleToggleStatus(seeker._id, seeker.status, "job_seeker")}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                    >
                      {seeker.status === "looking_for_work" ? "Mark Hired" : "Reactivate"}
                    </button>

                    <Link
                      to={`/jobs/${seeker._id}`}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
                    >
                      View
                    </Link>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleDeleteListing(seeker._id)}
                      className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      title="Delete Profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}

        {/* ------------------------------------------------------
            Tab 3: Jobs I Applied For (Requirement 8)
            ------------------------------------------------------ */}
        {!loading && activeTab === "applications" ? (
          myApplications.length === 0 ? (
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800 max-w-md mx-auto space-y-3">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">No Applications Yet</h3>
              <p className="text-xs text-slate-500">
                You haven&apos;t applied to any job vacancies yet. Explore the marketplace to find open roles.
              </p>
              <Link
                to="/jobs"
                className="inline-block px-4 py-2 bg-[#A83D32] text-white rounded-xl text-xs font-bold transition"
              >
                Browse Job Vacancies
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {myApplications.map((app) => (
                <div
                  key={app._id}
                  className="bg-white dark:bg-[#1E293B] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Status: {app.status}
                    </span>

                    <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                      {app.listing?.title || "Job Listing"}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>{app.listing?.company || app.employer?.name}</span>
                      <span>📍 {app.listing?.location}</span>
                      <span>
                        Applied: {new Date(app.appliedAt || app.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {app.conversation && (
                      <Link
                        to={`/messages?conv=${app.conversation}`}
                        className="px-4 py-2 bg-[#A83D32] hover:bg-[#873027] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Open Chat with Employer
                      </Link>
                    )}
                    {app.listing?._id && (
                      <Link
                        to={`/jobs/${app.listing._id}`}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
                        title="View Job Details"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}

        {/* ------------------------------------------------------
            Tab 4: Applications Received (Requirement 8)
            ------------------------------------------------------ */}
        {!loading && activeTab === "received" ? (
          receivedApplications.length === 0 ? (
            <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800 max-w-md mx-auto space-y-3">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">No Received Inquiries</h3>
              <p className="text-xs text-slate-500">
                You haven&apos;t received any applications on your posted jobs yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {receivedApplications.map((app) => (
                <div
                  key={app._id}
                  className="bg-white dark:bg-[#1E293B] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-400">
                      Applied for: <strong>{app.listing?.title}</strong>
                    </span>

                    <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                      {app.applicant?.name || "Candidate"}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      {app.applicant?.area && <span>📍 {app.applicant.area}</span>}
                      <span>
                        Received: {new Date(app.appliedAt || app.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {app.message && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 line-clamp-2">
                        “{app.message}”
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {app.conversation && (
                      <Link
                        to={`/messages?conv=${app.conversation}`}
                        className="px-4 py-2 bg-[#A83D32] hover:bg-[#873027] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Chat with Candidate
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}
      </main>
    </div>
  );
}
