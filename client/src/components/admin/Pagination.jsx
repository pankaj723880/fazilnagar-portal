import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems,
  pageSize = 10,
  onPageChange = () => {},
  className = "",
}) {
  if (totalPages <= 1 && !totalItems) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems || currentPage * pageSize);

  // Generate page numbers to show (e.g. 1, 2, 3...)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div
      className={`bg-white px-4 py-3 rounded-2xl border border-[#E5E7EB] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none ${className}`}
    >
      <div className="text-[#64748B] font-medium">
        {totalItems !== undefined ? (
          <>
            Showing <span className="font-bold text-[#111827]">{startItem}</span> to{" "}
            <span className="font-bold text-[#111827]">{endItem}</span> of{" "}
            <span className="font-bold text-[#111827]">{totalItems}</span> records
          </>
        ) : (
          <>
            Page <span className="font-bold text-[#111827]">{currentPage}</span> of{" "}
            <span className="font-bold text-[#111827]">{totalPages}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-xl border border-[#E5E7EB] text-[#1E293B] hover:bg-[#F8FAFC] hover:text-[#111827] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          title="Previous page"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((pg) => {
            const isActive = pg === currentPage;
            return (
              <button
                key={pg}
                onClick={() => onPageChange(pg)}
                className={`min-w-8 h-8 px-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                  isActive
                    ? "bg-[#111827] text-white shadow-xs font-black border-b-2 border-[#B8323C]"
                    : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#111827] border border-transparent"
                }`}
              >
                {pg}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          title="Next page"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
