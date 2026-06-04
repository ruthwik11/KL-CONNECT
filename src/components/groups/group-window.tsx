"use client";

import * as React from "react";
import { Send, Users, LogOut, RefreshCw, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Member {
  user_id: string;
  username: string;
  email: string;
  role?: "USER" | "ADMIN";
  status_text: string | null;
}

interface GroupMessage {
  msg_id: string;
  sender_id: string;
  target_id: string;
  target_type: "GROUP";
  content: string;
  timestamp: string;
  senderName?: string; // Cache sender name locally
}

interface GroupWindowProps {
  groupId: string | null;
  triggerRefresh: () => void;
}

export function GroupWindow({ groupId, triggerRefresh }: GroupWindowProps) {
  const currentUser = useAuthStore((state) => state.user);
  const { socket } = useChatStore();

  const [isMember, setIsMember] = React.useState<boolean | null>(null);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [messages, setMessages] = React.useState<GroupMessage[]>([]);
  const [inputVal, setInputVal] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [loadingHistory, setLoadingHistory] = React.useState(false);
  const [groupName, setGroupName] = React.useState("");

  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    scrollRef.current?.scrollIntoView({ behavior });
  };

  const checkMembershipAndLoad = React.useCallback(async () => {
    if (!groupId) return;
    setLoadingHistory(true);
    setIsMember(null);

    try {
      // 1. Fetch group members. If 403 Forbidden, we are not a member
      const membersData = await fetchApi(`/groups/${groupId}/members`);
      setMembers(membersData.members || []);
      setIsMember(true);

      // 2. Fetch public group details for header
      const publicGroupsData = await fetchApi("/groups/public");
      const currentGroup = publicGroupsData.groups.find((g: any) => g.group_id === groupId);
      if (currentGroup) {
        setGroupName(currentGroup.name);
      }

      // 3. Join Socket.io group room
      if (socket) {
        socket.emit("group:join", { groupId });
      }

      // 4. Fetch group message history
      const historyData = await fetchApi(`/messages/group/${groupId}?limit=50`).catch(() => ({ messages: [] }));
      
      // Map sender usernames for visual feed
      const rawMessages = historyData.messages || [];
      setMessages(rawMessages);
      
      setTimeout(() => scrollToBottom("auto"), 50);
    } catch (err: any) {
      if (err.message && err.message.includes("join the group")) {
        setIsMember(false);
        // Load basic name anyway from public listings
        const publicGroupsData = await fetchApi("/groups/public").catch(() => ({ groups: [] }));
        const currentGroup = publicGroupsData.groups.find((g: any) => g.group_id === groupId);
        if (currentGroup) {
          setGroupName(currentGroup.name);
        }
      } else {
        console.error("Group initialization error:", err);
      }
    } finally {
      setLoadingHistory(false);
    }
  }, [groupId, socket]);

  // Handle initialization on groupId and socket change
  React.useEffect(() => {
    checkMembershipAndLoad();

    return () => {
      // Leave old Socket room
      if (socket && groupId) {
        socket.emit("group:leave", { groupId });
      }
    };
  }, [groupId, checkMembershipAndLoad, socket]);

  // Connect WebSockets listeners for incoming group messages
  React.useEffect(() => {
    if (!socket || !groupId) return;

    const handleGroupReceive = (msg: GroupMessage) => {
      if (msg.target_id === groupId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.msg_id === msg.msg_id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => scrollToBottom("smooth"), 50);
      }
    };

    socket.on("group:receive", handleGroupReceive);

    return () => {
      socket.off("group:receive", handleGroupReceive);
    };
  }, [socket, groupId]);

  // Action: Join Group
  const handleJoin = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      await fetchApi(`/groups/${groupId}/join`, {
        method: "POST",
      });
      triggerRefresh();
      checkMembershipAndLoad();
    } catch (err) {
      console.error("Failed to join group:", err);
    } finally {
      setLoading(false);
    }
  };

  // Action: Leave Group
  const handleLeave = async () => {
    if (!groupId) return;
    if (!window.confirm("ARE YOU SURE YOU WANT TO LEAVE THIS CHANNEL?")) return;

    setLoading(true);
    try {
      await fetchApi(`/groups/${groupId}/leave`, {
        method: "DELETE",
      });
      triggerRefresh();
      checkMembershipAndLoad();
    } catch (err) {
      console.error("Failed to leave group:", err);
    } finally {
      setLoading(false);
    }
  };

  // Action: Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || !groupId || !socket) return;

    setLoading(true);

    const messagePayload = {
      groupId,
      content: inputVal.trim(),
    };

    try {
      socket.emit("group:send", messagePayload, (response: any) => {
        if (response && response.status === "ok") {
          setInputVal("");
          setTimeout(() => scrollToBottom("smooth"), 30);
        } else {
          console.error("Failed to send group message:", response?.message);
        }
        setLoading(false);
      });
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Determine sender username from members cache or self
  const getSenderName = (senderId: string) => {
    if (senderId === currentUser?.user_id) return "Player 1 (Me)";
    const member = members.find((m) => m.user_id === senderId);
    return member ? member.username : "Player X";
  };

  // 1. UNSELECTED VIEW
  if (!groupId) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface p-6 text-center select-none">
        <div className="border-4 border-dashed border-primary/30 p-10 rounded-[8px] max-w-sm flex flex-col items-center gap-6">
          <span className="text-4xl animate-pulse">👾</span>
          
          <div className="flex flex-col gap-2">
            <h3 className="font-[family-name:var(--font-press-start)] text-[12px] text-primary uppercase">
              SELECT CHANNEL
            </h3>
            <p className="font-[family-name:var(--font-space-mono)] text-[10px] text-muted uppercase tracking-wider leading-relaxed">
              CHOOSE A DISCUSSION HUB FROM THE SIDEBAR DIRECTORY TO SYNC MULTIPLAYER CHAT ROOMS
            </p>
          </div>

          <div className="font-[family-name:var(--font-press-start)] text-[9px] text-secondary uppercase animate-pulse">
            SELECT PLAYER CHANNEL
          </div>
        </div>
      </div>
    );
  }

  // 2. LOADING STATE
  if (isMember === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface">
        <RefreshCw className="animate-spin text-primary mb-3" size={24} />
        <span className="font-[family-name:var(--font-press-start)] text-[8px] text-primary uppercase">
          Syncing Channel Link...
        </span>
      </div>
    );
  }

  // 3. JOIN CHANNEL GATEKEEPER VIEW
  if (isMember === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface p-6 text-center select-none">
        <div className="border-4 border-primary border-double p-8 rounded-[8px] max-w-md flex flex-col items-center gap-6 bg-surface shadow-[6px_6px_0px_0px_rgba(42,63,229,0.3)] font-[family-name:var(--font-space-mono)]">
          <div className="w-12 h-12 bg-primary/10 border-2 border-primary border-dotted rounded-full flex items-center justify-center text-primary">
            <Lock size={20} />
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-[family-name:var(--font-press-start)] text-[14px] text-secondary uppercase tracking-wider">
              #{groupName}
            </h3>
            <p className="text-[11px] text-white uppercase font-bold">
              Membership Required to Access Stream
            </p>
            <p className="text-[10px] text-muted uppercase leading-relaxed max-w-xs mx-auto">
              This is a public university conversation channel. Connect your profile to join the stream.
            </p>
          </div>

          <div className="w-full mt-2">
            <Button
              variant="default"
              size="lg"
              onClick={handleJoin}
              disabled={loading}
              className="w-full font-bold cursor-pointer"
            >
              {loading ? "LINKING SESSION..." : ">> JOIN CHANNEL <<"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-surface">
      {/* LEFT CHAT CANVAS CONTAINER */}
      <div className="flex-1 flex flex-col h-full border-r border-dotted border-primary/20">
        
        {/* Header */}
        <div className="p-4 border-b-2 border-dotted border-primary/30 flex justify-between items-center shrink-0">
          <div className="flex flex-col gap-1 min-w-0 pr-4">
            <span className="font-[family-name:var(--font-press-start)] text-[11px] text-white uppercase truncate">
              #{groupName}
            </span>
            <span className="font-[family-name:var(--font-space-mono)] text-[9px] text-muted uppercase">
              ONLINE USERS: {members.length}
            </span>
          </div>

          <motion.button
            onClick={handleLeave}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-transparent border-2 border-dotted border-danger/60 hover:bg-danger/10 hover:border-danger font-[family-name:var(--font-press-start)] text-[8px] text-danger uppercase transition-all duration-150 cursor-pointer"
          >
            <LogOut size={10} />
            <span>Leave</span>
          </motion.button>
        </div>

        {/* Timeline Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 font-[family-name:var(--font-space-mono)]">
          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <RefreshCw className="animate-spin text-primary" size={18} />
              <span className="font-[family-name:var(--font-press-start)] text-[7px] text-primary uppercase">
                Restoring stream logs...
              </span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
              <span className="text-xl">💬</span>
              <span className="font-[family-name:var(--font-press-start)] text-[8px] text-muted uppercase">
                Channel Feed Empty
              </span>
              <span className="text-[9px] text-muted uppercase">
                Broadcast first message to lobby
              </span>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === currentUser?.user_id;

              return (
                <div
                  key={msg.msg_id}
                  className={`flex flex-col max-w-[80%] ${
                    isMe ? "self-end items-end" : "self-start items-start"
                  }`}
                >
                  <span className="text-[8px] text-muted uppercase mb-1 px-1">
                    {getSenderName(msg.sender_id)}
                  </span>

                  <div
                    className={`p-3 rounded-[6px] border-2 text-[11px] leading-relaxed relative ${
                      isMe
                        ? "bg-surface border-primary text-white shadow-[2px_2px_0px_0px_rgba(42,63,229,0.4)]"
                        : "bg-surface border-dotted border-secondary text-white shadow-[2px_2px_0px_0px_rgba(244,185,176,0.3)]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <div className="text-[7px] text-muted text-right mt-1.5 uppercase select-none">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input Message Form */}
        <div className="p-4 border-t-2 border-dotted border-primary/30 shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              type="text"
              placeholder="BROADCAST STREAM DATA..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={loading}
              className="flex-1 text-[11px]"
              maxLength={1000}
            />
            <Button
              type="submit"
              variant="default"
              size="md"
              disabled={loading || !inputVal.trim()}
              className="cursor-pointer font-bold px-4"
            >
              <Send size={14} className="mr-1" />
              <span>SEND</span>
            </Button>
          </form>
        </div>
      </div>

      {/* RIGHT SIDEBAR ACTIVE MEMBERS PANEL (Fixed 64 units width, shown on desktops) */}
      <div className="hidden lg:flex flex-col w-56 h-full p-4 shrink-0 font-[family-name:var(--font-space-mono)]">
        <div className="font-[family-name:var(--font-press-start)] text-[8px] text-primary uppercase flex items-center gap-1.5 border-b-2 border-dotted border-primary/30 pb-3 mb-3">
          <Users size={12} />
          <span>Channel Lobby</span>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2.5">
          {members.map((member) => (
            <div key={member.user_id} className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-[2px] bg-primary/20 border border-primary flex items-center justify-center shrink-0">
                <span className="text-[10px]">👾</span>
              </div>
              <div className="flex flex-col min-w-0 leading-tight">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-[family-name:var(--font-press-start)] text-[8px] text-white truncate uppercase">
                    {member.user_id === currentUser?.user_id ? "Me" : member.username}
                  </span>
                  {member.role === "ADMIN" && (
                    <span className="px-1 py-0.5 text-[5px] font-[family-name:var(--font-press-start)] bg-danger border-2 border-double border-white text-white font-bold select-none uppercase tracking-wide rounded-[2px] leading-none shrink-0 shadow-[2px_2px_0px_rgba(220,38,38,0.5)] animate-arcade-blink">
                      ADMIN
                    </span>
                  )}
                </div>
                {member.status_text && (
                  <span className="text-[8px] text-muted truncate max-w-full">
                    {member.status_text}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
