import { usePageSEO } from "../utils/seo";
import { AlertCircle, Scale, CheckCircle, ShieldAlert } from "lucide-react";

export default function TermsOfService() {
  usePageSEO({
    title: "Terms of Service & Disclaimer | Fazilnagar Civic Portal",
    description: "Terms of service and non-governmental community disclaimer for Fazilnagar Town Portal.",
    canonicalPath: "/terms",
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 px-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
        <div className="inline-flex items-center gap-1.5 bg-rose-50 text-[#B8323C] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-rose-200">
          <Scale className="w-3.5 h-3.5" />
          <span>Community Agreement</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
          Terms of Service &amp; Non-Governmental Disclaimer
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Please review the terms and conditions governing the use of the Fazilnagar Town Civic &amp; Local Directory Portal (https://fazilnagar.vercel.app).
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 text-xs text-slate-700 leading-relaxed">
        <section className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-amber-950 space-y-2">
          <h2 className="text-sm font-bold flex items-center gap-2 text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-700" />
            <span>1. Unofficial &amp; Community-Run Declaration</span>
          </h2>
          <p>
            <strong>IMPORTANT:</strong> This website is an independent community portal operated by local residents and civic volunteers. It is <strong>NOT</strong> an official government portal, and is not affiliated with, authorized by, or an agent of <em>Nagar Panchayat Fazilnagar</em>, the District Magistrate of Kushinagar, or the Government of Uttar Pradesh.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#B8323C]" />
            <span>2. Directory Accuracy &amp; Verification Disclaimer</span>
          </h2>
          <p>
            While our team exercises reasonable diligence in verifying telephone numbers, clinic timings, and location markers via ground surveys, listings are provided for informational and civic awareness purposes only. Contact numbers and visiting hours may change without prior notice. Always independently confirm emergency services during critical situations.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>3. Community Code of Conduct</span>
          </h2>
          <p>
            Users submitting town news, local announcements, or business listings agree not to post defamatory, false, commercially deceptive, or inflammatory material. The volunteer editorial desk reserves the right to reject or remove any submission that fails verification.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">
            4. Legal Contact &amp; Grievances
          </h2>
          <p>
            To notify us of intellectual property matters, incorrect directory data, or terms inquiries:<br />
            <strong>Contact:</strong> Community Editorial Board, Fazilnagar Civic Initiative<br />
            <strong>Email:</strong> editorial@fazilnagar.vercel.app<br />
            <strong>Jurisdiction:</strong> Courts having jurisdiction in Kushinagar District, Uttar Pradesh, India.
          </p>
        </section>
      </div>
    </div>
  );
}
