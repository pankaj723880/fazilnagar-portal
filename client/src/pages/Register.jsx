import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api";
import { setAuthSession } from "../utils/authStorage";
import { usePageSEO } from "../utils/seo";

export default function Register({ setUser }) {
  usePageSEO({
    title: "Register Citizen Account | Fazilnagar Town Portal",
    description: "Create an account on the Fazilnagar Town Portal to post community news and local business listings.",
    canonicalPath: "/register",
    noIndex: true,
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/register", { name, email, password });

      // Save auth tokens & user info isolated to this tab
      const userData = res.data.user || { name, email };
      setAuthSession(res.data.token, userData);
      
      if (setUser) setUser(userData);

      navigate("/");
    } catch (err) {
      const serverMessage = err.response?.data?.message || "Registration failed. Try again.";
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
          <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
          <input
            type="text"
            value={name}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600"
            required
          />
        </div>

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
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-600"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors shadow-md"
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