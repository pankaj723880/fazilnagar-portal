import { useEffect } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

export default function ToastNotification({
  message,
  type = "success", // "success" | "error" | "warning" | "info"
  onClose = () => {},
  duration = 4000,
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const typeConfig = {
    success: {
      bg: "bg-slate-900 border-slate-700 text-white",
      icon: CheckCircle2,
      iconColor: "text-emerald-400",
    },
    error: {
      bg: "bg-red-950 border-red-800 text-white",
      icon: XCircle,
      iconColor: "text-red-400",
    },
    warning: {
      bg: "bg-amber-950 border-amber-800 text-white",
      icon: AlertTriangle,
      iconColor: "text-amber-400",
    },
    info: {
      bg: "bg-slate-900 border-slate-700 text-white",
      icon: Info,
      iconColor: "text-blue-400",
    },
  };

  const current = typeConfig[type] || typeConfig.success;
  const Icon = current.icon;

  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 duration-200 select-none"
    >
      <div
        className={`p-3.5 sm:p-4 rounded-2xl border shadow-2xl flex items-start gap-3 text-xs ${current.bg}`}
      >
        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${current.iconColor}`} />
        <div className="flex-1 min-w-0 font-medium leading-relaxed">
          {message}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition p-0.5 rounded cursor-pointer"
          aria-label="Dismiss message"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
