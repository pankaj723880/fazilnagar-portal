import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import API from "../api";

export default function UploadForm() {
  const token = localStorage.getItem("token");
  const location = useLocation();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [titleHi, setTitleHi] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("titleHi", titleHi);
    formData.append("description", description);
    formData.append("category", category);

    if (imageFile) formData.append("image", imageFile);
    if (videoFile) formData.append("video", videoFile);

    try {
      const res = await API.post("/news", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      const msg = res.data?.moderationMessage || "News submitted successfully!";
      setMessage(msg);
      setTimeout(() => navigate("/news"), 2000);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to post news. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-slate-200 my-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Post News / समाचार जोड़ें</h2>

      {message && (
        <p className={`p-3 rounded-xl text-sm font-semibold mb-4 text-center ${message.includes("success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Title (English)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">शीर्षक (Hindi - Optional)</label>
          <input
            type="text"
            value={titleHi}
            onChange={(e) => setTitleHi(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600"
          >
            <option value="General">General</option>
            <option value="Politics">Politics</option>
            <option value="Events">Events</option>
            <option value="Sports">Sports</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Upload Image (JPG/PNG)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-xs file:font-semibold"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Upload Video (MP4/WebM - Max 50MB)</label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setVideoFile(e.target.files[0])}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-xs file:font-semibold"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Description / विवरण</label>
          <textarea
            rows="5"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600"
            required
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl transition-colors shadow-md"
        >
          {loading ? "Uploading & Publishing..." : "Publish News / प्रकाशित करें"}
        </button>
      </form>
    </div>
  );
}