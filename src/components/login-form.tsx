"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Check your email for the magic link.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-zinc-700">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 outline-none ring-violet-500 focus:ring-2"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-violet-600 px-4 py-3 font-medium text-white transition hover:bg-violet-500 disabled:opacity-60"
      >
        {loading ? "Sending..." : "Send magic link"}
      </button>
      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}
    </form>
  );
}
