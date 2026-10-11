import { useState } from "react";

const ATTRACTIONS = [
  {
    id: 1,
    name: "Pawa Nagar Buddha Stupa & Heritage Site",
    type: "Historical & Religious",
    photoSpot: "⭐⭐⭐⭐⭐ Top Photo Spot",
    desc: "Sacred historical site representing Mahaparinirvana traditions, surrounded by quiet gardens and ancient ruins.",
    timing: "06:00 AM - 06:30 PM",
    entry: "Free Entry",
  },
  {
    id: 2,
    name: "Fazilnagar Sacred Lotus Pond",
    type: "Hidden Places",
    photoSpot: "⭐⭐⭐⭐ Great Sunset Spot",
    desc: "A serene body of water on the city periphery popular for morning bird watching and peaceful evening walks.",
    timing: "Open 24/7",
    entry: "Free",
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
  const [activeTab, setActiveTab] = useState("places");

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-2">
        <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          City Tourism Desk
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold">🏨 Tourism & Heritage</h1>
        <p className="text-slate-300 text-sm">
          Discover historic landmarks, spiritual sites, hidden photography spots, and curated city itineraries.
        </p>
      </div>

      <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-md">
        <button
          onClick={() => setActiveTab("places")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "places" ? "bg-red-700 text-white shadow" : "text-slate-600"
          }`}
        >
          🏰 Places to Visit
        </button>
        <button
          onClick={() => setActiveTab("itinerary")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "itinerary" ? "bg-red-700 text-white shadow" : "text-slate-600"
          }`}
        >
          🧭 1-Day Tour
        </button>
        <button
          onClick={() => setActiveTab("stays")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "stays" ? "bg-red-700 text-white shadow" : "text-slate-600"
          }`}
        >
          🛌 Hotels & Dining
        </button>
      </div>

      {activeTab === "places" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ATTRACTIONS.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-3xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase bg-red-50 text-red-700 px-2.5 py-0.5 rounded">
                  {item.type}
                </span>
                <span className="text-xs font-semibold text-amber-600">{item.photoSpot}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{item.name}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span>🕒 {item.timing}</span>
                <span>🎟️ {item.entry}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "itinerary" && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">🧭 Suggested 1-Day City Tour</h2>
          <div className="space-y-3 border-l-2 border-red-700 pl-4 text-xs space-y-4">
            <div>
              <span className="font-bold text-red-700">🌅 Morning (08:00 AM)</span>
              <p className="text-slate-700 font-semibold mt-0.5">Visit Pawa Nagar Stupa & Gardens</p>
              <p className="text-slate-500">Explore historical monuments and enjoy peaceful morning walks.</p>
            </div>
            <div>
              <span className="font-bold text-red-700">🍛 Midday / Lunch (01:00 PM)</span>
              <p className="text-slate-700 font-semibold mt-0.5">Local Thali at Main Market Highway Eatery</p>
              <p className="text-slate-500">Sample authentic eastern UP vegetarian thali and lassi.</p>
            </div>
            <div>
              <span className="font-bold text-red-700">🌇 Sunset & Evening (05:00 PM)</span>
              <p className="text-slate-700 font-semibold mt-0.5">Pond Sunset & Main Bazaar Shopping</p>
              <p className="text-slate-500">Capture photos at the Lotus Pond and shop local handicrafts.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "stays" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HOTELS_RESTAURANTS.map((stay, idx) => (
            <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">{stay.type}</span>
                <span className="text-xs font-bold text-slate-700">⭐ {stay.rating}</span>
              </div>
              <h3 className="font-bold text-slate-900">{stay.name}</h3>
              <p className="text-xs text-slate-600">Cost: {stay.price}</p>
              <a href={`tel:${stay.contact}`} className="block text-center text-xs font-bold bg-slate-900 text-white py-2 rounded-xl mt-2">
                📞 Call ({stay.contact})
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}