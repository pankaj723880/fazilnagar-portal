import { useState, useEffect, useRef } from "react";
import API from "../api";
import { Search, X, Loader2, UserPlus, MapPin, Shield, MessageCircle } from "lucide-react";
import { resolveMediaUrl } from "../utils/mediaUtils";

export default function UserSearch({ onSelectUser }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [error, setError] = useState("");

  const debounceTimerRef = useRef(null);

  // 300 ms Debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // Execute Search API call
  useEffect(() => {
    let isCancelled = false;

    if (debouncedQuery.length < 2) {
      setUsers([]);
      setPagination({ total: 0, totalPages: 0 });
      setLoading(false);
      setError("");
      return;
    }

    async function fetchUsers() {
      setLoading(true);
      setError("");
      try {
        const res = await API.get("/users/search", {
          params: {
            q: debouncedQuery,
            page,
            limit: 15,
          },
        });

        if (!isCancelled && res.data?.success) {
          if (page === 1) {
            setUsers(res.data.users || []);
          } else {
            setUsers((prev) => [...prev, ...(res.data.users || [])]);
          }
          setPagination(res.data.pagination || { total: 0, totalPages: 0 });
        }
      } catch (err) {
        if (!isCancelled) {
          if (err.response?.status === 429) {
            setError("Rate limit reached. Please wait a moment before searching again.");
          } else {
            setError(err.response?.data?.message || "Search failed. Please try again.");
          }
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchUsers();

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, page]);

  const handleClear = () => {
    setQuery("");
    setDebouncedQuery("");
    setUsers([]);
    setPage(1);
    setPagination({ total: 0, totalPages: 0 });
  };

  const handleLoadMore = () => {
    if (page < pagination.totalPages && !loading) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#B8323C]" />
            Find Citizens &amp; Start Chat / नागरिक खोजें
          </h2>
          <p className="text-[11px] text-slate-500">
            Search by name, @username, or exact email (if discoverable). Supports Hindi &amp; English.
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, @username or email... / नाम या यूज़रनेम लिखें..."
          className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#B8323C]/20 focus:border-[#B8323C] transition"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Query status feedback */}
      {query.trim().length > 0 && query.trim().length < 2 && (
        <p className="text-[11px] text-amber-600 font-medium px-1">
          Type at least 2 characters to search / कम से कम 2 अक्षर लिखें
        </p>
      )}

      {error && (
        <p className="text-[11px] text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 font-medium">
          {error}
        </p>
      )}

      {/* Search Results */}
      {loading && users.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#B8323C]" />
          <span className="text-xs">Searching directory... / खोज जारी है...</span>
        </div>
      ) : users.length > 0 ? (
        <div className="space-y-2 pt-1">
          <div className="text-[11px] text-slate-500 font-medium px-1 flex justify-between items-center">
            <span>Found {pagination.total} citizens</span>
            <span className="text-[10px] text-slate-400">Page {page} of {pagination.totalPages}</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto rounded-2xl border border-slate-100">
            {users.map((u) => (
              <div
                key={u.id || u._id}
                className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden shrink-0 relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-slate-600 bg-slate-100">
                      {(u.name || "C")[0]?.toUpperCase()}
                    </div>
                    {u.avatar ? (
                      <img
                        src={resolveMediaUrl(u.avatar)}
                        alt={u.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {u.name}
                      </span>
                      {u.username && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          @{u.username}
                        </span>
                      )}
                      {u.maskedEmail && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-mono">
                          {u.maskedEmail}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                      {u.area && (
                        <span className="flex items-center gap-0.5 text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {u.area}
                        </span>
                      )}
                      {u.whoCanMessage === "requests" && (
                        <span className="inline-flex items-center gap-0.5 text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded text-[9px] font-medium border border-amber-200/50">
                          <Shield className="w-2.5 h-2.5 text-amber-600" />
                          Message Requests
                        </span>
                      )}
                    </div>

                    {u.bio && (
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 max-w-xs">
                        {u.bio}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectUser && onSelectUser(u)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#B8323C] hover:bg-red-700 text-white text-xs font-bold transition shadow-2xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>
              </div>
            ))}
          </div>

          {page < pagination.totalPages && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loading}
                className="text-xs font-bold text-[#B8323C] hover:text-red-700 py-1.5 px-4 rounded-xl border border-red-200 hover:bg-red-50 transition"
              >
                {loading ? "Loading more..." : "Load more citizens / और देखें"}
              </button>
            </div>
          )}
        </div>
      ) : debouncedQuery.length >= 2 && !loading ? (
        <div className="py-6 text-center text-slate-400 space-y-1">
          <p className="text-xs font-medium text-slate-600">No citizens found / कोई नागरिक नहीं मिला</p>
          <p className="text-[11px] text-slate-400">
            Check the spelling or try searching by their exact display name or @username.
          </p>
        </div>
      ) : null}
    </div>
  );
}
