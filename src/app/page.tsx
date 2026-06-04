"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const GHOSTS = ["👻", "👾", "🎮", "🕹️"];

export default function SplashPage() {
  const router = useRouter();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-surface overflow-hidden">
      {/* Fuzzy screen noise layer */}
      <div className="fuzzy-grain" aria-hidden="true" />

      {/* Pac-dots decorative path — horizontal line of dots */}
      <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex items-center justify-center gap-4 opacity-10 pointer-events-none select-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary"
          />
        ))}
      </div>

      {/* Floating ghosts */}
      {GHOSTS.map((ghost, i) => (
        <motion.span
          key={i}
          className="absolute text-3xl select-none pointer-events-none opacity-30"
          initial={{
            x: (i % 2 === 0 ? -1 : 1) * (100 + i * 60),
            y: (i % 2 === 0 ? -1 : 1) * (50 + i * 40),
          }}
          animate={{
            y: [
              (i % 2 === 0 ? -1 : 1) * (50 + i * 40),
              (i % 2 === 0 ? 1 : -1) * (50 + i * 30),
              (i % 2 === 0 ? -1 : 1) * (50 + i * 40),
            ],
            x: [
              (i % 2 === 0 ? -1 : 1) * (100 + i * 60),
              (i % 2 === 0 ? 1 : -1) * (80 + i * 40),
              (i % 2 === 0 ? -1 : 1) * (100 + i * 60),
            ],
          }}
          transition={{
            duration: 6 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {ghost}
        </motion.span>
      ))}

      {/* Main content */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-10"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Score display */}
        <div className="flex items-center gap-6 font-[family-name:var(--font-space-mono)] text-[10px] text-muted uppercase tracking-widest">
          <span>1UP</span>
          <span className="text-primary">00000</span>
          <span>HIGH SCORE</span>
          <span className="text-danger">99999</span>
        </div>

        {/* Logo / Title */}
        <div className="flex flex-col items-center gap-4">
          {/* Pac-man icon row */}
          <div className="flex items-center gap-3 text-2xl select-none">
            <span className="text-primary">●</span>
            <span className="text-secondary">●</span>
            <span className="text-success">●</span>
            <span className="text-warning">●</span>
          </div>

          <h1 className="font-[family-name:var(--font-press-start)] text-[28px] md:text-[36px] text-primary leading-tight text-center">
            KL CONNECT
          </h1>

          <p className="font-[family-name:var(--font-space-mono)] text-[11px] text-muted text-center max-w-md leading-relaxed uppercase tracking-wider">
            Academic Messaging Platform for KLU
          </p>
        </div>

        {/* Dotted separator */}
        <div className="w-64 border-t-2 border-dotted border-primary/40" />

        {/* Start Button */}
        <div>
          <Button
            variant="default"
            size="lg"
            onClick={() => router.push("/login")}
          >
            {">> START GAME <<"}
          </Button>
        </div>

        {/* Insert Coin blink */}
        <p className="font-[family-name:var(--font-press-start)] text-[10px] text-secondary uppercase tracking-widest animate-arcade-blink">
          Insert Coin
        </p>

        {/* Credits */}
        <p className="font-[family-name:var(--font-space-mono)] text-[8px] text-muted uppercase tracking-widest">
          Credits 01
        </p>
      </motion.div>
    </div>
  );
}