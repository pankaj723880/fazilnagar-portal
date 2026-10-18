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
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs overflow-hidden">
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
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs overflow-hidden">
        {emptyState || (
          <div className="p-12 text-center text-[#64748B] text-xs font-semibold">
            No records found.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#111827] divide-y divide-[#E5E7EB]">
          <thead className="bg-[#F8FAFC] text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] border-b border-[#E5E7EB]">
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
                    } ${isSortable ? "cursor-pointer hover:text-[#111827] select-none" : ""}`}
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
                            <ChevronUp className="w-3.5 h-3.5 text-[#B8323C]" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-[#B8323C]" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E5E7EB] bg-white">
            {data.map((row, rowIdx) => {
              const rowKey = row[keyField] || row.id || rowIdx;
              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors ${
                    onRowClick ? "cursor-pointer hover:bg-[#F8FAFC]" : "hover:bg-[#F8FAFC]/50"
                  }`}
                >
                  {columns.map((col, colIdx) => {
                    let cellContent = "—";
                    if (typeof col.render === "function") {
                      try {
                        const val = row[col.key];
                        // If cell value is undefined (e.g. actions, status, admin, coordinates, etc.),
                        // pass the whole row as the primary argument so single-argument handlers
                        // like (item) => item.property never crash with "Cannot read properties of undefined".
                        const primaryArg = val !== undefined ? val : row;
                        cellContent = col.render(primaryArg, row, rowIdx);
                      } catch (renderErr) {
                        console.warn(`[DataTable] Column "${col.key}" render error:`, renderErr);
                        cellContent = row[col.key] ?? "—";
                      }
                    } else {
                      cellContent = row[col.key] ?? "—";
                    }

                    return (
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
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
