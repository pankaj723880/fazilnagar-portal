import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Clock,
  RotateCcw,
  CheckCircle2,
  KeyRound,
  Edit2,
  ShieldCheck,
  Shield,
} from "lucide-react";
import API from "../api";
import { usePageSEO } from "../utils/seo";
import AuthLayout from "../components/AuthLayout";

export default function ForgotPassword() {
  usePageSEO({
    title: "Reset Password | Fazilnagar Town Portal",
    description: "Reset your Fazilnagar Town Portal citizen account password securely using email verification OTP.",
    canonicalPath: "/forgot-password",
    noIndex: true,
  });

  // Steps: "email" (1) -> "otp" (2) -> "new-password" (3) -> "success"
  const [step, setStep] = useState("email");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);
  const [expirySeconds, setExpirySeconds] = useState(600);

  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Countdown timer for resend cooldown and 10-minute expiry
  useEffect(() => {
    let timer = null;
    if (step === "otp") {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step]);

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");
    setLoading(true);

    try {
      const res = await API.post("/auth/forgot-password", {
        email: email.trim(),
      });
      setInfoMsg(res.data?.message || "Verification code dispatched to your registered email.");
      setStep("otp");
      setResendCooldown(60);
      setExpirySeconds(600);
      setOtp("");
    } catch (err) {
      setInfoMsg(""); // Prevent showing false success on delivery failure
      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to dispatch reset code. Please check your email and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");
    setLoading(true);

    try {
      const res = await API.post("/auth/forgot-password/verify", {
        email: email.trim(),
        otp: otp.trim(),
      });

      if (!res.data.resetToken) {
        throw new Error("Reset authorization token was not returned by server.");
      }

      setResetToken(res.data.resetToken);
      setStep("new-password");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Invalid or expired verification code. Please check your code or request a new one."
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError("");
    setInfoMsg("");
    setLoading(true);

    try {
      const res = await API.post("/auth/forgot-password", {
        email: email.trim(),
      });
      setInfoMsg(res.data?.message || "A new 6-digit reset code has been dispatched.");
      setResendCooldown(60);
      setExpirySeconds(600);
      setOtp("");
    } catch (err) {
      setInfoMsg("");
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to resend recovery code. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set New Password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter identical passwords.");
      return;
    }

    setLoading(true);

    try {
      const res = await API.post("/auth/reset-password", {
        email: email.trim(),
        resetToken,
        newPassword,
      });

      setInfoMsg(res.data?.message || "Password successfully updated.");
      setStep("success");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to update password. Your reset session may have expired. Please start over."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Password strength meter calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: "", color: "", text: "" };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[0-9]/.test(pwd) && /[a-zA-Z]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 1) {
      return { score: 1, label: "Weak / कमज़ोर", color: "bg-red-500", text: "text-red-600 dark:text-red-400" };
    }
    if (score <= 3) {
      return { score: 2, label: "Moderate / मध्यम", color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
    }
    return { score: 3, label: "Strong / मजबूत", color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
  };

  const strength = getPasswordStrength(newPassword);

  // Step configuration for headers, progress bars & tailored illustrations
  const stepConfig = {
    email: {
      currentStep: 1,
      stepLabel: "Account Search",
      title: "Reset Password / पासवर्ड रीसेट",
      subtitle: "Enter your registered citizen email address to receive a secure 6-digit recovery code.",
      illustration: (
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-linear-to-br from-amber-500/15 via-red-500/10 to-amber-600/15 border border-amber-200/80 dark:border-amber-900/50 flex items-center justify-center text-red-700 dark:text-amber-400 shadow-2xs">
          <KeyRound className="w-5 h-5" />
        </div>
      ),
    },
    otp: {
      currentStep: 2,
      stepLabel: "Code Verification",
      title: "Enter Reset Code / कोड दर्ज करें",
      subtitle: `We sent a 6-digit recovery code to verify your identity before resetting your password.`,
      illustration: (
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-linear-to-br from-red-600/10 via-amber-500/10 to-red-700/15 border border-red-200/80 dark:border-red-900/50 flex items-center justify-center text-red-700 dark:text-red-400 shadow-2xs">
          <Mail className="w-5 h-5" />
        </div>
      ),
    },
    "new-password": {
      currentStep: 3,
      stepLabel: "New Password",
      title: "Set New Password / नया पासवर्ड",
      subtitle: "Choose a strong, unique password for your Fazilnagar Town Portal account.",
      illustration: (
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-linear-to-br from-red-600/10 via-amber-500/10 to-red-700/15 border border-red-200/80 dark:border-red-900/50 flex items-center justify-center text-red-700 dark:text-red-400 shadow-2xs">
          <ShieldCheck className="w-5 h-5" />
        </div>
      ),
    },
    success: {
      currentStep: null,
      stepLabel: null,
      title: "Password Updated / पासवर्ड बदला गया",
      subtitle: "Your credentials have been securely refreshed. Previous sessions were invalidated.",
      illustration: (
        <div className="w-10 h-10 sm:w-11 sm:h-11 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mx-auto border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs animate-bounce-short">
          <CheckCircle2 className="w-5.5 h-5.5" />
        </div>
      ),
    },
  }[step];

  return (
    <AuthLayout
      maxWidth="max-w-[420px]"
      title={stepConfig.title}
      subtitle={stepConfig.subtitle}
      illustration={stepConfig.illustration}
      currentStep={stepConfig.currentStep}
      totalSteps={step === "success" ? null : 3}
      stepLabel={stepConfig.stepLabel}
      error={error}
      info={infoMsg}
    >
      {/* ========================================================= */}
      {/* STEP 1: ENTER REGISTERED EMAIL */}
      {/* ========================================================= */}
      {step === "email" && (
        <form onSubmit={handleRequestOtp} className="space-y-2.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Registered Email / पंजीकृत ईमेल
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                value={email}
                autoComplete="email"
                autoFocus
                placeholder="name@example.com"
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 sm:h-10.5 pl-10 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2637] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/15 text-sm transition-all"
                required
              />
            </div>
            <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              We'll send a 6-digit one-time recovery code to this email
            </span>
          </div>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full h-10 sm:h-10.5 mt-1 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-red-950/10 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-sm cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending recovery code...</span>
              </>
            ) : (
              <>
                <span>Send Reset Code / रीसेट कोड भेजें</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Subtle Security Decorative Element */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
            <Shield className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Encrypted municipal verification code delivery</span>
          </div>

          <div className="text-center pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login / लॉगिन पृष्ठ पर वापस</span>
            </Link>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* STEP 2: VERIFY RESET OTP */}
      {/* ========================================================= */}
      {step === "otp" && (
        <div className="space-y-3">
          {/* Destination Email Info Panel */}
          <div className="bg-slate-50 dark:bg-[#1A2637] p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-center transition-colors">
            <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              <Mail className="w-3 h-3" />
              <span>Recovery Code Dispatched To</span>
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 break-all">
              {email}
            </div>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError("");
                setInfoMsg("");
              }}
              className="inline-flex items-center gap-1 text-[11px] text-red-700 dark:text-red-400 font-semibold hover:underline mt-0.5 cursor-pointer transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              <span>Change Email / ईमेल बदलें</span>
            </button>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  6-Digit Recovery Code / 6-अंकों का कोड
                </label>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Expires in: {formatTime(expirySeconds)}</span>
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  autoFocus
                  placeholder="••••••"
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  className="w-full h-11 sm:h-12 px-4 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2637] text-slate-900 dark:text-white focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/15 text-center text-xl sm:text-2xl font-mono tracking-[0.3em] sm:tracking-[0.4em] font-extrabold transition-all"
                  required
                />
              </div>
              <span className="block text-[10px] text-slate-400 dark:text-slate-500 text-center mt-1">
                Check your inbox or spam folder for your 6-digit recovery code.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6 || expirySeconds <= 0}
              className="w-full h-10 sm:h-10.5 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-red-950/10 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-sm cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Verify Code / कोड सत्यापित करें</span>
                </>
              )}
            </button>
          </form>

          {/* Resend Cooldown Section */}
          <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">Didn't receive code?</span>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || loading}
              className="inline-flex items-center gap-1.5 text-red-700 dark:text-red-400 font-bold hover:underline disabled:text-slate-400 dark:disabled:text-slate-600 disabled:no-underline cursor-pointer transition-colors text-[11px]"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code / पुनः भेजें"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 3: SET NEW PASSWORD & CONFIRMATION */}
      {/* ========================================================= */}
      {step === "new-password" && (
        <form onSubmit={handleUpdatePassword} className="space-y-2.5">
          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              New Password / नया पासवर्ड
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                autoComplete="new-password"
                minLength={6}
                autoFocus
                placeholder="At least 6 characters"
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-10 sm:h-10.5 pl-10 pr-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2637] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/15 text-sm transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {newPassword.length > 0 && (
              <div className="mt-1 space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 dark:text-slate-500">Strength / मजबूती:</span>
                  <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 h-1">
                  <div className={`rounded-full transition-colors ${strength.score >= 1 ? strength.color : "bg-slate-200 dark:bg-slate-700"}`} />
                  <div className={`rounded-full transition-colors ${strength.score >= 2 ? strength.color : "bg-slate-200 dark:bg-slate-700"}`} />
                  <div className={`rounded-full transition-colors ${strength.score >= 3 ? strength.color : "bg-slate-200 dark:bg-slate-700"}`} />
                </div>
              </div>
            )}

            <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Use at least 6 characters with letters and numbers
            </span>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Confirm New Password / पासवर्ड की पुष्टि करें
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                autoComplete="new-password"
                minLength={6}
                placeholder="Re-enter new password"
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-10 sm:h-10.5 pl-10 pr-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2637] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/15 text-sm transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Match Indicator */}
            {confirmPassword.length > 0 && (
              <div className="mt-1 text-[10.5px] font-medium flex items-center gap-1.5">
                {newPassword === confirmPassword ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Passwords match / पासवर्ड मेल खाते हैं
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">
                    Passwords do not match / पासवर्ड मेल नहीं खाते
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            className="w-full h-10 sm:h-10.5 mt-1 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-red-950/10 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-sm cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating password...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Update Password / पासवर्ड सहेजें</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* ========================================================= */}
      {/* STEP 4: SUCCESS SCREEN */}
      {/* ========================================================= */}
      {step === "success" && (
        <div className="text-center py-1 space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            Your password has been successfully updated and previous sessions were invalidated for security. You can now sign in with your new password.
          </p>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full h-10 sm:h-11 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-red-950/10 active:scale-[0.99] text-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Return to Login / लॉगिन करें</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
