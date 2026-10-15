import { Link } from "react-router-dom";
import UploadForm from "../components/UploadForm";
import { usePageSEO } from "../utils/seo";
import { getAuthToken } from "../utils/authStorage";
import { LogIn, UserPlus, ShieldAlert } from "lucide-react";

export default function CreateNews({ user }) {
  usePageSEO({
    title: "Submit Local News & Announcements | Fazilnagar Town Portal",
    description: "Citizen news submission desk for Fazilnagar. Submit town news, notices, and community announcements for review.",
    canonicalPath: "/create-news",
    noIndex: true,
  });

  const isAuthenticated = Boolean(user || getAuthToken());

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-2">
        <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Reporter Desk
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold">📝 Post News / समाचार जोड़ें</h1>
        <p className="text-slate-300 text-sm">
          Publish local breaking news, announcements, and regional community reports.
        </p>
      </div>

      {!isAuthenticated ? (
        <div className="max-w-xl mx-auto my-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800">
              Authentication Required / लॉगिन आवश्यक है
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
              You must be registered and logged in to publish or submit news articles, photos, and video updates for the town portal.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/login"
              state={{ from: "/create-news", message: "Please log in to submit a local story." }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#B8323C] hover:bg-[#991B1B] text-white text-xs font-bold px-5 py-3 rounded-xl transition shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / लॉगिन करें</span>
            </Link>
            <Link
              to="/register"
              state={{ from: "/create-news" }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-3 rounded-xl transition shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account / नया खाता बनाएं</span>
            </Link>
          </div>
        </div>
      ) : (
        <UploadForm user={user} />
      )}
    </div>
  );
}
