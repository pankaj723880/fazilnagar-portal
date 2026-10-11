import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../api";

export default function NewsList() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await API.get("/news");
        // Ensure data is an array before setting state
        setNews(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Failed to fetch news:", err);
        setError("Unable to load news articles at this time.");
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return <p className="text-center py-8 text-slate-500">Loading latest news...</p>;
  }

  if (error) {
    return <p className="text-center py-8 text-red-500 font-semibold">{error}</p>;
  }

  if (!news || news.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>No news articles published yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
      {news.map((item) => (
        <article key={item._id || item.id} className="bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          {item.image && (
            <img 
              src={item.image} 
              alt={item.title} 
              className="w-full h-48 object-cover rounded-xl mb-4" 
            />
          )}
          <span className="text-xs font-bold uppercase text-red-700 bg-red-50 px-2.5 py-1 rounded-md">
            {item.category || "General"}
          </span>
          <h3 className="text-lg font-bold text-slate-800 mt-2 line-clamp-2">
            {item.title}
          </h3>
          {item.titleHi && (
            <p className="text-sm font-medium text-slate-600 mt-1 line-clamp-1">
              {item.titleHi}
            </p>
          )}
          <p className="text-sm text-slate-500 mt-2 line-clamp-3">
            {item.description}
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>By {item.author?.name || "Local Reporter"}</span>
            <Link to={`/news/${item._id || item.id}`} className="text-red-700 font-bold hover:underline">
              Read more →
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}