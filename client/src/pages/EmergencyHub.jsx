import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageSEO } from "../utils/seo";
import { Phone, ShieldAlert, HeartPulse, Flame, Zap, Droplets, ArrowLeft, Bell } from "lucide-react";

const EMERGENCY_SERVICES = [
  {
    category: "Police",
    title: "Thana Fazilnagar & Highway Patrol",
    number: "112",
    altNumber: "+91 5564 222111",
    icon: "👮",
    badge: "Police / 112",
    color: "border-rose-200 bg-rose-50/50 text-slate-900",
    btnColor: "bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-md shadow-rose-600/20",
    desc: "24/7 Emergency response, Highway Patrol NH-27, and town outpost.",
  },
  {
    category: "Ambulance",
    title: "Emergency Medical & CHC Ambulance",
    number: "108",
    altNumber: "102 (Maternity)",
    icon: "🚑",
    badge: "Medical / 108",
    color: "border-emerald-200 bg-emerald-50/50 text-slate-900",
    btnColor: "bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-md shadow-emerald-600/20",
    desc: "Free 24/7 Govt Ambulance service for critical emergencies & hospital transfer.",
  },
  {
    category: "Fire",
    title: "Kushinagar & Fazilnagar Fire Station",
    number: "101",
    altNumber: "+91 94152 99101",
    icon: "🚒",
    badge: "Fire Brigade / 101",
    color: "border-amber-200 bg-amber-50/50 text-slate-900",
    btnColor: "bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-md shadow-amber-600/20",
    desc: "Fire response unit, civil protection & rescue operations.",
  },
  {
    category: "Hospitals",
    title: "Community Health Centre (CHC) Emergency",
    number: "+91 5564 222100",
    altNumber: "05564222102",
    icon: "🏥",
    badge: "24/7 Casualty",
    color: "border-blue-200 bg-blue-50/50 text-slate-900",
    btnColor: "bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md shadow-blue-600/20",
    desc: "24/7 Emergency casualty ward, trauma doctor on-duty, and ambulance point.",
  },
  {
    category: "Women & Child",
    title: "Women Power Line & Childline 1098",
    number: "1090",
    altNumber: "1098 (Childline)",
    icon: "🚨",
    badge: "Women & Child",
    color: "border-purple-200 bg-purple-50/50 text-slate-900",
    btnColor: "bg-purple-600 hover:bg-purple-700 active:scale-95 text-white shadow-md shadow-purple-600/20",
    desc: "Confidential 24/7 support for women distress, domestic alerts, and child rights.",
  },
  {
    category: "Electricity",
    title: "Fazilnagar Power Substation Desk",
    number: "1912",
    altNumber: "+91 94152 00191",
    icon: "⚡",
    badge: "Power (1912)",
    color: "border-amber-200 bg-amber-50/40 text-slate-900",
    btnColor: "bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-md shadow-amber-600/20",
    desc: "Transformer breakdown, live wire hazards, and line breakdown reporting.",
  },
  {
    category: "Electricity",
    title: "Municipal Water Supply Helpline",
    number: "+91 5564 222188",
    altNumber: "1800 180 0101",
    icon: "💧",
    badge: "Water Supply",
    color: "border-cyan-200 bg-cyan-50/50 text-slate-900",
    btnColor: "bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white shadow-md shadow-cyan-600/20",
    desc: "Town pipeline leakage alerts, tube-well fault, and tanker dispatch.",
  },
];

const CATEGORIES = ["All", "Police", "Ambulance", "Fire", "Hospitals", "Women & Child", "Electricity"];

export default function EmergencyHub() {
  usePageSEO({
    title: "Fazilnagar Emergency Numbers & 24/7 Helplines | Police, Ambulance, Fire",
    description: "Essential 24/7 emergency contacts for Fazilnagar and Kushinagar: Police (112), Ambulance (108/102), Fire (101), CHC Hospital, Women Helpline (1090), and Power Substation.",
    canonicalPath: "/emergency",
  });
  const [filter, setFilter] = useState("All");

  const filteredServices =
    filter === "All"
      ? EMERGENCY_SERVICES
      : EMERGENCY_SERVICES.filter((s) => s.category === filter);

  return (
    <div className="w-full max-w-[420px] mx-auto min-h-screen bg-slate-50/60 pb-28 pt-2">
      {/* 3.1 Compact Mobile App Bar */}
      <div className="sticky top-0 z-30 h-[54px] bg-white/95 backdrop-blur-md border-b border-slate-100 px-3 flex items-center justify-between mb-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition active:scale-95 cursor-pointer"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded-xl bg-rose-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
            F
          </div>
          <div className="leading-tight">
            <h2 className="font-extrabold text-sm tracking-tight text-slate-900 font-heading">
              FAZILNAGAR
            </h2>
            <p className="text-[9px] text-slate-500 font-semibold tracking-wide">
              PIN 274401 • 24/7 Emergency Hub
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 animate-pulse">
            ● 24/7 LIVE
          </span>
        </div>
      </div>

      <div className="px-3 space-y-3.5">
        {/* 3.1 Crimson Tint Banner */}
        <div className="p-4 rounded-2xl border border-rose-200/90 bg-rose-50 text-rose-950 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚨</span>
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-700 bg-rose-200/60 px-2 py-0.5 rounded-md">
                24/7 Resident Support
              </span>
              <h1 className="text-base font-black tracking-tight mt-1 text-slate-900">
                Fazilnagar Emergency Numbers &amp; 24/7 Helplines
              </h1>
            </div>
          </div>
          <p className="text-xs text-rose-900/80 mt-1.5 leading-relaxed font-medium">
            Verified instant-dial emergency contacts for Fazilnagar police, medical trauma, fire, women safety, and utility breakdowns.
          </p>
        </div>

        {/* 3.1 Category Filter List */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                filter === cat
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 3.2 Standard High-Priority Dialing Cards */}
        <div className="space-y-3">
          {filteredServices.map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border shadow-2xs flex flex-col justify-between space-y-3 bg-white ${item.color}`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-white/90 px-2 py-0.5 rounded-md border border-slate-200/60 text-slate-700">
                      {item.badge}
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-500">
                    Alt: {item.altNumber}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 pt-1">{item.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">{item.desc}</p>
              </div>

              {/* Solid Block Call Button */}
              <div className="pt-1">
                <a
                  href={`tel:${item.number.replace(/\s+/g, "")}`}
                  className={`w-full py-3 px-4 rounded-xl text-center font-black text-xs tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${item.btnColor}`}
                >
                  <Phone className="w-3.5 h-3.5 fill-current" />
                  <span>CALL NOW ({item.number})</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}