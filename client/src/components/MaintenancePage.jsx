import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Wrench, Clock, ShieldCheck, Lock, ExternalLink, Calendar } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function MaintenancePage({ maintenance, siteSettings, isPreview = false, onClosePreview }) {
  const m = maintenance || siteSettings?.maintenance || {};
  const message = m.message || "We are temporarily unavailable due to scheduled maintenance. Please check back soon.";
  const reopeningText = m.reopeningText || "Coming back soon";
  const expectedTimeStr = m.expectedReopeningTime;

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState(null);
  const [isPast, setIsPast] = useState(false);

  useEffect(() => {
    if (!expectedTimeStr) {
      setTimeLeft(null);
      setIsPast(false);
      return;
    }

    const targetDate = new Date(expectedTimeStr).getTime();
    if (isNaN(targetDate)) {
      setTimeLeft(null);
      setIsPast(false);
      return;
    }

    const calculateTime = () => {
      const now = Date.now();
      const diff = targetDate - now;

      if (diff <= 0) {
        setIsPast(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setIsPast(false);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [expectedTimeStr]);

  const brandFirst = siteSettings?.navigation?.brandFirst || "FAZIL";
  const brandSecond = siteSettings?.navigation?.brandSecond || "NAGAR";
  const logoUrl = siteSettings?.logoUrl || "/icon-192.svg";

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between items-center p-4 sm:p-8 font-sans transition-colors duration-200 select-none ${
        isPreview ? "relative rounded-2xl overflow-hidden border border-amber-500/30" : "fixed inset-0 z-50 overflow-y-auto"
      }`}
      style={{
        backgroundColor: "var(--background-primary, #F7F3EB)",
        color: "var(--text-primary, #292722)",
      }}
    >
      {/* Top Header: Branding, Preview Banner & Theme Toggle */}
      <header className="w-full max-w-4xl flex items-center justify-between py-2 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#A83D32] flex items-center justify-center text-white shadow-md overflow-hidden p-1.5 shrink-0">
            <img
              src={logoUrl}
              alt="Fazilnagar Portal"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-extrabold tracking-tight font-heading flex items-center gap-0.5">
              <span className="text-[#292722] dark:text-[#F5F0E7]">{brandFirst}</span>
              <span className="text-[#A83D32] dark:text-[#C45A4C]">{brandSecond}</span>
            </div>
            <p className="text-[10px] sm:text-xs text-[#524E47] dark:text-[#C0B8AA] font-medium tracking-wide">
              Official Civic &amp; Municipal Portal • PIN 274401
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPreview && (
            <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Preview Mode
            </span>
          )}
          {isPreview && onClosePreview && (
            <button
              type="button"
              onClick={onClosePreview}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Exit Preview
            </button>
          )}
          <ThemeToggle compact={true} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-2xl my-auto py-8 sm:py-12 flex flex-col items-center text-center">
        {/* Animated Badge & Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-amber-500/10 dark:bg-amber-500/20 border-2 border-amber-500/30 flex items-center justify-center shadow-lg">
            <Wrench className="w-10 h-10 sm:w-12 sm:h-12 text-[#A83D32] dark:text-[#C45A4C] animate-pulse" />
          </div>
          <span className="absolute -bottom-2 -right-2 bg-[#A83D32] dark:bg-[#C45A4C] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" /> Scheduled
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-heading mb-3">
          Under Scheduled Maintenance
        </h1>
        <p className="text-xs sm:text-sm text-[#A83D32] dark:text-[#C45A4C] font-semibold tracking-wide uppercase mb-6">
          अस्थायी रखरखाव जारी है • कृपया प्रतीक्षा करें
        </p>

        {/* Configured Maintenance Message Card */}
        <div
          className="w-full rounded-2xl p-5 sm:p-7 border mb-8 shadow-sm text-left sm:text-center leading-relaxed"
          style={{
            backgroundColor: "var(--surface-card, #FFFFFF)",
            borderColor: "var(--border-color, #DED5C7)",
          }}
        >
          <p className="text-sm sm:text-base text-[#292722] dark:text-[#F5F0E7] font-medium whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Reopening & Countdown Section */}
        <div className="w-full space-y-4 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-200/70 dark:bg-slate-800/80 text-xs font-semibold text-[#524E47] dark:text-[#C0B8AA]">
            <Calendar className="w-3.5 h-3.5 text-[#A83D32] dark:text-[#C45A4C]" />
            <span>Expected Reopening: <strong className="text-[#292722] dark:text-[#F5F0E7]">{reopeningText}</strong></span>
          </div>

          {/* Countdown Clock (Only shown when future target date is valid and active) */}
          {timeLeft && !isPast && (
            <div className="pt-2">
              <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-sm sm:max-w-md mx-auto">
                <div
                  className="rounded-2xl p-3 sm:p-4 border text-center shadow-xs"
                  style={{
                    backgroundColor: "var(--surface-card, #FFFFFF)",
                    borderColor: "var(--border-color, #DED5C7)",
                  }}
                >
                  <div className="text-xl sm:text-3xl font-black text-[#A83D32] dark:text-[#C45A4C] font-mono">
                    {String(timeLeft.days).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] sm:text-xs font-semibold text-[#524E47] dark:text-[#C0B8AA] uppercase tracking-wider mt-1">
                    Days
                  </div>
                </div>

                <div
                  className="rounded-2xl p-3 sm:p-4 border text-center shadow-xs"
                  style={{
                    backgroundColor: "var(--surface-card, #FFFFFF)",
                    borderColor: "var(--border-color, #DED5C7)",
                  }}
                >
                  <div className="text-xl sm:text-3xl font-black text-[#A83D32] dark:text-[#C45A4C] font-mono">
                    {String(timeLeft.hours).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] sm:text-xs font-semibold text-[#524E47] dark:text-[#C0B8AA] uppercase tracking-wider mt-1">
                    Hours
                  </div>
                </div>

                <div
                  className="rounded-2xl p-3 sm:p-4 border text-center shadow-xs"
                  style={{
                    backgroundColor: "var(--surface-card, #FFFFFF)",
                    borderColor: "var(--border-color, #DED5C7)",
                  }}
                >
                  <div className="text-xl sm:text-3xl font-black text-[#A83D32] dark:text-[#C45A4C] font-mono">
                    {String(timeLeft.minutes).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] sm:text-xs font-semibold text-[#524E47] dark:text-[#C0B8AA] uppercase tracking-wider mt-1">
                    Mins
                  </div>
                </div>

                <div
                  className="rounded-2xl p-3 sm:p-4 border text-center shadow-xs"
                  style={{
                    backgroundColor: "var(--surface-card, #FFFFFF)",
                    borderColor: "var(--border-color, #DED5C7)",
                  }}
                >
                  <div className="text-xl sm:text-3xl font-black text-[#A83D32] dark:text-[#C45A4C] font-mono animate-pulse">
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] sm:text-xs font-semibold text-[#524E47] dark:text-[#C0B8AA] uppercase tracking-wider mt-1">
                    Secs
                  </div>
                </div>
              </div>
            </div>
          )}

          {isPast && (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Maintenance window concluded. Reopening momentarily…
            </p>
          )}
        </div>

        {/* Emergency Assistance Note */}
        <div className="text-xs text-[#524E47] dark:text-[#C0B8AA] max-w-md">
          Emergency civic or medical helpline: <strong className="text-[#292722] dark:text-[#F5F0E7] font-mono">112</strong> / <strong className="text-[#292722] dark:text-[#F5F0E7] font-mono">108</strong> • CHC Fazilnagar: <strong className="text-[#292722] dark:text-[#F5F0E7] font-mono">05564-222102</strong>
        </div>
      </main>

      {/* Footer: Admin Login Shortcut & Verification */}
      <footer className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--border-color,#DED5C7)] text-xs text-[#524E47] dark:text-[#C0B8AA]">
        <div className="flex items-center gap-1.5 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Fazilnagar Municipal Portal • System Integrity Guard</span>
        </div>

        {!isPreview && (
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color,#DED5C7)] hover:border-[#A83D32] hover:text-[#A83D32] dark:hover:text-[#C45A4C] transition text-[11px] font-semibold cursor-pointer"
          >
            <Lock className="w-3 h-3" />
            <span>Administrator Login</span>
          </Link>
        )}
      </footer>
    </div>
  );
}
