import { useState } from "react";

const LOCAL_NEWS = [
  {
    id: 1,
    title: "New Civic Amenities & Beautification Drive Launched",
    category: "Civic Updates",
    time: "2 hours ago",
    author: "City Bureau",
    summary:
      "Municipal authorities have initiated a town beautification project focusing on solar streetlights, road resurfacing, and green zones.",
  },
  {
    id: 2,
    title: "Health Camp Announced at District Civil Hospital This Sunday",
    category: "Healthcare",
    time: "5 hours ago",
    author: "Health Desk",
    summary:
      "A free health checkup and eye-care consultation camp will be hosted at the primary health center featuring visiting specialists.",
  },
];

export default function News() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-2">
        <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Live Updates
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold">📰 City News & Announcements</h1>
        <p className="text-slate-300 text-sm">
          Stay updated with verified local headlines, municipal notices, and regional events.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LOCAL_NEWS.map((article) => (
          <div key={article.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase bg-red-50 text-red-700 px-2.5 py-0.5 rounded">
                {article.category}
              </span>
              <span className="text-xs text-slate-400">{article.time}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">{article.title}</h2>
            <p className="text-xs text-slate-600">{article.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}