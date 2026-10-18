import Breadcrumbs from "./Breadcrumbs";

export default function PageHeader({
  title,
  description,
  subtitle,
  icon: Icon,
  badge,
  badgeText,
  actions,
  primaryAction,
  breadcrumbs = [],
  onNavigate,
}) {
  // Support subtitle as an alias for description
  const displayDescription = description || subtitle;

  // Support badgeText as a shorthand badge
  const displayBadge = badge || (badgeText ? (
    <span className="text-[10px] font-bold text-[#1E293B] bg-slate-100 border border-[#E5E7EB] px-2 py-0.5 rounded-full">
      {badgeText}
    </span>
  ) : null);

  // Support primaryAction when no explicit actions JSX is provided
  const renderedActions = actions || (primaryAction ? (
    <button
      type="button"
      onClick={primaryAction.onClick}
      className="inline-flex items-center gap-2 bg-[#B8323C] hover:bg-[#991B1B] text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer active:scale-95 duration-150"
    >
      {primaryAction.icon && <primaryAction.icon className="w-4 h-4" />}
      <span>{primaryAction.label}</span>
    </button>
  ) : null);

  return (
    <div className="space-y-3 mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} onNavigate={onNavigate} />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] shadow-2xs">
        <div className="flex items-start gap-3.5 min-w-0">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#111827] border border-[#E5E7EB] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <Icon className="w-5 h-5" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight font-heading truncate">
                {title}
              </h1>
              {displayBadge}
            </div>

            {displayDescription && (
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed max-w-3xl">
                {displayDescription}
              </p>
            )}
          </div>
        </div>

        {renderedActions && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-center">
            {renderedActions}
          </div>
        )}
      </div>
    </div>
  );
}
