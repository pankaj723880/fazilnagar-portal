import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorState({
  title = "Failed to load data",
  message = "An error occurred while connecting to the civic administration server.",
  onRetry,
  className = "",
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-red-200/90 p-8 sm:p-12 text-center shadow-2xs space-y-3 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center mx-auto shadow-2xs">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <div className="space-y-1 max-w-md mx-auto">
        <h4 className="text-base font-extrabold text-[#18232E]">
          {title}
        </h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          {message}
        </p>
      </div>

      {onRetry && (
        <div className="pt-2">
          <button
            onClick={onRetry}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 mx-auto cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Operation</span>
          </button>
        </div>
      )}
    </div>
  );
}
