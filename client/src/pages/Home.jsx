import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

// Important Places Data
const PLACES = [
  { id: 1, name: "Pawa Nagar Jain Temple", category: "Heritage", address: "Main Town, Fazilnagar", icon: "🏛️" },
  { id: 2, name: "Community Health Centre (CHC)", category: "Healthcare", address: "NH-27 Highway", icon: "🏥" },
  { id: 3, name: "Fazilnagar Bus Station", category: "Transport", address: "Main Chauraha", icon: "🚌" },
  { id: 4, name: "Police Station Fazilnagar", category: "Safety", address: "Near Market Gate", icon: "👮" },
  { id: 5, name: "Sarvodaya Inter College", category: "Education", address: "College Road", icon: "🎓" },
];

// Upcoming Events Data
const UPCOMING_EVENTS = [
  {
    id: 1,
    title: "Mahavir Nirvana Diwas Smarak",
    date: "Oct 24, 2026",
    time: "09:00 AM",
    venue: "Pawa Nagar Temple Grounds",
    category: "Cultural & Religious",
  },
  {
    id: 2,
    title: "Annual Block Kisan & Agro Fair",
    date: "Nov 12, 2026",
    time: "10:00 AM",
    venue: "Fazilnagar Sports Ground",
    category: "Community",
  },
];

// Emergency Contacts Data
const EMERGENCY_CONTACTS = [
  { title: "Police Emergency", number: "112", icon: "🚨", color: "bg-red-50 text-red-700 border-red-200" },
  { title: "Ambulance / CHC", number: "102 / 108", icon: "🚑", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { title: "Fire Station", number: "101", icon: "🚒", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { title: "Women Helpline", number: "1090", icon: "🛡️", color: "bg-purple-50 text-purple-700 border-purple-200" },
];

// Photo Gallery
const GALLERY = [
  { url: "https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=600&auto=format&fit=crop", caption: "Pawa Nagar Sanctuary" },
  { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop", caption: "Heritage Architecture" },
  { url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop", caption: "Kukutta River Ghat" },
  { url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=600&auto=format&fit=crop", caption: "Local Market Square" },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [latestNews, setLatestNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);

  // Fetch Latest News from API
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/news");
        if (response.ok) {
          const data = await response.json();
          setLatestNews(data.slice(0, 3)); // Display top 3
        }
      } catch (err) {
        console.error("Failed to load news for home page:", err);
      } finally {
        setLoadingNews(false);
      }
    };
    fetchNews();
  }, []);

  // Filter places based on search
  const filteredPlaces = PLACES.filter(
    (place) =>
      place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-16">
      {/* 1. HERO & SEARCH BAR */}
      <section className="relative bg-slate-900 text-white rounded-3xl p-6 sm:p-12 overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <span className="bg-red-700/80 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-block">
            Official City Portal
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Explore Fazilnagar <br />
            <span className="text-red-500">Ancient Pawa Nagar</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base">
            Discover historic landmarks, essential services, local news, and live municipal updates.
          </p>

          {/* Search Input */}
          <div className="pt-4">
            <div className="relative max-w-xl">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                🔎
              </span>
              <input
                type="text"
                placeholder="What are you looking for? (e.g. Hospital, Temple, Police)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-slate-900 placeholder-slate-400 pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. WEATHER WIDGET & EMERGENCY CONTACTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weather Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 text-white p-6 rounded-3xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-blue-200">
                🌤️ Live Weather
              </span>
              <h3 className="text-xl font-bold mt-1">Fazilnagar, UP</h3>
            </div>
            <span className="text-4xl">☀️</span>
          </div>
          <div className="my-6">
            <span className="text-5xl font-black">31°C</span>
            <p className="text-blue-100 text-sm mt-1">Sunny • Humidity: 45% • Wind: 12 km/h</p>
          </div>
          <p className="text-xs text-blue-200 border-t border-blue-400/30 pt-3">
            Ideal weather for visiting local outdoor monuments today.
          </p>
        </div>

        {/* Emergency Contacts Grid */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              🚨 Emergency Contacts
            </h2>
            <span className="text-xs font-semibold text-slate-400">24/7 Support</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {EMERGENCY_CONTACTS.map((item, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border ${item.color} flex flex-col justify-between`}
              >
                <div className="text-2xl mb-1">{item.icon}</div>
                <div>
                  <p className="text-xs font-bold leading-tight">{item.title}</p>
                  <p className="text-sm font-extrabold mt-1">{item.number}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. IMPORTANT LOCATIONS */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">
          📍 Important Locations
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlaces.length > 0 ? (
            filteredPlaces.map((place) => (
              <div
                key={place.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start space-x-3 hover:border-red-300 transition-colors"
              >
                <span className="text-3xl bg-slate-100 p-2.5 rounded-xl">{place.icon}</span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded">
                    {place.category}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">{place.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{place.address}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-sm col-span-full">
              No matching locations found for "{searchQuery}".
            </p>
          )}
        </div>
      </section>

      {/* 4. INTERACTIVE CITY MAP */}
      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">🗺️ Interactive City Map</h2>
          <span className="text-xs text-slate-500">Fazilnagar Block, Kushinagar</span>
        </div>
        <div className="w-full h-80 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
          <iframe
            title="Fazilnagar City Map"
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            src="https://maps.google.com/maps?q=Fazilnagar%20Kushinagar%20Uttar%20Pradesh&t=&z=13&ie=UTF8&iwloc=&output=embed"
            className="w-full h-full"
          />
        </div>
      </section>

      {/* 5. ABOUT THE CITY */}
      <section className="bg-slate-900 text-white p-6 sm:p-10 rounded-3xl shadow-xl space-y-4">
        <h2 className="text-2xl font-bold text-red-400">🏛️ About Fazilnagar (Pawa Nagar)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-300 text-sm leading-relaxed">
          <p>
            Fazilnagar is a prominent historical block situated in the Kushinagar district of Uttar Pradesh. Historically recognized as <strong>Pawa Nagar</strong>, it is revered as the sacred location where Bhagwan Mahavira, the 24th Tirthankara of Jainism, delivered his final discourse and attained Nirvana in 527 BCE.
          </p>
          <p>
            Located along National Highway 27, Fazilnagar links major pilgrimage sites across Kushinagar, Gorakhpur, and Bihar. Today, it stands as an energetic administrative and educational hub surrounded by fertile agricultural land and rich cultural traditions.
          </p>
        </div>
      </section>

      {/* 6. LATEST LOCAL NEWS & UPCOMING EVENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Latest Local News */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">📰 Latest Local News</h2>
            <Link to="/news" className="text-xs font-bold text-red-600 hover:underline">
              View All News →
            </Link>
          </div>

          {loadingNews ? (
            <p className="text-sm text-slate-400">Loading latest headlines...</p>
          ) : latestNews.length > 0 ? (
            <div className="space-y-3">
              {latestNews.map((news) => (
                <Link
                  key={news._id}
                  to={`/news/${news._id}`}
                  className="block bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-red-300 transition-all"
                >
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded uppercase">
                    {news.category || "General"}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base mt-1">{news.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{news.description}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No news updates published yet.</p>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">🎉 Upcoming Events</h2>
          <div className="space-y-3">
            {UPCOMING_EVENTS.map((event) => (
              <div
                key={event.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1"
              >
                <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {event.category}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">{event.title}</h3>
                <p className="text-xs text-slate-500">📅 {event.date} • ⏰ {event.time}</p>
                <p className="text-xs text-slate-400">📍 {event.venue}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7. BEAUTIFUL CITY PHOTOS */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">📸 City Photo Gallery</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {GALLERY.map((img, idx) => (
            <div key={idx} className="relative group rounded-2xl overflow-hidden shadow-sm h-48 bg-slate-200">
              <img
                src={img.url}
                alt={img.caption}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <span className="text-xs font-semibold text-white">{img.caption}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}