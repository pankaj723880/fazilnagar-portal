import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { usePageSEO } from "../utils/seo";
import { getHeritageSites, DEFAULT_HERITAGE_SITES } from "../services/cmsService";
import { openGoogleMapsDirections } from "../utils/directions";
import seedPlaces from "../data/places.json";
import {
  BookOpen,
  Landmark,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  HeartPulse,
  Compass,
  Building2,
  Bus,
} from "lucide-react";

export default function About() {
  usePageSEO({
    title: "About Fazilnagar & Ancient Pawanagar | History, Heritage & Geography",
    description: "Learn about Fazilnagar (ancient Pawanagar), its 2,600-year history in the Malla Mahajanapada, connection to Kushinagar, geography, culture, and civic community.",
    canonicalPath: "/about",
  });
  const [activeTab, setActiveTab] = useState("fazilnagar"); // "fazilnagar" | "kushinagar" | "connection"
  const [heritageSites, setHeritageSites] = useState(DEFAULT_HERITAGE_SITES);

  const loadSites = () => {
    getHeritageSites(true).then((sites) => {
      if (Array.isArray(sites) && sites.length > 0) {
        setHeritageSites(sites);
      }
    });
  };

  useEffect(() => {
    loadSites();

    const handleUpdate = () => loadSites();
    window.addEventListener("cms-cache-cleared", handleUpdate);
    const handleStorage = (e) => {
      if (e.key === "fazilnagar_cms_cache_bust") loadSites();
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("cms-cache-cleared", handleUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const fazilnagarCandidates = (heritageSites || []).filter((s) => {
    if (s.isPublished === false) return false;
    if (s.heritageZone === "fazilnagar" || s.heritageZone === "both") return true;
    if (s.heritageZone === "kushinagar") return false;
    const name = (s.name || "").toLowerCase();
    const cat = s.category || "";
    const dist = (s.distanceFromFazilnagarCenter || "").toLowerCase();
    if (cat === "Buddhist Heritage") return false;
    if (name.includes("kushinagar") || dist.includes("18 km")) return false;
    return true;
  });
  const fazilnagarSites = fazilnagarCandidates.length > 0
    ? fazilnagarCandidates
    : DEFAULT_HERITAGE_SITES.filter((s) => s.heritageZone === "fazilnagar");

  const kushinagarCandidates = (heritageSites || []).filter((s) => {
    if (s.isPublished === false) return false;
    if (s.heritageZone === "kushinagar" || s.heritageZone === "both") return true;
    if (s.heritageZone === "fazilnagar") return false;
    const name = (s.name || "").toLowerCase();
    const cat = s.category || "";
    const dist = (s.distanceFromFazilnagarCenter || "").toLowerCase();
    return cat === "Buddhist Heritage" || name.includes("kushinagar") || dist.includes("18 km");
  });
  const kushinagarSites = kushinagarCandidates.length > 0
    ? kushinagarCandidates
    : DEFAULT_HERITAGE_SITES.filter((s) => s.heritageZone === "kushinagar");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-12 space-y-12 sm:space-y-16 lg:space-y-20 pb-32 font-sans">
      {/* Unofficial Community-Operated Declaration Banner */}
      <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-300/60 dark:border-amber-900/40 rounded-3xl p-6 sm:p-7 text-amber-950 dark:text-amber-200 text-xs shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-2">
        <div className="flex items-center gap-2 font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider text-[11px]">
          <span className="text-base">📢</span>
          <span>Unofficial, Community-Operated Civic Portal Notice</span>
        </div>
        <p className="leading-relaxed text-amber-900/90 dark:text-amber-200/90">
          This portal is an independent civic initiative operated by local volunteers and citizens of Fazilnagar (PIN 274401). 
          <strong> It is NOT run, authorized, or maintained by Nagar Panchayat Fazilnagar or any government department.</strong> 
          All information is curated for community welfare and peer-reviewed by local residents.
        </p>
      </div>

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#18232E] via-slate-900 to-black text-white p-8 sm:p-12 lg:p-16 rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] relative overflow-hidden border border-slate-800/80">
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#B8323C] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Antiquity, Culture & Heritage</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-heading leading-tight">
            Fazilnagar & Kushinagar: 2,600 Years of Sacred Heritage
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            The ancient sovereign capitals of the democratic Malla Mahajanapada — the sacred ground where Lord Mahavira
            attained Nirvana and Gautam Buddha passed into Mahaparinirvana along the tranquil waters of the Kukuttha and Hiranyavati.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="#heritage-showcase"
              className="bg-[#B8323C] hover:bg-[#991B1B] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              <span>Explore History & Monuments</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              to="/directory"
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition border border-white/20"
            >
              View Local Directory ({seedPlaces?.length || 19} Places)
            </Link>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#B8323C]/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Interactive Tabs */}
      <div id="heritage-showcase" className="scroll-mt-24 space-y-8">
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center justify-center gap-2 p-1.5 bg-[#F8FAFC] dark:bg-[#131823] rounded-2xl border border-slate-200/60 dark:border-white/8 max-w-xl mx-auto shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("fazilnagar")}
            className={`w-full sm:w-auto sm:flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "fazilnagar"
                ? "bg-[#18232E] text-white shadow-md font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <span>🏛️ Fazilnagar (Pawanagar)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("kushinagar")}
            className={`w-full sm:w-auto sm:flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "kushinagar"
                ? "bg-[#18232E] text-white shadow-md font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <span>☸️ Kushinagar (Mahaparinirvana)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("connection")}
            className={`w-full sm:w-auto sm:flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "connection"
                ? "bg-[#18232E] text-white shadow-md font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <span>✨ The Twin Sacred Bond</span>
          </button>
        </div>

        {/* SECTION 1: FAZILNAGAR */}
        {activeTab === "fazilnagar" && (
          <div className="space-y-8">
            {/* Dynamic Heritage Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fazilnagarSites.map((site) => (
                <div
                  key={site._id || site.slug || site.name}
                  className="group relative rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-slate-900 aspect-16/10 flex flex-col justify-end"
                >
                  <img
                    src={site.primaryImage || "/images/fazilnagar_pawanagar.webp"}
                    alt={site.name}
                    width="800"
                    height="500"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="relative z-10 bg-gradient-to-t from-black/90 via-black/35 to-transparent p-6 flex flex-col justify-end space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-950/85 border border-amber-600/50 px-2.5 py-0.5 rounded-full w-fit">
                        {site.category || "Jain Heritage"}
                      </span>
                      {site.distanceFromFazilnagarCenter && (
                        <span className="text-[10px] font-semibold text-slate-300 bg-black/50 px-2 py-0.5 rounded-full border border-white/20">
                          📍 {site.distanceFromFazilnagarCenter}
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-bold text-lg sm:text-xl">
                      {site.name}
                    </h3>
                    {site.nameHindi && (
                      <p className="text-amber-200/90 text-xs font-hindi">
                        {site.nameHindi}
                      </p>
                    )}
                    <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed">
                      {site.historicalSignificance || site.narrative}
                    </p>
                    <div className="pt-2 flex items-center justify-between text-xs text-slate-300 border-t border-white/20 mt-1">
                      <span className="truncate max-w-[200px]">
                        🕒 {site.visitingHours || "06:00 AM – 07:00 PM"}
                      </span>
                      <button
                        type="button"
                        onClick={() => openGoogleMapsDirections({
                          name: site.name,
                          lat: site.latitude || 26.6827,
                          lng: site.longitude || 84.0498,
                          landmark: site.locationAddress || "Fazilnagar",
                        })}
                        className="font-bold text-amber-300 hover:text-white underline cursor-pointer shrink-0 ml-2"
                      >
                        Directions →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Deep History Narrative */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8323C] uppercase tracking-wider">
                  <Landmark className="w-4 h-4" />
                  <span>The Legacy of Ancient Pawa</span>
                </div>
                <h2 className="text-2xl font-bold text-[#18232E] font-heading">
                  Ancient Pawa Nagar: Capital of the Mallas & Birthplace of Deepavali Lore
                </h2>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
                  <p>
                    <strong>Fazilnagar</strong> is historically recognized as the ancient city of <strong>Pawa (Pawanagar)</strong>.
                    In the 6th century BCE, the Mallas established one of ancient India’s earliest democratic republics (the Malla Gana-Rajya).
                    Pawa served as the southern sovereign capital with its own independent assembly and chieftaincy under King Hastipala.
                  </p>
                  <p>
                    <strong>Lord Mahavira’s Nirvana (527 BCE):</strong> Canonical Jain texts record that the 24th Tirthankara,
                    Bhagwan Mahavira, spent his final <em>chaturmas</em> (rain retreat) in Pawa. Here, he delivered his last 55 lectures
                    (the revered <em>Uttaradhyayana Sutra</em>) expounding liberation, ahimsa, and self-conquest. On the dark night of
                    Kartik Krishna Amavasya, he attained Nirvana. To symbolize that the spiritual light of knowledge would never fade,
                    the confederate kings and townsfolk lit rows of lamps—a sacred custom that became the festival of <strong>Deepavali</strong>.
                  </p>
                  <p>
                    <strong>Gautam Buddha’s Journey:</strong> In the Buddhist text <em>Maha-parinibbana Sutta</em>, Lord Buddha stayed
                    at the mango grove of Cunda the metalsmith in Pawa. After accepting his final meal, he crossed the Kukuttha river
                    (modern Kakodha) before arriving at Kushinagar to attain Parinirvana.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-[#F5F7F8] p-3 rounded-xl border border-slate-200">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Antiquity</span>
                    <span className="text-xs font-extrabold text-[#18232E]">2,600+ Years</span>
                  </div>
                  <div className="bg-[#F5F7F8] p-3 rounded-xl border border-slate-200">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Heritage State</span>
                    <span className="text-xs font-extrabold text-[#18232E]">Uttar Pradesh</span>
                  </div>
                  <div className="bg-[#F5F7F8] p-3 rounded-xl border border-slate-200">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Postal PIN</span>
                    <span className="text-xs font-extrabold text-[#18232E]">274401</span>
                  </div>
                  <div className="bg-[#F5F7F8] p-3 rounded-xl border border-slate-200">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Corridor</span>
                    <span className="text-xs font-extrabold text-[#18232E]">NH-27 Highway</span>
                  </div>
                </div>
              </div>

              {/* Modern Profile */}
              <div className="bg-[#F5F7F8] p-6 rounded-3xl border border-slate-200 space-y-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#168568] tracking-wider block mb-1">
                    Civic & Commercial Life
                  </span>
                  <h3 className="text-base font-bold text-[#18232E] font-heading mb-3">
                    Fazilnagar Today: Regional Lifeline
                  </h3>
                  <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-[#168568] font-bold">✓</span>
                      <span><strong>Educational Hub:</strong> Pawanagar Mahavir Inter College, Degree Colleges, and specialized institutes educate thousands of youth from nearby blocks.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#168568] font-bold">✓</span>
                      <span><strong>Strategic Highway Connectivity:</strong> Located directly on Four-Lane NH-27, providing rapid transit to Gorakhpur, Kasya, Tamkuhi Raj, and Gopalganj (Bihar).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#168568] font-bold">✓</span>
                      <span><strong>Public Healthcare:</strong> Community Health Centre (CHC) Fazilnagar offers 24/7 emergency medical, ambulance, and maternity facilities.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#168568] font-bold">✓</span>
                      <span><strong>Commerce & Mandi:</strong> A bustling market for agricultural produce, building materials, clothing, electronics, and traditional sweets.</span>
                    </li>
                  </ul>
                </div>

                <Link
                  to="/directory"
                  className="w-full bg-[#18232E] hover:bg-[#B8323C] text-white text-xs font-bold py-2.5 rounded-xl transition text-center block shadow-xs"
                >
                  Explore Fazilnagar Directory
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: KUSHINAGAR */}
        {activeTab === "kushinagar" && (
          <div className="space-y-8">
            {/* Dynamic CMS Heritage Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {kushinagarSites.map((site) => (
                <div
                  key={site._id || site.slug || site.name}
                  className="group relative rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-slate-900 aspect-16/10 flex flex-col justify-end"
                >
                  <img
                    src={site.primaryImage || "/images/kushinagar_mahaparinirvana.webp"}
                    alt={site.name}
                    width="800"
                    height="500"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="relative z-10 bg-gradient-to-t from-black/90 via-black/35 to-transparent p-6 flex flex-col justify-end space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-300 bg-rose-950/85 border border-rose-600/50 px-2.5 py-0.5 rounded-full w-fit">
                        {site.category || "Buddhist Heritage"}
                      </span>
                      {site.distanceFromFazilnagarCenter && (
                        <span className="text-[10px] font-semibold text-slate-300 bg-black/50 px-2 py-0.5 rounded-full border border-white/20">
                          📍 {site.distanceFromFazilnagarCenter}
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-bold text-lg sm:text-xl">
                      {site.name}
                    </h3>
                    {site.nameHindi && (
                      <p className="text-amber-200/90 text-xs font-hindi">
                        {site.nameHindi}
                      </p>
                    )}
                    <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed">
                      {site.historicalSignificance || site.narrative}
                    </p>
                    <div className="pt-2 flex items-center justify-between text-xs text-slate-300 border-t border-white/20 mt-1">
                      <span className="truncate max-w-[200px]">
                        🕒 {site.visitingHours || "06:00 AM – 06:00 PM"}
                      </span>
                      <button
                        type="button"
                        onClick={() => openGoogleMapsDirections({
                          name: site.name,
                          lat: site.latitude || 26.7416,
                          lng: site.longitude || 83.8911,
                          landmark: site.locationAddress || "Kushinagar",
                        })}
                        className="font-bold text-amber-300 hover:text-white underline cursor-pointer shrink-0 ml-2"
                      >
                        Directions →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Deep History Narrative */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B8323C] uppercase tracking-wider">
                  <Landmark className="w-4 h-4" />
                  <span>The Parinirvana Sthal of the Enlightened One</span>
                </div>
                <h2 className="text-2xl font-bold text-[#18232E] font-heading">
                  Kushinagar (Kusinara): The Ultimate Sanctuary of Lord Buddha
                </h2>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
                  <p>
                    <strong>Kushinagar</strong>, anciently known as <em>Kushavati</em> and <em>Kusinara</em>, was the second capital
                    of the ancient Malla Confederacy. Located just <strong>18 km from Fazilnagar</strong>, it is considered one of the
                    four most holy pilgrimage centers in the Buddhist world, visited annually by thousands of devotees from Asia, Europe, and America.
                  </p>
                  <p>
                    <strong>The Mahaparinirvana (483 BCE):</strong> In his 80th year, Gautama Buddha traveled to Kusinara. In the Upavattana
                    Sal grove on the banks of the Hiranyavati river, he reclined between two twin Sal trees. Addressing his grieving disciple Ananda,
                    he spoke his final words: <em>"Decay is inherent in all component things! Work out your salvation with diligence."</em>
                    Here he entered Mahaparinirvana.
                  </p>
                  <p>
                    <strong>Excavation by Carlleyle (1876):</strong> Hidden beneath mounds for centuries, the site was systematically excavated
                    by A.C.L. Carlleyle under the Archaeological Survey of India. They recovered the iconic 20-foot reclining Buddha carved from a single
                    block of sandstone, dedicated by the monk Haribala during King Kumaragupta's reign.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-[#F5F7F8] p-3 rounded-xl border border-slate-200">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Distance</span>
                    <span className="text-xs font-extrabold text-[#18232E]">18 km from Town</span>
                  </div>
                  <div className="bg-[#F5F7F8] p-3 rounded-xl border border-slate-200">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Airport</span>
                    <span className="text-xs font-extrabold text-[#18232E]">International</span>
                  </div>
                  <div className="bg-[#F5F7F8] p-3 rounded-xl border border-slate-200">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">PIN Code</span>
                    <span className="text-xs font-extrabold text-[#18232E]">274403</span>
                  </div>
                  <div className="bg-[#F5F7F8] p-3 rounded-xl border border-slate-200">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Monasteries</span>
                    <span className="text-xs font-extrabold text-[#18232E]">8+ Nations</span>
                  </div>
                </div>
              </div>

              {/* Modern World Center */}
              <div className="bg-[#F5F7F8] p-6 rounded-3xl border border-slate-200 space-y-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#B8323C] tracking-wider block mb-1">
                    World Buddhist Heritage
                  </span>
                  <h3 className="text-base font-bold text-[#18232E] font-heading mb-3">
                    Key Monuments in Kushinagar
                  </h3>
                  <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-[#B8323C] font-bold">☸</span>
                      <span><strong>Mahaparinirvana Stupa:</strong> Standing 167 feet tall, rebuilt atop ancient brick foundations to commemorate Buddha's departure.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#B8323C] font-bold">☸</span>
                      <span><strong>Ramabhar Stupa:</strong> The large red brick mound of Mukutbandhana Chaitya where the final cremation was conducted.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#B8323C] font-bold">☸</span>
                      <span><strong>Matha Kuar Shrine:</strong> Features the 10th-century blue-black stone Buddha in Bhumisparsha (earth-touching) mudra.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#B8323C] font-bold">☸</span>
                      <span><strong>Global Monasteries:</strong> Monasteries and meditation centers built by Thailand, Myanmar, Japan, Sri Lanka, Tibet, Vietnam, and South Korea.</span>
                    </li>
                  </ul>
                </div>

                <Link
                  to="/tourism"
                  className="w-full bg-[#B8323C] hover:bg-[#991B1B] text-white text-xs font-bold py-2.5 rounded-xl transition text-center block shadow-xs"
                >
                  View Kushinagar Tourism Guide
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: SACRED BOND */}
        {activeTab === "connection" && (
          <div className="bg-gradient-to-br from-slate-900 to-[#18232E] text-white p-8 sm:p-12 rounded-3xl shadow-xl space-y-8">
            <div className="max-w-3xl space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 bg-amber-950/80 border border-amber-600/50 px-3 py-1 rounded-full">
                The Sacred Republican Twin Capitals
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold font-heading text-white">
                Pawa & Kusinara: A Historical Crossroads of Two Great World Religions
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Nowhere else in world history did two great founders of world thought and spiritual philosophies—Lord Mahavira
                (Jainism) and Gautam Buddha (Buddhism)—complete their earthly missions within the same 18-kilometer corridor
                in the democratic Malla Republic.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-800 text-xs">
              <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 space-y-2">
                <span className="text-2xl">🏛️</span>
                <h4 className="font-bold text-amber-300 text-sm">The Malla Democracy</h4>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Over 2,600 years ago, the Mallas functioned as a republic (Gana-Sangha), divided into two capital branches:
                  Pawa (modern Fazilnagar) and Kusinara (modern Kushinagar), governed by republican councils.
                </p>
              </div>

              <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 space-y-2">
                <span className="text-2xl">🕯️</span>
                <h4 className="font-bold text-amber-300 text-sm">Mahavira's Nirvana in Pawa</h4>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  In 527 BCE, the 24th Tirthankara Bhagwan Mahavira attained Nirvana at Pawa. The Malla chieftains lit deepams
                  to dispel spiritual darkness, originating the eternal Diwali festival celebration observed to this day.
                </p>
              </div>

              <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/60 space-y-2">
                <span className="text-2xl">☸️</span>
                <h4 className="font-bold text-amber-300 text-sm">Buddha's Parinirvana in Kusinara</h4>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  In 483 BCE, Gautam Buddha accepted his final offering in Pawa, drank water at the Kakodha/Kukuttha river,
                  and walked the 18 km route to Kushinagar to attain Mahaparinirvana under the twin Sal trees.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Connected along Four-Lane NH-27 (Distance: 18 km / Travel Time: 20 minutes)</span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/"
                  className="bg-[#B8323C] hover:bg-[#991B1B] text-white font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
                >
                  Return to Town Portal
                </Link>
                <Link
                  to="/directory"
                  className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-xl transition border border-white/20"
                >
                  Browse Town Directory
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HOW WE VERIFY LISTINGS & CRITERIA SECTION */}
      <section id="verification-criteria" className="bg-white dark:bg-[#131823] rounded-3xl p-8 sm:p-12 border border-slate-200/60 dark:border-white/8 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-8">
        <div className="space-y-2.5">
          <span className="text-xs font-bold text-[#B8323C] uppercase tracking-wider">
            Transparency &amp; Trust Standards
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-heading tracking-tight">
            How We Verify Directory Listings
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
            To prevent fraud, outdated telephone numbers, and ghost listings, every entry in the Fazilnagar Civic Directory undergoes a 4-step physical and telephone audit before receiving the verified badge.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-50/70 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200/60 dark:border-white/8 space-y-2.5">
            <span className="text-xl">📍</span>
            <h3 className="text-xs font-bold text-slate-900">1. Physical GPS Ground Truth</h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Volunteer surveyor confirms the physical existence of the establishment within Nagar Panchayat Fazilnagar boundary and logs exact coordinates.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="text-xl">📞</span>
            <h3 className="text-xs font-bold text-slate-900">2. Active Call Verification</h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Every listed telephone number is called to confirm active service, correct business owner, and emergency response availability.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="text-xl">🏛️</span>
            <h3 className="text-xs font-bold text-slate-900">3. Cross-Referenced Source</h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Hospitals, colleges, and emergency helplines are cross-referenced with district notices, medical registrations, or academic board affiliations.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="text-xl">🔄</span>
            <h3 className="text-xs font-bold text-slate-900">4. Community Re-Audit</h3>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Listings show a public "Last Verified" date and can be flagged by any citizen using the "Report Wrong Information" desk.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            Found an inaccurate listing or closed clinic?
          </span>
          <Link
            to="/contact"
            className="bg-[#18232E] hover:bg-[#B8323C] text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5"
          >
            <span>🚨 Report Inaccurate Information</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
