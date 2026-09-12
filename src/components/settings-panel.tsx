"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SettingsPanel({
  initialKey,
  initialExpiryDays,
  appUrl,
}: {
  initialKey: string | null;
  initialExpiryDays: number;
  appUrl: string;
}) {
  const [captureKey, setCaptureKey] = useState(initialKey ?? "");
  const [expiryDays, setExpiryDays] = useState(initialExpiryDays);
  const [expirySaved, setExpirySaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function saveExpiryDays() {
    const res = await fetch("/api/settings/expiry", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiryDays }),
    });
    if (res.ok) {
      setExpirySaved(true);
      setTimeout(() => setExpirySaved(false), 1500);
    }
  }

  async function regenerate() {
    setLoading(true);
    const res = await fetch("/api/settings/capture-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerate: true }),
    });
    const data = (await res.json()) as { captureApiKey?: string };
    if (data.captureApiKey) setCaptureKey(data.captureApiKey);
    setLoading(false);
  }

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  const captureUrl = `${appUrl}/api/capture`;

  return (
    <div className="space-y-6">
      <section className="paper-card rounded-2xl p-5">
        <h2 className="font-display font-semibold">Capture API key</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use this in your iOS Shortcut as the Bearer token.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <code className="flex-1 overflow-x-auto rounded-lg border border-border bg-muted px-4 py-3 text-xs">
            {captureKey || "Loading..."}
          </code>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => copy(captureKey, "key")}>
              {copied === "key" ? "Copied" : "Copy"}
            </Button>
            <Button type="button" disabled={loading} onClick={regenerate}>
              Regenerate
            </Button>
          </div>
        </div>
      </section>

      <section className="paper-card rounded-2xl p-5">
        <h2 className="font-display font-semibold">Auto-archive</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Active items you don&apos;t revisit move to Archive after this many days.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Input
            type="number"
            min={7}
            max={365}
            value={expiryDays}
            onChange={(e) => setExpiryDays(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">days</span>
          <Button type="button" variant="secondary" onClick={saveExpiryDays}>
            {expirySaved ? "Saved" : "Save"}
          </Button>
        </div>
      </section>

      <section className="paper-card rounded-2xl p-5">
        <h2 className="font-display font-semibold">iOS Shortcut setup</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-muted-foreground">
          <li>Open the Shortcuts app → New Shortcut → name it “Save to Reel Stash”.</li>
          <li>Add action “Receive URLs from Share Sheet”.</li>
          <li>
            Add “Get contents of URL” with method POST, URL{" "}
            <button
              type="button"
              onClick={() => copy(captureUrl, "url")}
              className="font-medium text-primary hover:underline"
            >
              {captureUrl}
            </button>
            .
          </li>
          <li>
            Headers: <code>Authorization: Bearer YOUR_KEY</code> and{" "}
            <code>Content-Type: application/json</code>.
          </li>
          <li>
            Request body JSON: <code>{`{"url":"[Shortcut Input]"}`}</code>
          </li>
          <li>Enable “Show in Share Sheet” and pin it for Instagram shares.</li>
        </ol>
        {copied === "url" ? <p className="mt-2 text-sm text-primary">Capture URL copied.</p> : null}
        <p className="mt-4 text-sm text-muted-foreground">
          Full guide: <code>ios-shortcut/README.md</code>
        </p>
      </section>

      <section className="paper-card rounded-2xl p-5">
        <h2 className="font-display font-semibold">Free service signup links</h2>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <a className="text-primary hover:underline" href="https://supabase.com/dashboard/sign-in">
              Supabase
            </a>
          </li>
          <li>
            <a
              className="text-primary hover:underline"
              href="https://captapi.com/apis/instagram-transcript"
            >
              Captapi (Instagram transcript)
            </a>
          </li>
          <li>
            <a className="text-primary hover:underline" href="https://build.nvidia.com/settings/api-keys">
              NVIDIA Nemotron API keys
            </a>
          </li>
          <li>
            <a className="text-primary hover:underline" href="https://dashboard.render.com/register">
              Render (deploy)
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
