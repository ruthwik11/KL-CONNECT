"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const KLU_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@kluniversity\.in$/i;

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !email || !password) {
      setError("ALL FIELDS ARE REQUIRED");
      return;
    }

    if (!KLU_EMAIL_REGEX.test(email)) {
      setError("EMAIL MUST END WITH @kluniversity.in");
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
      setError("USERNAME: 3-32 ALPHANUMERIC / UNDERSCORE ONLY");
      return;
    }

    if (password.length < 8) {
      setError("PASSWORD MUST BE >= 8 CHARACTERS");
      return;
    }

    setLoading(true);

    try {
      // 1. Submit Registration API
      const registerRes = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        throw new Error(registerData.message || "REGISTRATION FAILED");
      }

      // 2. Automatically trigger OTP creation and send email
      const otpRes = await fetch(`${BACKEND_URL}/api/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const otpData = await otpRes.json();

      if (!otpRes.ok) {
        throw new Error(otpData.message || "FAILED TO DISPATCH VERIFICATION OTP");
      }

      // Redirect to OTP input page
      router.push(`/verify?email=${encodeURIComponent(email)}`);
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
          NEW USER SELECT
        </h2>
        <p className="text-[10px] text-muted uppercase">
          Register academic domain profile
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
            Username
          </label>
          <Input
            type="text"
            placeholder="e.g. sai_kumar"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            className="w-full text-[11px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] text-primary uppercase tracking-widest font-bold">
            Academic Email
          </label>
          <Input
            type="email"
            placeholder="e.g. 2200030001@kluniversity.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full text-[11px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[9px] text-primary uppercase tracking-widest font-bold">
            Create Passkey
          </label>
          <Input
            type="password"
            placeholder="MINIMUM 8 CHARACTERS"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full text-[11px]"
          />
        </div>

        <div className="mt-2">
          <Button
            type="submit"
            variant="secondary"
            size="lg"
            disabled={loading}
            className="w-full font-bold cursor-pointer"
          >
            {loading ? "CREATING PROFILE..." : ">> REGISTER PROFILE <<"}
          </Button>
        </div>
      </form>

      <div className="flex flex-col items-center gap-2 mt-4 text-[9px] border-t border-dotted border-primary/20 pt-4 uppercase">
        <div className="flex gap-1.5 text-muted">
          <span>Already registered?</span>
          <Link
            href="/login"
            className="text-primary hover:text-white underline cursor-pointer"
          >
            Sign In
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
