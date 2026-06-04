"use client";

import * as React from "react";
import { User, Search, Check, X, UserPlus, Clock } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useChatStore, ConversationFriend } from "@/stores/chat.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ConversationList() {
  const { friends, setFriends, activeFriendId, setActiveFriendId } = useChatStore();
  
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = React.useState<any[]>([]);
  const [activeTab, setActiveTab] = React.useState<"friends" | "requests" | "search">("friends");
  const [addStatus, setAddStatus] = React.useState<string | null>(null);

  // Load friends and pending requests on mount
  const loadData = React.useCallback(async () => {
    try {
      const friendsData = await fetchApi("/friendships");
      setFriends(friendsData.friends.map((f: any) => ({ ...f, online: false })));

      const pendingData = await fetchApi("/friendships/pending");
      setPendingRequests(pendingData.requests);
    } catch (err) {
      console.error("Failed to load friends directory data:", err);
    }
  }, [setFriends]);

  React.useEffect(() => {
    loadData();
    // Poll for pending requests every 15 seconds to simulate push notifications
    const timer = setInterval(() => {
      loadData();
    }, 15000);
    return () => clearInterval(timer);
  }, [loadData]);

  // Handle player search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      // In a real database, this search will hit an endpoint `/users/search?q=query`
      // We will perform a fetch request
      const results = await fetchApi(`/users/search?q=${encodeURIComponent(searchQuery)}`).catch(() => []);
      setSearchResults(results.users || []);
    } catch (err) {
      setSearchResults([]);
    }
  };

  // Trigger search on typing
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await fetchApi(`/users/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(results.users || []);
      } catch (err) {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Send friend request
  const sendRequest = async (targetId: string) => {
    setAddStatus(null);
    try {
      await fetchApi("/friendships/request", {
        method: "POST",
        body: JSON.stringify({ targetId }),
      });
      setAddStatus("REQUEST SENT");
      setTimeout(() => setAddStatus(null), 3000);
      loadData();
    } catch (err: any) {
      setAddStatus(err.message || "FAILED");
      setTimeout(() => setAddStatus(null), 4000);
    }
  };

  // Accept request
  const acceptRequest = async (friendshipId: string) => {
    try {
      await fetchApi(`/friendships/${friendshipId}/accept`, {
        method: "PATCH",
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Decline/Cancel request
  const declineRequest = async (friendshipId: string) => {
    try {
      await fetchApi(`/friendships/${friendshipId}`, {
        method: "DELETE",
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-surface">
      {/* Sub tabs selector */}
      <div className="flex border-b-2 border-dotted border-primary/30 text-[9px] font-[family-name:var(--font-press-start)]">
        <button
          onClick={() => setActiveTab("friends")}
          className={`flex-1 py-3 text-center cursor-pointer uppercase select-none transition-colors ${
            activeTab === "friends" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted hover:text-foreground"
          }`}
        >
          🎮 Friends
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex-1 py-3 text-center cursor-pointer uppercase select-none relative transition-colors ${
            activeTab === "requests" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted hover:text-foreground"
          }`}
        >
          📨 Inbox
          {pendingRequests.length > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 bg-danger rounded-full animate-ping" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("search")}
          className={`flex-1 py-3 text-center cursor-pointer uppercase select-none transition-colors ${
            activeTab === "search" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted hover:text-foreground"
          }`}
        >
          🔍 Search
        </button>
      </div>

      {/* Main tab viewport */}
      <div className="flex-1 overflow-y-auto p-3">
        
        {/* TAB 1: FRIENDS DIRECTORY */}
        {activeTab === "friends" && (
          <div className="flex flex-col gap-2">
            {friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center gap-2">
                <span className="text-xl">👾</span>
                <span className="font-[family-name:var(--font-press-start)] text-[8px] text-muted uppercase">
                  No Players in Lobby
                </span>
                <button
                  onClick={() => setActiveTab("search")}
                  className="font-[family-name:var(--font-space-mono)] text-[10px] text-secondary hover:text-white underline mt-1"
                >
                  Find Academic Players
                </button>
              </div>
            ) : (
              friends.map((friend) => {
                const isActive = activeFriendId === friend.user_id;
                
                return (
                  <button
                    key={friend.user_id}
                    onClick={() => setActiveFriendId(friend.user_id)}
                    className={`flex flex-col gap-1 w-full p-2.5 rounded-[4px] border-2 text-left cursor-pointer transition-all ${
                      isActive
                        ? "bg-primary/10 border-primary shadow-[2px_2px_0px_0px_rgba(42,63,229,0.3)]"
                        : "bg-surface border-dotted border-primary/20 hover:border-secondary hover:bg-foreground/5"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      {/* Name & presence */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            friend.online ? "bg-success animate-pulse" : "bg-muted"
                          }`}
                        />
                        <span
                          className={`font-[family-name:var(--font-press-start)] text-[9px] uppercase truncate ${
                            friend.online ? "text-white" : "text-muted"
                          }`}
                        >
                          {friend.username}
                        </span>
                        {friend.role === "ADMIN" && (
                          <span className="px-1 py-0.5 text-[5px] font-[family-name:var(--font-press-start)] bg-danger border-2 border-double border-white text-white font-bold select-none uppercase tracking-wide rounded-[2px] leading-none shrink-0 shadow-[2px_2px_0px_rgba(220,38,38,0.5)] animate-arcade-blink">
                            ADMIN
                          </span>
                        )}
                      </div>

                      {/* Spotify Badge equalizer */}
                      {friend.spotifyPlaying && (
                        <div className="flex items-center gap-1 shrink-0 bg-success/20 border border-success rounded-[2px] px-1 text-[7px] font-[family-name:var(--font-press-start)] text-success animate-pulse">
                          <span>🎵</span>
                        </div>
                      )}
                    </div>

                    {/* Status Bubble */}
                    {friend.status_text && (
                      <p className="font-[family-name:var(--font-space-mono)] text-[9px] text-muted truncate pl-3">
                        {`"${friend.status_text}"`}
                      </p>
                    )}

                    {/* Spotify Subtext */}
                    {friend.spotifyPlaying && (
                      <div className="font-[family-name:var(--font-space-mono)] text-[8px] text-success truncate pl-3 flex items-center gap-1">
                        <span className="animate-bounce">▶</span>
                        <span className="truncate">
                          {friend.spotifyPlaying.track} - {friend.spotifyPlaying.artist}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: PENDING INCOMING REQUESTS */}
        {activeTab === "requests" && (
          <div className="flex flex-col gap-2">
            <div className="font-[family-name:var(--font-press-start)] text-[8px] text-primary uppercase mb-2 flex items-center gap-1.5">
              <Clock size={12} />
              <span>Pending Approvals</span>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="text-center p-8 text-muted font-[family-name:var(--font-space-mono)] text-[10px] uppercase">
                Inbox is Empty
              </div>
            ) : (
              pendingRequests.map((req) => (
                <div
                  key={req.friendship_id}
                  className="flex items-center justify-between p-2 bg-surface border-2 border-dotted border-secondary/50 rounded-[4px] font-[family-name:var(--font-space-mono)]"
                >
                  <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-[family-name:var(--font-press-start)] text-[8px] text-white truncate">
                        {req.requester.username}
                      </span>
                      {req.requester.role === "ADMIN" && (
                        <span className="px-1 py-0.5 text-[5px] font-[family-name:var(--font-press-start)] bg-danger border-2 border-double border-white text-white font-bold select-none uppercase tracking-wide rounded-[2px] leading-none shrink-0 shadow-[2px_2px_0px_rgba(220,38,38,0.5)] animate-arcade-blink">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-muted truncate">
                      {req.requester.email}
                    </span>
                  </div>
                  
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => acceptRequest(req.friendship_id)}
                      className="p-1 rounded bg-success/20 text-success border border-success hover:bg-success hover:text-white cursor-pointer transition-colors"
                      title="Accept Request"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => declineRequest(req.friendship_id)}
                      className="p-1 rounded bg-danger/20 text-danger border border-danger hover:bg-danger hover:text-white cursor-pointer transition-colors"
                      title="Decline Request"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: SEARCH PLAYERS */}
        {activeTab === "search" && (
          <div className="flex flex-col gap-3 font-[family-name:var(--font-space-mono)]">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="text"
                placeholder="USERNAME OR ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-[11px]"
              />
              <Button type="submit" variant="outline" size="sm" className="cursor-pointer">
                <Search size={14} />
              </Button>
            </form>

            {addStatus && (
              <div className="bg-primary/10 border border-primary text-primary text-[9px] uppercase py-1 px-2 rounded-[2px] text-center font-bold">
                📢 {addStatus}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {searchResults.length === 0 ? (
                searchQuery.trim() ? (
                  <div className="text-center text-muted text-[10px] py-4 uppercase">
                    No Players Found
                  </div>
                ) : (
                  <div className="text-center text-muted text-[9px] py-4 uppercase">
                    Enter username prefix to query
                  </div>
                )
              ) : (
                searchResults.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-2 bg-surface border-2 border-dotted border-primary/20 rounded-[4px]"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-[family-name:var(--font-press-start)] text-[8px] text-white truncate">
                          {user.username}
                        </span>
                        {user.role === "ADMIN" && (
                          <span className="px-1 py-0.5 text-[5px] font-[family-name:var(--font-press-start)] bg-danger border-2 border-double border-white text-white font-bold select-none uppercase tracking-wide rounded-[2px] leading-none shrink-0 shadow-[2px_2px_0px_rgba(220,38,38,0.5)] animate-arcade-blink">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-muted truncate">
                        {user.email}
                      </span>
                    </div>

                    <button
                      onClick={() => sendRequest(user.user_id)}
                      className="flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary border border-primary rounded-[4px] text-[9px] uppercase hover:bg-primary hover:text-white cursor-pointer transition-colors"
                    >
                      <UserPlus size={10} />
                      <span>Add</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
