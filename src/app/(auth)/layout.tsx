"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-surface flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background Retro Grid Path */}
      <div className="absolute inset-0 opacity-5 pointer-events-none select-none">
        <div className="w-full h-full bg-[linear-gradient(to_right,#2A3FE5_1px,transparent_1px),linear-gradient(to_bottom,#2A3FE5_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      {/* Retro Arcade Machine Header */}
      <motion.div
        className="w-full max-w-md flex flex-col items-center gap-2 mb-6"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Link href="/" className="flex flex-col items-center gap-1 group cursor-pointer select-none">
          <span className="font-[family-name:var(--font-press-start)] text-[16px] text-primary uppercase tracking-widest group-hover:text-secondary transition-colors duration-150">
            🕹️ KL CONNECT 🕹️
          </span>
          <span className="font-[family-name:var(--font-space-mono)] text-[8px] text-muted uppercase tracking-wider">
            Academic Messaging Cabinet
          </span>
        </Link>
      </motion.div>

      {/* Main Form Cabinet Case */}
      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {/* Neon Border Box */}
        <div className="bg-surface border-4 border-primary border-double rounded-[8px] p-6 shadow-[8px_8px_0px_0px_rgba(42,63,229,0.3)] hover:shadow-[8px_8px_16px_0px_rgba(244,185,176,0.2)] hover:border-secondary transition-all duration-300">
          
          {/* Top Arcade Lights */}
          <div className="flex items-center justify-between px-2 mb-6 border-b-2 border-dotted border-primary/30 pb-4">
            <div className="flex gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
              <span className="w-2.5 h-2.5 rounded-full bg-warning animate-[pulse_1.5s_infinite]" />
              <span className="w-2.5 h-2.5 rounded-full bg-success animate-[pulse_2s_infinite]" />
            </div>
            <div className="font-[family-name:var(--font-press-start)] text-[8px] text-secondary uppercase animate-pulse">
              CREDIT 01
            </div>
          </div>

          {/* Children components */}
          {children}

          {/* Bottom coin slot graphic */}
          <div className="mt-6 pt-4 border-t-2 border-dotted border-primary/30 flex justify-center items-center gap-4">
            <div className="w-10 h-6 border-2 border-primary/50 flex items-center justify-center rounded-[2px] opacity-40">
              <span className="text-[8px] font-mono text-primary font-bold">25¢</span>
            </div>
            <div className="w-10 h-6 border-2 border-primary/50 flex items-center justify-center rounded-[2px] opacity-40">
              <span className="text-[8px] font-mono text-primary font-bold">COIN</span>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
