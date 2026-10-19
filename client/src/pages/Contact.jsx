import { useState } from "react";
import { Mail, Phone, MapPin, AlertTriangle, Send, CheckCircle2, Loader2 } from "lucide-react";
import { usePageSEO } from "../utils/seo";
import API from "../api";

export default function Contact() {
  usePageSEO({
    title: "Contact & Report Wrong Information | Fazilnagar Civic Portal",
    description: "Contact the volunteer editorial team of Fazilnagar Town Portal, report inaccurate directory listings, or submit civic inquiries.",
    canonicalPath: "/contact",
  });

  const [formType, setFormType] = useState("report"); // "report" | "general"
  const [formData, setFormData] = useState({
    name: "",
    emailOrPhone: "",
    subject: "",
    listingName: "",
    incorrectInfo: "",
    correctionDetails: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [referenceId, setReferenceId] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.name.trim()) {
      setSubmitError("Please enter your name.");
      return;
    }
    if (!formData.emailOrPhone.trim()) {
      setSubmitError("Please provide an email or phone number so we can verify the information.");
      return;
    }
    if (formType === "report" && !formData.listingName.trim()) {
      setSubmitError("Please specify the business or listing name to correct.");
      return;
    }
    if (!formData.correctionDetails.trim()) {
      setSubmitError("Please enter your message or correction details.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await API.post("/submissions/correction", {
        name: formData.name.trim(),
        emailOrPhone: formData.emailOrPhone.trim(),
        subject: formData.subject.trim(),
        listingName: formData.listingName.trim(),
        incorrectInfo: formData.incorrectInfo.trim(),
        correctionDetails: formData.correctionDetails.trim(),
        formType,
      });

      if (res.data?.success) {
        setReferenceId(res.data.referenceId || "");
        setSubmitted(true);
      } else {
        setSubmitError(res.data?.message || "Failed to submit report. Please check the fields.");
      }
    } catch (err) {
      setSubmitError(
        err.response?.data?.message || "Network error. Please check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 sm:space-y-10 pb-32 px-4 sm:px-8 lg:px-12 py-8 sm:py-12 font-sans">
      {/* Disclaimer Banner */}
      <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-300/60 dark:border-amber-900/40 p-5 rounded-2xl text-amber-950 dark:text-amber-200 text-xs shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
        <p className="font-bold flex items-center gap-1.5 mb-1 text-amber-900 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Independent Community Portal Notice</span>
        </p>
        <p className="leading-relaxed">
          Fazilnagar Town Portal is an unofficial, community-operated civic directory maintained by local volunteers. It is not affiliated with, operated by, or an official representative of Nagar Panchayat Fazilnagar or any state government ministry.
        </p>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-[#131823] rounded-3xl p-6 sm:p-8 border border-slate-200/60 dark:border-white/8 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-2">
        <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading tracking-tight">
          Contact Us &amp; Report Corrections
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
          Spotted an outdated telephone number, closed business, or incorrect location? Help us keep Fazilnagar’s civic directory 100% accurate.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {/* Contact Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#131823] rounded-3xl p-6 border border-slate-200/60 dark:border-white/8 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-3">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Portal Volunteer Desk
            </h2>
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong className="text-slate-900 dark:text-white">Desk Address:</strong> Main NH-27 Corridor, Near Pawanagar Mahavir Chowk, Fazilnagar - 274401, Kushinagar, UP
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong className="text-slate-900 dark:text-white">Email:</strong> editorial@fazilnagar.me
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong className="text-slate-900 dark:text-white">Community Helpline:</strong> +91 94520 89540
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50/70 dark:bg-blue-950/20 rounded-3xl p-6 border border-blue-200/60 dark:border-blue-900/40 text-blue-950 dark:text-blue-200 text-xs space-y-2 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
            <h3 className="font-bold text-sm">Government Helplines</h3>
            <p className="text-xs leading-relaxed text-blue-900/80 dark:text-blue-300">
              For official administrative emergencies or municipal grievances, call National Emergency (112) or Nagar Panchayat helpline directly.
            </p>
          </div>
        </div>

        {/* Correction / Message Form */}
        <div className="md:col-span-2 bg-white dark:bg-[#131823] rounded-3xl p-6 sm:p-8 border border-slate-200/60 dark:border-white/8 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          {submitted ? (
            <div className="p-5 text-center space-y-2.5 bg-emerald-50 rounded-2xl border border-emerald-200">
              <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-emerald-950">Report Received!</h3>
              <p className="text-xs text-emerald-800 leading-relaxed max-w-md mx-auto">
                Thank you for helping keep Fazilnagar informed. A portal volunteer will verify the submitted correction with ground truth data.
              </p>
              {referenceId && (
                <div className="bg-white/80 p-2 rounded-xl border border-emerald-300 max-w-xs mx-auto text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Tracking Reference ID</span>
                  <span className="font-mono font-bold text-emerald-900 text-sm select-all">{referenceId}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setReferenceId("");
                  setFormData({ name: "", emailOrPhone: "", subject: "", listingName: "", incorrectInfo: "", correctionDetails: "" });
                }}
                className="mt-2 text-xs font-bold text-emerald-700 underline cursor-pointer"
              >
                Submit another report
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2.5">
              {submitError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2 animate-shake">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">{submitError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <button
                  type="button"
                  onClick={() => setFormType("report")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition ${
                    formType === "report" ? "bg-[#B8323C] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  🚨 Report Inaccurate Information
                </button>
                <button
                  type="button"
                  onClick={() => setFormType("general")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition ${
                    formType === "general" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  ✉️ General Inquiry
                </button>
              </div>

              {formType === "report" && (
                <div>
                  <label htmlFor="listingName" className="block text-xs font-bold text-slate-800 mb-1">
                    Name of Listing / Page to Correct *
                  </label>
                  <input
                    id="listingName"
                    type="text"
                    required
                    placeholder="e.g., Community Health Centre, Sarvodaya College, etc."
                    value={formData.listingName}
                    onChange={(e) => setFormData({ ...formData, listingName: e.target.value })}
                    className="w-full text-xs px-3 h-10 sm:h-10.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#B8323C] bg-slate-50/50 focus:bg-white transition-all"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="name" className="block text-xs font-bold text-slate-800 mb-1">
                    Your Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder="e.g. Ramesh Singh"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs px-3 h-10 sm:h-10.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#B8323C] bg-slate-50/50 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="emailOrPhone" className="block text-xs font-bold text-slate-800 mb-1">
                    Email or Mobile (For verification) *
                  </label>
                  <input
                    id="emailOrPhone"
                    type="text"
                    required
                    placeholder="mobile number or email"
                    value={formData.emailOrPhone}
                    onChange={(e) => setFormData({ ...formData, emailOrPhone: e.target.value })}
                    className="w-full text-xs px-3 h-10 sm:h-10.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#B8323C] bg-slate-50/50 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="correctionDetails" className="block text-xs font-bold text-slate-800 mb-1">
                  {formType === "report" ? "What is wrong and what is the correct information? *" : "Message / Details *"}
                </label>
                <textarea
                  id="correctionDetails"
                  rows={3}
                  required
                  placeholder={formType === "report" ? "Please detail what phone number, address, or service is wrong and provide the verified correct detail..." : "Your civic inquiry or feedback..."}
                  value={formData.correctionDetails}
                  onChange={(e) => setFormData({ ...formData, correctionDetails: e.target.value })}
                  className="w-full text-xs p-2.5 sm:p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#B8323C] bg-slate-50/50 focus:bg-white transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#18232E] hover:bg-[#B8323C] disabled:opacity-60 text-white text-xs font-bold h-10 sm:h-10.5 rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting to Volunteer Desk...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit to Volunteer Verification Desk</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
