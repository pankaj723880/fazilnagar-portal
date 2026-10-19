import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import API from "../api";
import { setAuthSession } from "../utils/authStorage";
import { usePageSEO } from "../utils/seo";
import GoogleSignInButton from "../components/GoogleSignInButton";

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

      setSuccessMsg(res.data.message || "Verification code sent to your email.");
      setStep("otp");
      setResendCooldown(60);
      setExpirySeconds(600);
    } catch (err) {
      const serverMessage =
        err.response?.data?.message || err.message || "Registration failed. Try again.";
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
        err.response?.data?.message || err.message || "Invalid verification code.";
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
      setSuccessMsg(res.data.message || "A new verification code has been sent.");
      setResendCooldown(60);
      setExpirySeconds(600);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to resend verification code.";
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
    <div className="max-w-md mx-auto my-10 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
        {step === "form" ? "Create Account / नया खाता" : "Verify Email / ईमेल सत्यापन"}
      </h2>
      <p className="text-xs text-center text-slate-500 mb-6">
        {step === "form"
          ? "Join Fazilnagar Town Portal community as a verified citizen"
          : `Enter the 6-digit verification code sent to ${email}`}
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold mb-4 text-center border border-red-100">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs font-semibold mb-4 text-center border border-emerald-100">
          {successMsg}
        </div>
      )}

      {step === "form" ? (
        <>
          {/* Google Sign-in */}
          <div className="mb-5">
            <GoogleSignInButton
              setUser={setUser}
              redirectPath={redirectPath}
              onError={setError}
            />
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 font-medium">Or register with email / या ईमेल से</span>
            </div>
          </div>

          <form onSubmit={handleInitiateRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name / पूरा नाम</label>
              <input
                type="text"
                value={name}
                autoComplete="name"
                maxLength={50}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Username / यूज़रनेम (@handle)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-mono">@</span>
                <input
                  type="text"
                  value={username}
                  autoComplete="username"
                  maxLength={20}
                  placeholder="e.g. rahul_kumar"
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600 text-sm font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-400">Used for Fazilnagar town messaging handle.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mobile Number / मोबाइल नंबर</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-mono">+91</span>
                <input
                  type="tel"
                  value={phone}
                  autoComplete="tel"
                  maxLength={15}
                  placeholder="9876543210"
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\s-]/g, ""))}
                  className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600 text-sm font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-400">Optional: Must be unique if provided.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address / ईमेल</label>
              <input
                type="email"
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Password / पासवर्ड</label>
              <input
                type="password"
                value={password}
                autoComplete="new-password"
                minLength={6}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600 text-sm"
                required
              />
              <span className="text-[10px] text-slate-400">Must be at least 6 characters long.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors shadow-md disabled:opacity-50 text-sm cursor-pointer"
            >
              {loading ? "Sending verification code..." : "Send Verification Code / कोड भेजें"}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-red-700 font-bold hover:underline">
              Login here / लॉगिन करें
            </Link>
          </p>
        </>
      ) : (
        /* STEP 2: OTP VERIFICATION UI */
        <div className="space-y-5">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">Verification Code Sent To</span>
            <div className="text-sm font-bold text-slate-800 mt-0.5">{email}</div>
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setError("");
                setSuccessMsg("");
              }}
              className="text-xs text-red-700 font-medium hover:underline mt-1"
            >
              Change Email / ईमेल बदलें
            </button>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">6-Digit Code / 6-अंकों का कोड</label>
                <span className="text-xs font-mono font-bold text-slate-500">
                  Expires in: {formatTime(expirySeconds)}
                </span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                autoFocus
                placeholder="123456"
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600 text-center text-2xl font-mono tracking-[0.5em] font-extrabold text-slate-800"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6 || expirySeconds <= 0}
              className="w-full py-3 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl transition-colors shadow-md disabled:opacity-50 text-sm cursor-pointer"
            >
              {loading ? "Verifying..." : "Verify & Activate Account / खाता सक्रिय करें"}
            </button>
          </form>

          <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-100">
            <span className="text-slate-500">Didn't receive the code?</span>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || loading}
              className="text-red-700 font-bold hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code / पुनः भेजें"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}