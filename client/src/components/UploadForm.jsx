import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

export default function UploadForm() {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [titleHi, setTitleHi] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [reporterName, setReporterName] = useState("");
  const [locationName, setLocationName] = useState("Fazilnagar");
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsSuccess(false);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("titleHi", titleHi);
    formData.append("description", description);
    formData.append("summary", description.slice(0, 250));
    formData.append("category", category);
    formData.append("location", locationName || "Fazilnagar");
    formData.append("source", reporterName ? `${reporterName} (Citizen)` : "Citizen Reporter");

    if (imageFile) formData.append("image", imageFile);
    if (videoFile) formData.append("video", videoFile);

    try {
      const headers = {
        "Content-Type": "multipart/form-data",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await API.post("/news", formData, { headers });
      const msg = res.data?.moderationMessage || "Story submitted successfully! It will appear after quick review.";
      setMessage(msg);
      setIsSuccess(true);
      setTimeout(() => navigate("/news"), 2500);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to submit story. Please check fields and try again.");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 my-6">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-1">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Citizen Reporter Open Desk</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#18232E]">
            Post Town News / समाचार जोड़ें
          </h2>
          <p className="text-xs text-slate-500">
            Anyone can submit local news, announcements, alerts, and community reports.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold mb-4 flex items-center gap-2 ${
            isSuccess
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {isSuccess ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />}
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-bold text-[#18232E] mb-1">
            News Headline (शीर्षक) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Major Market Gathering or Road Construction near Fazilnagar Crossing"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#B8323C] text-xs bg-[#F5F7F8]"
            required
          />
        </div>

        <div>
          <label className="block font-bold text-[#18232E] mb-1">
            Hindi Headline (हिंदी शीर्षक - Optional)
          </label>
          <input
            type="text"
            value={titleHi}
            onChange={(e) => setTitleHi(e.target.value)}
            placeholder="उदा. फाजिलनगर चौराहे पर सड़क निर्माण कार्य पूर्ण"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#B8323C] text-xs bg-[#F5F7F8]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-bold text-[#18232E] mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#B8323C] text-xs bg-[#F5F7F8]"
            >
              <option value="General">General (सामान्य)</option>
              <option value="Civic Updates">Civic Updates (नगर समाचार)</option>
              <option value="Events">Events (कार्यक्रम)</option>
              <option value="Healthcare">Healthcare (स्वास्थ्य)</option>
              <option value="Education">Education (शिक्षा)</option>
              <option value="Market">Market (बाजार)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-[#18232E] mb-1">
              Your Name (रिपोर्टर का नाम)
            </label>
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="e.g. Ramesh Singh / Ward 5"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#B8323C] text-xs bg-[#F5F7F8]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#18232E] mb-1">
              Location / Area
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. College Road, Fazilnagar"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#B8323C] text-xs bg-[#F5F7F8]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-[#18232E] mb-1">
              Upload Photo (JPG/PNG - Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-[#B8323C] file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-slate-200 file:text-xs file:font-bold text-xs bg-[#F5F7F8]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#18232E] mb-1">
              Upload Video Clip (MP4 - Optional)
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files[0])}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-[#B8323C] file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:bg-slate-200 file:text-xs file:font-bold text-xs bg-[#F5F7F8]"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-[#18232E] mb-1">
            Story Details / विस्तृत विवरण <span className="text-red-500">*</span>
          </label>
          <textarea
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of what occurred, time, people involved, civic impact..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#B8323C] text-xs bg-[#F5F7F8]"
            required
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#B8323C] hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>Submitting Story...</span>
          ) : (
            <span>🚀 Submit Story for Fazilnagar News Feed</span>
          )}
        </button>
      </form>
    </div>
  );
}