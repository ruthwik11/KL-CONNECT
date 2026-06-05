"use client";

import * as React from "react";
import { Users, Search, Plus } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Group {
  group_id: string;
  name: string;
  is_public: boolean;
  memberCount: number;
  creator: {
    user_id: string;
    username: string;
  };
}

interface GroupListProps {
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;
  onRefreshTrigger: number;
  triggerRefresh: () => void;
}

export function GroupList({
  activeGroupId,
  setActiveGroupId,
  onRefreshTrigger,
  triggerRefresh,
}: GroupListProps) {
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === "ADMIN";

  const [groups, setGroups] = React.useState<Group[]>([]);
  const [search, setSearch] = React.useState("");
  const [newGroupName, setNewGroupName] = React.useState("");
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  const loadGroups = React.useCallback(async () => {
    try {
      const data = await fetchApi("/groups/public");
      setGroups(data.groups || []);
    } catch (err) {
      console.error("Failed to load group channels:", err);
    }
  }, []);

  React.useEffect(() => {
    loadGroups();
  }, [loadGroups, onRefreshTrigger]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const name = newGroupName.trim();
    if (name.length < 3 || name.length > 64) {
      setCreateError("NAME: 3-64 CHARS ONLY");
      return;
    }

    try {
      const data = await fetchApi("/groups", {
        method: "POST",
        body: JSON.stringify({ name, is_public: true }),
      });

      setNewGroupName("");
      setShowCreateForm(false);
      triggerRefresh();
      // Auto select newly created group
      setActiveGroupId(data.group.group_id);
    } catch (err: any) {
      setCreateError(err.message || "CREATE FAILED");
    }
  };

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header with Search and Create Actions */}
      <div className="p-4 border-b-2 border-dotted border-primary/30 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-[family-name:var(--font-press-start)] text-[10px] text-primary uppercase tracking-wider">
            👾 channels
          </span>
          
          {isAdmin && (
            <button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setCreateError(null);
              }}
              className="flex items-center justify-center p-1 rounded border border-primary text-primary hover:bg-primary hover:text-white cursor-pointer transition-colors"
              title="Create New Channel"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {/* Create group form */}
        {isAdmin && showCreateForm ? (
          <form onSubmit={handleCreateGroup} className="flex flex-col gap-2 p-2.5 bg-primary/5 border-2 border-dashed border-primary rounded-[4px] font-[family-name:var(--font-space-mono)]">
            <span className="font-[family-name:var(--font-press-start)] text-[7px] text-secondary uppercase">
              NEW CHANNEL SELECT
            </span>
            {createError && (
              <span className="text-[8px] text-danger font-bold uppercase animate-pulse">
                ⚠️ {createError}
              </span>
            )}
            <Input
              type="text"
              placeholder="ENTER NAME"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="h-8 text-[11px]"
              maxLength={64}
            />
            <div className="flex gap-2 justify-end mt-1">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="text-[9px] text-muted hover:text-white uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-[9px] text-secondary hover:text-white font-bold uppercase cursor-pointer"
              >
                Create
              </button>
            </div>
          </form>
        ) : (
          <div className="flex gap-2 relative font-[family-name:var(--font-space-mono)]">
            <Input
              type="text"
              placeholder="SEARCH CHANNELS"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-[11px] pr-8"
            />
            <Search className="absolute right-2.5 top-2.5 text-muted" size={14} />
          </div>
        )}
      </div>

      {/* Public channels listings */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-2">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-muted font-[family-name:var(--font-space-mono)] text-[10px] uppercase">
              {search.trim() ? "No channels match query" : "No public channels found"}
            </div>
          ) : (
            filteredGroups.map((g) => {
              const isActive = activeGroupId === g.group_id;

              return (
                <button
                  key={g.group_id}
                  onClick={() => setActiveGroupId(g.group_id)}
                  className={`flex flex-col gap-1.5 w-full p-3 rounded-[4px] border-2 text-left cursor-pointer transition-all ${
                    isActive
                      ? "bg-primary/10 border-primary shadow-[2px_2px_0px_0px_rgba(42,63,229,0.3)]"
                      : "bg-surface border-dotted border-primary/20 hover:border-secondary hover:bg-foreground/5"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-[family-name:var(--font-press-start)] text-[9px] text-white uppercase truncate pr-2">
                      #{g.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 bg-primary/20 border border-primary rounded-[2px] px-1 text-[7px] font-[family-name:var(--font-press-start)] text-primary">
                      <Users size={8} className="mr-0.5" />
                      <span>{g.memberCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full font-[family-name:var(--font-space-mono)] text-[8px] text-muted uppercase">
                    <span>Creator: {g.creator.username}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
