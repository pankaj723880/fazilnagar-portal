import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function FormSection({
  title,
  description,
  icon: Icon,
  badge,
  children,
  actions,
  collapsible = false,
  defaultOpen = true,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all ${className}`}
    >
      {(title || description || actions) && (
        <div
          className={`p-5 sm:p-6 border-b border-slate-100 flex items-start sm:items-center justify-between gap-4 ${
            collapsible ? "cursor-pointer select-none hover:bg-slate-50/50" : ""
          }`}
          onClick={collapsible ? () => setIsOpen((prev) => !prev) : undefined}
        >
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-[#18232E] font-heading">
                  {title}
                </h3>
                {badge}
              </div>
              {description && (
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {actions && <div onClick={(e) => e.stopPropagation()}>{actions}</div>}
            {collapsible && (
              <button
                type="button"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                aria-label={isOpen ? "Collapse section" : "Expand section"}
              >
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      )}

      {(!collapsible || isOpen) && <div className="p-5 sm:p-6 space-y-4">{children}</div>}
    </div>
  );
}
