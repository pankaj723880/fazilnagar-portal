import { useState } from "react";
import { Mail, Phone, MapPin, AlertTriangle, Send, CheckCircle2 } from "lucide-react";
import { usePageSEO } from "../utils/seo";

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

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate submission handling
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 px-4">
      {/* Disclaimer Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl text-amber-900 text-xs">
        <p className="font-bold flex items-center gap-1.5 mb-1">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Independent Community Portal Notice</span>
        </p>
        <p className="leading-relaxed">
          Fazilnagar Town Portal is an unofficial, community-operated civic directory maintained by local volunteers. It is not affiliated with, operated by, or an official representative of Nagar Panchayat Fazilnagar or any state government ministry.
        </p>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
          Contact Us &amp; Report Corrections
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
          Spotted an outdated telephone number, closed business, or incorrect location? Help us keep Fazilnagar’s civic directory 100% accurate.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Portal Volunteer Desk
            </h2>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Desk Address:</strong> Community Editorial Desk, Main NH-27 Corridor, Near Pawanagar Mahavir Chowk, Fazilnagar - 274401, Kushinagar, UP
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Email:</strong> editorial@fazilnagar.me
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Community Helpline:</strong> +91 94520 89540
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200 text-blue-950 text-xs space-y-2">
            <h3 className="font-bold">Government Helplines</h3>
            <p className="text-[11px] leading-relaxed text-blue-900">
              For official administrative emergencies or municipal grievances, call National Emergency (112) or Nagar Panchayat helpline directly.
            </p>
          </div>
        </div>

        {/* Correction / Message Form */}
        <div className="md:col-span-2 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          {submitted ? (
            <div className="p-8 text-center space-y-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-emerald-950">Report Received!</h3>
              <p className="text-xs text-emerald-800 leading-relaxed max-w-md mx-auto">
                Thank you for helping keep Fazilnagar informed. A portal volunteer will verify the submitted correction with ground truth data.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setFormData({ name: "", emailOrPhone: "", subject: "", listingName: "", incorrectInfo: "", correctionDetails: "" });
                }}
                className="mt-3 text-xs font-bold text-emerald-700 underline cursor-pointer"
              >
                Submit another report
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
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
                    placeholder="e.g., Community Health Centre, Hermitage School, etc."
                    value={formData.listingName}
                    onChange={(e) => setFormData({ ...formData, listingName: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#B8323C]"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-xs font-bold text-slate-800 mb-1">
                    Your Name (Optional)
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="e.g. Ramesh Singh"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#B8323C]"
                  />
                </div>
                <div>
                  <label htmlFor="emailOrPhone" className="block text-xs font-bold text-slate-800 mb-1">
                    Email or Phone (For follow-up)
                  </label>
                  <input
                    id="emailOrPhone"
                    type="text"
                    placeholder="user@example.com or mobile"
                    value={formData.emailOrPhone}
                    onChange={(e) => setFormData({ ...formData, emailOrPhone: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#B8323C]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="correctionDetails" className="block text-xs font-bold text-slate-800 mb-1">
                  {formType === "report" ? "What is wrong and what is the correct information? *" : "Message *"}
                </label>
                <textarea
                  id="correctionDetails"
                  rows={4}
                  required
                  placeholder={formType === "report" ? "Please detail what phone number, address, or service is wrong and provide the verified correct detail..." : "Your inquiry or feedback..."}
                  value={formData.correctionDetails}
                  onChange={(e) => setFormData({ ...formData, correctionDetails: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#B8323C]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#18232E] hover:bg-[#B8323C] text-white text-xs font-bold py-3 rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit to Volunteer Verification Desk</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
