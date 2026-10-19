import { useEffect } from "react";
import { AlertTriangle, Trash2, X, RefreshCw } from "lucide-react";

export default function ConfirmDialog({
  isOpen = false,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  confirmVariant = "danger", // "danger" | "primary" | "warning"
  onConfirm = () => {},
  onCancel = () => {},
  loading = false,
}) {
  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen && !loading) {
        onCancel();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      btn: "bg-[#B8323C] hover:bg-[#991B1B] text-white shadow-xs focus:ring-[#B8323C]/30",
      iconBg: "bg-red-50 text-[#B8323C] border-red-200",
      icon: Trash2,
    },
    primary: {
      btn: "bg-[#111827] hover:bg-[#1E293B] text-white shadow-xs focus:ring-[#111827]/30",
      iconBg: "bg-slate-100 text-[#111827] border-slate-200",
      icon: AlertTriangle,
    },
    warning: {
      btn: "bg-amber-700 hover:bg-amber-800 text-white shadow-xs focus:ring-amber-400",
      iconBg: "bg-amber-50 text-amber-700 border-amber-200",
      icon: AlertTriangle,
    },
  };

  const theme = variantStyles[confirmVariant] || variantStyles.danger;
  const Icon = theme.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-[#111827]/70 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md my-auto bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${theme.iconBg}`}
          >
            <Icon className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold text-[#111827]">
              {title}
            </h3>
            <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
              {message}
            </p>
          </div>

          <button
            onClick={onCancel}
            disabled={loading}
            className="text-[#64748B] hover:text-[#111827] p-1 rounded-lg transition"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${theme.btn}`}
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
