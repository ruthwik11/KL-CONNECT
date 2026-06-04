"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare, Users, BarChart3, Settings, Music, RefreshCw, CheckCircle, HelpCircle } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";
import { SidebarNav, SidebarNavItem } from "@/components/shared/sidebar-nav";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Suspense } from "react";

const SIDEBAR_ITEMS: SidebarNavItem[] = [
  { id: "chat", label: "Direct Messages", icon: MessageSquare, href: "/chat" },
  { id: "groups", label: "Discussion Hub", icon: Users, href: "/groups" },
  { id: "polls", label: "Daily Polls", icon: BarChart3, href: "/polls" },
  { id: "settings", label: "Game Settings", icon: Settings, href: "/settings" },
];

const MOCK_TRACKS = [
  { track: "Pac-Man Fever", artist: "Buckner & Garcia" },
  { track: "Around the World", artist: "Daft Punk" },
  { track: "Blue Monday", artist: "New Order" },
  { track: "Space Invaders", artist: "Player One" },
];

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { user, accessToken, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const { socket, initSocket } = useChatStore();

  const [checkingAuth, setCheckingAuth] = React.useState(true);
  const [statusText, setStatusText] = React.useState(user?.status_text || "");
  const [statusLoading, setStatusLoading] = React.useState(false);
  const [statusSuccess, setStatusSuccess] = React.useState(false);
  const [spotifyLoading, setSpotifyLoading] = React.useState(false);

  // Username Config State
  const [username, setUsername] = React.useState(user?.username || "");
  const [usernameLoading, setUsernameLoading] = React.useState(false);
  const [usernameSuccess, setUsernameSuccess] = React.useState(false);
  const [usernameError, setUsernameError] = React.useState<string | null>(null);

  // Friend Network Directory State
  const [friends, setFriends] = React.useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = React.useState(true);

  // Joined Discussion Hubs State
  const [joinedGroups, setJoinedGroups] = React.useState<any[]>([]);
  const [groupsLoading, setGroupsLoading] = React.useState(true);
  
  // Mock player states
  const [selectedMockIdx, setSelectedMockIdx] = React.useState(0);
  const [isMockBroadcasting, setIsMockBroadcasting] = React.useState(false);

  const [notifyMsg, setNotifyMsg] = React.useState<string | null>(null);
  const [notifyType, setNotifyType] = React.useState<"success" | "error" | null>(null);

  // Update fields when user store loads/updates
  React.useEffect(() => {
    if (user) {
      setUsername(user.username);
      setStatusText(user.status_text || "");
    }
  }, [user]);

  // Parse query params for OAuth return state messages
  React.useEffect(() => {
    const status = searchParams?.get("spotify");
    const msg = searchParams?.get("message");

    if (status === "success") {
      setNotifyMsg("SPOTIFY LINKED SUCCESSFULLY!");
      setNotifyType("success");
      router.replace("/settings");
    } else if (status === "error") {
      setNotifyMsg(`SPOTIFY LINK FAILED: ${msg || "UNKNOWN"}`);
      setNotifyType("error");
      router.replace("/settings");
    }
  }, [searchParams, router]);

  // Fetch Friends and Groups
  React.useEffect(() => {
    const loadProfileData = async () => {
      if (!isAuthenticated || !accessToken) return;

      try {
        const friendsData = await fetchApi("/friendships", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setFriends(friendsData.friends || []);
      } catch (err) {
        console.error("🔒 Failed to load friendships:", err);
      } finally {
        setFriendsLoading(false);
      }

      try {
        const groupsData = await fetchApi("/groups/my", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setJoinedGroups(groupsData.groups || []);
      } catch (err) {
        console.error("🔒 Failed to load joined groups:", err);
      } finally {
        setGroupsLoading(false);
      }
    };

    if (!checkingAuth) {
      loadProfileData();
    }
  }, [isAuthenticated, accessToken, checkingAuth]);

  // Auth gate checks and session restoration loop
  React.useEffect(() => {
    const restoreSession = async () => {
      if (isAuthenticated && accessToken) {
        initSocket(accessToken);
        setCheckingAuth(false);
        return;
      }

      const rt = localStorage.getItem("klc_rt");
      if (!rt) {
        clearAuth();
        router.push("/login");
        return;
      }

      try {
        const data = await fetchApi("/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refreshToken: rt }),
        });

        const profile = await fetchApi("/users/me", {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        });

        setAuth(profile.user, data.accessToken, data.refreshToken);
        initSocket(data.accessToken);
        setStatusText(profile.user.status_text || "");
        setUsername(profile.user.username);
      } catch (err) {
        console.error("🔒 Auth restoration failed:", err);
        clearAuth();
        router.push("/login");
      } finally {
        setCheckingAuth(false);
      }
    };

    restoreSession();
  }, [isAuthenticated, accessToken, initSocket, setAuth, clearAuth, router]);

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameLoading(true);
    setUsernameSuccess(false);
    setUsernameError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setUsernameError("Username is required");
      setUsernameLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,32}$/.test(cleanUsername)) {
      setUsernameError("Alphanumeric and underscores only (3-32 chars)");
      setUsernameLoading(false);
      return;
    }

    try {
      const data = await fetchApi("/users/me/username", {
        method: "PATCH",
        body: JSON.stringify({ username: cleanUsername }),
      });

      // Update local store state
      if (user && accessToken) {
        setAuth({ ...user, username: data.user.username }, accessToken);
      }

      setUsernameSuccess(true);
      setTimeout(() => setUsernameSuccess(false), 3000);
    } catch (err: any) {
      setUsernameError(err.message || "Failed to update username");
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusLoading(true);
    setStatusSuccess(false);

    try {
      const data = await fetchApi("/users/me/status", {
        method: "PATCH",
        body: JSON.stringify({ statusText }),
      });

      // Update local store
      if (user && accessToken) {
        setAuth({ ...user, status_text: data.status_text }, accessToken);
      }

      // Emit real-time presence change to friends via WebSockets
      if (socket) {
        socket.emit("status:update", { statusText: data.status_text });
      }

      setStatusSuccess(true);
      setTimeout(() => setStatusSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleLinkSpotify = async () => {
    if (!user) return;
    setSpotifyLoading(true);
    try {
      const data = await fetchApi(`/spotify/authorize?userId=${user.user_id}`);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error(err);
      setSpotifyLoading(false);
    }
  };

  const handleUnlinkSpotify = async () => {
    if (!window.confirm("ARE YOU SURE YOU WANT TO UNLINK YOUR SPOTIFY ACCOUNT?")) return;
    setSpotifyLoading(true);
    try {
      await fetchApi("/users/me/spotify", {
        method: "DELETE",
      });

      // Update store
      if (user && accessToken) {
        setAuth({ ...user, spotify_token: null }, accessToken);
      }
      setNotifyMsg("SPOTIFY ACCOUNT UNLINKED");
      setNotifyType("success");
      setIsMockBroadcasting(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSpotifyLoading(false);
    }
  };

  // Mock player broadcaster
  const toggleMockBroadcast = () => {
    if (!socket) return;

    if (isMockBroadcasting) {
      // Stop broadcast
      socket.emit("spotify:broadcast", null);
      setIsMockBroadcasting(false);
    } else {
      // Start broadcast
      const song = MOCK_TRACKS[selectedMockIdx];
      socket.emit("spotify:broadcast", {
        track: song.track,
        artist: song.artist,
      });
      setIsMockBroadcasting(true);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface font-[family-name:var(--font-press-start)] text-[10px] text-primary gap-4 animate-pulse uppercase">
        <span>🔋 SYNCING SYSTEM PREFERENCES...</span>
        <div className="w-48 h-2 border-2 border-primary rounded-[2px] overflow-hidden p-0.5">
          <div className="h-full bg-primary rounded-[1px]" style={{ width: "90%" }} />
        </div>
      </div>
    );
  }

  const isSpotifyLinked = user?.spotify_token !== null && user?.spotify_token !== undefined;

  return (
    <div className="flex h-screen w-screen bg-surface overflow-hidden">
      
      {/* 1. LEFT NAVIGATION PANEL (Fixed 64 units) */}
      <div className="h-full shrink-0">
        <SidebarNav items={SIDEBAR_ITEMS} />
      </div>

      {/* 2. MAIN CONFIGURATION CABINET */}
      <div className="h-full flex-1 overflow-y-auto p-6 font-[family-name:var(--font-space-mono)] max-w-2xl mx-auto">
        <div className="flex flex-col gap-6 pb-12">
          
          {/* Header */}
          <div className="border-b-2 border-dotted border-primary/30 pb-4">
            <h1 className="font-[family-name:var(--font-press-start)] text-[14px] text-primary uppercase tracking-wider mb-2">
              🕹️ Player Profile Dashboard
            </h1>
            <p className="text-[10px] text-muted uppercase">
              Manage your credentials, friends list, status text, and joined groups
            </p>
          </div>

          {/* Notifications */}
          {notifyMsg && (
            <div
              className={`p-3 border-2 border-dashed rounded-[4px] text-[10px] uppercase font-bold animate-pulse text-center ${
                notifyType === "success"
                  ? "bg-success/10 border-success text-success"
                  : "bg-danger/10 border-danger text-danger"
              }`}
            >
              {notifyType === "success" ? "❇️" : "⚠️"} {notifyMsg}
            </div>
          )}

          {/* 1. USERNAME CONFIGURATION CARD */}
          <div className="bg-surface border-2 border-dotted border-primary/30 p-5 rounded-[4px] flex flex-col gap-3">
            <h3 className="font-[family-name:var(--font-press-start)] text-[10px] text-secondary uppercase tracking-wider flex items-center gap-2">
              👤 Username Configuration
            </h3>
            <p className="text-[9px] text-muted uppercase">
              Update your account username key (must be alphanumeric/underscores, 3-32 characters)
            </p>

            {usernameError && (
              <div className="bg-danger/10 border-2 border-dashed border-danger p-2.5 rounded-[4px] text-danger text-[9px] uppercase font-bold animate-pulse text-center">
                ⚠️ ERROR: {usernameError}
              </div>
            )}

            <form onSubmit={handleUpdateUsername} className="flex flex-col gap-3">
              <Input
                type="text"
                placeholder="ENTER NEW USERNAME"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={usernameLoading}
                className="text-[11px]"
                maxLength={32}
              />
              <div className="flex justify-end items-center gap-3">
                {usernameSuccess && (
                  <span className="text-[9px] text-success font-bold uppercase animate-pulse">
                    USERNAME UPDATED
                  </span>
                )}
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={usernameLoading}
                  className="font-bold cursor-pointer"
                >
                  {usernameLoading ? "SAVING..." : ">> SET USERNAME <<"}
                </Button>
              </div>
            </form>
          </div>

          {/* 2. STATUS BUBBLE CARD */}
          <div className="bg-surface border-2 border-dotted border-primary/30 p-5 rounded-[4px] flex flex-col gap-3">
            <h3 className="font-[family-name:var(--font-press-start)] text-[10px] text-secondary uppercase tracking-wider flex items-center gap-2">
              💬 Status Bubble
            </h3>
            <p className="text-[9px] text-muted uppercase">
              Update your presence presence text shown to online players in chats
            </p>

            <form onSubmit={handleUpdateStatus} className="flex flex-col gap-3">
              <Input
                type="text"
                placeholder="WHAT'S YOUR CURRENT PLAYING STATUS?"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                disabled={statusLoading}
                className="text-[11px]"
                maxLength={140}
              />
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-muted font-bold">
                  CHARS LEFT: {140 - statusText.length}
                </span>

                <div className="flex gap-3 items-center">
                  {statusSuccess && (
                    <span className="text-[9px] text-success font-bold uppercase animate-pulse">
                      STATUS UPDATED
                    </span>
                  )}
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={statusLoading}
                    className="font-bold cursor-pointer"
                  >
                    {statusLoading ? "SAVING..." : ">> SET STATUS <<"}
                  </Button>
                </div>
              </div>
            </form>
          </div>

          {/* 3. FRIEND NETWORK DIRECTORY */}
          <div className="bg-surface border-2 border-dotted border-primary/30 p-5 rounded-[4px] flex flex-col gap-3">
            <h3 className="font-[family-name:var(--font-press-start)] text-[10px] text-secondary uppercase tracking-wider flex items-center justify-between">
              <span>👥 Friend Network Directory</span>
              <span className="text-[9px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded">
                TOTAL: {friends.length}
              </span>
            </h3>
            <p className="text-[9px] text-muted uppercase">
              List of mutual players connected to your multiplayer channel network
            </p>

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto mt-2">
              {friendsLoading ? (
                <div className="text-[9px] text-muted uppercase tracking-widest text-center py-4 animate-pulse">
                  Querying network ledger...
                </div>
              ) : friends.length === 0 ? (
                <div className="text-[9px] text-muted uppercase text-center py-4 border border-dashed border-primary/10 rounded-[4px]">
                  No players in lobby network.
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.user_id}
                    className="flex items-center gap-3 p-2 bg-surface/50 border border-solid border-primary/20 rounded-[4px] hover:border-primary/50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-[2px] bg-primary/25 border border-primary flex items-center justify-center text-[11px] shrink-0">
                      👾
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 leading-tight">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-[family-name:var(--font-press-start)] text-[8px] text-white uppercase truncate">
                          {friend.username}
                        </span>
                        {friend.role === "ADMIN" && (
                          <span className="px-1 py-0.5 text-[5px] font-[family-name:var(--font-press-start)] bg-danger border-2 border-double border-white text-white font-bold select-none uppercase tracking-wide rounded-[2px] leading-none shrink-0 shadow-[2px_2px_0px_rgba(220,38,38,0.5)] animate-arcade-blink">
                            ADMIN
                          </span>
                        )}
                      </div>
                      {friend.status_text && (
                        <span className="text-[8px] text-muted truncate max-w-full italic">
                          &ldquo;{friend.status_text}&rdquo;
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 4. JOINED DISCUSSION HUBS */}
          <div className="bg-surface border-2 border-dotted border-primary/30 p-5 rounded-[4px] flex flex-col gap-3">
            <h3 className="font-[family-name:var(--font-press-start)] text-[10px] text-secondary uppercase tracking-wider flex items-center justify-between">
              <span>💬 Joined Discussion Hubs</span>
              <span className="text-[9px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded">
                TOTAL: {joinedGroups.length}
              </span>
            </h3>
            <p className="text-[9px] text-muted uppercase">
              Groups and chat channels you are currently linked to
            </p>

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto mt-2">
              {groupsLoading ? (
                <div className="text-[9px] text-muted uppercase tracking-widest text-center py-4 animate-pulse">
                  Syncing joined hubs...
                </div>
              ) : joinedGroups.length === 0 ? (
                <div className="text-[9px] text-muted uppercase text-center py-4 border border-dashed border-primary/10 rounded-[4px]">
                  No active channels joined.
                </div>
              ) : (
                joinedGroups.map((group) => (
                  <div
                    key={group.group_id}
                    className="flex items-center justify-between p-2.5 bg-surface/50 border border-solid border-primary/20 rounded-[4px] hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => router.push("/groups")}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-bold text-primary shrink-0">#</span>
                      <div className="flex flex-col min-w-0">
                        <span className="font-[family-name:var(--font-press-start)] text-[8px] text-white uppercase truncate">
                          {group.name}
                        </span>
                        <span className="text-[8px] text-muted truncate">
                          Creator: {group.creator?.username || "Admin"}
                        </span>
                      </div>
                    </div>
                    <div className="text-[8px] text-muted uppercase border border-solid border-primary/20 px-2 py-0.5 rounded shrink-0">
                      {group.memberCount} Members
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 5. SPOTIFY INTEGRATION CARD */}
          <div className="bg-surface border-2 border-dotted border-primary/30 p-5 rounded-[4px] flex flex-col gap-3">
            <h3 className="font-[family-name:var(--font-press-start)] text-[10px] text-secondary uppercase tracking-wider flex items-center gap-2">
              <Music size={14} />
              <span>Spotify Integration</span>
            </h3>
            <p className="text-[9px] text-muted uppercase leading-relaxed">
              Link your Spotify account to broadcast currently playing track streams dynamically to friends
            </p>

            {/* Linked Status */}
            <div className="flex items-center justify-between border-2 border-solid border-primary/20 bg-primary/5 p-3 rounded-[4px] my-1">
              <span className="text-[10px] uppercase font-bold text-white">
                Link Status
              </span>
              <div className="flex items-center gap-2 font-[family-name:var(--font-press-start)] text-[8px]">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isSpotifyLinked ? "bg-success animate-pulse" : "bg-danger"
                  }`}
                />
                <span className={isSpotifyLinked ? "text-success" : "text-danger"}>
                  {isSpotifyLinked ? "CONNECTED" : "DISCONNECTED"}
                </span>
              </div>
            </div>

            {/* Connection Actions */}
            <div>
              {isSpotifyLinked ? (
                <Button
                  variant="danger"
                  size="md"
                  onClick={handleUnlinkSpotify}
                  disabled={spotifyLoading}
                  className="w-full font-bold cursor-pointer uppercase"
                >
                  {spotifyLoading ? "UNLINKING..." : ">> UNLINK SPOTIFY ACCOUNT <<"}
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="lg"
                  onClick={handleLinkSpotify}
                  disabled={spotifyLoading}
                  className="w-full font-bold cursor-pointer uppercase"
                >
                  {spotifyLoading ? "REDIRECTING..." : ">> LINK SPOTIFY ACCOUNT <<"}
                </Button>
              )}
            </div>

            {/* MOCK MUSIC STREAM PLAYER SIMULATOR (Only available if Spotify is linked) */}
            {isSpotifyLinked && (
              <div className="mt-4 pt-4 border-t-2 border-dashed border-primary/20 flex flex-col gap-3">
                <div className="flex items-center gap-2 font-[family-name:var(--font-press-start)] text-[8px] text-success">
                  <span className="animate-spin">🌀</span>
                  <span>Activity Stream Broadcast simulator</span>
                </div>
                <p className="text-[9px] text-muted uppercase leading-relaxed">
                  Choose a retro track to simulate currently playing broadcast data sent via WebSockets
                </p>

                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                  {/* Select Track */}
                  <select
                    value={selectedMockIdx}
                    onChange={(e) => setSelectedMockIdx(Number(e.target.value))}
                    disabled={isMockBroadcasting}
                    className="flex-1 bg-surface border-2 border-solid border-primary p-1.5 rounded-[4px] text-[11px] font-[family-name:var(--font-space-mono)] text-white focus:outline-none focus:border-secondary uppercase"
                  >
                    {MOCK_TRACKS.map((t, idx) => (
                      <option key={idx} value={idx}>
                        {t.track} - {t.artist}
                      </option>
                    ))}
                  </select>

                  {/* Play / Stop broadcast button */}
                  <Button
                    onClick={toggleMockBroadcast}
                    variant={isMockBroadcasting ? "danger" : "outline"}
                    size="sm"
                    className="font-bold cursor-pointer h-10 uppercase shrink-0"
                  >
                    {isMockBroadcasting ? "⏹ Stop Stream" : "▶ Start Stream"}
                  </Button>
                </div>

                {isMockBroadcasting && (
                  <div className="bg-success/5 border-2 border-solid border-success/30 p-2.5 rounded-[4px] flex items-center justify-between font-[family-name:var(--font-space-mono)]">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[8px] text-success font-bold uppercase tracking-wider animate-pulse">
                        Broadcasting Activity
                      </span>
                      <span className="text-[10px] text-white truncate font-bold">
                        {MOCK_TRACKS[selectedMockIdx].track}
                      </span>
                      <span className="text-[9px] text-muted truncate">
                        {MOCK_TRACKS[selectedMockIdx].artist}
                      </span>
                    </div>
                    <div className="flex gap-0.5 items-end h-6 shrink-0">
                      <span className="w-1 bg-success animate-[pulse_0.8s_infinite] h-4" />
                      <span className="w-1 bg-success animate-[pulse_1.2s_infinite] h-6" />
                      <span className="w-1 bg-success animate-[pulse_0.6s_infinite] h-3" />
                      <span className="w-1 bg-success animate-[pulse_1s_infinite] h-5" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-surface font-[family-name:var(--font-press-start)] text-[10px] text-primary gap-4 animate-pulse uppercase">
          <span>🔋 LOADING SETTINGS INTERFACE...</span>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
