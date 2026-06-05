"use client";

import * as React from "react";
import { fetchApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  Users, 
  Trash2, 
  ShieldAlert, 
  ShieldCheck, 
  Download, 
  Flame, 
  Plus, 
  Check, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Database,
  Terminal,
  Activity,
  AlertTriangle
} from "lucide-react";

interface AdminUser {
  user_id: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
  is_verified: boolean;
  is_suspended: boolean;
  created_at: string;
}

interface Pagination {
  totalUsers: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export default function AdminDashboard() {
  const { accessToken } = useAuthStore();
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [pagination, setPagination] = React.useState<Pagination | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [userError, setUserError] = React.useState<string | null>(null);

  // Poll Creator State
  const [pollQuestion, setPollQuestion] = React.useState("");
  const [pollOptions, setPollOptions] = React.useState<string[]>(["", ""]);
  const [pollDate, setPollDate] = React.useState("");
  const [creatingPoll, setCreatingPoll] = React.useState(false);
  const [pollSuccess, setPollSuccess] = React.useState<string | null>(null);
  const [pollError, setPollError] = React.useState<string | null>(null);

  // Export Audit Logs State
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [exporting, setExporting] = React.useState(false);
  const [exportSuccess, setExportSuccess] = React.useState<string | null>(null);
  const [exportError, setExportError] = React.useState<string | null>(null);

  // Purge Messages State
  const [purgeConfirm, setPurgeConfirm] = React.useState(false);
  const [purging, setPurging] = React.useState(false);
  const [purgeSuccess, setPurgeSuccess] = React.useState<string | null>(null);
  const [purgeError, setPurgeError] = React.useState<string | null>(null);

  // Action Loading states per user
  const [actionLoadingUser, setActionLoadingUser] = React.useState<string | null>(null);

  // Group Management State
  interface AdminGroup {
    group_id: string;
    name: string;
    created_at: string;
    creator: {
      username: string;
      email: string;
    };
    memberCount: number;
  }
  const [groups, setGroups] = React.useState<AdminGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = React.useState(false);
  const [groupError, setGroupError] = React.useState<string | null>(null);
  const [actionLoadingGroup, setActionLoadingGroup] = React.useState<string | null>(null);

  // Fetch groups list
  const loadGroups = React.useCallback(async () => {
    setLoadingGroups(true);
    setGroupError(null);
    try {
      const data = await fetchApi("/admin/groups");
      if (data.status === "success") {
        setGroups(data.groups);
      }
    } catch (err: any) {
      setGroupError(err.message || "Failed to query active group channels");
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("CONFIRM DELETION: This permanently deletes this discussion channel and ejects all members. This action is irreversible.")) {
      return;
    }
    setActionLoadingGroup(groupId);
    setGroupError(null);
    try {
      const data = await fetchApi(`/admin/groups/${groupId}`, {
        method: "DELETE",
      });
      if (data.status === "success") {
        setGroups((prev) => prev.filter((g) => g.group_id !== groupId));
      }
    } catch (err: any) {
      setGroupError(err.message || "Deletion failed");
    } finally {
      setActionLoadingGroup(null);
    }
  };

  // Fetch users list
  const loadUsers = React.useCallback(async (page: number, search: string) => {
    setLoadingUsers(true);
    setUserError(null);
    try {
      const qs = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search ? { q: search } : {}),
      });
      const data = await fetchApi(`/admin/users?${qs.toString()}`);
      if (data.status === "success") {
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch (err: any) {
      setUserError(err.message || "Failed to query directory logs");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  React.useEffect(() => {
    loadUsers(currentPage, searchQuery);
  }, [currentPage, searchQuery, loadUsers]);

  React.useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Set default poll date to today on load
  React.useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setPollDate(today);
    // Set default export dates
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setStartDate(yesterday);
    setEndDate(today);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadUsers(1, searchQuery);
  };

  const handleToggleSuspension = async (userId: string) => {
    setActionLoadingUser(userId);
    setUserError(null);
    try {
      const data = await fetchApi(`/admin/users/${userId}/suspend`, {
        method: "PATCH",
      });
      if (data.status === "success") {
        // Toggle state locally
        setUsers((prev) =>
          prev.map((u) =>
            u.user_id === userId ? { ...u, is_suspended: data.is_suspended } : u
          )
        );
      }
    } catch (err: any) {
      setUserError(err.message || "Failed to alter suspension status");
    } finally {
      setActionLoadingUser(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("CONFIRM ABSOLUTE PURGE: This hard-deletes the user and all associated records permanently. This action is irreversible.")) {
      return;
    }
    setActionLoadingUser(userId);
    setUserError(null);
    try {
      const data = await fetchApi(`/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (data.status === "success") {
        // Remove from list
        setUsers((prev) => prev.filter((u) => u.user_id !== userId));
        if (pagination) {
          setPagination({
            ...pagination,
            totalUsers: pagination.totalUsers - 1,
          });
        }
      }
    } catch (err: any) {
      setUserError(err.message || "Purge execution failed");
    } finally {
      setActionLoadingUser(null);
    }
  };

  // Add Poll Option input
  const addPollOption = () => {
    if (pollOptions.length >= 8) return;
    setPollOptions((prev) => [...prev, ""]);
  };

  // Remove Poll Option input
  const removePollOption = (index: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlePollOptionChange = (idx: number, val: string) => {
    setPollOptions((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  // Submit Poll creation
  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingPoll(true);
    setPollError(null);
    setPollSuccess(null);

    const filteredOptions = pollOptions.map((o) => o.trim()).filter((o) => o !== "");
    if (filteredOptions.length < 2) {
      setPollError("Poll requires at least 2 valid options");
      setCreatingPoll(false);
      return;
    }

    try {
      const response = await fetchApi("/polls", {
        method: "POST",
        body: JSON.stringify({
          question: pollQuestion,
          options: filteredOptions,
          activeDate: pollDate,
        }),
      });

      if (response.status === "success") {
        setPollSuccess(`SUCCESS: Poll #${response.poll.poll_id.slice(0, 8)} deployed for ${pollDate}`);
        setPollQuestion("");
        setPollOptions(["", ""]);
      }
    } catch (err: any) {
      setPollError(err.message || "Failed to deploy engagement poll");
    } finally {
      setCreatingPoll(false);
    }
  };

  // Export Audit CSV
  const handleExportAuditLogs = async (e: React.FormEvent) => {
    e.preventDefault();
    setExporting(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ startDate, endDate }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to download report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Dynamic filename: Chat history[DD-MM-YYYY].csv (based on current local date)
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;
      const filename = `Chat history[${formattedDate}].csv`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setExportSuccess("CSV stream successfully downloaded.");
    } catch (err: any) {
      setExportError(err.message || "Failed to export logs");
    } finally {
      setExporting(false);
    }
  };

  // Purge old logs
  const handlePurgeMessages = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purgeConfirm) {
      setPurgeError("System safety confirmation required");
      return;
    }

    setPurging(true);
    setPurgeError(null);
    setPurgeSuccess(null);

    try {
      const response = await fetchApi("/admin/purge", {
        method: "POST",
        body: JSON.stringify({ confirm: true }),
      });

      if (response.status === "success") {
        setPurgeSuccess(`PURGE COMPLETE: ${response.purgedCount} logs deleted.`);
        setPurgeConfirm(false);
      }
    } catch (err: any) {
      setPurgeError(err.message || "Purge run failed");
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="h-full w-full p-6 overflow-y-auto bg-black text-white font-[family-name:var(--font-space-mono)] border-t border-solid border-white/20 select-text">
      
      {/* Telemetry dashboard banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="border border-solid border-white/30 p-4 bg-black flex items-center gap-3">
          <Database size={20} className="text-white" />
          <div>
            <div className="text-[8px] text-gray-400 uppercase tracking-widest">Active Database</div>
            <div className="text-[12px] font-bold uppercase">PRISMA [SQLITE]</div>
          </div>
        </div>
        <div className="border border-solid border-white/30 p-4 bg-black flex items-center gap-3">
          <Activity size={20} className="text-white" />
          <div>
            <div className="text-[8px] text-gray-400 uppercase tracking-widest">Sys Uptime</div>
            <div className="text-[12px] font-bold uppercase">99.98% NODE RUN</div>
          </div>
        </div>
        <div className="border border-solid border-white/30 p-4 bg-black flex items-center gap-3">
          <Users size={20} className="text-white" />
          <div>
            <div className="text-[8px] text-gray-400 uppercase tracking-widest">Total Directory</div>
            <div className="text-[12px] font-bold uppercase">
              {pagination ? `${pagination.totalUsers} registered` : "Querying..."}
            </div>
          </div>
        </div>
        <div className="border border-solid border-white/30 p-4 bg-black flex items-center gap-3">
          <Terminal size={20} className="text-white animate-pulse" />
          <div>
            <div className="text-[8px] text-gray-400 uppercase tracking-widest">Connection Bridge</div>
            <div className="text-[12px] font-bold uppercase text-white">REDIS ALIGNED</div>
          </div>
        </div>
      </div>

      {/* Grid of panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* User Directory Management (2 cols width on large screens) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card className="border-2 border-solid border-white bg-black shadow-none rounded-[4px]">
            <CardHeader className="border-b-2 border-solid border-white py-4 bg-black/50 border-t-0 rounded-t-0">
              <CardTitle className="text-[11px] font-[family-name:var(--font-press-start)] text-white">
                // USER REGISTRY DIRECTORY
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              
              {/* Directory Filter Search */}
              <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search by username key..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black border border-solid border-white/40 text-[11px] rounded-[4px] pl-9 pr-3 py-2 outline-none focus:border-white text-white font-bold"
                  />
                </div>
                <Button 
                  type="submit" 
                  variant="ghost" 
                  className="border-white border-2 border-solid text-white hover:bg-white hover:text-black shadow-none py-2 h-auto"
                >
                  QUERY
                </Button>
              </form>

              {userError && (
                <div className="border border-solid border-white/50 bg-white/10 text-white p-3 rounded-[4px] text-[10px] uppercase text-center font-bold mb-4">
                  ⚠️ DIRECTORY OUTAGE: {userError}
                </div>
              )}

              {/* User list table */}
              <div className="overflow-x-auto border border-solid border-white/20 rounded-[4px] mb-4">
                <table className="w-full border-collapse text-left text-[10px]">
                  <thead>
                    <tr className="bg-white/10 border-b border-solid border-white/20 uppercase font-bold text-gray-300">
                      <th className="p-3">User Node</th>
                      <th className="p-3">Email Key</th>
                      <th className="p-3">Clearance</th>
                      <th className="p-3 text-center">Security Status</th>
                      <th className="p-3 text-right">System Controls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400 uppercase tracking-widest animate-pulse">
                          Accessing ledger streams...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500 uppercase">
                          No matching credentials found
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.user_id} className="border-b border-solid border-white/10 hover:bg-white/5 transition-colors">
                          <td className="p-3 font-bold">{u.username}</td>
                          <td className="p-3 text-gray-400">{u.email}</td>
                          <td className="p-3 font-bold">
                            <span className={u.role === "ADMIN" ? "text-white underline decoration-dotted" : "text-gray-400"}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1.5 justify-center">
                              {u.is_suspended ? (
                                <span className="flex items-center gap-1 text-white border border-solid border-white px-1.5 py-0.5 rounded text-[8px] bg-white/10 font-bold">
                                  <ShieldAlert size={8} /> SUSPENDED
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-gray-400 border border-solid border-white/20 px-1.5 py-0.5 rounded text-[8px]">
                                  <ShieldCheck size={8} /> SECURE
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center gap-2 justify-end">
                              {u.role !== "ADMIN" && (
                                <>
                                  <button
                                    onClick={() => handleToggleSuspension(u.user_id)}
                                    disabled={actionLoadingUser === u.user_id}
                                    className={`px-2 py-1 border text-[8px] font-bold rounded uppercase cursor-pointer transition-colors ${
                                      u.is_suspended
                                        ? "border-white bg-white text-black hover:bg-black hover:text-white"
                                        : "border-white/40 text-white hover:bg-white hover:text-black"
                                    }`}
                                  >
                                    {actionLoadingUser === u.user_id ? "..." : u.is_suspended ? "Revoke" : "Suspend"}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u.user_id)}
                                    disabled={actionLoadingUser === u.user_id}
                                    className="p-1 border border-solid border-white/20 hover:border-white text-gray-400 hover:text-white rounded cursor-pointer transition-colors"
                                    title="Purge User Account"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between text-[10px] border-t border-solid border-white/20 pt-4">
                  <span className="text-gray-400 uppercase">
                    Ledger {pagination.currentPage} / {pagination.totalPages} ({pagination.totalUsers} total)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 border border-solid border-white/40 hover:border-white rounded disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <ChevronLeft size={12} />
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={currentPage === pagination.totalPages}
                      className="p-1.5 border border-solid border-white/40 hover:border-white rounded disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* GROUP CHANNELS DIRECTORY */}
          <Card className="border-2 border-solid border-white bg-black shadow-none rounded-[4px]">
            <CardHeader className="border-b-2 border-solid border-white py-4 bg-black/50 border-t-0 rounded-t-0">
              <CardTitle className="text-[11px] font-[family-name:var(--font-press-start)] text-white">
                // GROUP CHANNELS DIRECTORY
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {groupError && (
                <div className="border border-solid border-white/50 bg-white/10 text-white p-3 rounded-[4px] text-[10px] uppercase text-center font-bold mb-4">
                  ⚠️ GROUP DIRECTORY OUTAGE: {groupError}
                </div>
              )}

              <div className="overflow-x-auto border border-solid border-white/20 rounded-[4px]">
                <table className="w-full border-collapse text-left text-[10px]">
                  <thead>
                    <tr className="bg-white/10 border-b border-solid border-white/20 uppercase font-bold text-gray-300">
                      <th className="p-3">Channel Name</th>
                      <th className="p-3">Creator User</th>
                      <th className="p-3">Active Members</th>
                      <th className="p-3 text-right">System Controls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingGroups ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-400 uppercase tracking-widest animate-pulse">
                          Querying active channel matrix...
                        </td>
                      </tr>
                    ) : groups.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-500 uppercase">
                          No active group channels registered
                        </td>
                      </tr>
                    ) : (
                      groups.map((g) => (
                        <tr key={g.group_id} className="border-b border-solid border-white/10 hover:bg-white/5 transition-colors">
                          <td className="p-3 font-bold text-white">#{g.name}</td>
                          <td className="p-3">
                            <span className="font-bold">{g.creator?.username || "SYSTEM"}</span>
                            <span className="text-gray-400 text-[8px] block">{g.creator?.email || ""}</span>
                          </td>
                          <td className="p-3 text-gray-300 font-bold">{g.memberCount} / 50</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteGroup(g.group_id)}
                              disabled={actionLoadingGroup === g.group_id}
                              className="p-1 border border-solid border-white/20 hover:border-white text-gray-400 hover:text-white rounded cursor-pointer transition-colors"
                              title="Delete Group Channel"
                            >
                              {actionLoadingGroup === g.group_id ? "..." : <Trash2 size={12} />}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Control Desk Pane */}
        <div className="flex flex-col gap-6">

          {/* Daily Poll Manager */}
          <Card className="border-2 border-solid border-white bg-black shadow-none rounded-[4px]">
            <CardHeader className="border-b-2 border-solid border-white py-4 border-t-0 rounded-t-0">
              <CardTitle className="text-[11px] font-[family-name:var(--font-press-start)] text-white">
                // POLL DEPLOYMENT UNIT
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {pollSuccess && (
                <div className="bg-white/10 border border-solid border-white p-2.5 rounded-[4px] text-[9px] uppercase font-bold text-white mb-4">
                  {pollSuccess}
                </div>
              )}
              {pollError && (
                <div className="border border-solid border-white bg-black p-2.5 rounded-[4px] text-[9px] uppercase font-bold text-white mb-4 animate-pulse">
                  ⚠️ DEPLOY FAIL: {pollError}
                </div>
              )}

              <form onSubmit={handleCreatePoll} className="flex flex-col gap-4 text-[10px]">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] text-gray-400 uppercase font-bold">
                    Poll Inquiry / Question
                  </label>
                  <textarea
                    required
                    placeholder="Input today's daily inquiry..."
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    className="w-full bg-black border border-solid border-white/40 text-[11px] rounded-[4px] p-2.5 min-h-[60px] outline-none focus:border-white text-white font-bold"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[9px] uppercase font-bold text-gray-400 mb-1">
                    <span>Options / Indexes</span>
                    {pollOptions.length < 8 && (
                      <button
                        type="button"
                        onClick={addPollOption}
                        className="flex items-center gap-1 text-white hover:underline cursor-pointer"
                      >
                        <Plus size={10} /> Add Index
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {pollOptions.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-[9px] text-white font-bold w-4">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <input
                          type="text"
                          required
                          placeholder={`Option selection ${idx + 1}`}
                          value={option}
                          onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                          className="flex-1 bg-black border border-solid border-white/40 text-[10px] rounded-[4px] px-2.5 py-1.5 outline-none focus:border-white text-white font-bold"
                        />
                        {pollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removePollOption(idx)}
                            className="p-1 border border-solid border-white/20 hover:border-white hover:text-white text-gray-400 rounded cursor-pointer"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] text-gray-400 uppercase font-bold">
                    Target Deployment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={pollDate}
                    onChange={(e) => setPollDate(e.target.value)}
                    className="w-full bg-black border border-solid border-white/40 text-[10px] rounded-[4px] px-2.5 py-1.5 outline-none focus:border-white text-white font-bold"
                  />
                </div>

                <Button
                  type="submit"
                  variant="ghost"
                  disabled={creatingPoll}
                  className="border-white border-2 border-solid text-white hover:bg-white hover:text-black shadow-none mt-2 w-full font-bold py-2 h-auto"
                >
                  {creatingPoll ? "PROVISIONING..." : ">> DEPLOY CONSENSUS MATRIX <<"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Audit Logs CSV Exporter */}
          <Card className="border-2 border-solid border-white bg-black shadow-none rounded-[4px]">
            <CardHeader className="border-b-2 border-solid border-white py-4 border-t-0 rounded-t-0">
              <CardTitle className="text-[11px] font-[family-name:var(--font-press-start)] text-white">
                // CHAT ARCHIVE AUDITOR
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {exportSuccess && (
                <div className="bg-white/10 border border-solid border-white p-2.5 rounded-[4px] text-[9px] uppercase font-bold text-white mb-4">
                  {exportSuccess}
                </div>
              )}
              {exportError && (
                <div className="border border-solid border-white bg-black p-2.5 rounded-[4px] text-[9px] uppercase font-bold text-white mb-4 animate-pulse">
                  ⚠️ EXPORT FAIL: {exportError}
                </div>
              )}

              <form onSubmit={handleExportAuditLogs} className="flex flex-col gap-3 text-[10px]">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] text-gray-400 uppercase font-bold">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-black border border-solid border-white/40 text-[10px] rounded-[4px] px-2.5 py-1.5 outline-none focus:border-white text-white font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] text-gray-400 uppercase font-bold">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-black border border-solid border-white/40 text-[10px] rounded-[4px] px-2.5 py-1.5 outline-none focus:border-white text-white font-bold"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="ghost"
                  disabled={exporting}
                  className="border-white border-2 border-solid text-white hover:bg-white hover:text-black shadow-none mt-1 w-full font-bold py-2 h-auto flex items-center justify-center gap-2"
                >
                  <Download size={12} />
                  {exporting ? "STREAMING CSV..." : "GENERATE AUDIT REPORT"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Database message purge execution */}
          <Card className="border-2 border-solid border-white bg-black shadow-none rounded-[4px]">
            <CardHeader className="border-b-2 border-solid border-white py-4 border-t-0 rounded-t-0">
              <CardTitle className="text-[11px] font-[family-name:var(--font-press-start)] text-white">
                // SYSTEM GOVERNANCE DISK
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {purgeSuccess && (
                <div className="bg-white/10 border border-solid border-white p-2.5 rounded-[4px] text-[9px] uppercase font-bold text-white mb-4">
                  {purgeSuccess}
                </div>
              )}
              {purgeError && (
                <div className="border border-solid border-white bg-black p-2.5 rounded-[4px] text-[9px] uppercase font-bold text-white mb-4 animate-pulse">
                  ⚠️ PURGE ERR: {purgeError}
                </div>
              )}

              <form onSubmit={handlePurgeMessages} className="flex flex-col gap-3 text-[10px]">
                <div className="p-3 border border-solid border-white/30 bg-white/5 flex gap-2.5 items-start">
                  <AlertTriangle size={16} className="text-white shrink-0 mt-0.5" />
                  <div className="text-[9px] uppercase leading-relaxed text-gray-400 font-bold">
                    WARNING: Deletes all database message records older than 24 hours permanently. Enforces data retention restrictions.
                  </div>
                </div>

                <label className="flex items-center gap-2 text-[9px] uppercase cursor-pointer select-none font-bold">
                  <input
                    type="checkbox"
                    checked={purgeConfirm}
                    onChange={(e) => setPurgeConfirm(e.target.checked)}
                    className="bg-black border border-solid border-white/50 text-white rounded cursor-pointer"
                  />
                  Confirm disk space override
                </label>

                <Button
                  type="submit"
                  variant="ghost"
                  disabled={purging || !purgeConfirm}
                  className="border-white border-2 border-solid text-white hover:bg-white hover:text-black shadow-none w-full font-bold py-2 h-auto flex items-center justify-center gap-2 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white"
                >
                  <Flame size={12} />
                  {purging ? "PURGING LEDGER..." : "EXECUTE 24H CORE PURGE"}
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
