import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchNewsById } from "../api";

export default function NewsDetail() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getArticle = async () => {
      // Guard against missing or undefined ID
      if (!id || id === "undefined") {
        setError("Invalid article ID.");
        setLoading(false);
        return;
      }

      try {
        const data = await fetchNewsById(id);
        setArticle(data);
      } catch (err) {
        console.error("Error fetching news detail:", err);
        setError("Article not found or server error.");
      } finally {
        setLoading(false);
      }
    };

    getArticle();
  }, [id]);

  if (loading) {
    return <p className="text-center py-12 text-slate-500">Loading article...</p>;
  }

  if (error || !article) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-semibold mb-4">{error || "Article not found."}</p>
        <Link to="/news" className="text-red-700 font-bold hover:underline">
          ← Back to All News
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
      <Link to="/news" className="inline-block text-sm font-semibold text-slate-500 hover:text-red-700 transition-colors">
        ← Back to News
      </Link>

      <div className="space-y-2">
        <span className="text-xs font-bold uppercase text-red-700 bg-red-50 px-2.5 py-1 rounded-md">
          {article.category || "General"}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
          {article.title}
        </h1>
        {article.titleHi && (
          <h2 className="text-lg font-medium text-slate-600">
            {article.titleHi}
          </h2>
        )}
      </div>

      {(article.video || article.mediaType === "video") && (
        <video controls playsInline className="w-full max-h-96 object-contain bg-black rounded-2xl">
          <source src={article.video || article.mediaUrl} />
          Your browser does not support the video tag.
        </video>
      )}

      {!(article.video || article.mediaType === "video") && (article.image || article.mediaUrl) && (
        <img
          src={article.image || article.mediaUrl}
          alt={article.title}
          className="w-full h-80 object-cover rounded-2xl"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}

      <div className="flex items-center justify-between text-xs text-slate-400 border-y border-slate-100 py-3">
        <span>By {article.author?.name || "Local Reporter"}</span>
        <span>{new Date(article.createdAt).toLocaleDateString()}</span>
      </div>

      <div className="text-slate-700 leading-relaxed whitespace-pre-line text-base">
        {article.description}
      </div>
    </article>
  );
}