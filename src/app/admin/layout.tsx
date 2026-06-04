"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { ShieldAlert, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    // Artificial 500ms delay to prevent layout flicker on store load
    const timer = setTimeout(() => {
      setChecking(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (checking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white font-[family-name:var(--font-space-mono)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-white" size={24} />
          <span className="text-[10px] tracking-widest uppercase">INITIALIZING ADMIN SUBSYSTEMS...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    if (typeof window !== "undefined") {
      router.push("/login");
    }
    return null;
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white p-6 font-[family-name:var(--font-space-mono)]">
        <div className="border-4 border-solid border-white p-8 max-w-md w-full text-center bg-black shadow-[8px_8px_0_0_rgba(255,255,255,0.15)]">
          <div className="w-12 h-12 bg-white/10 border-2 border-solid border-white rounded-full flex items-center justify-center text-white mx-auto mb-6">
            <ShieldAlert size={24} />
          </div>
          <h2 className="font-[family-name:var(--font-press-start)] text-[12px] text-white uppercase tracking-wider mb-2">
            ACCESS DENIED
          </h2>
          <p className="text-[10px] text-gray-400 uppercase leading-relaxed mb-6">
            Insufficient security credentials detected. Clearance level ADMIN required. Your attempt has been logged.
          </p>
          <Button
            variant="ghost"
            className="border-white text-white hover:bg-white hover:text-black shadow-none border-2 border-solid w-full"
            onClick={() => router.push("/groups")}
          >
            RETURN TO SECTOR 7G
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-black text-white overflow-hidden font-[family-name:var(--font-space-mono)] select-none">
      {/* Stark Monochrome Admin Shell */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b-2 border-solid border-white px-6 flex items-center justify-between shrink-0 bg-black">
          <div className="flex items-center gap-4">
            <span className="font-[family-name:var(--font-press-start)] text-[12px] text-white tracking-widest">
              KLCS // CORE ADMIN
            </span>
            <div className="hidden sm:flex items-center gap-2 border-l border-solid border-white/30 pl-4">
              <span className="w-2 h-2 bg-white rounded-full animate-ping" />
              <span className="text-[9px] text-gray-400 uppercase tracking-wider">
                Gov-Security Terminal Level 4
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <div className="text-[10px] font-bold text-white uppercase">{user.username}</div>
              <div className="text-[8px] text-gray-400 uppercase">System Operator</div>
            </div>
            <button
              onClick={() => router.push("/groups")}
              className="flex items-center gap-1.5 border border-solid border-white/40 px-2.5 py-1 text-[9px] rounded-[4px] uppercase hover:bg-white hover:text-black transition-colors cursor-pointer"
            >
              <LogOut size={12} />
              Exit Console
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <div className="flex-1 overflow-hidden bg-black">
          {children}
        </div>
      </div>
    </div>
  );
}
