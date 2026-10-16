import { useState, useEffect, useRef } from "react";
import API from "../api";
import { getSocket } from "../socket";
import {
  Users,
  X,
  Shield,
  UserPlus,
  UserMinus,
  LogOut,
  Loader2,
  Check,
  Search,
  Edit2,
  Save,
  Crown,
} from "lucide-react";

export default function GroupDetailsModal({
  isOpen,
  onClose,
  conversation,
  currentUserId,
  onGroupUpdated,
  onLeftGroup,
}) {
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [editingInfo, setEditingInfo] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const debounceTimerRef = useRef(null);
  const conversationId = conversation?._id || conversation?.id;

  // Identify if current user is group admin
  const myMembership = members.find((m) => (m.user?._id || m.user) === currentUserId);
  const isAdmin = myMembership?.role === "admin" || conversation?.myRole === "admin" || conversation?.initiator === currentUserId;

  // Initialize group name and description
  useEffect(() => {
    if (conversation) {
      setGroupName(conversation.groupName || "");
      setGroupDescription(conversation.groupDescription || "");
    }
  }, [conversation]);

  // Load members
  const fetchMembers = async () => {
    if (!conversationId) return;
    setLoadingMembers(true);
    try {
      const res = await API.get(`/messages/conversations/${conversationId}/members`);
      if (res.data?.success) {
        setMembers(res.data.members || []);
      }
    } catch (err) {
      console.error("Failed to load group members:", err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (isOpen && conversationId) {
      fetchMembers();
    }
  }, [isOpen, conversationId]);

  // Socket listener for real-time member updates
  useEffect(() => {
    if (!isOpen || !conversationId) return;
    let socket;
    try {
      socket = getSocket();
    } catch {
      return;
    }
    if (!socket) return;

    const handleMembersUpdated = (data) => {
      if (data?.conversationId === conversationId) {
        fetchMembers();
      }
    };

    socket.on("group_members_updated", handleMembersUpdated);
    return () => {
      socket.off("group_members_updated", handleMembersUpdated);
    };
  }, [isOpen, conversationId]);

  // Search debounce for adding members
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    let isCancelled = false;
    if (debouncedQuery.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    async function searchCitizens() {
      setSearching(true);
      try {
        const res = await API.get("/users/search", { params: { q: debouncedQuery, limit: 10 } });
        if (!isCancelled && res.data?.success) {
          // Filter out users who are already active members
          const activeMemberUserIds = members.map((m) => m.user?._id || m.user);
          const filtered = (res.data.users || []).filter((u) => !activeMemberUserIds.includes(u._id));
          setSearchResults(filtered);
        }
      } catch (err) {
        // ignore
      } finally {
        if (!isCancelled) setSearching(false);
      }
    }

    searchCitizens();
    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, members]);

  if (!isOpen || !conversation) return null;

  // Save edited group name/description
  const handleSaveInfo = async () => {
    if (!groupName.trim() || groupName.trim().length < 2) {
      setError("Group name must be at least 2 characters.");
      return;
    }
    setSavingInfo(true);
    setError("");
    try {
      const res = await API.patch(`/messages/conversations/${conversationId}/group`, {
        groupName: groupName.trim(),
        groupDescription: groupDescription.trim(),
      });
      if (res.data?.success) {
        setEditingInfo(false);
        setSuccessMsg("Group details updated.");
        if (onGroupUpdated) {
          onGroupUpdated({
            ...conversation,
            groupName: res.data.group.groupName,
            groupDescription: res.data.group.groupDescription,
          });
        }
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update group.");
    } finally {
      setSavingInfo(false);
    }
  };

  // Add selected citizens
  const handleAddMembers = async () => {
    if (selectedToAdd.length === 0) return;
    setAddingMembers(true);
    setError("");
    try {
      const res = await API.post(`/messages/conversations/${conversationId}/members`, {
        memberIds: selectedToAdd.map((u) => u._id),
      });
      if (res.data?.success) {
        setSelectedToAdd([]);
        setShowAddMember(false);
        setSearchQuery("");
        fetchMembers();
        setSuccessMsg("Members added successfully.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add members.");
    } finally {
      setAddingMembers(false);
    }
  };

  // Remove a member
  const handleRemoveMember = async (memberUserId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName || "this citizen"} from the group?`)) {
      return;
    }
    setRemovingId(memberUserId);
    setError("");
    try {
      const res = await API.delete(`/messages/conversations/${conversationId}/members/${memberUserId}`);
      if (res.data?.success) {
        fetchMembers();
        setSuccessMsg("Member removed.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove member.");
    } finally {
      setRemovingId(null);
    }
  };

  // Leave group
  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) {
      return;
    }
    setLeaving(true);
    setError("");
    try {
      const res = await API.delete(`/messages/conversations/${conversationId}/members/${currentUserId}`);
      if (res.data?.success) {
        if (onLeftGroup) onLeftGroup(conversationId);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to leave group.");
      setLeaving(false);
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
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Group Info / समूह विवरण</h3>
              <p className="text-[11px] text-slate-500">{members.length} Members</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200/60 text-red-700 text-xs rounded-2xl font-medium">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs rounded-2xl font-medium">
              {successMsg}
            </div>
          )}

          {/* Group Info Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            {editingInfo ? (
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Group Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-bold focus:outline-hidden focus:border-[#B8323C]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Description</label>
                  <textarea
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-[#B8323C] resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingInfo(false)}
                    className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveInfo}
                    disabled={savingInfo}
                    className="px-3.5 py-1 text-xs bg-[#B8323C] text-white rounded-xl font-bold hover:bg-[#962831] flex items-center gap-1.5 shadow-2xs"
                  >
                    {savingInfo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {conversation.groupName || "Town Group"}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">
                      {conversation.groupDescription || "No description set for this group."}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setEditingInfo(true)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60"
                      title="Edit Group Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Members Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">
                Group Members ({members.length})
              </span>
              {isAdmin && !showAddMember && (
                <button
                  type="button"
                  onClick={() => setShowAddMember(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B8323C] hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </button>
              )}
            </div>

            {/* Add Member Panel */}
            {showAddMember && (
              <div className="p-3 bg-red-50/40 rounded-2xl border border-red-100 mb-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Search citizens to add</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMember(false);
                      setSelectedToAdd([]);
                      setSearchQuery("");
                    }}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or @username..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                  />
                </div>

                {/* Selected to Add Chips */}
                {selectedToAdd.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedToAdd.map((u) => (
                      <span
                        key={u._id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[11px] font-bold text-slate-800"
                      >
                        <span>{u.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedToAdd((prev) => prev.filter((x) => x._id !== u._id))}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search Results */}
                {searching ? (
                  <div className="text-center py-2 text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-[#B8323C]" />
                    <span>Searching...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="divide-y divide-slate-100 max-h-32 overflow-y-auto bg-white rounded-xl border border-slate-200">
                    {searchResults.map((u) => {
                      const isSelected = selectedToAdd.some((x) => x._id === u._id);
                      return (
                        <div
                          key={u._id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedToAdd((prev) => prev.filter((x) => x._id !== u._id));
                            } else {
                              setSelectedToAdd((prev) => [...prev, u]);
                            }
                          }}
                          className={`p-2 flex items-center justify-between text-xs cursor-pointer ${
                            isSelected ? "bg-red-50" : "hover:bg-slate-50"
                          }`}
                        >
                          <span className="font-semibold text-slate-800">{u.name}</span>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                            isSelected ? "bg-[#B8323C] text-white" : "border border-slate-300"
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : debouncedQuery.length >= 2 ? (
                  <p className="text-[11px] text-slate-400 italic">No available citizens found.</p>
                ) : null}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAddMembers}
                    disabled={addingMembers || selectedToAdd.length === 0}
                    className="px-3.5 py-1 text-xs bg-[#B8323C] text-white font-bold rounded-xl hover:bg-[#962831] disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
                  >
                    {addingMembers ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                    <span>Add to Group ({selectedToAdd.length})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Member List */}
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
              {loadingMembers ? (
                <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B8323C]" />
                  <span>Loading members...</span>
                </div>
              ) : (
                members.map((m) => {
                  const u = m.user || {};
                  const isMe = (u._id || u) === currentUserId;
                  const isMemberAdmin = m.role === "admin";

                  return (
                    <div
                      key={m._id || u._id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-600 bg-slate-100">
                              {(u.name || "C")[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {u.name || "Citizen"}
                            </span>
                            {isMe && <span className="text-[10px] text-slate-400">(You)</span>}
                            {isMemberAdmin && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[9px] font-bold">
                                <Crown className="w-2.5 h-2.5" />
                                <span>Admin</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                            {u.username ? `@${u.username}` : u.area || "Fazilnagar"}
                          </span>
                        </div>
                      </div>

                      {/* Remove button (if caller is admin and target is not self) */}
                      {isAdmin && !isMe && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(u._id, u.name)}
                          disabled={removingId === u._id}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                          title="Remove from group"
                        >
                          {removingId === u._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserMinus className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Leave Group Action */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleLeaveGroup}
              disabled={leaving}
              className="w-full py-2.5 px-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              {leaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>Leave Group / समूह छोड़ें</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
