import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getAuthToken, getAuthUser, clearAuthSession } from "../utils/authStorage";
import { performLogout } from "../api";

export default function Navbar() {
  const [currentUser, setCurrentUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = () => {
      setCurrentUser(getAuthUser());
    };

    checkAuth();
    window.addEventListener("auth-change", checkAuth);
    return () => window.removeEventListener("auth-change", checkAuth);
  }, []);

  const handleLogout = async () => {
    await performLogout();
    setCurrentUser(null);
    navigate("/login");
  };

  const isLoggedIn = !!currentUser;

  return (
    <nav className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <span className="bg-red-700 text-white font-extrabold text-xl px-2.5 py-1 rounded-xl">
            फ
          </span>
          <div>
            <span className="text-lg font-bold tracking-tight block leading-none">
              Fazilnagar Portal
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">
              पावा नगर • Kushinagar
            </span>
          </div>

          <Link to="/map" className="hover:text-red-400 transition-colors">
  🗺️ Map Directory
</Link>
        </Link>

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-slate-300 hover:text-white focus:outline-none"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6 text-sm font-semibold">
          <Link to="/" className="hover:text-red-400 transition-colors">
            Home
          </Link>
          <Link to="/news" className="hover:text-red-400 transition-colors">
            News
          </Link>
          <Link
            to="/fazilnagar"
            className="text-red-400 hover:text-red-300 font-bold transition-colors bg-red-950/50 px-3 py-1 rounded-full border border-red-800/40"
          >
            Fazilnagar ✨
          </Link>

          {isLoggedIn ? (
            <>
              <Link
                to="/upload"
                className="bg-red-700 hover:bg-red-800 text-white px-3.5 py-1.5 rounded-xl transition-colors"
              >
                + Post News
              </Link>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-1.5 rounded-xl border border-slate-700 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 pt-3 pb-4 space-y-3 text-sm font-semibold">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="block hover:text-red-400 transition-colors"
          >
            Home
          </Link>
          <Link
            to="/news"
            onClick={() => setMenuOpen(false)}
            className="block hover:text-red-400 transition-colors"
          >
            News
          </Link>
          <Link
            to="/fazilnagar"
            onClick={() => setMenuOpen(false)}
            className="block text-red-400 hover:text-red-300 font-bold"
          >
            Fazilnagar ✨
          </Link>

          {isLoggedIn ? (
            <>
              <Link
                to="/upload"
                onClick={() => setMenuOpen(false)}
                className="block bg-red-700 hover:bg-red-800 text-white px-3.5 py-2 rounded-xl text-center"
              >
                + Post News
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="block w-full text-left text-slate-400 hover:text-white pt-1"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="block bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-center border border-slate-700"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}