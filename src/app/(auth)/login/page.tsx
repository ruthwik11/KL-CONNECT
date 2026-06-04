"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("ENTER BOTH CREDENTIALS");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle unverified user redirect UX
        if (data.message && data.message.includes("verify your OTP")) {
          // Send a fresh OTP to the user before redirecting
          await fetch(`${BACKEND_URL}/api/auth/otp/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          }).catch((err) => console.error("Resend OTP failed", err));

          router.push(`/verify?email=${encodeURIComponent(email)}`);
          return;
        }
        throw new Error(data.message || "LOGIN FAILURE");
      }

      // Successful login
      setAuth(data.user, data.accessToken, data.refreshToken);
      
      // Redirect based on role
      if (data.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/groups");
      }
    } catch (err: any) {
      setError(err.message || "CONNECTION ERROR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 font-[family-name:var(--font-space-mono)]">
      <div className="flex flex-col gap-2 items-center text-center">
        <h2 className="font-[family-name:var(--font-press-start)] text-[12px] text-secondary uppercase tracking-wider">
          SIGN IN SELECT
        </h2>
        <p className="text-[10px] text-muted uppercase">
          Enter credentials to start session
        </p>
      </div>

      {error && (
        <div className="bg-danger/10 border-2 border-dashed border-danger p-3 rounded-[4px] text-danger text-[10px] uppercase text-center font-bold animate-pulse">
          ⚠️ ERROR: {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] text-primary uppercase tracking-widest font-bold">
            Academic Email
          </label>
          <Input
            type="email"
            placeholder="e.g. USERNAME@kluniversity.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full text-[11px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] text-primary uppercase tracking-widest font-bold">
            Passkey
          </label>
          <Input
            type="password"
            placeholder="ENTER PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full text-[11px]"
          />
        </div>

        <div className="mt-2">
          <Button
            type="submit"
            variant="default"
            size="lg"
            disabled={loading}
            className="w-full font-bold cursor-pointer"
          >
            {loading ? "AUTHENTICATING..." : ">> START GAME <<"}
          </Button>
        </div>
      </form>

      <div className="flex flex-col items-center gap-2 mt-4 text-[9px] border-t border-dotted border-primary/20 pt-4 uppercase">
        <div className="flex gap-1.5 text-muted">
          <span>New Player?</span>
          <Link
            href="/register"
            className="text-secondary hover:text-white underline cursor-pointer"
          >
            Create Account
          </Link>
        </div>
        <Link
          href="/"
          className="text-primary hover:text-secondary underline cursor-pointer"
        >
          Return to Splash
        </Link>
      </div>
    </div>
  );
}
