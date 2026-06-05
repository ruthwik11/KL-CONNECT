"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Users, BarChart3, Settings, HelpCircle, Activity } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";
import { SidebarNav, SidebarNavItem } from "@/components/shared/sidebar-nav";
import { ConversationList } from "@/components/chat/conversation-list";
import { ChatWindow } from "@/components/chat/chat-window";
import { fetchApi } from "@/lib/api";

const SIDEBAR_ITEMS: SidebarNavItem[] = [
  { id: "chat", label: "Direct Messages", icon: MessageSquare, href: "/chat" },
  { id: "groups", label: "Discussion Hub", icon: Users, href: "/groups" },
  { id: "polls", label: "Daily Polls", icon: BarChart3, href: "/polls" },
  { id: "settings", label: "Game Settings", icon: Settings, href: "/settings" },
];

export default function ChatPage() {
  const router = useRouter();
  
  const { user, accessToken, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const { initSocket, disconnectSocket } = useChatStore();
  
  const [checkingAuth, setCheckingAuth] = React.useState(true);

  // Auth checker & Session restoration loop
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

        // Set restored session details
        // In a real database, we would also verify or fetch user profile info
        // For local restoration we can fetch user profile:
        const profile = await fetchApi("/users/me", {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        });

        setAuth(profile.user, data.accessToken, data.refreshToken);
        initSocket(data.accessToken);
      } catch (err) {
        console.error("🔒 Auth restoration failed:", err);
        clearAuth();
        router.push("/login");
      } finally {
        setCheckingAuth(false);
      }
    };

    restoreSession();

    return () => {
      // Disconnect socket on page unmount
      disconnectSocket();
    };
  }, [isAuthenticated, accessToken, initSocket, disconnectSocket, setAuth, clearAuth, router]);

  if (checkingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-surface font-[family-name:var(--font-press-start)] text-[10px] text-primary gap-4 animate-pulse uppercase">
        <span>🔋 RESTORING PLAYER SESSION...</span>
        <div className="w-48 h-2 border-2 border-primary rounded-[2px] overflow-hidden p-0.5">
          <div className="h-full bg-primary rounded-[1px] animate-[pulse_1s_infinite]" style={{ width: "60%" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-surface overflow-hidden">
      
      {/* 1. LEFT NAVIGATION PANEL (Fixed 64 units) */}
      <div className="h-full shrink-0">
        <SidebarNav items={SIDEBAR_ITEMS} />
      </div>

      {/* 2. MIDDLE CHAT DIRECTORY LIST (Fixed 80 units) */}
      <div className="h-full w-80 shrink-0 border-r-2 border-dotted border-primary/30">
        <ConversationList />
      </div>

      {/* 3. RIGHT ACTIVE CONVERSATION CABINET (Flex-1) */}
      <div className="h-full flex-1 min-w-0">
        <ChatWindow />
      </div>

    </div>
  );
}
