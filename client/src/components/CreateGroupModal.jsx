import { useState, useEffect, useRef } from "react";
import API from "../api";
import { Users, X, Search, Check, Loader2, Plus, Sparkles, UserCheck } from "lucide-react";

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }) {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedCitizens, setSelectedCitizens] = useState([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const debounceTimerRef = useRef(null);

  // Debounce search
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  // Search citizens
  useEffect(() => {
    let isCancelled = false;
    if (debouncedQuery.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    async function doSearch() {
      setSearching(true);
      setError("");
      try {
        const res = await API.get("/users/search", {
          params: { q: debouncedQuery, limit: 10 },
        });
        if (!isCancelled && res.data?.success) {
          setSearchResults(res.data.users || []);
        }
      } catch (err) {
        if (!isCancelled) setError("Failed to search citizens.");
      } finally {
        if (!isCancelled) setSearching(false);
      }
    }

    doSearch();

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery]);

  if (!isOpen) return null;

  const toggleCitizen = (user) => {
    const isSelected = selectedCitizens.some((c) => c._id === user._id);
    if (isSelected) {
      setSelectedCitizens((prev) => prev.filter((c) => c._id !== user._id));
    } else {
      setSelectedCitizens((prev) => [...prev, user]);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || groupName.trim().length < 2) {
      setError("Please provide a group name with at least 2 characters.");
      return;
    }
    if (selectedCitizens.length === 0) {
      setError("Please select at least 1 other citizen to join the group.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const res = await API.post("/messages/conversations/group", {
        groupName: groupName.trim(),
        groupDescription: groupDescription.trim(),
        memberIds: selectedCitizens.map((c) => c._id),
      });

      if (res.data?.success && res.data?.conversation) {
        onGroupCreated(res.data.conversation);
        onClose();
      } else {
        setError(res.data?.message || "Failed to create group.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error creating group.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#B8323C] text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Create Town Group / समूह बनाएं</h3>
              <p className="text-[11px] text-slate-500">Fazilnagar Community & Ward Groups</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200/60 text-red-700 text-xs rounded-2xl font-medium">
              {error}
            </div>
          )}

          {/* Group Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Group Name / समूह का नाम <span className="text-[#B8323C]">*</span>
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Fazilnagar Market Association, Ward 3 News..."
              maxLength={100}
              required
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-hidden focus:border-[#B8323C] text-xs font-medium text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Group Description */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Description (Optional) / विवरण
            </label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="Brief description of the group's purpose or discussion topic..."
              rows={2}
              maxLength={500}
              className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 focus:outline-hidden focus:border-[#B8323C] text-xs text-slate-900 placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Selected Members Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800">
                Selected Members ({selectedCitizens.length})
              </label>
              {selectedCitizens.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCitizens([])}
                  className="text-[11px] text-[#B8323C] hover:underline font-semibold"
                >
                  Clear all
                </button>
              )}
            </div>

            {selectedCitizens.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">No citizens selected yet. Search below to add.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                {selectedCitizens.map((c) => (
                  <span
                    key={c._id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-800 shadow-2xs"
                  >
                    <span>{c.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleCitizen(c)}
                      className="text-slate-400 hover:text-red-500 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Search Citizens to Add */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Search & Add Citizens / नागरिक खोजें
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or @username..."
                className="w-full pl-9 pr-8 py-2 rounded-2xl border border-slate-200 text-xs focus:outline-hidden focus:border-[#B8323C] text-slate-900 placeholder:text-slate-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Search Results List */}
            <div className="mt-2 divide-y divide-slate-100 border border-slate-100 rounded-2xl max-h-48 overflow-y-auto bg-slate-50/50">
              {searching ? (
                <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B8323C]" />
                  <span>Searching citizens...</span>
                </div>
              ) : debouncedQuery.length >= 2 && searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No citizens found matching "{debouncedQuery}"
                </div>
              ) : (
                searchResults.map((user) => {
                  const isSelected = selectedCitizens.some((c) => c._id === user._id);
                  return (
                    <div
                      key={user._id}
                      onClick={() => toggleCitizen(user)}
                      className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition ${
                        isSelected ? "bg-red-50/60" : "hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-600">
                              {(user.name || "C")[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {user.username ? `@${user.username}` : user.area || "Citizen"}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition ${
                          isSelected
                            ? "bg-[#B8323C] text-white"
                            : "border border-slate-300 text-slate-400 hover:border-slate-400"
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !groupName.trim() || selectedCitizens.length === 0}
              className="px-5 py-2 rounded-2xl bg-[#B8323C] hover:bg-[#962831] text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-50 shadow-xs cursor-pointer"
            >
              {creating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Group...</span>
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5" />
                  <span>Create Group</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
