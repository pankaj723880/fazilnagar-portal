import { ArrowUpRight, ArrowDownRight, ChevronRight } from "lucide-react";

export default function StatCard({
  label,
  value,
  icon: Icon,
  color = "blue", // "blue" | "emerald" | "amber" | "red" | "purple" | "indigo"
  trend,
  subtitle,
  onClick,
  loading = false,
}) {
  const colorMap = {
    blue: {
      bg: "bg-blue-50 text-blue-600 border-blue-100",
      accent: "hover:border-blue-300",
    },
    emerald: {
      bg: "bg-emerald-50 text-emerald-600 border-emerald-100",
      accent: "hover:border-emerald-300",
    },
    amber: {
      bg: "bg-amber-50 text-amber-600 border-amber-100",
      accent: "hover:border-amber-300",
    },
    red: {
      bg: "bg-red-50 text-red-600 border-red-100",
      accent: "hover:border-red-300",
    },
    purple: {
      bg: "bg-purple-50 text-purple-600 border-purple-100",
      accent: "hover:border-purple-300",
    },
    indigo: {
      bg: "bg-indigo-50 text-indigo-600 border-indigo-100",
      accent: "hover:border-indigo-300",
    },
  };

  const currentTheme = colorMap[color] || colorMap.blue;

  return (
    <div
      onClick={typeof onClick === "function" ? onClick : undefined}
      className={`bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs transition-all duration-200 flex flex-col justify-between ${
        typeof onClick === "function"
          ? `cursor-pointer hover:shadow-sm ${currentTheme.accent} hover:-translate-y-0.5`
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            {label}
          </span>
          {loading ? (
            <div className="h-8 w-20 bg-slate-100 animate-pulse rounded-lg mt-1" />
          ) : (
            <h3 className="text-2xl font-black text-[#18232E] tracking-tight font-heading">
              {value ?? "—"}
            </h3>
          )}
        </div>

        {Icon && (
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${currentTheme.bg} shadow-2xs`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        {trend ? (
          <div className="flex items-center gap-1 font-bold">
            {trend.isPositive ? (
              <span className="text-emerald-600 flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{trend.value}</span>
              </span>
            ) : (
              <span className="text-red-600 flex items-center">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>{trend.value}</span>
              </span>
            )}
            <span className="text-slate-400 font-normal text-[11px]">{trend.label}</span>
          </div>
        ) : subtitle ? (
          <span className="text-[11px] text-slate-500 font-medium truncate">{subtitle}</span>
        ) : (
          <span className="text-[11px] text-slate-400">Click to view details</span>
        )}

        {onClick && (
          <span className="text-slate-300 hover:text-slate-600 transition flex items-center shrink-0">
            <ChevronRight className="w-4 h-4" />
          </span>
        )}
      </div>
    </div>
  );
}
