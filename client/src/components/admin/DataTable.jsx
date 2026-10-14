import { ChevronDown, ChevronUp } from "lucide-react";

export default function DataTable({
  columns = [],
  data = [],
  keyField = "_id",
  loading = false,
  emptyState = null,
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-8 text-center space-y-3">
          <div className="h-6 w-32 bg-slate-100 animate-pulse rounded-lg mx-auto" />
          <div className="space-y-2 max-w-md mx-auto">
            <div className="h-4 bg-slate-100 animate-pulse rounded" />
            <div className="h-4 bg-slate-100 animate-pulse rounded w-5/6 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {emptyState || (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">
            No records found.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
          <thead className="bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            <tr>
              {columns.map((col, idx) => {
                const isSortable = col.sortable && onSort;
                const isCurrentSort = sortColumn === col.key;

                return (
                  <th
                    key={col.key || idx}
                    className={`px-4 py-3.5 whitespace-nowrap font-bold ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left"
                    } ${isSortable ? "cursor-pointer hover:text-slate-800 select-none" : ""}`}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => isSortable && onSort(col.key)}
                  >
                    <div
                      className={`inline-flex items-center gap-1 ${
                        col.align === "right"
                          ? "justify-end"
                          : col.align === "center"
                          ? "justify-center"
                          : "justify-start"
                      }`}
                    >
                      <span>{col.label}</span>
                      {isSortable && isCurrentSort && (
                        <span>
                          {sortDirection === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {data.map((row, rowIdx) => {
              const rowKey = row[keyField] || row.id || rowIdx;
              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors ${
                    onRowClick ? "cursor-pointer hover:bg-slate-50/80" : "hover:bg-slate-50/40"
                  }`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      className={`px-4 py-3.5 whitespace-nowrap align-middle ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left"
                      }`}
                    >
                      {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
