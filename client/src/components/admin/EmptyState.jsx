import { Inbox } from "lucide-react";

export default function EmptyState({
  icon: Icon = Inbox,
  title = "No records found",
  description = "There is nothing to display here yet.",
  action,
  className = "",
}) {
  return (
    <div
      className={`p-10 sm:p-14 text-center flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200/80 flex items-center justify-center shadow-2xs">
        <Icon className="w-6 h-6" />
      </div>

      <div className="space-y-1 max-w-sm mx-auto">
        <h4 className="text-sm sm:text-base font-extrabold text-[#18232E]">
          {title}
        </h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          {description}
        </p>
      </div>

      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
