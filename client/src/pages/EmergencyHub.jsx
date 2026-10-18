import { useState } from "react";
import { Link } from "react-router-dom";
import { usePageSEO } from "../utils/seo";
import { Phone, ShieldAlert, HeartPulse, Flame, Zap, Droplets, ArrowLeft, Bell, CheckCircle2, AlertTriangle } from "lucide-react";
import { EMERGENCY_SERVICES, EMERGENCY_CATEGORIES as CATEGORIES } from "../data/emergencyContacts";


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
    <div className="w-full max-w-5xl mx-auto min-h-screen bg-slate-50/60 pb-28 pt-2 px-3 sm:px-6">
      {/* 3.1 Compact App Bar (Mobile & Desktop) */}
      <div className="sticky top-0 z-30 h-[54px] bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl px-3.5 flex items-center justify-between mb-3 shadow-2xs">
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 animate-pulse">
            ● 24/7 LIVE
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* 3.1 Crimson Tint Banner */}
        <div className="p-4 sm:p-5 rounded-2xl border border-rose-200/90 bg-rose-50 text-rose-950 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🚨</span>
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-700 bg-rose-200/60 px-2 py-0.5 rounded-md">
                24/7 Resident Support
              </span>
              <h1 className="text-base sm:text-lg font-black tracking-tight mt-1 text-slate-900">
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

        {/* 3.2 Standard High-Priority Dialing Cards (Responsive Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredServices.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border shadow-2xs flex flex-col justify-between space-y-3 bg-white ${item.color}`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" role="img" aria-label={item.badge}>
                      {item.icon}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-white/90 px-2 py-0.5 rounded-md border border-slate-200/60 text-slate-700">
                      {item.badge}
                    </span>
                  </div>
                  {item.altNumber && (
                    <a
                      href={`tel:${item.altNumberTel}`}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-950 underline decoration-slate-300 underline-offset-2 flex items-center gap-1 cursor-pointer"
                      title={`Call alternate number ${item.altNumber}`}
                    >
                      <Phone className="w-2.5 h-2.5" />
                      <span>Alt: {item.altNumber}</span>
                    </a>
                  )}
                </div>

                <h3 className="text-sm font-extrabold text-slate-900 pt-1">{item.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">{item.desc}</p>

                {/* Verification & Source Badges */}
                <div className="pt-1.5 border-t border-slate-100 space-y-1 text-[10px] text-slate-500 font-medium">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-600">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                      <span>Last verified: <strong>{item.lastVerified}</strong></span>
                    </span>
                    <span className="text-slate-400 truncate max-w-[170px]" title={item.source}>
                      Src: {item.source}
                    </span>
                  </div>

                  {!item.isVerified && (
                    <div className="p-1.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[10px] flex items-start gap-1 font-semibold">
                      <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                      <span>{item.verificationNote || "TODO: Contact unverified with local authority."}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Solid Block Primary Call Button */}
              <div className="pt-1">
                <a
                  href={`tel:${item.numberTel}`}
                  className={`w-full py-3 px-4 rounded-xl text-center font-black text-xs tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${item.btnColor}`}
                  aria-label={`Call emergency number ${item.number} for ${item.title}`}
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