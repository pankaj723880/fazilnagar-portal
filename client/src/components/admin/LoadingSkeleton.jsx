export default function LoadingSkeleton({ type = "table", count = 3 }) {
  if (type === "stats") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3"
          >
            <div className="h-3 w-20 bg-slate-100 animate-pulse rounded" />
            <div className="h-8 w-16 bg-slate-100 animate-pulse rounded-lg" />
            <div className="h-3 w-28 bg-slate-100 animate-pulse rounded pt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "cards") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4"
          >
            <div className="h-36 w-full bg-slate-100 animate-pulse rounded-xl" />
            <div className="space-y-2">
              <div className="h-4 w-3/4 bg-slate-100 animate-pulse rounded" />
              <div className="h-3 w-full bg-slate-100 animate-pulse rounded" />
              <div className="h-3 w-1/2 bg-slate-100 animate-pulse rounded" />
            </div>
            <div className="h-8 w-full bg-slate-100 animate-pulse rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "form") {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
        <div className="h-6 w-48 bg-slate-100 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-3 w-24 bg-slate-100 animate-pulse rounded" />
            <div className="h-10 w-full bg-slate-100 animate-pulse rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-24 bg-slate-100 animate-pulse rounded" />
            <div className="h-10 w-full bg-slate-100 animate-pulse rounded-xl" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-28 bg-slate-100 animate-pulse rounded" />
          <div className="h-24 w-full bg-slate-100 animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  // Default: Table skeleton
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="h-11 bg-slate-50 border-b border-slate-100 px-4 flex items-center gap-4">
        <div className="h-3 w-24 bg-slate-200 animate-pulse rounded" />
        <div className="h-3 w-32 bg-slate-200 animate-pulse rounded" />
        <div className="h-3 w-20 bg-slate-200 animate-pulse rounded ml-auto" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-1/3 bg-slate-100 animate-pulse rounded" />
              <div className="h-3 w-1/2 bg-slate-100 animate-pulse rounded" />
            </div>
            <div className="h-6 w-20 bg-slate-100 animate-pulse rounded-full" />
            <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
