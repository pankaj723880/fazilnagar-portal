import { Search, X, Filter, RotateCcw } from "lucide-react";

export default function SearchAndFilters({
  searchQuery = "",
  onSearchChange = () => {},
  placeholder = "Search records...",
  filters = [],
  totalCount,
  filteredCount,
  onReset,
  actions,
}) {
  const hasActiveFilters =
    Boolean(searchQuery) ||
    filters.some(
      (f) => f.value && f.value !== "all" && f.value !== "All" && f.value !== ""
    );

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 mb-5">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {filters.map((filter) => (
            <div key={filter.id} className="flex items-center gap-1.5">
              {filter.label && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden xl:inline">
                  {filter.label}:
                </span>
              )}
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
              >
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {hasActiveFilters && onReset && (
            <button
              onClick={onReset}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2.5 py-2 rounded-xl hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {actions && <div className="flex items-center gap-2 ml-auto lg:ml-0">{actions}</div>}
        </div>
      </div>

      {/* Record Counter summary if provided */}
      {(totalCount !== undefined || filteredCount !== undefined) && (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div>
            Showing{" "}
            <span className="font-bold text-slate-800">
              {filteredCount !== undefined ? filteredCount : totalCount}
            </span>{" "}
            {totalCount !== undefined && filteredCount !== undefined && filteredCount !== totalCount && (
              <>
                of <span className="font-bold text-slate-800">{totalCount}</span>
              </>
            )}{" "}
            records
          </div>
          {hasActiveFilters && (
            <span className="text-amber-600 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px]">
              Filters active
            </span>
          )}
        </div>
      )}
    </div>
  );
}
