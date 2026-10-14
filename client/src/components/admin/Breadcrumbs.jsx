import { ChevronRight, Home } from "lucide-react";

export default function Breadcrumbs({ items = [], onNavigate }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
      <button
        onClick={() => onNavigate && onNavigate("dashboard")}
        className="flex items-center gap-1 font-medium hover:text-slate-800 transition cursor-pointer text-slate-400"
        title="Admin Dashboard"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Admin</span>
      </button>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <div key={idx} className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            {isLast || !item.tab ? (
              <span className="font-semibold text-slate-800 truncate max-w-[200px]" aria-current="page">
                {item.label}
              </span>
            ) : (
              <button
                onClick={() => onNavigate && onNavigate(item.tab)}
                className="hover:text-slate-800 transition cursor-pointer font-medium text-slate-500 truncate max-w-[160px]"
              >
                {item.label}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
