import UploadForm from "../components/UploadForm";
import { usePageSEO } from "../utils/seo";

export default function CreateNews({ user }) {
  usePageSEO({
    title: "Submit Local News & Announcements | Fazilnagar Town Portal",
    description: "Citizen news submission desk for Fazilnagar. Submit town news, notices, and community announcements for review.",
    canonicalPath: "/create-news",
    noIndex: true,
  });
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

      <UploadForm user={user} />
    </div>
  );
}
