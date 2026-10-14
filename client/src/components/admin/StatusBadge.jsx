import { CheckCircle2, Clock, XCircle, AlertCircle, Sparkles, Star, ShieldCheck } from "lucide-react";

export default function StatusBadge({
  status,
  label,
  pulse = false,
  size = "md", // "sm" | "md"
  className = "",
}) {
  const norm = String(status || "").toLowerCase().trim();

  let config = {
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    icon: null,
    defaultLabel: status || "Unknown",
  };

  if (norm === "published" || norm === "live" || norm === "active" || norm === "approved") {
    config = {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: CheckCircle2,
      defaultLabel: norm === "live" ? "Live" : norm === "approved" ? "Approved" : "Published",
    };
  } else if (norm === "pending" || norm === "review" || norm === "in_review") {
    config = {
      bg: "bg-amber-50 text-amber-700 border-amber-200",
      icon: Clock,
      defaultLabel: "Pending Review",
    };
  } else if (norm === "rejected" || norm === "declined" || norm === "error") {
    config = {
      bg: "bg-red-50 text-red-700 border-red-200",
      icon: XCircle,
      defaultLabel: "Rejected",
    };
  } else if (norm === "draft" || norm === "inactive" || norm === "unpublished") {
    config = {
      bg: "bg-slate-100 text-slate-600 border-slate-200",
      icon: AlertCircle,
      defaultLabel: norm === "inactive" ? "Inactive" : "Draft",
    };
  } else if (norm === "archived") {
    config = {
      bg: "bg-slate-100 text-slate-500 border-slate-200",
      icon: null,
      defaultLabel: "Archived",
    };
  } else if (norm === "expired") {
    config = {
      bg: "bg-amber-50 text-amber-800 border-amber-200",
      icon: Clock,
      defaultLabel: "Expired Schedule",
    };
  } else if (norm === "permanent") {
    config = {
      bg: "bg-amber-100 text-amber-900 border-amber-300 font-extrabold",
      icon: Star,
      defaultLabel: "Permanent (स्थाई)",
    };
  } else if (norm === "verified") {
    config = {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
      icon: ShieldCheck,
      defaultLabel: "Verified",
    };
  }

  const Icon = config.icon;
  const text = label || config.defaultLabel;

  const sizeClass =
    size === "sm"
      ? "text-[10px] px-2 py-0.5 gap-1"
      : "text-[11px] px-2.5 py-1 gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full border shadow-2xs ${sizeClass} ${config.bg} ${className}`}
    >
      {pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping opacity-75 shrink-0" />
      )}
      {Icon && <Icon className={size === "sm" ? "w-3 h-3 shrink-0" : "w-3.5 h-3.5 shrink-0"} />}
      <span>{text}</span>
    </span>
  );
}
