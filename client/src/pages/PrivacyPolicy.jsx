import { usePageSEO } from "../utils/seo";
import { ShieldCheck, Lock, Eye, FileText } from "lucide-react";

export default function PrivacyPolicy() {
  usePageSEO({
    title: "Privacy Policy | Fazilnagar Civic & Directory Portal",
    description: "Privacy policy for the unofficial, community-operated Fazilnagar Town Portal. Learn how citizen data, submissions, and session cookies are handled.",
    canonicalPath: "/privacy",
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 px-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
        <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Last Updated: October 2026</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Fazilnagar Town Civic &amp; Local Directory Portal (https://www.fazilnagar.me) is an independent, community-driven civic resource. We respect your privacy and adhere to responsible data protection standards.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 text-xs text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#B8323C]" />
            <span>1. Information We Collect</span>
          </h2>
          <p>
            When you browse the portal, we do not require account creation. We only collect information that you explicitly volunteer:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Community Submissions: Place names, business addresses, contact numbers, and descriptions submitted for review.</li>
            <li>User Accounts: If you register as an authorized editor or reporter, your name, email, and hashed password.</li>
            <li>Technical Logs: Standard anonymized web server logs (browser type, IP address, page views) for security and rate limiting.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#B8323C]" />
            <span>2. Cookies &amp; Local Storage</span>
          </h2>
          <p>
            We use strictly necessary cookies for session security (HttpOnly, SameSite=Strict) when users log in to the administrative desk. We do not use third-party tracking cookies or sell visitor telemetry to advertising brokers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#B8323C]" />
            <span>3. Community Listing Data</span>
          </h2>
          <p>
            Public listings (schools, hospitals, clinics, businesses) contain publicly available contact information for civic benefit. If you own a listing and wish to modify or remove your telephone number or details, contact us via the correction form.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">
            4. Data Controller &amp; Grievances
          </h2>
          <p>
            For privacy inquiries or listing modification requests, please contact:<br />
            <strong>Volunteer Data Coordinator:</strong> Fazilnagar Community Editorial &amp; Privacy Desk<br />
            <strong>Email:</strong> privacy@fazilnagar.me<br />
            <strong>Postal Location:</strong> Fazilnagar Town, PIN 274401, Kushinagar, Uttar Pradesh
          </p>
        </section>
      </div>
    </div>
  );
}
