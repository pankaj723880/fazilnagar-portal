import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import { usePageSEO } from "../utils/seo";
import { getAuthUser } from "../utils/authStorage";
import {
  JOB_CATEGORIES,
  EMPLOYMENT_TYPES,
  SALARY_PERIODS,
  EXPERIENCE_LEVELS,
  SEEKER_AVAILABILITY,
  POPULAR_SKILLS,
  LOCAL_JOB_LOCATIONS,
} from "../constants/jobs";
import {
  Briefcase,
  Users,
  Building,
  MapPin,
  DollarSign,
  Clock,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Plus,
  X,
  Lock,
} from "lucide-react";

export default function PostJob() {
  usePageSEO({
    title: "Post a Job Vacancy or Seeker Profile | Fazilnagar Jobs",
    description: "Publish an employer job vacancy or post your job seeker profile on Fazilnagar Jobs to connect with town opportunities.",
    canonicalPath: "/jobs/post",
  });

  const navigate = useNavigate();
  const user = getAuthUser();

  // Mode: "job" (Employer Vacancy) vs "job_seeker" (Candidate Profile)
  const [listingType, setListingType] = useState("job");

  // Form State: Job Vacancy
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState("Office & Data Entry");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [location, setLocation] = useState("Main Market");
  const [customLocation, setCustomLocation] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryPeriod, setSalaryPeriod] = useState("month");
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [experience, setExperience] = useState("Fresher friendly");
  const [isFresherFriendly, setIsFresherFriendly] = useState(true);
  const [qualifications, setQualifications] = useState("");
  const [skillsList, setSkillsList] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [openings, setOpenings] = useState(1);
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");

  // Form State: Job Seeker
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [desiredRole, setDesiredRole] = useState("");
  const [seekerCategory, setSeekerCategory] = useState("Office & Data Entry");
  const [education, setEducation] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Fresher");
  const [preferredLocation, setPreferredLocation] = useState("Fazilnagar Town");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [employmentPreference, setEmploymentPreference] = useState("Full-time");
  const [availability, setAvailability] = useState("Immediately");
  const [languages, setLanguages] = useState("Hindi, Bhojpuri");
  const [bio, setBio] = useState("");
  const [showPhone, setShowPhone] = useState(false);
  const [phone, setPhone] = useState("");

  // UI status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleAddSkill = (skillToAdd) => {
    const trimmed = (skillToAdd || skillInput).trim();
    if (trimmed && !skillsList.includes(trimmed)) {
      setSkillsList([...skillsList, trimmed]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkillsList(skillsList.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login", {
        state: {
          from: "/jobs/post",
          message: "Please log in to publish your listing.",
        },
      });
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const finalLocation = location === "Other / Custom" ? customLocation.trim() || "Fazilnagar" : location;

      if (listingType === "job") {
        if (!jobTitle.trim() || jobTitle.trim().length < 3) {
          setError("Job title is required (at least 3 characters).");
          setSubmitting(false);
          return;
        }
        if (!company.trim()) {
          setError("Company or Shop / Employer name is required.");
          setSubmitting(false);
          return;
        }
        if (!description.trim() || description.trim().length < 15) {
          setError("Please provide a job description (at least 15 characters).");
          setSubmitting(false);
          return;
        }

        const payload = {
          type: "job",
          title: jobTitle.trim(),
          company: company.trim(),
          category,
          employmentType,
          location: finalLocation,
          salaryMin: Number(salaryMin) || 0,
          salaryMax: Number(salaryMax) || 0,
          salaryPeriod,
          isNegotiable,
          experience,
          isFresherFriendly,
          qualifications: qualifications.trim(),
          skills: skillsList,
          responsibilities: responsibilities.trim(),
          workingHours: workingHours.trim(),
          openings: Math.max(1, Number(openings) || 1),
          deadline: deadline ? deadline : null,
          description: description.trim(),
        };

        const res = await API.post("/jobs", payload);
        if (res.data?.success && res.data.listing) {
          navigate(`/jobs/${res.data.listing._id || res.data.listing.id}`);
        }
      } else {
        // Job Seeker Profile
        if (!desiredRole.trim() || desiredRole.trim().length < 2) {
          setError("Please specify the job role sought.");
          setSubmitting(false);
          return;
        }
        if (!bio.trim() || bio.trim().length < 15) {
          setError("Please provide a brief introduction about your skills and experience (min 15 characters).");
          setSubmitting(false);
          return;
        }

        const payload = {
          type: "job_seeker",
          displayName: displayName.trim() || user?.name || "Local Candidate",
          desiredRole: desiredRole.trim(),
          category: seekerCategory,
          education: education.trim(),
          experienceLevel,
          preferredLocation,
          expectedSalary: expectedSalary.trim() || "Negotiable",
          employmentPreference,
          availability,
          languages: languages.split(",").map((l) => l.trim()).filter(Boolean),
          skills: skillsList,
          bio: bio.trim(),
          showPhone,
          phone: showPhone ? phone.trim() : "",
        };

        const res = await API.post("/jobs", payload);
        if (res.data?.success && res.data.listing) {
          navigate(`/jobs/${res.data.listing._id || res.data.listing.id}`);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to publish listing. Please check your inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#FDFBF7] dark:bg-[#0F172A] font-sans pb-32 transition-colors duration-200">
      {/* ------------------------------------------------------
          Top Header Bar
          ------------------------------------------------------ */}
      <div className="border-b border-[#E8DFC8] dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md py-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link
            to="/jobs"
            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Jobs Portal
          </Link>
          <span className="text-[11px] font-bold text-[#A83D32] dark:text-[#C45A4C] bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 rounded-full border border-red-200/60 dark:border-red-900/40">
            Publish Opportunity
          </span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Auth prompt if unauthenticated */}
        {!user && (
          <div className="mb-6 p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                  Authentication Required
                </h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Sign in with your Fazilnagar account to publish and receive inquiries.
                </p>
              </div>
            </div>
            <Link
              to="/login"
              state={{ from: "/jobs/post" }}
              className="px-4 py-2 bg-[#A83D32] hover:bg-[#873027] text-white text-xs font-bold rounded-xl shrink-0 transition"
            >
              Sign In to Continue →
            </Link>
          </div>
        )}

        {/* ------------------------------------------------------
            Listing Option Switcher (Requirement 6)
            ------------------------------------------------------ */}
        <div className="bg-white dark:bg-[#1E293B] p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">
              Publish on Fazilnagar Jobs
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Select your goal: are you hiring staff, or are you looking for local employment?
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option A */}
            <button
              type="button"
              onClick={() => {
                setListingType("job");
                setError("");
              }}
              className={`p-5 rounded-2xl border-2 text-left transition cursor-pointer flex items-start gap-4 ${
                listingType === "job"
                  ? "border-[#A83D32] bg-red-50/30 dark:bg-red-950/20 shadow-xs"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  listingType === "job"
                    ? "bg-[#A83D32] text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Post a Job Vacancy
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  For shops, offices, clinics, schools, and employers looking to hire workers in Fazilnagar.
                </p>
              </div>
            </button>

            {/* Option B */}
            <button
              type="button"
              onClick={() => {
                setListingType("job_seeker");
                setError("");
              }}
              className={`p-5 rounded-2xl border-2 text-left transition cursor-pointer flex items-start gap-4 ${
                listingType === "job_seeker"
                  ? "border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  listingType === "job_seeker"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Post a Job-Seeker Profile
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  For citizens, skilled workers, technicians, or freshers looking for employment in town.
                </p>
              </div>
            </button>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl text-red-700 dark:text-red-300 text-xs font-bold">
              {error}
            </div>
          )}

          {/* ------------------------------------------------------
              Form: Job Vacancy
              ------------------------------------------------------ */}
          {listingType === "job" ? (
            <form onSubmit={handleSubmit} className="space-y-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Billing Accountant, Computer Operator, Teacher"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A83D32]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Company / Shop / Employer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Kisan Agro Supplies, Pawanagar Medicos"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A83D32]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A83D32]"
                  >
                    {JOB_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Employment Type
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A83D32]"
                  >
                    {EMPLOYMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Location in Fazilnagar
                  </label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A83D32]"
                  >
                    {LOCAL_JOB_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                    <option value="Other / Custom">Other Town Location</option>
                  </select>
                </div>
              </div>

              {location === "Other / Custom" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Custom Location Name
                  </label>
                  <input
                    type="text"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="e.g. Near Pawapuri Mandir, NH-27 Mile 14"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              )}

              {/* Salary Section */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Salary &amp; Compensation (INR ₹)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Min Salary (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                      placeholder="e.g. 12000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Max Salary (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={salaryMax}
                      onChange={(e) => setSalaryMax(e.target.value)}
                      placeholder="e.g. 18000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Frequency
                    </label>
                    <select
                      value={salaryPeriod}
                      onChange={(e) => setSalaryPeriod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    >
                      {SALARY_PERIODS.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          {sp.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isNegotiable}
                    onChange={(e) => setIsNegotiable(e.target.checked)}
                    className="rounded text-[#A83D32]"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    Salary is negotiable based on candidate experience
                  </span>
                </label>
              </div>

              {/* Experience, Openings, Working Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Experience Required
                  </label>
                  <select
                    value={experience}
                    onChange={(e) => {
                      setExperience(e.target.value);
                      setIsFresherFriendly(e.target.value === "Fresher friendly");
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  >
                    {EXPERIENCE_LEVELS.map((exp) => (
                      <option key={exp} value={exp}>
                        {exp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Number of Openings
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={openings}
                    onChange={(e) => setOpenings(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Working Hours / Shift
                  </label>
                  <input
                    type="text"
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    placeholder="e.g. 9:30 AM - 6:30 PM"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* Qualifications */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Required Education &amp; Qualifications
                </label>
                <input
                  type="text"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  placeholder="e.g. 12th Pass / Graduate in Commerce / B.Com / D.Pharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>

              {/* Skills Tags */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Required Skills
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Type skill & press Enter (e.g. Tally Prime, GST, Typing)"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill()}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold transition"
                  >
                    Add
                  </button>
                </div>

                {/* Popular Skill quick pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 self-center">Suggestions:</span>
                  {POPULAR_SKILLS.slice(0, 6).map((ps) => (
                    <button
                      key={ps}
                      type="button"
                      onClick={() => handleAddSkill(ps)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-0.5 rounded-md font-medium text-slate-700 dark:text-slate-300"
                    >
                      + {ps}
                    </button>
                  ))}
                </div>

                {skillsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {skillsList.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-red-50 text-[#A83D32] dark:bg-red-950/40 dark:text-red-300 border border-red-200 font-semibold"
                      >
                        {skill}
                        <button type="button" onClick={() => handleRemoveSkill(skill)}>
                          <X className="w-3 h-3 text-red-500" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Responsibilities */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Key Responsibilities
                </label>
                <textarea
                  rows={3}
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  placeholder="Outline day-to-day duties (e.g. Customer billing, inventory check, ledger reconciliation...)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>

              {/* Full Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Job Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the opportunity, work environment, and what makes your enterprise a great place to work in Fazilnagar..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>

              {/* Application Deadline */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Application Deadline (Optional)
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !user}
                  className="px-8 py-3 bg-[#A83D32] hover:bg-[#873027] text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Publishing Vacancy...
                    </span>
                  ) : (
                    "Publish Job Vacancy →"
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* ------------------------------------------------------
               Form: Job Seeker Profile (Requirement 6)
               ------------------------------------------------------ */
            <form onSubmit={handleSubmit} className="space-y-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Your Public Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Rajesh Verma, Amit K."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A83D32]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Job Sought / Preferred Role <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={desiredRole}
                    onChange={(e) => setDesiredRole(e.target.value)}
                    placeholder="e.g. Tally Accountant, Science Teacher, Electrician"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-[#A83D32]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category of Work
                  </label>
                  <select
                    value={seekerCategory}
                    onChange={(e) => setSeekerCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  >
                    {JOB_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Experience Level
                  </label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  >
                    <option value="Fresher">Fresher (Entry Level)</option>
                    <option value="0-1 Years">0-1 Years Experience</option>
                    <option value="1-3 Years">1-3 Years Experience</option>
                    <option value="3-5 Years">3-5 Years Experience</option>
                    <option value="5+ Years">5+ Years Senior</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Availability to Join
                  </label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  >
                    {SEEKER_AVAILABILITY.map((av) => (
                      <option key={av} value={av}>
                        {av}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Education &amp; Degree
                  </label>
                  <input
                    type="text"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    placeholder="e.g. B.Com Graduate, 12th Pass, ITI Electrician"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Preferred Location / Area
                  </label>
                  <input
                    type="text"
                    value={preferredLocation}
                    onChange={(e) => setPreferredLocation(e.target.value)}
                    placeholder="e.g. Fazilnagar Town / NH-27 Bypass"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Expected Salary / Wages
                  </label>
                  <input
                    type="text"
                    value={expectedSalary}
                    onChange={(e) => setExpectedSalary(e.target.value)}
                    placeholder="e.g. ₹12,000 - ₹15,000 / month, Negotiable"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Languages Spoken
                </label>
                <input
                  type="text"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder="e.g. Hindi, Bhojpuri, English"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>

              {/* Skills Tags */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Skills &amp; Expertise
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Type skill & press Enter"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill()}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold transition"
                  >
                    Add
                  </button>
                </div>

                {skillsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {skillsList.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 font-semibold"
                      >
                        {skill}
                        <button type="button" onClick={() => handleRemoveSkill(skill)}>
                          <X className="w-3 h-3 text-emerald-600" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bio / Introduction */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Brief Introduction &amp; Work Background <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Introduce yourself to employers in Fazilnagar. Mention your past work experience, hands-on skills, and what kind of position you are looking for..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
              </div>

              {/* Privacy Setting (Requirement 3) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Privacy Protection
                </span>
                <label className="inline-flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPhone}
                    onChange={(e) => setShowPhone(e.target.checked)}
                    className="rounded text-[#A83D32]"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    Show my contact phone number publicly on my profile
                  </span>
                </label>
                {showPhone ? (
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number to display publicly"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs mt-2"
                  />
                ) : (
                  <p className="text-[11px] text-slate-400">
                    🔒 Default: Employers will contact you privately through Fazilnagar Town Chat. Your phone and home address remain completely confidential.
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !user}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Publishing Profile...
                    </span>
                  ) : (
                    "Publish Job Seeker Profile →"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
