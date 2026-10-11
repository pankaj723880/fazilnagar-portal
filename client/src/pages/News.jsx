import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import { Newspaper, PlusCircle, Search, Calendar, User, Tag, Sparkles } from "lucide-react";

const FALLBACK_NEWS = [
  {
    _id: "fb-1",
    title: "New Civic Amenities & Beautification Drive Launched along NH-27 Corridor",
    titleHi: "एनएच-27 कॉरिडोर पर नई नागरिक सुविधाओं और सौंदर्यीकरण अभियान की शुरुआत",
    category: "Civic Updates",
    createdAt: new Date().toISOString(),
    author: { name: "Municipal Ward Bureau" },
    description:
      "Municipal authorities and town committee have initiated a comprehensive town beautification project focusing on solar streetlights, highway service road resurfacing, and pedestrian walkways.",
  },
  {
    _id: "fb-2",
    title: "Special Health Checkup Camp Announced at CHC Fazilnagar This Week",
    titleHi: "सामुदायिक स्वास्थ्य केंद्र फाजिलनगर में इस सप्ताह विशेष स्वास्थ्य जांच शिविर",
    category: "Healthcare",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    author: { name: "CHC Health Desk" },
    description:
      "A free health checkup, maternal wellness consultation, and eye-screening camp will be hosted at CHC Fazilnagar on Hospital Road with visiting medical officers.",
  },
];

export default function News() {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["All", "General", "Civic Updates", "Healthcare", "Events", "Politics", "Sports"];

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const res = await API.get("/news");
      if (Array.isArray(res.data) && res.data.length > 0) {
        setNewsList(res.data);
      } else {
        setNewsList(FALLBACK_NEWS);
      }
    } catch (err) {
      console.error("Failed to fetch news:", err);
      setNewsList(FALLBACK_NEWS);
    } finally {
      setLoading(false);
    }
  };

  const filteredNews = newsList.filter((item) => {
    const matchesCategory =
      selectedCategory === "All" ||
      item.category?.toLowerCase() === selectedCategory.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.title?.toLowerCase().includes(query) ||
      item.titleHi?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#18232E] text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#B8323C] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Live Town Bulletin</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading">
            📰 Fazilnagar News & Updates
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Verified local headlines, public notices, press releases, and community reports directly from town reporters and residents.
          </p>
        </div>

        <Link
          to="/create-news"
          className="bg-[#B8323C] hover:bg-[#991B1B] text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-2xl transition shadow-md flex items-center gap-2 shrink-0 group"
        >
          <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          <span>+ Post News / समाचार जोड़ें</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E1E6EA] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-[#B8323C] text-white font-bold shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search news or headlines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[#B8323C] bg-slate-50/50"
          />
        </div>
      </div>

      {/* News Articles Grid */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-3 border-slate-300 border-t-[#B8323C] rounded-full animate-spin mb-3"></div>
          <p className="text-slate-500 text-sm font-medium">Loading town bulletins...</p>
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
          <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No articles found in this category</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">Be the first to publish local updates for Fazilnagar.</p>
          <Link
            to="/create-news"
            className="inline-flex items-center gap-1.5 bg-[#B8323C] text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-[#991B1B] transition shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Publish Now</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNews.map((article) => (
            <article
              key={article._id || article.id}
              className="bg-white rounded-3xl border border-[#E1E6EA] shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
            >
              <div>
                {/* Image if available */}
                {article.image ? (
                  <div className="h-48 w-full overflow-hidden bg-slate-100">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="h-32 bg-gradient-to-r from-slate-800 to-slate-900 p-4 flex flex-col justify-between text-white">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded text-slate-200">
                        {article.category || "General"}
                      </span>
                      <Newspaper className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="text-xs text-slate-300 font-serif line-clamp-1 italic">
                      Fazilnagar Town Bulletin
                    </span>
                  </div>
                )}

                <div className="p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1 bg-red-50 text-[#B8323C] font-bold text-[10px] px-2 py-0.5 rounded">
                      <Tag className="w-3 h-3" />
                      {article.category || "General"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {article.createdAt
                        ? new Date(article.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Recent"}
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-[#18232E] group-hover:text-[#B8323C] transition-colors leading-snug line-clamp-2">
                    {article.title}
                  </h2>

                  {article.titleHi && (
                    <p className="text-xs font-medium text-slate-600 line-clamp-1 font-serif">
                      {article.titleHi}
                    </p>
                  )}

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {article.description}
                  </p>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{article.author?.name || "Local Resident"}</span>
                </span>
                <span className="text-[#168568] font-bold text-[10px] uppercase">
                  Verified Update
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}