import { useState, useEffect } from "react";
import { usePageSEO } from "../utils/seo";
import { getHeritageSites } from "../services/cmsService";
import {
  Compass,
  MapPin,
  Clock,
  Sparkles,
  Navigation,
  Image as ImageIcon,
} from "lucide-react";

const FALLBACK_ATTRACTIONS = [
  {
    id: 1,
    name: "Pawapuri Jain Tirth & Mahavira Nirvana Bhoomi",
    nameHindi: "पावापुरी जैन तीर्थ (फाजिलनगर)",
    category: "Jain Heritage",
    distanceFromFazilnagarCenter: "0 km / Within Fazilnagar",
    historicalSignificance:
      "Ancient Pawanagar is revered as the sacred location of Bhagwan Mahavira's nirvana (527 BCE). Features ancient Manasthambha and serene shrines.",
    narrative:
      "A premier national Jain pilgrimage centre located right in Fazilnagar. Pilgrims from all over India visit to offer prayers and participate in annual Nirvana Mahotsav.",
    visitingHours: "06:00 AM – 07:00 PM",
    entryFee: "Free Admission",
    primaryImage:
      "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 2,
    name: "Sathiaon Archaeological Mound & Chetiya",
    nameHindi: "सठियाओं पुरातात्विक टीला",
    category: "Historical Monument",
    distanceFromFazilnagarCenter: "2 km from main market",
    historicalSignificance:
      "Ancient fortified mound identified with classical Malla Janapada settlements, ancient brick structures, and stupa relics.",
    narrative:
      "Protected historical mound holding great archaeological interest for scholars studying Buddhist and Jain connections across eastern Uttar Pradesh.",
    visitingHours: "Open Daily 06:00 AM – 06:00 PM",
    entryFee: "Free Admission",
    primaryImage:
      "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 3,
    name: "Kushinagar Twin Axis: Mahaparinirvana Temple",
    nameHindi: "महापरिनिर्वाण मंदिर एवं स्तूप (कुशीनगर)",
    category: "Buddhist Heritage",
    distanceFromFazilnagarCenter: "18 km via NH-27 Corridor",
    historicalSignificance:
      "The sacred spot of Lord Buddha's Mahaparinirvana. Houses the monumental 6.1m monolithic reclining Buddha statue of 5th-century Gupta era.",
    narrative:
      "Fazilnagar and Kushinagar form a sacred twin spiritual circuit. Travelers journeying to Kushinagar historically traversed this very Pawanagar highway route.",
    visitingHours: "06:00 AM – 06:30 PM",
    entryFee: "Free Admission",
    primaryImage:
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
  },
];

const HOTELS_RESTAURANTS = [
  {
    name: "Hotel Pawa Residency",
    type: "Hotel / Stay",
    price: "₹1,500 - ₹3,000 / Night",
    rating: "4.5 ★",
    contact: "+91 94152 11223",
  },
  {
    name: "Highway Treat Family Restaurant",
    type: "Restaurant",
    price: "₹300 for two",
    rating: "4.3 ★",
    contact: "+91 98380 44556",
  },
];

export default function Tourism() {
  usePageSEO({
    title: "Fazilnagar & Kushinagar Sacred Twin Heritage | Pawapuri & Tourism Guide",
    description: "Explore Fazilnagar tourism, ancient Pawapuri Jain Tirth, Sathiaon archaeological mound, Buddhist twin heritage axis, and local hospitality in Kushinagar district.",
    canonicalPath: "/tourism",
  });

  const [activeTab, setActiveTab] = useState("places");
  const [heritageSites, setHeritageSites] = useState(FALLBACK_ATTRACTIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHeritageSites()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setHeritageSites(data);
        }
      })
      .catch((err) => {
        console.warn("Using fallback heritage sites:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#18232E] to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-2 border border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-600/90 text-white text-xs font-bold uppercase tracking-wider">
          <Compass className="w-3.5 h-3.5" />
          <span>Sacred Twin Heritage Circuit</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold font-heading text-white">
          Fazilnagar Tourism &amp; Ancient Pawanagar Heritage
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
          Discover the sacred convergence of ancient Pawapuri Dham, historical Sathiaon mound, and the world-renowned Kushinagar Mahaparinirvana Buddhist corridor.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-200/80 p-1.5 rounded-2xl w-full max-w-md overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("places")}
          className={`flex-1 min-w-[100px] py-2 px-2.5 text-xs font-bold rounded-xl transition cursor-pointer min-h-[44px] flex items-center justify-center text-center whitespace-nowrap ${
            activeTab === "places"
              ? "bg-[#0D5E49] text-white shadow-xs font-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          🏰 Sites ({heritageSites.length})
        </button>
        <button
          onClick={() => setActiveTab("itinerary")}
          className={`flex-1 min-w-[100px] py-2 px-2.5 text-xs font-bold rounded-xl transition cursor-pointer min-h-[44px] flex items-center justify-center text-center whitespace-nowrap ${
            activeTab === "itinerary"
              ? "bg-[#0D5E49] text-white shadow-xs font-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          🧭 1-Day Circuit
        </button>
        <button
          onClick={() => setActiveTab("stays")}
          className={`flex-1 min-w-[100px] py-2 px-2.5 text-xs font-bold rounded-xl transition cursor-pointer min-h-[44px] flex items-center justify-center text-center whitespace-nowrap ${
            activeTab === "stays"
              ? "bg-[#0D5E49] text-white shadow-xs font-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          🛌 Hotels & Dining
        </button>
      </div>

      {activeTab === "places" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {heritageSites.map((item, idx) => (
            <div
              key={item._id || item.id || idx}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div>
                <div className="relative h-56 bg-slate-100 overflow-hidden">
                  {item.primaryImage ? (
                    <img
                      src={item.primaryImage}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                    <span className="px-2.5 py-1 rounded-lg bg-black/70 text-white text-[10px] font-bold backdrop-blur-xs">
                      {item.category || "Heritage Site"}
                    </span>
                    {item.isTwinHeritageHighlight && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-bold backdrop-blur-xs flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Twin Axis
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-[#18232E] leading-snug">
                      {item.name}
                    </h3>
                    {item.nameHindi && (
                      <p className="text-xs text-emerald-800 font-bold mt-0.5">{item.nameHindi}</p>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.historicalSignificance}
                  </p>

                  {item.narrative && (
                    <p className="text-xs text-slate-500 leading-relaxed italic border-l-2 border-emerald-600 pl-3">
                      {item.narrative}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-3 border-t border-slate-100 font-medium">
                    <span className="flex items-center gap-1 text-slate-700 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      {item.distanceFromFazilnagarCenter || "Within town area"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {item.visitingHours || "06:00 AM – 07:00 PM"}
                    </span>
                    <span className="text-emerald-700 font-bold">
                      🎟️ {item.entryFee || "Free Entry"}
                    </span>
                  </div>
                </div>
              </div>

              {item.latitude && item.longitude && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-[#0D5E49] text-white text-xs font-bold transition shadow-xs"
                  >
                    <Navigation className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Get Directions on Map</span>
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === "itinerary" && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-6">
          <div>
            <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-200">
              Curated Pilgrimage Trail
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-2">
              🧭 Suggested 1-Day Fazilnagar &amp; Kushinagar Pilgrimage Circuit
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Connect ancient Mahavira nirvana bhoomi with Buddha Mahaparinirvana corridor in a single day.
            </p>
          </div>

          <div className="space-y-4 border-l-2 border-emerald-700 pl-4 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-emerald-700">🌅 Morning (07:30 AM – 10:30 AM)</span>
              <p className="text-slate-800 font-bold text-sm">Pawapuri Jain Tirth &amp; Manasthambha (Fazilnagar)</p>
              <p className="text-slate-600 leading-relaxed">
                Begin your journey with morning prayers at ancient Pawapuri temple complex, peaceful dharamshala grounds, and archaeological markers of ancient Pawanagar.
              </p>
            </div>

            <div className="space-y-1 pt-2">
              <span className="font-bold text-amber-700">☀️ Mid-Morning (11:00 AM – 12:30 PM)</span>
              <p className="text-slate-800 font-bold text-sm">Sathiaon Archaeological Mound</p>
              <p className="text-slate-600 leading-relaxed">
                Short 5-minute drive to the Sathiaon archaeological mounds. Witness brick antiquities and the tranquil rural landscape of the ancient Malla Republic.
              </p>
            </div>

            <div className="space-y-1 pt-2">
              <span className="font-bold text-blue-700">🍛 Afternoon (01:00 PM – 02:30 PM)</span>
              <p className="text-slate-800 font-bold text-sm">Traditional Lunch in Fazilnagar Bazaar</p>
              <p className="text-slate-600 leading-relaxed">
                Enjoy authentic Poorvanchali thali, sweets at Mahavir Peda Bhandar, and refresh before taking the NH-27 highway corridor.
              </p>
            </div>

            <div className="space-y-1 pt-2">
              <span className="font-bold text-purple-700">🌇 Afternoon / Sunset (03:30 PM – 06:30 PM)</span>
              <p className="text-slate-800 font-bold text-sm">Kushinagar Mahaparinirvana Temple &amp; Ramabhar Stupa</p>
              <p className="text-slate-600 leading-relaxed">
                Conclude the twin circuit at Kushinagar (18 km west). Meditate at the reclining Buddha shrine, circle the monumental Ramabhar Stupa, and explore Wat Thai monastery.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "stays" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HOTELS_RESTAURANTS.map((stay, idx) => (
            <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">
                  {stay.type}
                </span>
                <span className="text-xs font-bold text-slate-700">⭐ {stay.rating}</span>
              </div>
              <h3 className="font-bold text-slate-900">{stay.name}</h3>
              <p className="text-xs text-slate-600">Cost: {stay.price}</p>
              <a
                href={`tel:${stay.contact}`}
                className="block text-center text-xs font-bold bg-slate-900 hover:bg-[#0D5E49] text-white py-2.5 rounded-xl mt-2 transition"
              >
                📞 Call ({stay.contact})
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}