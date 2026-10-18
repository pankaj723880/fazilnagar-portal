import { Link } from "react-router-dom";
import { usePageSEO } from "../utils/seo";
import { Home, Compass, PhoneCall, Newspaper, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  usePageSEO({
    title: "Page Not Found (404) | Fazilnagar Civic Portal",
    description: "The requested page could not be found on Fazilnagar Civic Portal.",
    canonicalPath: "/404",
    noIndex: true,
  });

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-[#B8323C] border border-red-200 flex items-center justify-center mx-auto text-2xl font-black">
          404
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
            Page Not Found / पृष्ठ नहीं मिला
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            The civic page, listing, or route you are looking for may have been relocated, renamed, or is temporarily unavailable.
          </p>
        </div>

        {/* Helpful Direct Civic Links */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-left">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Popular Town Destinations
          </span>
          <div className="grid grid-cols-2 gap-2 pt-1 font-semibold text-slate-700">
            <Link to="/" className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/60 flex items-center gap-1.5 transition">
              <Home className="w-3.5 h-3.5 text-[#B8323C]" />
              <span>Town Portal</span>
            </Link>
            <Link to="/directory" className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/60 flex items-center gap-1.5 transition">
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              <span>Directory</span>
            </Link>
            <Link to="/news" className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/60 flex items-center gap-1.5 transition">
              <Newspaper className="w-3.5 h-3.5 text-emerald-600" />
              <span>Local News</span>
            </Link>
            <Link to="/emergency" className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/60 flex items-center gap-1.5 transition">
              <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
              <span>Emergency 24/7</span>
            </Link>
          </div>
        </div>

        <Link
          to="/"
          className="w-full bg-[#18232E] hover:bg-[#B8323C] text-white text-xs font-bold py-3 px-4 rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Homepage / मुख्य पृष्ठ</span>
        </Link>
      </div>
    </div>
  );
}
