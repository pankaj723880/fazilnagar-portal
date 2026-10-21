import { Link } from "react-router-dom";

export default function NewsCard({ news }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <img
        src={news.image || news.mediaUrl || "https://images.unsplash.com/photo-1548013146-72479768bada"}
        alt={news.title}
        className="w-full h-40 object-cover"
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.src = "https://images.unsplash.com/photo-1548013146-72479768bada";
        }}
      />
      <div className="p-4">
        <h3 className="font-bold text-slate-800 line-clamp-2">{news.title}</h3>
        <Link to={`/news/${news._id || news.id || 1}`} className="text-red-700 text-sm font-semibold mt-2 block">Read more →</Link>
      </div>
    </div>
  );
}