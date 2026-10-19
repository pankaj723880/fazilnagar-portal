import { ShieldCheck, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Reusable, compact, production-ready Civic Auth Card layout for Fazilnagar Town Portal.
 * Features full-page Fazilnagar town background, warm cream translucent overlay,
 * fluid responsiveness, compact vertical rhythm, and natural document scrolling.
 */
export default function AuthLayout({
  title,
  subtitle,
  badgeText = "फाजिलनगर नागरिक पोर्टल • PIN 274401",
  illustration,
  currentStep,
  totalSteps,
  stepLabel,
  error,
  success,
  info,
  children,
  maxWidth = "max-w-[430px]",
}) {
  return (
    <div
      className="min-h-[calc(100dvh-64px)] w-full flex-1 flex flex-col items-center justify-center py-4 sm:py-6 px-3.5 sm:px-6 relative bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/fzn.png')" }}
    >
      {/* Subtle translucent warm cream overlay in light mode, deep navy overlay in dark mode */}
      <div
        className="absolute inset-0 bg-[#FFFDF8]/85 dark:bg-[#0B1320]/85 backdrop-blur-[2px] transition-colors"
        aria-hidden="true"
      />

      {/* Ambient warm glow emphasizing the golden-hour temple palette */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[320px] bg-amber-500/[0.08] dark:bg-amber-400/[0.05] rounded-full blur-3xl" />
      </div>

      <div
        className={`relative z-10 w-full ${maxWidth} my-auto bg-white/95 dark:bg-[#151F2E]/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-[0_12px_40px_-10px_rgba(15,23,42,0.14)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] transition-all`}
      >
        {/* Header Section */}
        <div className="flex flex-col items-center text-center">
          {/* Page-Specific Icon / Illustration */}
          {illustration && (
            <div className="flex justify-center mb-1 animate-fadeIn">
              {illustration}
            </div>
          )}

          {/* Civic Badge */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[10.5px] font-semibold bg-red-50/90 dark:bg-red-950/70 text-red-700 dark:text-red-400 border border-red-200/80 dark:border-red-800/60 mb-1.5 hover:bg-red-100/80 transition-colors shadow-2xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            <span>{badgeText}</span>
          </Link>

          {/* Progress Indicator for Multi-step workflows */}
          {currentStep && totalSteps && (
            <div className="w-full mb-2">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">
                <span>
                  Step {currentStep} of {totalSteps}
                </span>
                {stepLabel && <span className="text-red-700 dark:text-red-400 font-bold">{stepLabel}</span>}
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-red-700 dark:bg-red-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          )}

          <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            {title}
          </h1>

          {subtitle && (
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-2 leading-relaxed max-w-sm">
              {subtitle}
            </p>
          )}
        </div>

        {/* Unified Alert Boxes */}
        {error && (
          <div
            role="alert"
            className="bg-red-50/95 dark:bg-red-950/50 border border-red-200/90 dark:border-red-800/60 text-red-700 dark:text-red-300 rounded-xl p-2 text-xs font-medium mb-2.5 flex items-start gap-2 animate-fadeIn"
          >
            <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="bg-emerald-50/95 dark:bg-emerald-950/50 border border-emerald-200/90 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 rounded-xl p-2 text-xs font-medium mb-2.5 flex items-start gap-2 animate-fadeIn"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{success}</div>
          </div>
        )}

        {info && (
          <div
            role="status"
            className="bg-slate-50/95 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl p-2 text-xs font-medium mb-2.5 flex items-start gap-2 animate-fadeIn"
          >
            <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{info}</div>
          </div>
        )}

        {/* Form Body */}
        {children}
      </div>

      {/* Trust & Security Verification Footer */}
      <div className="mt-2.5 sm:mt-3 flex items-center justify-center gap-1.5 text-[10px] sm:text-[10.5px] font-medium text-slate-700 dark:text-slate-300 bg-white/85 dark:bg-[#151F2E]/85 backdrop-blur-md px-3 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-800/80 shadow-2xs relative z-10">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Official Civic Portal • 256-Bit SSL Encrypted Verification</span>
      </div>
    </div>
  );
}
