"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ItemRow } from "@/lib/types";
import type { StructuredData } from "@/lib/db/schema";
import { categoryLabel, daysUntil } from "@/lib/utils";

export function ItemDetail({ item }: { item: ItemRow }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const actedRef = useRef(false);
  const structured = item.structured_data as StructuredData | null;
  const daysLeft = daysUntil(item.expires_at);
  const showPrompt = item.status === "inbox";

  async function runAction(action: "keep" | "stash" | "reopen" | "retry") {
    actedRef.current = true;
    setLoading(action);
    await fetch(`/api/items/${item.id}/${action}`, { method: "POST" });
    setLoading(null);
    router.refresh();
  }

  useEffect(() => {
    return () => {
      if (showPrompt && item.visited_at && !actedRef.current) {
        void fetch(`/api/items/${item.id}/keep`, { method: "POST" });
      }
    };
  }, [item.id, item.visited_at, showPrompt]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium">
            {categoryLabel(item.category)}
          </span>
          {item.confidence !== null ? (
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
              {Math.round(item.confidence * 100)}% confidence
            </span>
          ) : null}
          {daysLeft !== null && item.status === "active" ? (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              Auto-archive in {daysLeft} days
            </span>
          ) : null}
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">{item.title ?? "Saved link"}</h1>
        <p className="mt-3 text-zinc-600">{item.summary}</p>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex text-sm font-medium text-violet-700 hover:text-violet-600"
        >
          Open original link
        </a>
      </section>

      {showPrompt ? (
        <section className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
          <h2 className="font-semibold text-violet-900">Keep or stash?</h2>
          <p className="mt-1 text-sm text-violet-800">
            Keep it in your active list, or stash it to archive.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={!!loading}
              onClick={() => runAction("keep")}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
            >
              Keep
            </button>
            <button
              type="button"
              disabled={!!loading}
              onClick={() => runAction("stash")}
              className="rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-60"
            >
              Stash
            </button>
          </div>
        </section>
      ) : null}

      {(item.status === "stashed" || item.status === "expired") && (
        <section>
          <button
            type="button"
            disabled={!!loading}
            onClick={() => runAction("reopen")}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
          >
            Move back to Active
          </button>
        </section>
      )}

      <StructuredSection structured={structured} />

      {item.transcript ? (
        <details className="rounded-2xl border border-zinc-200 bg-white p-5">
          <summary className="cursor-pointer font-medium text-zinc-900">Full transcript</summary>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-600">
            {item.transcript}
          </p>
        </details>
      ) : null}

      {item.caption ? (
        <details className="rounded-2xl border border-zinc-200 bg-white p-5">
          <summary className="cursor-pointer font-medium text-zinc-900">Caption</summary>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-600">{item.caption}</p>
        </details>
      ) : null}

      {item.processing_error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">Partial extraction: {item.processing_error}</p>
          <button
            type="button"
            disabled={!!loading}
            onClick={() => runAction("retry")}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StructuredSection({ structured }: { structured: StructuredData | null }) {
  if (!structured || typeof structured !== "object") return null;

  const data = structured as Record<string, unknown>;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="font-semibold text-zinc-900">Extracted details</h2>
      <div className="mt-4 space-y-4 text-sm text-zinc-700">
        {Array.isArray(data.ingredients) && (
          <div>
            <h3 className="mb-2 font-medium">Ingredients</h3>
            <ul className="list-disc space-y-1 pl-5">
              {(data.ingredients as string[]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {Array.isArray(data.steps) && (
          <div>
            <h3 className="mb-2 font-medium">Steps</h3>
            <ol className="list-decimal space-y-1 pl-5">
              {(data.steps as string[]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        )}
        {Array.isArray(data.takeaways) && (
          <div>
            <h3 className="mb-2 font-medium">Takeaways</h3>
            <ul className="list-disc space-y-1 pl-5">
              {(data.takeaways as string[]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {Array.isArray(data.keyFeatures) && (
          <div>
            <h3 className="mb-2 font-medium">Key features</h3>
            <ul className="list-disc space-y-1 pl-5">
              {(data.keyFeatures as string[]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {typeof data.purpose === "string" && (
          <p>
            <span className="font-medium">Purpose: </span>
            {data.purpose}
          </p>
        )}
        {typeof data.readmeSummary === "string" && (
          <p>
            <span className="font-medium">README: </span>
            {data.readmeSummary}
          </p>
        )}
        {typeof data.whyPopular === "string" && (
          <p>
            <span className="font-medium">Why popular: </span>
            {data.whyPopular}
          </p>
        )}
      </div>
    </section>
  );
}
