"use client";

import { useState } from "react";

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
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold text-zinc-900">Capture API key</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Use this in your iOS Shortcut as the Bearer token.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <code className="flex-1 overflow-x-auto rounded-xl bg-zinc-100 px-4 py-3 text-xs">
            {captureKey || "Loading..."}
          </code>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => copy(captureKey, "key")}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              {copied === "key" ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={regenerate}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
            >
              Regenerate
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold text-zinc-900">Auto-archive</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Active items you don&apos;t revisit move to Archive after this many days.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="number"
            min={7}
            max={365}
            value={expiryDays}
            onChange={(e) => setExpiryDays(Number(e.target.value))}
            className="w-24 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none ring-violet-500 focus:ring-2"
          />
          <span className="text-sm text-zinc-600">days</span>
          <button
            type="button"
            onClick={saveExpiryDays}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            {expirySaved ? "Saved" : "Save"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold text-zinc-900">iOS Shortcut setup</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-zinc-700">
          <li>Open the Shortcuts app → New Shortcut → name it “Save to Reel Stash”.</li>
          <li>Add action “Receive URLs from Share Sheet”.</li>
          <li>
            Add “Get contents of URL” with method POST, URL{" "}
            <button
              type="button"
              onClick={() => copy(captureUrl, "url")}
              className="font-medium text-violet-700 hover:underline"
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
            Request body JSON:{" "}
            <code>{`{"url":"[Shortcut Input]"}`}</code>
          </li>
          <li>Enable “Show in Share Sheet” and pin it for Instagram shares.</li>
        </ol>
        {copied === "url" ? <p className="mt-2 text-sm text-violet-700">Capture URL copied.</p> : null}
        <p className="mt-4 text-sm text-zinc-500">
          Full guide: <code>ios-shortcut/README.md</code>
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold text-zinc-900">Free service signup links</h2>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <a className="text-violet-700 hover:underline" href="https://supabase.com/dashboard/sign-in">
              Supabase
            </a>
          </li>
          <li>
            <a className="text-violet-700 hover:underline" href="https://console.groq.com/keys">
              Groq API keys
            </a>
          </li>
          <li>
            <a
              className="text-violet-700 hover:underline"
              href="https://build.nvidia.com/settings/api-keys"
            >
              NVIDIA Nemotron API keys
            </a>
          </li>
          <li>
            <a
              className="text-violet-700 hover:underline"
              href="https://dashboard.render.com/register"
            >
              Render (deploy)
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
