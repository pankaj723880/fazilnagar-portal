import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import API from "../api";

export default function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const res = await API.post("/auth/login", { email, password });

      // Save credentials & user info
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("isLoggedIn", "true");
      const userData = res.data.user || { email, name: email.split("@")[0] };
      localStorage.setItem("user", JSON.stringify(userData));
      
      if (setUser) setUser(userData);
      window.dispatchEvent(new Event("auth-change"));
      window.dispatchEvent(new Event("storage"));

      // Navigate dynamically based on where user came from
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials or server offline.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Login / लॉगिन</h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium mb-4 text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
          <input
            type="email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl transition-colors shadow-md"
        >
          {loading ? "Signing in..." : "Sign In / लॉगिन"}
        </button>
      </form>

      <p className="text-center text-xs text-slate-500 mt-6">
        Don't have an account?{" "}
        <Link 
          to="/register" 
          state={{ from: redirectPath }} 
          className="text-red-700 font-bold hover:underline"
        >
          Register here
        </Link>
      </p>
    </div>
  );
}