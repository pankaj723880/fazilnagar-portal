import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  User,
  AtSign,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Clock,
  RotateCcw,
  CheckCircle2,
  Edit2,
  Users,
  ShieldCheck,
  MailCheck,
} from "lucide-react";
import API from "../api";
import { setAuthSession } from "../utils/authStorage";
import { usePageSEO } from "../utils/seo";
import GoogleSignInButton from "../components/GoogleSignInButton";
import AuthLayout from "../components/AuthLayout";

export default function Register({ setUser }) {
  usePageSEO({
    title: "Register Citizen Account | Fazilnagar Town Portal",
    description: "Create an account on the Fazilnagar Town Portal to post community news, local listings, and town messaging.",
    canonicalPath: "/register",
    noIndex: true,
  });

  // Step 1: "form", Step 2: "otp"
  const [step, setStep] = useState("form");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expirySeconds, setExpirySeconds] = useState(600); // 10 minutes

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from || "/";

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

  // Step 1: Initiate registration and dispatch OTP
  const handleInitiateRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    const cleanUsername = username.toLowerCase().trim();

    try {
      const res = await API.post("/auth/register", {
        name: name.trim(),
        username: cleanUsername || undefined,
        phone: phone.trim() || undefined,
        email: email.trim(),
        password,
      });

      setSuccessMsg(res.data?.message || "Verification code dispatched to your email address.");
      setStep("otp");
      setResendCooldown(60);
      setExpirySeconds(600);
    } catch (err) {
      setSuccessMsg(""); // Ensure success is never shown on delivery or validation failure
      const serverMessage =
        err.response?.data?.message || err.message || "Registration failed. Please check your details and try again.";
      setError(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP and activate account
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await API.post("/auth/register/verify", {
        email: email.trim(),
        otp: otp.trim(),
      });

      const userData = res.data.user;
      setAuthSession(res.data.token, userData);
      if (setUser) setUser(userData);

      navigate(redirectPath, { replace: true });
    } catch (err) {
      const serverMessage =
        err.response?.data?.message || err.message || "Invalid or expired verification code.";
      setError(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await API.post("/auth/register/resend", {
        email: email.trim(),
      });
      setSuccessMsg(res.data?.message || "A new 6-digit verification code has been sent.");
      setResendCooldown(60);
      setExpirySeconds(600);
      setOtp("");
    } catch (err) {
      setSuccessMsg("");
      const msg = err.response?.data?.message || err.message || "Failed to resend verification code.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <AuthLayout
      title={step === "form" ? "Create Citizen Account / नया खाता" : "Verify Email / ईमेल सत्यापन"}
      subtitle={
        step === "form"
          ? "Join Fazilnagar Town Portal community as a verified citizen to submit local updates and access civic resources."
          : `We dispatched a 6-digit security code to verify your account registration.`
      }
      currentStep={step === "form" ? 1 : 2}
      totalSteps={2}
      stepLabel={step === "form" ? "Citizen Details" : "Email Verification"}
      error={error}
      success={successMsg}
      maxWidth={step === "form" ? "max-w-[450px]" : "max-w-[400px]"}
      illustration={
        step === "form" ? (
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-linear-to-br from-red-600/10 via-amber-500/15 to-red-700/15 border border-red-200/80 dark:border-red-900/50 flex items-center justify-center text-red-700 dark:text-red-400 shadow-2xs">
            <Users className="w-5 h-5" />
          </div>
        ) : (
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-linear-to-br from-amber-500/15 via-red-500/10 to-amber-600/15 border border-amber-200/80 dark:border-amber-900/50 flex items-center justify-center text-red-700 dark:text-amber-400 shadow-2xs">
            <Mail className="w-5 h-5" />
          </div>
        )
      }
    >
      {step === "form" ? (
        <>
          {/* Google Sign-in */}
          <div className="mb-2 sm:mb-2.5">
            <GoogleSignInButton
              setUser={setUser}
              redirectPath={redirectPath}
              onError={setError}
            />
          </div>

          {/* SaaS Divider */}
          <div className="relative my-2 sm:my-2.5">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white/90 dark:bg-[#151F2E]/90 px-2.5 text-slate-400 dark:text-slate-500 font-medium text-[10.5px]">
                Or register with email / या ईमेल द्वारा
              </span>
            </div>
          </div>

          <form onSubmit={handleInitiateRegister} className="space-y-2">
            {/* Full Name */}
            <div>
              <label className="block text-[11.5px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                Full Name / पूरा नाम <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={name}
                  autoComplete="name"
                  maxLength={50}
                  placeholder="e.g. Ramesh Kumar"
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 sm:h-10.5 pl-9 pr-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2637] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-600 focus:ring-3 focus:ring-red-600/15 text-xs sm:text-sm transition-all"
                  required
                />
              </div>
            </div>

            {/* Username & Mobile Number (2-Column Grid on sm+ screens) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {/* Username */}
              <div>
                <label className="block text-[11.5px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                  Username / यूज़रनेम
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 font-mono text-xs">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    autoComplete="username"
                    maxLength={20}
                    placeholder="ramesh_kumar"
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    className="w-full h-10 sm:h-10.5 pl-7.5 pr-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2637] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-600 focus:ring-3 focus:ring-red-600/15 text-xs sm:text-sm font-mono transition-all"
                  />
                </div>
                <span className="block text-[9.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Unique handle (3-20 chars)
                </span>
              </div>

              {/* Mobile Phone */}
              <div>
                <label className="block text-[11.5px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                  Mobile / मोबाइल नंबर
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 font-mono text-xs">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    autoComplete="tel"
                    maxLength={15}
                    placeholder="9876543210"
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\s-]/g, ""))}
                    className="w-full h-10 sm:h-10.5 pl-11 pr-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2637] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-600 focus:ring-3 focus:ring-red-600/15 text-xs sm:text-sm font-mono transition-all"
                  />
                </div>
                <span className="block text-[9.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Optional: For local alerts
                </span>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-[11.5px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                Email Address / ईमेल पता <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  autoComplete="email"
                  placeholder="name@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 sm:h-10.5 pl-9 pr-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2637] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-600 focus:ring-3 focus:ring-red-600/15 text-xs sm:text-sm transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[11.5px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                Password / पासवर्ड <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  autoComplete="new-password"
                  minLength={6}
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 sm:h-10.5 pl-9 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2637] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-600 focus:ring-3 focus:ring-red-600/15 text-xs sm:text-sm transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="block text-[9.5px] text-slate-400 dark:text-slate-500 mt-0.5">
                Must be at least 6 characters long
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 sm:h-10.5 mt-0.5 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold rounded-xl transition-all shadow-xs hover:shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending verification code...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code / कोड भेजें</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Email verification helper badge */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
              <MailCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>A 6-digit verification code will be sent to your email</span>
            </div>
          </form>

          {/* Switch to Login Link */}
          <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Already have an account? / पहले से खाता है? </span>
            <Link
              to="/login"
              className="text-red-700 dark:text-red-400 font-bold hover:underline inline-flex items-center gap-1 transition-colors"
            >
              Login here / लॉगिन करें
            </Link>
          </div>
        </>
      ) : (
        /* STEP 2: OTP VERIFICATION UI */
        <div className="space-y-3">
          {/* Destination Email Summary Card */}
          <div className="bg-slate-50 dark:bg-[#1A2637] p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-center transition-colors">
            <div className="flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              <Mail className="w-3.5 h-3.5" />
              <span>Verification Code Dispatched To</span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5 break-all">
              {email}
            </div>
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setError("");
                setSuccessMsg("");
              }}
              className="inline-flex items-center gap-1 text-[10.5px] text-red-700 dark:text-red-400 font-semibold hover:underline mt-0.5 cursor-pointer transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              <span>Change Email / ईमेल बदलें</span>
            </button>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11.5px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300">
                  6-Digit Security Code / 6-अंकों का कोड
                </label>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-mono font-bold text-slate-500 dark:text-slate-400">
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
                  className="w-full h-11 sm:h-12 px-4 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2637] text-slate-900 dark:text-white focus:outline-none focus:border-red-600 focus:ring-3 focus:ring-red-600/15 text-center text-xl sm:text-2xl font-mono tracking-[0.3em] sm:tracking-[0.45em] font-extrabold transition-all"
                  required
                />
              </div>
              <span className="block text-[10px] text-slate-400 dark:text-slate-500 text-center mt-1">
                Check your inbox or spam folder for your 6-digit registration code.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6 || expirySeconds <= 0}
              className="w-full h-10 sm:h-10.5 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold rounded-xl transition-all shadow-xs hover:shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Activating Account...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Verify & Activate Account / खाता सक्रिय करें</span>
                </>
              )}
            </button>
          </form>

          {/* Resend Cooldown Section */}
          <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 text-[10.5px]">Didn't receive the code?</span>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || loading}
              className="inline-flex items-center gap-1 text-red-700 dark:text-red-400 font-bold hover:underline disabled:text-slate-400 dark:disabled:text-slate-600 disabled:no-underline cursor-pointer transition-colors text-[10.5px]"
            >
              <RotateCcw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              <span>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code / पुनः भेजें"}
              </span>
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}