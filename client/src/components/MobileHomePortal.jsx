import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Mic,
  X,
  Phone,
  Navigation,
  MapPin,
  Map,
  Compass,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check,
  Bell,
} from "lucide-react";
import NotificationCenter from "./NotificationCenter";
import { openGoogleMapsDirections } from "../utils/directions";

// Authoritative verified places for Fazilnagar Mobile Portal
const VERIFIED_CAROUSEL_PLACES = [
  {
    id: "chc-fazilnagar",
    title: "CHC Fazilnagar",
    subtitle: "Hospital Road",
    category: "healthcare",
    categoryLabel: "🏥 Healthcare",
    phone: "05564222102",
    lat: 26.6808,
    lng: 84.0472,
    image: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&auto=format&fit=crop",
    verified: true,
  },
  {
    id: "prashant-sweets",
    title: "Prashant Sweet House",
    subtitle: "Main Market, NH-27 Chowk",
    category: "sweets",
    categoryLabel: "🍬 Sweets & Chaat",
    phone: "09839245678",
    lat: 26.6833,
    lng: 84.0502,
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop",
    verified: true,
  },
  {
    id: "pawanagar-college",
    title: "Pawanagar Mahavir Inter College",
    subtitle: "College Road",
    category: "schools",
    categoryLabel: "🏫 Schools",
    phone: "09450467890",
    lat: 26.6843,
    lng: 84.0454,
    image: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&auto=format&fit=crop",
    verified: true,
  },
  {
    id: "indian-oil-fuel",
    title: "Indian Oil Petrol Pump",
    subtitle: "NH-27 Highway",
    category: "fuel",
    categoryLabel: "⛽ Fuel Stations",
    phone: "1800224344",
    lat: 26.6850,
    lng: 84.0490,
    image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop",
    verified: true,
  },
  {
    id: "maa-yashoda-hosp",
    title: "Maa Yashoda Hospital",
    subtitle: "Garahiya More, NH-28",
    category: "healthcare",
    categoryLabel: "🏥 Healthcare",
    phone: "09450812345",
    lat: 26.6835,
    lng: 84.0458,
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop",
    verified: true,
  },
  {
    id: "hermitage-school",
    title: "The Hermitage School",
    subtitle: "Hospital Road",
    category: "schools",
    categoryLabel: "🏫 Schools",
    phone: "09919523411",
    lat: 26.6804,
    lng: 84.0467,
    image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop",
    verified: true,
  },
  {
    id: "kanha-sweets",
    title: "Kanha Sweets",
    subtitle: "College Road Crossing",
    category: "sweets",
    categoryLabel: "🍬 Sweets & Chaat",
    phone: "09450987654",
    lat: 26.6833,
    lng: 84.0498,
    image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop",
    verified: true,
  },
  {
    id: "hp-fuel-pump",
    title: "Hindustan Petroleum (HP)",
    subtitle: "Pawanagar Bypass",
    category: "fuel",
    categoryLabel: "⛽ Fuel Stations",
    phone: "18002333555",
    lat: 26.6815,
    lng: 84.0430,
    image: "https://images.unsplash.com/photo-1527018607616-0526648e861c?w=800&auto=format&fit=crop",
    verified: true,
  },
];

// Horizontal Filter Pill categories exactly as specified
const CATEGORY_PILLS = [
  { id: "all", label: "All" },
  { id: "healthcare", label: "🏥 Healthcare" },
  { id: "schools", label: "🏫 Schools" },
  { id: "sweets", label: "🍬 Sweets & Chaat" },
  { id: "fuel", label: "⛽ Fuel Stations" },
];

export default function MobileHomePortal() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isListening, setIsListening] = useState(false);
  const [voiceToast, setVoiceToast] = useState("");
  const recognitionRef = useRef(null);

  // Filter carousel places based on selected category & search query
  const filteredPlaces = useMemo(() => {
    let list = VERIFIED_CAROUSEL_PLACES;
    if (selectedCategory !== "all") {
      list = list.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          p.categoryLabel.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedCategory, searchQuery]);

  // Voice Search Handler
  const handleVoiceSearch = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceToast("Voice search not supported in this browser. Please type.");
      setTimeout(() => setVoiceToast(""), 3000);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceToast("Listening... Speak now");
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setVoiceToast(`Search: "${transcript}"`);
        setTimeout(() => setVoiceToast(""), 2500);
      };

      recognition.onerror = (err) => {
        console.warn("Speech recognition error:", err);
        setIsListening(false);
        setVoiceToast("Could not recognize voice. Please try typing.");
        setTimeout(() => setVoiceToast(""), 2500);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition init error:", err);
      setIsListening(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto min-h-screen bg-slate-50 flex flex-col font-sans pb-28 text-slate-800 selection:bg-red-500 selection:text-white">
      {/* ========================================================
          1. TOP APP BAR (Fixed/Sticky)
          - Left: Square rounded logo badge [F] + Title "FAZILNAGAR" + "PIN 274401 • Kushinagar"
          - Right: Notification Bell icon 🔔 with subtle unread dot
          - Clean white background (backdrop-blur-md bg-white/95) + 1px soft bottom border
          ======================================================== */}
      <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-white/95 border-b border-slate-100 px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black text-base flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            F
          </div>
          <div>
            <h1 className="font-extrabold tracking-tight text-slate-900 text-base leading-none font-heading">
              FAZILNAGAR
            </h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide mt-0.5">
              PIN 274401 • Kushinagar
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationCenter lightMode={true} subtleDot={true} />
        </div>
      </header>

      {/* Voice Status Toast */}
      {voiceToast && (
        <div className="px-4 pt-2">
          <div className="py-1 px-3 rounded-lg bg-slate-900 text-white text-[11px] text-center font-medium animate-in fade-in duration-150">
            {voiceToast}
          </div>
        </div>
      )}

      {/* ========================================================
          2. SEARCH INPUT BAR
          - Rounded pill input (rounded-2xl) with soft shadow
          - Search icon 🔍 on left, placeholder: "Search CHC, schools, sweets, directory..."
          - Voice/Mic icon 🎙️ on right side
          ======================================================== */}
      <section className="px-4 pt-3 pb-1" aria-label="Search Fazilnagar">
        <div className="relative flex items-center bg-white rounded-2xl border border-slate-200/80 shadow-xs px-3.5 py-2.5 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100 transition">
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                navigate(`/directory?search=${encodeURIComponent(searchQuery.trim())}`);
              }
            }}
            placeholder="Search CHC, schools, sweets, directory..."
            className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent outline-none font-medium"
            aria-label="Search directory"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-slate-400 hover:text-slate-600 p-0.5 ml-1 transition"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleVoiceSearch}
              className={`p-1 rounded-lg text-slate-400 hover:text-slate-700 active:scale-90 transition ${
                isListening ? "text-red-500 animate-pulse bg-red-50" : ""
              }`}
              aria-label="Voice search"
              title="Speak to search"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {/* ========================================================
          3. 4-COLUMN QUICK SOS & UTILITY ACTION GRID
          - Equal 4-column cards with light pastel backgrounds, rounded-2xl corners, and active tap shrink effect (active:scale-95):
            * Tile 1: 🚨 112 SOS (Red tint: bg-rose-50 text-rose-600 border border-rose-100) -> href="tel:112"
            * Tile 2: 🏥 CHC Hospital (Cyan/Blue tint: bg-sky-50 text-sky-700 border border-sky-100) -> href="tel:05564222102"
            * Tile 3: 👮 Police Chowki (Indigo tint: bg-indigo-50 text-indigo-700 border border-indigo-100) -> href="tel:05564222100"
            * Tile 4: ⚡ Power Utility (1912) (Amber tint: bg-amber-50 text-amber-700 border border-amber-100) -> href="tel:1912"
          ======================================================== */}
      <section className="px-4 py-2.5" aria-label="Quick SOS & Utility Actions">
        <div className="grid grid-cols-4 gap-2">
          {/* Tile 1: 112 SOS */}
          <a
            href="tel:112"
            className="flex flex-col items-center justify-center p-2 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 active:scale-95 transition-all duration-150 touch-manipulation shadow-2xs group"
          >
            <span className="text-xl mb-1 group-active:scale-110 transition-transform select-none">
              🚨
            </span>
            <span className="text-[11px] font-bold text-rose-700 leading-tight">
              112 SOS
            </span>
            <span className="text-[9px] text-rose-500 font-medium leading-none mt-0.5">
              Emergency
            </span>
          </a>

          {/* Tile 2: CHC Hospital */}
          <a
            href="tel:05564222102"
            className="flex flex-col items-center justify-center p-2 rounded-2xl bg-sky-50 text-sky-700 border border-sky-100 active:scale-95 transition-all duration-150 touch-manipulation shadow-2xs group"
          >
            <span className="text-xl mb-1 group-active:scale-110 transition-transform select-none">
              🏥
            </span>
            <span className="text-[11px] font-bold text-sky-800 leading-tight">
              CHC Hosp.
            </span>
            <span className="text-[9px] text-sky-600 font-medium leading-none mt-0.5">
              Hospital
            </span>
          </a>

          {/* Tile 3: Police Chowki */}
          <a
            href="tel:05564222100"
            className="flex flex-col items-center justify-center p-2 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 active:scale-95 transition-all duration-150 touch-manipulation shadow-2xs group"
          >
            <span className="text-xl mb-1 group-active:scale-110 transition-transform select-none">
              👮
            </span>
            <span className="text-[11px] font-bold text-indigo-800 leading-tight">
              Police
            </span>
            <span className="text-[9px] text-indigo-600 font-medium leading-none mt-0.5">
              Chowki
            </span>
          </a>

          {/* Tile 4: Power Utility (1912) */}
          <a
            href="tel:1912"
            className="flex flex-col items-center justify-center p-2 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 active:scale-95 transition-all duration-150 touch-manipulation shadow-2xs group"
          >
            <span className="text-xl mb-1 group-active:scale-110 transition-transform select-none">
              ⚡
            </span>
            <span className="text-[11px] font-bold text-amber-800 leading-tight">
              Power
            </span>
            <span className="text-[9px] text-amber-600 font-medium leading-none mt-0.5">
              1912
            </span>
          </a>
        </div>
      </section>

      {/* ========================================================
          4. LIVE BULLETIN BANNER
          - Dark pill banner (bg-slate-900 text-white rounded-xl py-2 px-3 flex items-center justify-between text-xs)
          - Left badge: Red solid badge ● LIVE
          - Text: "Navratri Mela timings released..." with right arrow "View →"
          ======================================================== */}
      <section className="px-4 py-1" aria-label="Live Bulletin">
        <Link
          to="/news"
          className="bg-slate-900 text-white rounded-xl py-2 px-3 flex items-center justify-between text-xs hover:bg-slate-800 active:scale-[0.98] transition shadow-xs group"
        >
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0 uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              LIVE
            </span>
            <span className="truncate text-slate-200 font-medium">
              Navratri Mela timings released...
            </span>
          </div>
          <span className="text-slate-400 group-hover:text-white font-bold text-[11px] shrink-0 flex items-center gap-0.5 transition-colors">
            <span>View</span>
            <span className="text-xs">→</span>
          </span>
        </Link>
      </section>

      {/* ========================================================
          5. HORIZONTAL CATEGORY FILTER PILLS
          - Horizontal scrollable row (flex gap-2 overflow-x-auto no-scrollbar py-1)
          - Pills: All (Dark active: bg-slate-900 text-white), 🏥 Healthcare, 🏫 Schools, 🍬 Sweets & Chaat, ⛽ Fuel Stations
          ======================================================== */}
      <section className="px-4 pt-3 pb-1" aria-label="Category Filters">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 touch-pan-x">
          {CATEGORY_PILLS.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition active:scale-95 cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ========================================================
          6. HORIZONTAL SNAP CARDS CAROUSEL (VERIFIED PLACES)
          - Horizontal scrolling snap container (overflow-x-auto snap-x snap-mandatory flex gap-3 no-scrollbar)
          - Cards (w-[260px] snap-start shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden):
            * Image thumbnail on top (aspect-video) with rounded corners
            * Title with green verified checkmark CHC Fazilnagar ✔
            * Subtitle: "Hospital Road"
            * Action Buttons (2-col grid): 📞 Call and 📍 Directions with touch-friendly 40px height
            * Include cards for "CHC Fazilnagar" and "Prashant Sweet House"
          ======================================================== */}
      <section className="px-4 py-2" aria-label="Verified Places Carousel">
        <div className="flex items-center justify-between mb-2 px-0.5">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-slate-900">Verified Places</h2>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
              {filteredPlaces.length}
            </span>
          </div>
          <Link
            to="/directory"
            className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-0.5"
          >
            <span>View All (37)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {filteredPlaces.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/80 my-2">
            <p className="text-xs text-slate-500">No verified places found matching this filter.</p>
            <button
              onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
              }}
              className="mt-2 text-xs font-bold text-blue-600 hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto snap-x snap-mandatory flex gap-3 no-scrollbar pb-2 pt-1 touch-pan-x">
            {filteredPlaces.map((place) => (
              <article
                key={place.id}
                className="w-[260px] snap-start shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                {/* Image thumbnail on top (aspect-video) */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                  <img
                    src={place.image}
                    alt={place.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
                    {place.categoryLabel}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {place.title}
                      </h3>
                      <span
                        className="text-emerald-600 text-xs shrink-0 font-bold"
                        title="Verified by Civic Admin"
                        aria-label="Verified"
                      >
                        ✔
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {place.subtitle}
                    </p>
                  </div>

                  {/* Action Buttons (2-col grid, touch-friendly 40px height) */}
                  <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-slate-100">
                    <a
                      href={`tel:${place.phone}`}
                      className="h-10 flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 text-xs font-bold border border-slate-200 transition"
                      aria-label={`Call ${place.title}`}
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-600" />
                      <span>Call</span>
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        openGoogleMapsDirections({
                          name: place.title,
                          lat: place.lat,
                          lng: place.lng,
                          landmark: place.subtitle,
                        })
                      }
                      className="h-10 flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 text-xs font-bold border border-blue-200 transition cursor-pointer"
                      aria-label={`Directions to ${place.title}`}
                    >
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      <span>Directions</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================
          7. INTERACTIVE MAP PREVIEW BANNER
          - Dark gradient card (bg-slate-900 rounded-2xl p-3 flex items-center justify-between text-white)
          - Left: Map icon with text "Explore Town on Map" and sub-text "(20+ verified coordinates)"
          - Right: Pill button "Open Map View →" (bg-white text-slate-900 font-semibold text-xs px-3 py-1.5 rounded-xl)
          ======================================================== */}
      <section className="px-4 py-2" aria-label="Town Map Preview">
        <Link
          to="/directory#town-map-section"
          className="bg-slate-900 rounded-2xl p-3 flex items-center justify-between text-white shadow-md active:scale-[0.99] transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg shrink-0 border border-slate-700">
              🗺️
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                Explore Town on Map
              </h4>
              <p className="text-[11px] text-slate-400">
                (20+ verified coordinates)
              </p>
            </div>
          </div>
          <span className="bg-white text-slate-900 font-semibold text-xs px-3 py-1.5 rounded-xl shrink-0 group-hover:bg-slate-100 transition shadow-xs">
            Open Map View →
          </span>
        </Link>
      </section>

      {/* Civic Community Shortcuts Grid */}
      <section className="px-4 py-2" aria-label="Civic Shortcuts">
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Civic Services
            </h3>
            <span className="text-[10px] text-slate-500 font-medium">Quick Access</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Link
              to="/emergency"
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 active:scale-95 transition flex flex-col items-center"
            >
              <span className="text-lg mb-1">🚑</span>
              <span className="text-[11px] font-bold text-slate-800">Helplines</span>
            </Link>
            <Link
              to="/healthcare"
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 active:scale-95 transition flex flex-col items-center"
            >
              <span className="text-lg mb-1">🩺</span>
              <span className="text-[11px] font-bold text-slate-800">Hospitals</span>
            </Link>
            <Link
              to="/directory"
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 active:scale-95 transition flex flex-col items-center"
            >
              <span className="text-lg mb-1">📍</span>
              <span className="text-[11px] font-bold text-slate-800">All Places</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
