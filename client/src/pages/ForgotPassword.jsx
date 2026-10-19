import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import { usePageSEO } from "../utils/seo";

export default function ForgotPassword() {
  usePageSEO({
    title: "Reset Password | Fazilnagar Town Portal",
    description: "Reset your Fazilnagar Town Portal citizen account password securely using email verification OTP.",
    canonicalPath: "/forgot-password",
    noIndex: true,
  });

  // Steps: "email" -> "otp" -> "new-password" -> "success"
  const [step, setStep] = useState("email");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  // Step 1: Request Password Reset OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");
    setLoading(true);

    try {
      const res = await API.post("/auth/forgot-password", {
        email: email.trim(),
      });

      setInfoMsg(res.data.message || "If an account exists, a 6-digit code has been sent.");
      setStep("otp");
      setResendCooldown(60);
      setExpirySeconds(600);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to process request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and obtain single-use reset authorization token
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
        throw new Error("Reset authorization token not received.");
      }

      setResetToken(res.data.resetToken);
      setStep("new-password");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired reset code.");
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
      setInfoMsg(res.data.message || "A new 6-digit reset code has been sent.");
      setResendCooldown(60);
      setExpirySeconds(600);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to resend code.");
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
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await API.post("/auth/reset-password", {
        email: email.trim(),
        resetToken,
        newPassword,
        confirmPassword,
      });

      setStep("success");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update password. Please try again.");
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
      {/* SUCCESS SCREEN */}
      {step === "success" ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-black border border-emerald-200">
            ✓
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            Password Updated / पासवर्ड बदला गया
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            Your password has been successfully updated and previous sessions were invalidated for security. You can now log in with your new password.
          </p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full py-3 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl transition-colors shadow-md text-sm cursor-pointer"
          >
            Return to Login / लॉगिन करें
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
            {step === "email" && "Reset Password / पासवर्ड रीसेट"}
            {step === "otp" && "Enter Reset Code / कोड दर्ज करें"}
            {step === "new-password" && "Set New Password / नया पासवर्ड"}
          </h2>

          <p className="text-xs text-center text-slate-500 mb-6">
            {step === "email" && "Enter your registered email address to receive a 6-digit recovery code."}
            {step === "otp" && `We sent a 6-digit recovery code to ${email}`}
            {step === "new-password" && "Choose a strong new password for your citizen account."}
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold mb-4 text-center border border-red-100">
              {error}
            </div>
          )}

          {infoMsg && (
            <div className="bg-slate-50 text-slate-700 p-3 rounded-xl text-xs font-semibold mb-4 text-center border border-slate-200">
              {infoMsg}
            </div>
          )}

          {/* STEP 1: ENTER EMAIL */}
          {step === "email" && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Registered Email / पंजीकृत ईमेल
                </label>
                <input
                  type="email"
                  value={email}
                  autoComplete="email"
                  autoFocus
                  placeholder="name@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600 text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl transition-colors shadow-md disabled:opacity-50 text-sm cursor-pointer"
              >
                {loading ? "Sending reset code..." : "Send Reset Code / रीसेट कोड भेजें"}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs text-slate-500 hover:text-slate-800 font-semibold">
                  &larr; Back to Login / लॉगिन पृष्ठ पर वापस
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: VERIFY RESET OTP */}
          {step === "otp" && (
            <div className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                <span className="text-[11px] text-slate-500 uppercase font-semibold">Recovery Code Sent To</span>
                <div className="text-sm font-bold text-slate-800 mt-0.5">{email}</div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError("");
                    setInfoMsg("");
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
                  {loading ? "Verifying..." : "Verify Code / कोड सत्यापित करें"}
                </button>
              </form>

              <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-100">
                <span className="text-slate-500">Didn't receive code?</span>
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

          {/* STEP 3: NEW PASSWORD & CONFIRMATION (ONLY SHOWN AFTER OTP VERIFICATION) */}
          {step === "new-password" && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  New Password / नया पासवर्ड
                </label>
                <input
                  type="password"
                  value={newPassword}
                  autoComplete="new-password"
                  minLength={6}
                  autoFocus
                  placeholder="At least 6 characters"
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Confirm New Password / पासवर्ड की पुष्टि करें
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  autoComplete="new-password"
                  minLength={6}
                  placeholder="Re-enter new password"
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600 text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full py-3 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl transition-colors shadow-md disabled:opacity-50 text-sm cursor-pointer"
              >
                {loading ? "Updating password..." : "Update Password / पासवर्ड सहेजें"}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
