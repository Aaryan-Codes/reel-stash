"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SaveLinkForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, note: note || undefined }),
    });

    const data = (await res.json()) as { error?: string; message?: string };
    setLoading(false);

    if (!res.ok) {
      setStatus(data.error ?? "Could not save this link.");
      return;
    }

    setUrl("");
    setNote("");
    setStatus(data.message ?? "Saved — processing…");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <label className="block text-sm font-medium text-zinc-800">Paste a link</label>
      <p className="mt-1 text-xs text-zinc-500">
        Instagram reel, GitHub repo, or any website — same flow as the iOS Shortcut.
      </p>
      <input
        type="url"
        required
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.instagram.com/reel/…"
        className="mt-3 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2"
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note"
        className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save to inbox"}
        </button>
        {status ? <p className="text-sm text-zinc-600">{status}</p> : null}
      </div>
    </form>
  );
}
