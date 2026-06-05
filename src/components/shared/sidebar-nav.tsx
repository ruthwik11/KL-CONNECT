"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { LogOut, User, Shield } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

export interface SidebarNavProps {
  items: SidebarNavItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { socket, isConnecting } = useChatStore();

  const handleNavigate = (href: string) => {
    router.push(href);
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/");
  };

  const navigationItems = React.useMemo(() => {
    if (user?.role === "ADMIN" && !items.some((item) => item.href === "/admin")) {
      return [
        ...items,
        { id: "admin", label: "Admin Console", icon: Shield, href: "/admin" },
      ];
    }
    return items;
  }, [items, user]);

  return (
    <aside
      className={cn(
        "flex flex-col h-full w-64",
        "bg-surface border-r-2 border-dotted border-primary/50",
        "font-[family-name:var(--font-space-mono)]"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-2 p-6 pb-4">
        <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
        <span className="font-[family-name:var(--font-press-start)] text-[10px] text-primary uppercase tracking-widest">
          KL Connect
        </span>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t-2 border-dotted border-primary/30" />

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col gap-1 p-4" role="navigation">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.id}
              onClick={() => handleNavigate(item.href)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-3 rounded-[4px]",
                "text-[10px] uppercase tracking-wider text-left",
                "border-l-4 transition-colors duration-150 cursor-pointer",
                isActive
                  ? "bg-primary/20 text-white border-l-primary"
                  : "bg-transparent text-muted border-l-transparent hover:text-secondary hover:bg-foreground/5"
              )}
            >
              <Icon
                size={16}
                className={cn(
                  "shrink-0",
                  isActive ? "text-primary" : "text-muted"
                )}
              />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-dot"
                  className="ml-auto w-2 h-2 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t-2 border-dotted border-primary/30" />

      {/* Player Section */}
      <div className="p-4 flex flex-col gap-3">
        {/* Avatar Block */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-[4px] flex items-center justify-center",
              "bg-primary/20 border-2 border-dotted border-primary"
            )}
          >
            <User size={18} className="text-primary" />
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="font-[family-name:var(--font-press-start)] text-[8px] text-foreground uppercase truncate" title={user?.username || "PLAYER X"}>
              {user?.username || "PLAYER X"}
            </span>
            <span className="text-[8px] text-muted uppercase tracking-wider flex items-center gap-1">
              <span>{user?.role || "USER"}</span>
              <span>//</span>
              {socket ? (
                <span className="text-success font-bold">ONLINE</span>
              ) : isConnecting ? (
                <span className="text-warning animate-pulse">CONNECTING</span>
              ) : (
                <span className="text-danger font-bold animate-pulse">OFFLINE</span>
              )}
            </span>
          </div>
        </div>

        {/* Log Out Button */}
        <motion.button
          onClick={handleLogout}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "flex items-center justify-center gap-2 w-full",
            "h-9 px-3 rounded-[4px]",
            "bg-transparent border-2 border-dotted border-danger/60",
            "font-[family-name:var(--font-press-start)] text-[8px] text-danger uppercase",
            "transition-colors duration-150 cursor-pointer",
            "hover:bg-danger/10 hover:border-danger"
          )}
        >
          <LogOut size={12} />
          <span>Log Out</span>
        </motion.button>
      </div>
    </aside>
  );
}
