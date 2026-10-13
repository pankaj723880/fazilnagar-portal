import { useState, useEffect } from "react";
import API from "../api";
import {
  Users,
  Shield,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  Clock,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Store,
  X,
  Check,
} from "lucide-react";

export default function AdminManageUsers({ token, currentAdminUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [toastMessage, setToastMessage] = useState("");

  // Edit User Profile Modal
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("user");
  const [editStatus, setEditStatus] = useState("active");
  const [isSaving, setIsSaving] = useState(false);

  // User Submissions Detail Drawer
  const [viewingUserSubmissions, setViewingUserSubmissions] = useState(null);
  const [userSubmissionsList, setUserSubmissionsList] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Delete Confirm Modal
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const fetchUsers = async (targetPage = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", targetPage);
      params.set("limit", 20);

      const res = await API.get(`/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUsers(res.data?.users || []);
      setPagination(res.data?.pagination || { total: 0, page: targetPage, totalPages: 1 });
    } catch (err) {
      console.error("Fetch Users Error:", err);
      showToast(err.response?.data?.message || "Failed to load registered users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchUsers(1);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditName(user.name || "");
    setEditPhone(user.phone || "");
    setEditRole(user.role || "user");
    setEditStatus(user.status || "active");
  };

  const handleSaveUser = async (e) => {
    if (e) e.preventDefault();
    if (!editingUser) return;
    setIsSaving(true);
    try {
      const res = await API.put(
        `/users/${editingUser.id || editingUser._id}`,
        {
          name: editName,
          phone: editPhone,
          role: editRole,
          status: editStatus,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast(res.data?.message || "User profile updated successfully.");
      setEditingUser(null);
      fetchUsers(page);
    } catch (err) {
      console.error("Save user error:", err);
      showToast(err.response?.data?.message || "Failed to update user profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === "active" ? "inactive" : "active";
    try {
      await API.put(
        `/users/${user.id || user._id}`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`User account marked as ${nextStatus}.`);
      fetchUsers(page);
    } catch (err) {
      console.error("Toggle status error:", err);
      showToast(err.response?.data?.message || "Failed to toggle account status.");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setIsDeleting(true);
    try {
      const res = await API.delete(`/users/${deleteConfirmUser.id || deleteConfirmUser._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast(res.data?.message || "User account deleted successfully.");
      setDeleteConfirmUser(null);
      fetchUsers(page);
    } catch (err) {
      console.error("Delete user error:", err);
      showToast(err.response?.data?.message || "Failed to delete user account.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewSubmissions = async (user) => {
    setViewingUserSubmissions(user);
    setLoadingSubmissions(true);
    try {
      const res = await API.get(`/users/${user.id || user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserSubmissionsList(res.data?.submissions || []);
    } catch (err) {
      console.error("View submissions error:", err);
      showToast("Failed to load user's submissions.");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#18232E] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs border border-slate-700 animate-slide-down">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#18232E] text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
              Citizen Registry
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#18232E] tracking-tight">
            Manage Registered Users
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View accounts from the native authentication database, audit activity, manage roles, and review community ownership.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsers(page)}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
            title="Refresh Users"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-[#18232E] focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="bg-[#18232E] hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none font-medium cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="user">Registered Citizens</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none font-medium cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#18232E]" />
            <span className="text-xs font-semibold">Loading user records from database...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Users className="w-8 h-8 text-slate-300" />
            <span className="text-sm font-bold text-slate-600">No users found</span>
            <span className="text-xs text-slate-400">Try adjusting your search criteria or role filters.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">User / Name</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4">Submitted Places</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isAdmin = u.role === "admin";
                  const isActive = u.status === "active";

                  return (
                    <tr key={u.id || u._id} className="hover:bg-slate-50/80 transition">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                              isAdmin ? "bg-red-100 text-[#B8323C]" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {u.name?.charAt(0) || "U"}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block truncate max-w-xs">
                              {u.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-800 font-medium flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {u.email}
                          </span>
                          {u.phone ? (
                            <span className="text-slate-500 text-[11px] flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {u.phone}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[10px]">No phone registered</span>
                          )}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            isAdmin
                              ? "bg-red-50 text-[#B8323C] border border-red-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {isAdmin ? <Shield className="w-3 h-3 text-[#B8323C]" /> : <Users className="w-3 h-3" />}
                          <span>{isAdmin ? "Administrator" : "Citizen"}</span>
                        </span>
                      </td>

                      {/* Account Status Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>{u.status || "active"}</span>
                        </span>
                      </td>

                      {/* Last Login */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                        {u.lastLogin ? (
                          new Date(u.lastLogin).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        ) : (
                          <span className="text-slate-300">Never</span>
                        )}
                      </td>

                      {/* Registration Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "Legacy Account"}
                      </td>

                      {/* Number of Submitted Entities */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleViewSubmissions(u)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                          title="View submissions made by this user"
                        >
                          <Store className="w-3 h-3 text-[#0D5E49]" />
                          <span>{u.submissionCount ?? 0} Places</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit profile */}
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition cursor-pointer"
                            title="Edit user profile & permissions"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active / Inactive */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              isActive
                                ? "bg-amber-50 hover:bg-amber-100 text-amber-700"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                            }`}
                            title={isActive ? "Deactivate Account" : "Activate Account"}
                          >
                            {isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete Account */}
                          <button
                            onClick={() => setDeleteConfirmUser(u)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition cursor-pointer"
                            title="Delete user account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="bg-slate-50 p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing Page {pagination.page} of {pagination.totalPages} ({pagination.total} total registered users)
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => {
                  const p = pagination.page - 1;
                  setPage(p);
                  fetchUsers(p);
                }}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => {
                  const p = pagination.page + 1;
                  setPage(p);
                  fetchUsers(p);
                }}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-[#18232E]" />
                <h3 className="text-base font-extrabold text-slate-900">Edit User Profile</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-[#18232E] focus:bg-white text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-500 text-xs font-mono"
                  title="Email cannot be changed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-[#18232E] focus:bg-white text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none text-xs font-medium cursor-pointer"
                  >
                    <option value="user">Citizen (User)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none text-xs font-medium cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-[#18232E] hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirm Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">Delete User Account</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete account for{" "}
                <strong>{deleteConfirmUser.name}</strong> ({deleteConfirmUser.email})?
              </p>
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl mt-2 border border-amber-200">
                Official entities and unrelated records will NOT be cascade-deleted.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Submissions Drawer */}
      {viewingUserSubmissions && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Submitted Community Places</h3>
                <span className="text-xs text-slate-500">
                  Submissions linked to {viewingUserSubmissions.name} ({viewingUserSubmissions.email})
                </span>
              </div>
              <button
                onClick={() => setViewingUserSubmissions(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2">
              {loadingSubmissions ? (
                <div className="p-8 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  <span>Loading submissions...</span>
                </div>
              ) : userSubmissionsList.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Store className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                  <span className="text-xs">No place submissions found for this user.</span>
                </div>
              ) : (
                userSubmissionsList.map((s) => (
                  <div
                    key={s._id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <h4 className="font-bold text-slate-800">{s.title}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Ref: {s.referenceId} | {s.category}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        s.status === "approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : s.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingUserSubmissions(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
