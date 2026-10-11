import { useState, useEffect } from "react";
import API from "../api";

export default function NewsSlider() {
  const [slides, setSlides] = useState([]);

  useEffect(() => {
    API.get("/news")
      .then((res) => {
        if (Array.isArray(res.data)) {
          setSlides(res.data.slice(0, 5)); // Get top 5 news
        }
      })
      .catch((err) => console.error("Failed to load live news", err));
  }, []);

  if (!slides || slides.length === 0) {
    return null; // Gracefully hide slider if no news exists
  }

  return (
    <div className="bg-slate-900 text-white p-6 rounded-2xl mb-6">
      <h3 className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">Top Headlines</h3>
      <h2 className="text-xl font-bold">{slides[0]?.title}</h2>
      <p className="text-slate-300 text-sm mt-2 line-clamp-2">{slides[0]?.description}</p>
    </div>
  );
}