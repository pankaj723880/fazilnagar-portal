import { useState, useEffect, useRef } from "react";
import API from "../api";
import {
  Users,
  X,
  Search,
  Check,
  Loader2,
  Plus,
  Camera,
  Trash2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { resolveMediaUrl } from "../utils/mediaUtils";

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated }) {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupAvatar, setGroupAvatar] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [selectedCitizens, setSelectedCitizens] = useState([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const debounceTimerRef = useRef(null);
  const avatarInputRef = useRef(null);
  const modalContentRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setGroupName("");
      setGroupDescription("");
      setGroupAvatar("");
      setAvatarPreview("");
      setSelectedCitizens([]);
      setQuery("");
      setDebouncedQuery("");
      setSearchResults([]);
      setError("");
      setSuccess(false);
    }
  }, [isOpen]);

  // Debounce search query (300ms)
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  // Live citizen search
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
          params: { q: debouncedQuery, limit: 12 },
        });
        if (!isCancelled && res.data?.success) {
          setSearchResults(res.data.users || []);
        }
      } catch (err) {
        if (!isCancelled) {
          setError("Failed to search citizens. Please try again. / नागरिक खोजने में त्रुटि।");
        }
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

  // Handle group avatar upload & 256x256 client compression
  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be under 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setGroupAvatar(dataUrl);
        setAvatarPreview(dataUrl);
        setError("");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleClearAvatar = (e) => {
    e.stopPropagation();
    setGroupAvatar("");
    setAvatarPreview("");
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const toggleCitizen = (user) => {
    const isSelected = selectedCitizens.some((c) => c._id === user._id);
    if (isSelected) {
      setSelectedCitizens((prev) => prev.filter((c) => c._id !== user._id));
    } else {
      if (selectedCitizens.length >= 100) {
        setError("Maximum 100 members allowed in a town group. / समूह में अधिकतम 100 सदस्य हो सकते हैं।");
        return;
      }
      setSelectedCitizens((prev) => [...prev, user]);
      setError("");
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const trimmedName = groupName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError("Group name must be at least 2 characters long. / समूह का नाम कम से कम 2 अक्षरों का होना चाहिए।");
      return;
    }
    if (selectedCitizens.length === 0) {
      setError("Please select at least 1 other citizen to join the group. / कृपया कम से कम 1 सदस्य चुनें।");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const res = await API.post("/messages/conversations/group", {
        groupName: trimmedName,
        groupDescription: groupDescription.trim(),
        groupAvatar: groupAvatar || "",
        memberIds: selectedCitizens.map((c) => c._id),
      });

      if (res.data?.success && res.data?.conversation) {
        setSuccess(true);
        setTimeout(() => {
          onGroupCreated(res.data.conversation);
          onClose();
        }, 500);
      } else {
        setError(res.data?.message || "Failed to create group.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Error creating group. Please check your connection and try again."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        ref={modalContentRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-lg w-full border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#B8323C] text-white flex items-center justify-center shadow-xs shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                Create Town Group / समूह बनाएं
              </h3>
              <p className="text-[11px] text-slate-500">
                Fazilnagar Community, Ward &amp; Market Discussions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200/70 text-red-700 text-xs rounded-2xl font-medium flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs rounded-2xl font-bold flex items-center gap-2 animate-in fade-in">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Group created successfully! Opening chat... / समूह सफलतापूर्वक बनाया गया!</span>
            </div>
          )}

          {/* Top Section: Avatar Upload + Group Name */}
          <div className="flex items-start gap-4">
            {/* Avatar Picker */}
            <div className="flex flex-col items-center shrink-0">
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarSelect}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />
              <div
                onClick={() => avatarInputRef.current?.click()}
                className="relative w-16 h-16 rounded-2xl bg-slate-100 hover:bg-slate-200/80 border-2 border-dashed border-slate-300 hover:border-[#B8323C] flex items-center justify-center cursor-pointer transition overflow-hidden group shadow-2xs"
                title="Upload group avatar / समूह का फोटो चुनें"
              >
                {avatarPreview ? (
                  <>
                    <img
                      src={avatarPreview}
                      alt="Group Avatar Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                      <Camera className="w-4 h-4" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-[#B8323C] transition">
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-bold">Photo</span>
                  </div>
                )}
              </div>

              {avatarPreview && (
                <button
                  type="button"
                  onClick={handleClearAvatar}
                  className="mt-1 text-[10px] text-red-500 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            {/* Group Name Input */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800">
                  Group Name / समूह का नाम <span className="text-[#B8323C]">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {groupName.length}/100
                </span>
              </div>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Fazilnagar Youth, Ward 4 Cleanliness..."
                maxLength={100}
                required
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-hidden focus:border-[#B8323C] focus:ring-2 focus:ring-[#B8323C]/20 text-xs font-semibold text-slate-900 placeholder:text-slate-400 bg-slate-50/40"
              />
            </div>
          </div>

          {/* Group Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800">
                Description (Optional) / समूह विवरण
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {groupDescription.length}/500
              </span>
            </div>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="What is this group for? e.g. Community updates, emergency alerts, local events..."
              rows={2}
              maxLength={500}
              className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 focus:outline-hidden focus:border-[#B8323C] focus:ring-2 focus:ring-[#B8323C]/20 text-xs text-slate-900 placeholder:text-slate-400 resize-none bg-slate-50/40"
            />
          </div>

          {/* Selected Members Section */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Selected Members / चयनित सदस्य</span>
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-[#B8323C] text-[10px] font-bold font-mono">
                  {selectedCitizens.length} / 100
                </span>
              </label>

              {selectedCitizens.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCitizens([])}
                  className="text-[11px] text-[#B8323C] hover:underline font-semibold cursor-pointer"
                >
                  Clear all / सभी हटाएं
                </button>
              )}
            </div>

            {selectedCitizens.length === 0 ? (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center text-[11px] text-slate-400">
                No citizens selected yet. Search below to add friends and neighbors.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-100">
                {selectedCitizens.map((c) => (
                  <span
                    key={c._id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-800 shadow-2xs group"
                  >
                    <span className="w-4 h-4 rounded-full bg-slate-200 overflow-hidden shrink-0 text-[9px] flex items-center justify-center font-bold text-slate-600">
                      {c.avatar ? (
                        <img
                          src={resolveMediaUrl(c.avatar)}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      ) : (
                        (c.name || "C")[0]?.toUpperCase()
                      )}
                    </span>
                    <span className="max-w-[120px] truncate">{c.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleCitizen(c)}
                      className="p-0.5 text-slate-400 hover:text-red-500 rounded-full cursor-pointer transition"
                      title={`Remove ${c.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Citizen Search Section */}
          <div className="pt-1">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Search &amp; Add Citizens / नागरिक खोजें और जोड़ें
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by citizen name or @username..."
                className="w-full pl-9 pr-8 py-2.5 rounded-2xl border border-slate-200 text-xs focus:outline-hidden focus:border-[#B8323C] focus:ring-2 focus:ring-[#B8323C]/20 text-slate-900 placeholder:text-slate-400 bg-white"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Clear search query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Live Search Results Roster */}
            <div className="mt-2 divide-y divide-slate-100 border border-slate-200/80 rounded-2xl max-h-48 overflow-y-auto bg-slate-50/50">
              {searching ? (
                <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B8323C]" />
                  <span>Searching registered citizens...</span>
                </div>
              ) : debouncedQuery.length >= 2 && searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No citizens found matching "{debouncedQuery}"
                </div>
              ) : debouncedQuery.length < 2 && searchResults.length === 0 ? (
                <div className="p-3.5 text-center text-[11px] text-slate-400">
                  Type at least 2 characters to search citizens / खोजने के लिए कम से कम 2 अक्षर लिखें
                </div>
              ) : (
                searchResults.map((user) => {
                  const isSelected = selectedCitizens.some((c) => c._id === user._id);
                  return (
                    <div
                      key={user._id}
                      onClick={() => toggleCitizen(user)}
                      className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition ${
                        isSelected ? "bg-red-50/80" : "hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                          {user.avatar ? (
                            <img
                              src={resolveMediaUrl(user.avatar)}
                              alt={user.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-600">
                              {(user.name || "C")[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {user.username ? `@${user.username}` : user.area || "Fazilnagar Resident"}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition shrink-0 ${
                          isSelected
                            ? "bg-[#B8323C] text-white shadow-2xs"
                            : "border border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-600 bg-white"
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

          {/* Modal Actions Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Cancel / रद्द करें
            </button>
            <button
              type="submit"
              disabled={creating || !groupName.trim() || selectedCitizens.length === 0}
              className="px-5 py-2.5 rounded-2xl bg-[#B8323C] hover:bg-[#962831] text-white text-xs font-bold transition flex items-center gap-2 disabled:opacity-40 disabled:hover:bg-[#B8323C] shadow-xs cursor-pointer"
            >
              {creating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Group / समूह बन रहा है...</span>
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5" />
                  <span>Create Group / समूह बनाएं</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
