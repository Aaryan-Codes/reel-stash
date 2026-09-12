"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    <form onSubmit={handleSubmit} className="paper-card mb-6 rounded-2xl p-5">
      <label className="block text-sm font-medium">Paste a link</label>
      <p className="mt-1 text-xs text-muted-foreground">
        Instagram reel, GitHub repo, or any website — same flow as the iOS Shortcut.
      </p>
      <Input
        type="url"
        required
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.instagram.com/reel/…"
        className="mt-3"
      />
      <Input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note"
        className="mt-2"
      />
      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save to inbox"}
        </Button>
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
      </div>
    </form>
  );
}
