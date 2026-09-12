"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await res.json()) as { error?: string };

    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not send a code.");
      return;
    }

    setStep("code");
    setMessage("We sent a 6-digit code to your email. Enter it here — don’t tap the link.");
  }

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    await sendCode();
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      await supabase.from("profiles").upsert({ id: userId }, { onConflict: "id" });
    }

    router.push("/inbox");
    router.refresh();
  }

  if (step === "code") {
    return (
      <form onSubmit={verifyCode} className="flex w-full flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Code sent to <span className="font-medium text-foreground">{email}</span>
        </p>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">One-time code</span>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            minLength={6}
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
            placeholder="123456"
            className="tracking-[0.35em]"
          />
        </label>
        <Button type="submit" disabled={loading || code.length < 6}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
        <div className="flex flex-wrap gap-3 text-sm">
          <button
            type="button"
            className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => {
              setStep("email");
              setCode("");
              setMessage(null);
            }}
          >
            Use a different email
          </button>
          <button
            type="button"
            disabled={loading}
            className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
            onClick={() => void sendCode()}
          >
            Resend code
          </button>
        </div>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </form>
    );
  }

  return (
    <form onSubmit={handleEmailSubmit} className="flex w-full flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-foreground">Email</span>
        <Input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>
      <Button type="submit" disabled={loading}>
        {loading ? "Sending…" : "Send code"}
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </form>
  );
}
