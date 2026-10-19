import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  UserCheck,
  Shield,
} from "lucide-react";
import API from "../api";
import { setAuthSession } from "../utils/authStorage";
import { usePageSEO } from "../utils/seo";
import GoogleSignInButton from "../components/GoogleSignInButton";
import AuthLayout from "../components/AuthLayout";

export default function Login({ setUser }) {
  usePageSEO({
    title: "Account Login | Fazilnagar Town Portal",
    description: "Sign in to your Fazilnagar Town Portal account to submit community news and manage business listings.",
    canonicalPath: "/login",
    noIndex: true,
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to origin page if set, otherwise default to Homepage "/"
  const redirectPath = location.state?.from || "/";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/login", { email: email.trim(), password });
      const userData = res.data.user || { email, name: email.split("@")[0] };
      setAuthSession(res.data.token, userData);
      if (setUser) setUser(userData);

      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Invalid credentials or server offline. Please try again or sign in with Google."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Citizen Sign In / नागरिक लॉगिन"
      subtitle="Access your Fazilnagar Town Portal account to post verified local news, participate in town discussions, and access civic directory services."
      error={error}
      illustration={
        <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-red-600/10 via-amber-500/15 to-red-700/15 border border-red-200/80 dark:border-red-900/50 flex items-center justify-center text-red-700 dark:text-red-400 shadow-xs">
          <UserCheck className="w-7 h-7" />
        </div>
      }
    >
      {/* Google Login Section */}
      <div className="mb-6">
        <GoogleSignInButton
          setUser={setUser}
          redirectPath={redirectPath}
          onError={setError}
        />
      </div>

      {/* Modern SaaS-style Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white/90 dark:bg-[#151F2E]/90 px-3 text-slate-400 dark:text-slate-500 font-medium">
            Or sign in with email / या ईमेल द्वारा
          </span>
        </div>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Email Address / ईमेल पता
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              value={email}
              autoComplete="email"
              placeholder="citizen@fazilnagar.me"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 sm:h-12 pl-10 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2637] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/15 text-sm transition-all"
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password / पासवर्ड
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:underline font-semibold transition-colors"
            >
              Forgot Password? / भूल गए?
            </Link>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              autoComplete="current-password"
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 sm:h-12 pl-10 pr-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A2637] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/15 text-sm transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 sm:h-12 mt-2 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-red-900/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-sm cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing in... / सत्यापन हो रहा है...</span>
            </>
          ) : (
            <>
              <span>Sign In / लॉगिन करें</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Registration Link */}
      <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
        <span>Don't have a citizen account? / खाता नहीं है? </span>
        <Link
          to="/register"
          state={{ from: redirectPath }}
          className="text-red-700 dark:text-red-400 font-bold hover:underline inline-flex items-center gap-1 transition-colors"
        >
          Register here / नया खाता बनाएं
        </Link>
      </div>

      {/* Small Security / Shield Illustration near bottom */}
      <div className="mt-4 pt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
        <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Protected by Fazilnagar Municipal Security Protocol</span>
      </div>
    </AuthLayout>
  );
}