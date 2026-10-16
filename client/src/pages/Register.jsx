import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import API from "../api";
import { setAuthSession } from "../utils/authStorage";
import { usePageSEO } from "../utils/seo";

export default function Register({ setUser }) {
  usePageSEO({
    title: "Register Citizen Account | Fazilnagar Town Portal",
    description: "Create an account on the Fazilnagar Town Portal to post community news, local listings, and town messaging.",
    canonicalPath: "/register",
    noIndex: true,
  });
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from || "/";

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanUsername = username.toLowerCase().trim() || email.split("@")[0].replace(/[^a-z0-9_]/g, "_").slice(0, 15);

    try {
      const res = await API.post("/auth/register", {
        name,
        username: cleanUsername,
        email,
        password,
      });

      const userData = res.data.user || { name, username: cleanUsername, email };
      setAuthSession(res.data.token, userData);
      if (setUser) setUser(userData);

      navigate(redirectPath, { replace: true });
    } catch (err) {
      const serverMessage = err.response?.data?.message || err.message || "Registration failed. Try again.";
      setError(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Create Account / नया खाता</h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium mb-4 text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name / नाम</label>
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
          <label className="block text-xs font-semibold text-slate-600 mb-1">Email / ईमेल</label>
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
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors shadow-md disabled:opacity-50"
        >
          {loading ? "Creating Account..." : "Register / पंजीकरण करें"}
        </button>
      </form>

      <p className="text-center text-xs text-slate-500 mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-red-700 font-bold hover:underline">
          Login here
        </Link>
      </p>
    </div>
  );
}