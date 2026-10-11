import { useState } from "react";

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
  const [tab, setTab] = useState("reach");

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-2">
        <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Transit & Commute Desk
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold">🚌 Local Transportation</h1>
        <p className="text-slate-300 text-sm">
          Bus routes, rail stations, local auto stands, parking hubs, and regional road connectivity.
        </p>
      </div>

      <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-sm">
        <button
          onClick={() => setTab("reach")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            tab === "reach" ? "bg-red-700 text-white shadow" : "text-slate-600"
          }`}
        >
          📍 How to Reach
        </button>
        <button
          onClick={() => setTab("around")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            tab === "around" ? "bg-red-700 text-white shadow" : "text-slate-600"
          }`}
        >
          🛺 Get Around City
        </button>
      </div>

      {tab === "reach" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-2">
            <span className="text-lg">✈️ Air</span>
            <h3 className="font-bold text-slate-900">Kushinagar International Airport (KBK)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Located ~22 km via NH-27 highway. Taxis and buses are readily available from airport terminals.
            </p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-2">
            <span className="text-lg">🚆 Train</span>
            <h3 className="font-bold text-slate-900">Gorakhpur Junction (GKP) & Tamkuhi Road</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Gorakhpur Jn is the major railhead (~65 km). Local commuter trains stop at Tamkuhi Road (12 km).
            </p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-2">
            <span className="text-lg">🚗 Road & Highways</span>
            <h3 className="font-bold text-slate-900">National Highway 27 (East-West Corridor)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Direct four-lane connectivity connecting Lucknow, Gorakhpur, Fazilnagar, and Bihar border.
            </p>
          </div>
        </div>
      )}

      {tab === "around" && (
        <div className="space-y-4">
          {TRANSIT_HUBS.map((hub, idx) => (
            <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">{hub.type}</span>
                <span className="text-xs text-slate-400 font-medium">📍 {hub.distance}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">{hub.title}</h3>
              <p className="text-xs text-slate-600">{hub.details}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}