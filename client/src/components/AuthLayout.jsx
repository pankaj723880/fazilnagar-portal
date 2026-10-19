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
      className="min-h-[calc(100dvh-64px)] w-full flex-1 flex flex-col items-center justify-center py-8 sm:py-12 lg:py-16 px-4 sm:px-6 relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/images/fzn.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Subtle translucent calming off-white overlay in light mode, deep dark overlay in dark mode */}
      <div
        className="absolute inset-0 bg-[#F8FAFC]/90 dark:bg-[#0B0F17]/90 backdrop-blur-[2px] transition-colors"
        aria-hidden="true"
      />

      {/* Ambient subtle glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[360px] bg-slate-400/[0.04] dark:bg-white/[0.03] rounded-full blur-3xl" />
      </div>

      <div
        className={`relative z-10 w-full ${maxWidth} my-auto bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-md border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-[0_2px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] transition-all`}
      >
        {/* Header Section */}
        <div className="flex flex-col items-center text-center">
          {/* Page-Specific Icon / Illustration */}
          {illustration && (
            <div className="flex justify-center mb-2 animate-fadeIn">
              {illustration}
            </div>
          )}

          {/* Civic Badge - Soft Pastel Pill */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/20 mb-3 hover:bg-rose-500/15 transition-colors shadow-2xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            <span>{badgeText}</span>
          </Link>

          {/* Progress Indicator for Multi-step workflows */}
          {currentStep && totalSteps && (
            <div className="w-full mb-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                <span>
                  Step {currentStep} of {totalSteps}
                </span>
                {stepLabel && <span className="text-[#0F172A] dark:text-white font-bold">{stepLabel}</span>}
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#0F172A] dark:bg-white h-full rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          )}

          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0F172A] dark:text-white leading-tight font-heading">
            {title}
          </h1>

          {subtitle && (
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 mb-4 leading-relaxed max-w-sm">
              {subtitle}
            </p>
          )}
        </div>

        {/* Unified Alert Boxes */}
        {error && (
          <div
            role="alert"
            className="bg-red-500/8 border border-red-500/20 text-red-900 dark:text-red-300 rounded-2xl p-3 text-xs sm:text-sm font-medium mb-4 flex items-start gap-2.5 animate-fadeIn"
          >
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="bg-emerald-500/8 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 rounded-2xl p-3 text-xs sm:text-sm font-medium mb-4 flex items-start gap-2.5 animate-fadeIn"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{success}</div>
          </div>
        )}

        {info && (
          <div
            role="status"
            className="bg-slate-500/8 border border-slate-500/20 text-slate-800 dark:text-slate-300 rounded-2xl p-3 text-xs sm:text-sm font-medium mb-4 flex items-start gap-2.5 animate-fadeIn"
          >
            <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{info}</div>
          </div>
        )}

        {/* Form Body */}
        {children}
      </div>

      {/* Trust & Security Verification Footer */}
      <div className="mt-4 sm:mt-6 flex items-center justify-center gap-2 text-xs font-medium text-[#64748B] dark:text-[#94A3B8] bg-white/90 dark:bg-[#1E293B]/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-200/60 dark:border-white/10 shadow-xs relative z-10">
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Official Civic Portal • 256-Bit SSL Encrypted Verification</span>
      </div>
    </div>
  );
}
