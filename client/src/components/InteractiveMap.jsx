import { useState } from "react";
import { openGoogleMapsDirections } from "../utils/directions";

// 17 Requested Categories
const CATEGORIES = [
  { id: "all", label: "All Places", icon: "🌐" },
  { id: "hospitals", label: "Hospitals", icon: "🏥" },
  { id: "pharmacies", label: "Pharmacies", icon: "💊" },
  { id: "schools", label: "Schools", icon: "🏫" },
  { id: "colleges", label: "Colleges", icon: "🎓" },
  { id: "banks", label: "Banks & ATMs", icon: "🏦" },
  { id: "restaurants", label: "Restaurants", icon: "🍴" },
  { id: "markets", label: "Markets", icon: "🛒" },
  { id: "hotels", label: "Hotels", icon: "🏨" },
  { id: "temples", label: "Temples", icon: "🛕" },
  { id: "mosques", label: "Mosques", icon: "🕌" },
  { id: "religious", label: "Religious Places", icon: "⛪" },
  { id: "gov", label: "Govt Offices", icon: "🏛️" },
  { id: "railway", label: "Railway Stations", icon: "🚉" },
  { id: "bus", label: "Bus Stops", icon: "🚌" },
  { id: "petrol", label: "Petrol Pumps", icon: "⛽" },
  { id: "parking", label: "Parking", icon: "🅿️" },
  { id: "police", label: "Police Stations", icon: "🚓" },
];

// Sample Locations covering all categories in Fazilnagar Block
const LOCATIONS = [
  {
    id: 1,
    category: "hospitals",
    name: "Community Health Centre (CHC) Fazilnagar",
    address: "NH-27 Highway, Fazilnagar, UP 274401",
    phone: "+91 5564 222100",
    hours: "Open 24 Hours",
    rating: 4.6,
    mapQuery: "Community+Health+Centre+Fazilnagar",
    photos: [
      "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800&auto=format&fit=crop",
    ],
    reviews: [
      { user: "Ramesh Singh", rating: 5, comment: "Quick emergency assistance and clean facilities." },
      { user: "Anita Verma", rating: 4, comment: "24/7 doctors available for urgent treatment." },
    ],
  },
  {
    id: 2,
    category: "pharmacies",
    name: "Sanjivani Medical Store",
    address: "Main Market Chauraha, Fazilnagar",
    phone: "+91 98380 12345",
    hours: "08:00 AM - 10:00 PM",
    rating: 4.8,
    mapQuery: "Sanjivani+Medical+Fazilnagar",
    photos: [
      "https://images.unsplash.com/photo-1586015555751-63c26786a512?q=80&w=800&auto=format&fit=crop",
    ],
    reviews: [
      { user: "Vikas Kumar", rating: 5, comment: "All prescribed medicines were readily available." },
    ],
  },
  {
    id: 3,
    category: "schools",
    name: "St. Joseph's School",
    address: "Tamkuhi Road, Fazilnagar, UP",
    phone: "+91 5564 223456",
    hours: "07:30 AM - 02:00 PM (Mon-Sat)",
    rating: 4.5,
    mapQuery: "St+Joseph+School+Fazilnagar",
    photos: [
      "https://images.unsplash.com/photo-1580582932707-520aed937b7b?q=80&w=800&auto=format&fit=crop",
    ],
    reviews: [
      { user: "Priya Sharma", rating: 5, comment: "Excellent academic record and great sports grounds." },
    ],
  },
  {
    id: 4,
    category: "colleges",
    name: "Sarvodaya Degree College",
    address: "College Road, Fazilnagar",
    phone: "+91 5564 224567",
    hours: "09:00 AM - 04:00 PM",
    rating: 4.4,
    mapQuery: "Sarvodaya+Inter+College+Fazilnagar",
    photos: [
      "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=800&auto=format&fit=crop",
    ],
    reviews: [
      { user: "Suraj K.", rating: 4, comment: "Good faculty and well-stocked library." },
    ],
  },
  {
    id: 5,
    category: "banks",
    name: "State Bank of India (SBI) & ATM",
    address: "NH-27 Near Bus Stand, Fazilnagar",
    phone: "1800 1234",
    hours: "Branch: 10 AM - 4 PM | ATM: 24/7",
    rating: 4.2,
    mapQuery: "State+Bank+of+India+Fazilnagar",
    photos: [
      "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?q=80&w=800&auto=format&fit=crop",
    ],
    reviews: [
      { user: "Amit Patel", rating: 4, comment: "ATM is usually well-cash stocked." },
    ],
  },
  {
    id: 6,
    category: "restaurants",
    name: "Pawa Highway Dhaba & Family Restaurant",
    address: "NH-27 Highway Bypass, Fazilnagar",
    phone: "+91 94152 78901",
    hours: "07:00 AM - 11:00 PM",
    rating: 4.7,
    mapQuery: "Highway+Dhaba+Fazilnagar",
    photos: [
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=800&auto=format&fit=crop",
    ],
    reviews: [
      { user: "Rahul M.", rating: 5, comment: "Best Paneer Butter Masala and hot Tandoori Rotis!" },
    ],
  },
  {
    id: 7,
    category: "markets",
    name: "Fazilnagar Main Bazaar",
    address: "Central Market, Fazilnagar",
    phone: "N/A (Public Market)",
    hours: "09:00 AM - 09:00 PM",
    rating: 4.5,
    mapQuery: "Fazilnagar+Market",
    photos: [
      "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=800&auto=format&fit=crop",
    ],
    reviews: [
      { user: "Sangeeta D.", rating: 4, comment: "Great place for clothes, sweets, and daily vegetables." },
    ],
  },
  {
    id: 8,
    category: "hotels",
    name: "Hotel Nirvana & Banquets",
    address: "Station Road, Fazilnagar",
    phone: "+91 98110 54321",
    hours: "24/7 Check-in",
    rating: 4.3,
    mapQuery: "Hotel+Nirvana+Fazilnagar",
    photos: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=800&auto=format&fit=crop",
    ],
    reviews: [
      { user: "Deepak S.", rating: 4, comment: "Clean AC rooms and good room service." },
    ],
  },
  {
    id: 9,
    category: "temples",
    name: "Pawa Nagar Digambar & Swetambar Jain Temple",
    address: "Jain Mandir Marg, Fazilnagar",
    phone: "+91 5564 225678",
    hours: "05:00 AM - 08:30 PM",
    rating: 4.9,
    mapQuery: "Pawa+Nagar+Jain+Temple+Fazilnagar",
    photos: [
      "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=800&auto=format&fit=crop",
    ],
    reviews: [
      { user: "Manoj Jain", rating: 5, comment: "Extremely peaceful place where Mahavira attained Nirvana." },
    ],
  },
  {
    id: 10,
    category: "mosques",
    name: "Jama Masjid Fazilnagar",
    address: "Kasba Ward, Fazilnagar",
    phone: "N/A",
    hours: "Open for all 5 Daily Prayers",
    rating: 4.8,
    mapQuery: "Jama+Masjid+Fazilnagar",
    photos: [
      "https://images.unsplash.com/photo-1542810634-71277d95dcbb?q=80&w=800&auto=format&fit=crop",
    ],
    reviews: [
      { user: "Tariq Ali", rating: 5, comment: "Spacious and peaceful place for prayer." },
    ],
  },
  {
    id: 11,
    category: "religious",
    name: "Kakodha Ghat Sacred Shrine",
    address: "Kukutta River Bank, Fazilnagar Block",
    phone: "N/A",
    hours: "Open 24 Hours",
    rating: 4.6,
    mapQuery: "Kakodha+Ghat+Kushinagar",
    photos: [
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop",
    ],
    reviews: [
      { user: "Sunil Pandey", rating: 5, comment: "Historic river site on the ancient pilgrimage trail." },
    ],
  },
  {
    id: 12,
    category: "gov",
    name: "Block Development Office (BDO)",
    address: "Tehsildar Marg, Fazilnagar",
    phone: "+91 5564 221122",
    hours: "10:00 AM - 05:00 PM (Sun Closed)",
    rating: 4.1,
    mapQuery: "Block+Development+Office+Fazilnagar",
    photos: [
      "https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=800&auto=format&fit=crop",
    ],
    reviews: [
      { user: "Neeraj K.", rating: 4, comment: "Helpful public facilitation desk." },
    ],
  },
  {
    id: 13,
    category: "railway",
    name: "Kasia / Tamkuhi Road Railway Station (Nearest)",
    address: "Nearest Broad Gauge Station (15 km)",
    phone: "139 (IRCTC)",
    hours: "24 Hours Operational",
    rating: 4.0,
    mapQuery: "Tamkuhi+Road+Railway+Station",
    photos: [
      "https://images.unsplash.com/photo-1474487548417-781cb71495f3?q=80&w=800&auto=format&fit=crop",
    ],
    reviews: [
      { user: "Alok Gupta", rating: 4, comment: "Regular trains connecting to Gorakhpur and Bihar." },
    ],
  },
  {
    id: 14,
    category: "bus",
    name: "Fazilnagar Main Bus Depot",
    address: "NH-27 Chauraha, Fazilnagar",
    phone: "+91 5564 220099",
    hours: "24 Hours Bus Service",
    rating: 4.3,
    mapQuery: "Fazilnagar+Bus+Stand",
    photos: [
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=800&auto=format&fit=crop",
    ],
    reviews: [
      { user: "Rohan V.", rating: 4, comment: "Frequent UPSRTC buses for Gorakhpur, Lucknow, and Gopalganj." },
    ],
  },
  {
    id: 15,
    category: "petrol",
    name: "Indian Oil Petrol Pump",
    address: "NH-27 East Entry, Fazilnagar",
    phone: "+91 98390 99887",
    hours: "06:00 AM - 11:00 PM",
    rating: 4.6,
    mapQuery: "Indian+Oil+Petrol+Pump+Fazilnagar",
    photos: [
      "https://images.unsplash.com/photo-1527018601619-a508a2be00d6?q=80&w=800&auto=format&fit=crop",
    ],
    reviews: [
      { user: "Gaurav S.", rating: 5, comment: "Quick service with digital payment and free air filling." },
    ],
  },
  {
    id: 16,
    category: "parking",
    name: "Municipal Town Parking Stand",
    address: "Near Market Gate, Fazilnagar",
    phone: "N/A",
    hours: "08:00 AM - 09:00 PM",
    rating: 4.2,
    mapQuery: "Fazilnagar+Parking",
    photos: [
      "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=800&auto=format&fit=crop",
    ],
    reviews: [
      { user: "Shyam L.", rating: 4, comment: "Safe parking space for cars and bikes near the market." },
    ],
  },
  {
    id: 17,
    category: "police",
    name: "Thana Fazilnagar Police Station",
    address: "NH-27 Main Gate, Fazilnagar, UP 274401",
    phone: "112 / +91 5564 222111",
    hours: "Open 24 Hours",
    rating: 4.5,
    mapQuery: "Police+Station+Fazilnagar",
    photos: [
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=800&auto=format&fit=crop",
    ],
    reviews: [
      { user: "Dharmendra Y.", rating: 5, comment: "Active patrolling and fast helpline response." },
    ],
  },
];

export default function InteractiveMap() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter Locations by category and search term
  const filteredLocations = LOCATIONS.filter((item) => {
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            City Directory & Navigation
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold mt-2">
            🗺️ Fazilnagar Interactive Map
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Find essential services, religious heritage, transportation, and local spots.
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full md:w-80">
          <input
            type="text"
            placeholder="Search by name or place..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 text-white placeholder-slate-400 px-4 py-2.5 rounded-2xl text-sm border border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* 17 CATEGORIES FILTER SCROLLER */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
          Select Category ({CATEGORIES.length - 1} Categories)
        </h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? "bg-red-700 text-white shadow-md scale-105"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN MAP & LOCATION LIST CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: LIST OF FILTERED LOCATIONS */}
        <div className="lg:col-span-5 space-y-3 max-h-[600px] overflow-y-auto pr-1">
          <p className="text-xs font-semibold text-slate-500 px-1">
            Showing {filteredLocations.length} results
          </p>

          {filteredLocations.length > 0 ? (
            filteredLocations.map((loc) => (
              <div
                key={loc.id}
                onClick={() => setSelectedLocation(loc)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3.5 ${
                  selectedLocation?.id === loc.id
                    ? "bg-red-50/80 border-red-500 shadow-sm ring-1 ring-red-400"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl flex-shrink-0 border border-slate-200">
                  {CATEGORIES.find((c) => c.id === loc.category)?.icon || "📍"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-red-600 bg-red-100 px-2 py-0.5 rounded">
                      {loc.category}
                    </span>
                    <span className="text-xs font-bold text-amber-600">
                      ★ {loc.rating}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm truncate mt-1">
                    {loc.name}
                  </h3>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    📍 {loc.address}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">
                    🕒 {loc.hours}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-500 text-sm">
              No matching locations found in this category.
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DYNAMIC MAP & DETAILED ITEM CARD */}
        <div className="lg:col-span-7 space-y-6">
          {/* EMBEDDED DYNAMIC GOOGLE MAP */}
          <div className="bg-white p-2 rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-72">
            <iframe
              title={selectedLocation ? selectedLocation.name : "Fazilnagar Map"}
              width="100%"
              height="100%"
              className="rounded-2xl border-0"
              loading="lazy"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(
                selectedLocation ? selectedLocation.mapQuery : "Fazilnagar Kushinagar"
              )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
            />
          </div>

          {/* SELECTED LOCATION DETAILED VIEW */}
          {selectedLocation && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              {/* Title & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase text-red-700 bg-red-50 px-2.5 py-1 rounded-md">
                      {selectedLocation.category}
                    </span>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md">
                      ★ {selectedLocation.rating} Rating
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-2">
                    {selectedLocation.name}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections(selectedLocation)}
                  className="inline-flex items-center justify-center bg-red-700 hover:bg-red-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  🧭 Get Directions
                </button>
              </div>

              {/* Photo Gallery */}
              {selectedLocation.photos?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">
                    📸 Photos
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedLocation.photos.map((photo, i) => (
                      <img
                        key={i}
                        src={photo}
                        alt={selectedLocation.name}
                        className="w-full h-36 object-cover rounded-2xl border border-slate-100"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Info Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <p className="font-bold text-slate-400 uppercase">📍 Address</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedLocation.address}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase">📞 Phone</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedLocation.phone}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase">🕒 Hours</p>
                  <p className="font-semibold text-emerald-700 mt-0.5">{selectedLocation.hours}</p>
                </div>
              </div>

              {/* User Reviews */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">
                  ⭐ User Reviews
                </h4>
                <div className="space-y-2">
                  {selectedLocation.reviews.map((rev, i) => (
                    <div
                      key={i}
                      className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{rev.user}</span>
                        <span className="text-amber-600 font-bold">{"★".repeat(rev.rating)}</span>
                      </div>
                      <p className="text-slate-600">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}