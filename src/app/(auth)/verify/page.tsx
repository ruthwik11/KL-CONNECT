"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  const emailParam = searchParams?.get("email") || "";
  const [email, setEmail] = React.useState(emailParam);
  const [code, setCode] = React.useState<string[]>(Array(6).fill(""));
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);

  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Update email if query param changes
  React.useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Handle countdown timer for Resend button
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleChange = (index: number, val: string) => {
    setError(null);
    setSuccess(null);

    // Only allow numbers
    const cleanVal = val.replace(/[^0-9]/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = cleanVal;
    setCode(newCode);

    // Auto-focus next input if filled
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      // Focus previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "RESEND FAILED");
      }

      setSuccess("NEW OTP DISPATCHED");
      setResendCooldown(60); // 60s cooldown
    } catch (err: any) {
      setError(err.message || "FAILED TO RESEND OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const otpString = code.join("");
    if (otpString.length < 6) {
      setError("ENTER FULL 6-DIGIT CODE");
      return;
    }

    if (!email) {
      setError("EMAIL ADDRESS REQUIRED");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpString }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "VERIFICATION FAILED");
      }

      // Save credentials in store
      setAuth(data.user, data.accessToken, data.refreshToken);

      setSuccess("VERIFICATION COMPLETE!");
      
      // Redirect based on role
      setTimeout(() => {
        if (data.user.role === "ADMIN") {
          router.push("/admin");
        } else {
          router.push("/groups");
        }
      }, 800);
    } catch (err: any) {
      setError(err.message || "VERIFICATION ERROR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 font-[family-name:var(--font-space-mono)]">
      <div className="flex flex-col gap-2 items-center text-center">
        <h2 className="font-[family-name:var(--font-press-start)] text-[12px] text-secondary uppercase tracking-wider">
          OTP CODE INPUT
        </h2>
        <p className="text-[10px] text-muted uppercase">
          Enter 6-digit key sent to:
        </p>
        <span className="text-[10px] text-primary truncate max-w-full font-bold">
          {email || "NO EMAIL PROVIDED"}
        </span>
      </div>

      {error && (
        <div className="bg-danger/10 border-2 border-dashed border-danger p-3 rounded-[4px] text-danger text-[10px] uppercase text-center font-bold animate-pulse">
          ⚠️ ERROR: {error}
        </div>
      )}

      {success && (
        <div className="bg-success/10 border-2 border-dashed border-success p-3 rounded-[4px] text-success text-[10px] uppercase text-center font-bold">
          ❇️ SUCCESS: {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* OTP Input Grid */}
        <div className="flex justify-between gap-2 max-w-xs mx-auto">
          {code.map((num, idx) => (
            <input
              key={idx}
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={1}
              value={num}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              disabled={loading}
              className="w-10 h-12 bg-surface text-foreground text-center font-[family-name:var(--font-press-start)] text-[14px] border-2 border-primary rounded-[4px] focus:outline-none focus:border-secondary focus:ring-2 focus:ring-primary/40 focus:animate-pulse disabled:opacity-40 transition-colors"
            />
          ))}
        </div>

        {/* Verification Trigger Button */}
        <div>
          <Button
            type="submit"
            variant="default"
            size="lg"
            disabled={loading}
            className="w-full font-bold cursor-pointer"
          >
            {loading ? "VERIFYING CODE..." : ">> VERIFY KEY <<"}
          </Button>
        </div>
      </form>

      {/* Utilities */}
      <div className="flex flex-col items-center gap-3 mt-4 text-[9px] border-t border-dotted border-primary/20 pt-4 uppercase">
        <div className="flex justify-between w-full">
          {/* Back button */}
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="text-primary hover:text-white underline cursor-pointer"
          >
            {"< Edit Email"}
          </button>

          {/* Resend button */}
          <button
            type="button"
            onClick={handleResend}
            disabled={loading || resendCooldown > 0 || !email}
            className="text-secondary hover:text-white underline cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Resend Code"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center p-8 font-[family-name:var(--font-press-start)] text-[8px] text-primary animate-pulse uppercase">
          🔋 LOADING VERIFIER...
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
