import { useState } from "react";
import { usePageSEO } from "../utils/seo";

const EMERGENCY_SERVICES = [
  {
    category: "Police",
    title: "Thana Fazilnagar & Control Room",
    number: "112",
    altNumber: "+91 5564 222111",
    icon: "🚓",
    color: "border-red-500 bg-red-50 text-red-900",
    btnColor: "bg-red-600 hover:bg-red-700 text-white",
    desc: "24/7 Local Police Assistance & Emergency Highway Patrol",
  },
  {
    category: "Ambulance",
    title: "Emergency Medical & CHC Ambulance",
    number: "108",
    altNumber: "102",
    icon: "🚑",
    color: "border-emerald-500 bg-emerald-50 text-emerald-900",
    btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
    desc: "Free 24/7 Govt Ambulance service for critical emergencies",
  },
  {
    category: "Fire Brigade",
    title: "Kushinagar & Fazilnagar Fire Station",
    number: "101",
    altNumber: "+91 94152 99101",
    icon: "🚒",
    color: "border-amber-500 bg-amber-50 text-amber-900",
    btnColor: "bg-amber-600 hover:bg-amber-700 text-white",
    desc: "Fire response unit & rescue service",
  },
  {
    category: "Hospitals",
    title: "Community Health Centre (CHC) Emergency",
    number: "+91 5564 222100",
    altNumber: "108",
    icon: "🏥",
    color: "border-blue-500 bg-blue-50 text-blue-900",
    btnColor: "bg-blue-600 hover:bg-blue-700 text-white",
    desc: "24/7 Casualty ward & trauma assistance",
  },
  {
    category: "Women & Child Safety",
    title: "Women Helpline & Childline",
    number: "1090",
    altNumber: "1098",
    icon: "🚨",
    color: "border-purple-500 bg-purple-50 text-purple-900",
    btnColor: "bg-purple-600 hover:bg-purple-700 text-white",
    desc: "Dedicated 24/7 support line for distress calls and child safety",
  },
  {
    category: "Electricity Department",
    title: "Fazilnagar Power Substation Desk",
    number: "1912",
    altNumber: "+91 94152 00191",
    icon: "⚡",
    color: "border-yellow-500 bg-yellow-50 text-yellow-900",
    btnColor: "bg-yellow-600 hover:bg-yellow-700 text-white",
    desc: "Breakdown alerts, transformer failures, & live wire hazards",
  },
  {
    category: "Water Department",
    title: "Municipal Water Supply Helpline",
    number: "+91 5564 222188",
    altNumber: "1800 180 0101",
    icon: "💧",
    color: "border-cyan-500 bg-cyan-50 text-cyan-900",
    btnColor: "bg-cyan-600 hover:bg-cyan-700 text-white",
    desc: "Pipeline leakage reports & emergency tanker dispatch",
  },
];

export default function EmergencyHub() {
  usePageSEO({
    title: "Fazilnagar Emergency Numbers & 24/7 Helplines | Police, Ambulance, Fire",
    description: "Essential 24/7 emergency contacts for Fazilnagar and Kushinagar: Police (112), Ambulance (108/102), Fire (101), CHC Hospital, Women Helpline (1090), and Power Substation.",
    canonicalPath: "/emergency",
  });
  const [filter, setFilter] = useState("All");

  const categories = ["All", ...new Set(EMERGENCY_SERVICES.map((s) => s.category))];

  const filteredServices =
    filter === "All"
      ? EMERGENCY_SERVICES
      : EMERGENCY_SERVICES.filter((s) => s.category === filter);

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="bg-red-700 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            24/7 Resident Support
          </span>
          <h1 className="text-2xl sm:text-4xl font-black mt-2">🚨 Fazilnagar Emergency Numbers &amp; 24/7 Helplines</h1>
          <p className="text-red-100 text-sm mt-1">
            Instant dial helplines for Fazilnagar police, medical ambulance, fire station, utilities, and emergency safety.
          </p>
        </div>
      </div>

      {/* Quick Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filter === cat
                ? "bg-slate-900 text-white shadow-md"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid of Emergency Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredServices.map((item, idx) => (
          <div
            key={idx}
            className={`p-6 rounded-3xl border-2 shadow-sm flex flex-col justify-between space-y-4 ${item.color}`}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-3xl">{item.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/80 px-2.5 py-1 rounded-full shadow-xs">
                  {item.category}
                </span>
              </div>
              <h3 className="text-lg font-black mt-2">{item.title}</h3>
              <p className="text-xs opacity-80 leading-relaxed">{item.desc}</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-black/10">
              <p className="text-xs font-semibold opacity-75">
                Alt: {item.altNumber}
              </p>

              {/* Mobile Large CALL NOW Button */}
              <a
                href={`tel:${item.number.replace(/\s+/g, "")}`}
                className={`w-full py-3.5 px-4 rounded-2xl text-center font-black text-sm tracking-wide shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${item.btnColor}`}
              >
                <span>📞 CALL NOW ({item.number})</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}