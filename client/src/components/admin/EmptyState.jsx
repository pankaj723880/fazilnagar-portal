import { Inbox } from "lucide-react";

export default function EmptyState({
  icon: Icon = Inbox,
  title = "No records found",
  description = "There is nothing to display here yet.",
  action,
  actionLabel,
  onAction,
  className = "",
}) {
  // Support actionLabel + onAction as an alternative to passing a full action JSX node
  const renderedAction = action || (actionLabel && onAction ? (
    <button
      type="button"
      onClick={onAction}
      className="inline-flex items-center gap-2 bg-[#B8323C] hover:bg-[#991B1B] text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer active:scale-95 duration-150"
    >
      <span>+ {actionLabel}</span>
    </button>
  ) : null);

  return (
    <div
      className={`p-10 sm:p-14 text-center flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] text-[#64748B] border border-[#E5E7EB] flex items-center justify-center shadow-2xs">
        <Icon className="w-6 h-6" />
      </div>

      <div className="space-y-1 max-w-sm mx-auto">
        <h4 className="text-sm sm:text-base font-extrabold text-[#111827]">
          {title}
        </h4>
        <p className="text-xs text-[#64748B] leading-relaxed">
          {description}
        </p>
      </div>

      {renderedAction && <div className="pt-2">{renderedAction}</div>}
    </div>
  );
}
