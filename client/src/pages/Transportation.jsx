import { useState } from "react";
import { usePageSEO } from "../utils/seo";

const TRANSIT_HUBS = [
  {
    type: "Railway Station",
    title: "Tamkuhi Road Railway Station (TOI)",
    distance: "12 km from Fazilnagar Town Center",
    details: "Direct train connectivity to Gorakhpur Junction, Chhapra, and Patna.",
  },
  {
    type: "Bus Stand",
    title: "Fazilnagar Roadways Bus Stand (NH-27)",
    distance: "Main Chauraha",
    details: "UPSRTC and private intercity express buses every 15 mins to Gorakhpur, Lucknow, and Gopalganj.",
  },
  {
    type: "Auto & Taxi Stand",
    title: "Fazilnagar Main Chauraha Auto Hub",
    distance: "Center City",
    details: "Shared and private e-rickshaws, tempos, and taxi rentals available 24/7.",
  },
];

export default function Transportation() {
  usePageSEO({
    title: "Fazilnagar Transport & Connectivity | Bus Stand, Railway Station & Auto Hubs",
    description: "Complete transit guide for Fazilnagar (NH-27, Kushinagar): UPSRTC roadways bus stand, Tamkuhi Road railway station connectivity, auto stands, and local routes.",
    canonicalPath: "/transport",
  });
  const [tab, setTab] = useState("reach");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-10 space-y-8 sm:space-y-10 pb-32 font-sans">
      <div className="bg-gradient-to-r from-slate-900 via-[#18232E] to-slate-900 text-white p-6 sm:p-8 lg:p-10 rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-3 border border-slate-800/80">
        <span className="bg-red-600/90 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Transit & Commute Desk
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-heading">
          🚌 Fazilnagar Transportation &amp; Transit Hubs
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
          Bus routes, Tamkuhi Road railway station connectivity, auto stands, and NH-27 travel options for Fazilnagar.
        </p>
      </div>

      <div className="flex bg-slate-200/70 dark:bg-slate-800/60 p-1.5 rounded-2xl max-w-sm border border-slate-200/60 dark:border-white/8 shadow-xs">
        <button
          onClick={() => setTab("reach")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            tab === "reach" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          📍 How to Reach
        </button>
        <button
          onClick={() => setTab("around")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            tab === "around" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          🛺 Get Around City
        </button>
      </div>

      {tab === "reach" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="bg-white dark:bg-[#131823] p-6 sm:p-7 rounded-3xl border border-slate-200/60 dark:border-white/8 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-2.5">
            <span className="text-2xl">✈️</span>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Kushinagar International Airport (KBK)</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Located ~22 km via NH-27 highway. Taxis and buses are readily available from airport terminals.
            </p>
          </div>
          <div className="bg-white dark:bg-[#131823] p-6 sm:p-7 rounded-3xl border border-slate-200/60 dark:border-white/8 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-2.5">
            <span className="text-2xl">🚆</span>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Gorakhpur Junction (GKP) & Tamkuhi Road</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Gorakhpur Jn is the major railhead (~65 km). Local commuter trains stop at Tamkuhi Road (12 km).
            </p>
          </div>
          <div className="bg-white dark:bg-[#131823] p-6 sm:p-7 rounded-3xl border border-slate-200/60 dark:border-white/8 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-2.5">
            <span className="text-2xl">🚗</span>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">National Highway 27 (East-West Corridor)</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Direct four-lane connectivity connecting Lucknow, Gorakhpur, Fazilnagar, and Bihar border.
            </p>
          </div>
        </div>
      )}

      {tab === "around" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {TRANSIT_HUBS.map((hub, idx) => (
            <div key={idx} className="bg-white dark:bg-[#131823] p-6 sm:p-7 rounded-3xl border border-slate-200/60 dark:border-white/8 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 rounded-full border border-red-200/60 dark:border-red-800/40">{hub.type}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">📍 {hub.distance}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{hub.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{hub.details}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}