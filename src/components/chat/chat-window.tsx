"use client";

import * as React from "react";
import { Send, User, Award, RefreshCw } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore, Message } from "@/stores/chat.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChatWindow() {
  const currentUser = useAuthStore((state) => state.user);
  const { activeFriendId, friends, messages, addMessage, loadMessagesForFriend, socket } = useChatStore();

  const [inputVal, setInputVal] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [loadingHistory, setLoadingHistory] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);

  // Find details of active friend
  const activeFriend = friends.find((f) => f.user_id === activeFriendId);
  const chatMessages = activeFriendId ? messages[activeFriendId] || [] : [];

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Fetch chat history on friend change
  React.useEffect(() => {
    if (!activeFriendId) return;

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const data = await fetchApi(`/messages/dm/${activeFriendId}?limit=50`);
        loadMessagesForFriend(activeFriendId, data.messages);
        
        // Auto-scroll to bottom once history is loaded
        setTimeout(() => scrollToBottom("auto"), 50);
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [activeFriendId, loadMessagesForFriend]);

  // Scroll on new messages
  React.useEffect(() => {
    scrollToBottom("smooth");
  }, [chatMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || !activeFriendId || !socket) return;

    setLoading(true);

    const messagePayload = {
      targetId: activeFriendId,
      content: inputVal.trim(),
    };

    try {
      // Emit message via WebSockets
      socket.emit("dm:send", messagePayload, (response: any) => {
        if (response && response.status === "ok") {
          // Append message locally
          addMessage(activeFriendId, response.message);
          setInputVal("");
        } else {
          console.error("Failed to transmit message:", response?.message);
        }
        setLoading(false);
      });
    } catch (err) {
      console.error("Failed to dispatch Socket event:", err);
      setLoading(false);
    }
  };

  // Format timestamp (e.g. 10:14 PM)
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // 1. CHAT UNSELECTED VIEW
  if (!activeFriendId || !activeFriend) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface p-6 text-center select-none">
        <div className="border-4 border-dashed border-primary/30 p-10 rounded-[8px] max-w-sm flex flex-col items-center gap-6">
          <span className="text-4xl animate-bounce">🕹️</span>
          
          <div className="flex flex-col gap-2">
            <h3 className="font-[family-name:var(--font-press-start)] text-[12px] text-primary uppercase">
              SELECT PLAYER 2
            </h3>
            <p className="font-[family-name:var(--font-space-mono)] text-[10px] text-muted uppercase tracking-wider leading-relaxed">
              CHOOSE A CONNECTED PLAYER FROM YOUR DIRECTORY TO INITIATE MESSAGING SYSTEM
            </p>
          </div>

          <div className="font-[family-name:var(--font-press-start)] text-[9px] text-secondary uppercase animate-pulse">
            INSERT COIN TO START
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      
      {/* 2. CHAT HEADER */}
      <div className="flex flex-col gap-2 p-4 border-b-2 border-dotted border-primary/30 shrink-0">
        <div className="flex items-center justify-between w-full">
          {/* Friend Profile */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <div className="w-10 h-10 rounded-[4px] bg-primary/20 border-2 border-solid border-primary flex items-center justify-center">
                <User size={18} className="text-primary" />
              </div>
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-surface rounded-full ${
                  activeFriend.online ? "bg-success" : "bg-muted"
                }`}
              />
            </div>
            
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-[family-name:var(--font-press-start)] text-[10px] text-white truncate uppercase">
                {activeFriend.username}
              </span>
              <span className="font-[family-name:var(--font-space-mono)] text-[9px] text-muted truncate">
                {activeFriend.online ? `ONLINE • STATUS: "${activeFriend.status_text || "NO STATUS"}"` : "OFFLINE"}
              </span>
            </div>
          </div>

          {/* Spotify Activity */}
          {activeFriend.spotifyPlaying && (
            <div className="hidden sm:flex items-center gap-3 border-2 border-dotted border-success/40 bg-success/5 p-2 rounded-[4px] max-w-xs min-w-0 font-[family-name:var(--font-space-mono)]">
              <div className="w-6 h-6 bg-success/20 rounded-[2px] flex items-center justify-center shrink-0 animate-spin">
                🎵
              </div>
              <div className="flex flex-col min-w-0 gap-0.5 text-left">
                <span className="text-[8px] text-success font-bold uppercase tracking-widest animate-pulse">
                  Listening to Spotify
                </span>
                <span className="text-[9px] text-white font-bold truncate">
                  {activeFriend.spotifyPlaying.track}
                </span>
                <span className="text-[8px] text-muted truncate">
                  by {activeFriend.spotifyPlaying.artist}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. MESSAGE TIMELINE CANVAS */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 font-[family-name:var(--font-space-mono)]"
      >
        {loadingHistory ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <RefreshCw className="animate-spin text-primary" size={18} />
            <span className="font-[family-name:var(--font-press-start)] text-[7px] text-primary uppercase">
              Restoring Log Data...
            </span>
          </div>
        ) : chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
            <span className="text-xl">👾</span>
            <span className="font-[family-name:var(--font-press-start)] text-[8px] text-muted uppercase">
              No Message logs loaded
            </span>
            <span className="text-[9px] text-muted uppercase">
              Send a message to begin conversation history
            </span>
          </div>
        ) : (
          chatMessages.map((msg, index) => {
            const isMe = msg.sender_id === currentUser?.user_id;
            
            return (
              <div
                key={msg.msg_id}
                className={`flex flex-col max-w-[80%] ${
                  isMe ? "self-end items-end" : "self-start items-start"
                }`}
              >
                {/* Username label */}
                <span className="text-[8px] text-muted uppercase mb-1 px-1">
                  {isMe ? "Player 1 (Me)" : activeFriend.username}
                </span>

                {/* Speech Bubble */}
                <div
                  className={`p-3 rounded-[6px] border-2 text-[11px] leading-relaxed relative ${
                    isMe
                      ? "bg-surface border-primary text-white shadow-[2px_2px_0px_0px_rgba(42,63,229,0.4)]"
                      : "bg-surface border-dotted border-secondary text-white shadow-[2px_2px_0px_0px_rgba(244,185,176,0.3)]"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  
                  {/* Timestamp */}
                  <div className="text-[7px] text-muted text-right mt-1.5 uppercase select-none">
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. CHAT FOOTER TYPING CONTROLLER */}
      <div className="p-4 border-t-2 border-dotted border-primary/30 shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            type="text"
            placeholder="TYPE MESSAGE PORTAL..."
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
  );
}
