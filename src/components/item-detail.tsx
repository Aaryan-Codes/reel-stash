"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, FolderGit2 } from "lucide-react";
import type { ItemRow } from "@/lib/types";
import { asBrief, displayBadges } from "@/lib/extractors/brief";
import { categoryLabel, daysUntil } from "@/lib/utils";
import { ProcessingBar } from "@/components/processing-bar";
import { RecipePanel, RelatedRepos, SetupCommands, TakeawayBadges } from "@/components/reel-brief";
import { ItemGlyph } from "@/components/item-glyph";
import { iconTone } from "@/lib/item-icon";
import { Button } from "@/components/ui/button";

export function ItemDetail({ item }: { item: ItemRow }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const actedRef = useRef(false);
  const [liveProgress, setLiveProgress] = useState(item.processing_progress ?? 0);
  const [liveStage, setLiveStage] = useState(item.processing_stage);
  const brief = asBrief(item.structured_data);
  const daysLeft = daysUntil(item.expires_at);
  const showPrompt = item.status === "inbox";
  const processing = item.status === "processing";
  const title = brief?.name || item.title || "Saved link";
  const summary = brief?.summary || item.summary;
  const githubUrl = brief?.githubUrl;
  const badges = brief ? displayBadges(brief) : [];
  const category = brief?.type || item.category;
  const tone = iconTone(category);

  async function runAction(action: "keep" | "stash" | "reopen" | "retry") {
    actedRef.current = true;
    setLoading(action);
    await fetch(`/api/items/${item.id}/${action}`, { method: "POST" });
    setLoading(null);
    router.refresh();
  }

  useEffect(() => {
    if (!processing) return;
    let cancelled = false;

    async function poll() {
      const res = await fetch("/api/items/progress", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as {
        items?: Array<{
          id: string;
          processing_stage: string | null;
          processing_progress: number;
        }>;
      };
      const live = data.items?.find((row) => row.id === item.id);
      if (!live) {
        router.refresh();
        return;
      }
      setLiveProgress(live.processing_progress);
      setLiveStage(live.processing_stage);
    }

    void poll();
    const id = window.setInterval(() => void poll(), 1500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [processing, item.id, router]);

  useEffect(() => {
    return () => {
      if (showPrompt && item.visited_at && !actedRef.current) {
        void fetch(`/api/items/${item.id}/keep`, { method: "POST" });
      }
    };
  }, [item.id, item.visited_at, showPrompt]);

  return (
    <div className="space-y-5">
      <section className="paper-card rounded-2xl">
        <div className="flex items-start gap-4 p-5 sm:p-6">
          <ItemGlyph
            category={category}
            brief={brief}
            title={title}
            summary={summary}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone.chip}`}>
                {categoryLabel(category)}
              </span>
              {daysLeft !== null && item.status === "active" ? (
                <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                  Auto-archive in {daysLeft} days
                </span>
              ) : null}
            </div>
            <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
            {summary ? (
              <p className="mt-3 text-[15px] leading-7 text-muted-foreground">{summary}</p>
            ) : null}
          </div>
        </div>

        {badges.length ? (
          <div className="border-t border-border px-5 py-4 sm:px-6">
            <TakeawayBadges badges={badges} />
          </div>
        ) : null}

        {processing ? (
          <div className="border-t border-border px-5 py-4 sm:px-6">
            <ProcessingBar progress={liveProgress} stage={liveStage} />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-4 sm:px-6">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ExternalLink size={14} />
            Open original reel
          </a>
          {item.status === "active" ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!!loading}
              onClick={async () => {
                await runAction("stash");
                router.push("/active");
              }}
            >
              Remove from Active
            </Button>
          ) : null}
        </div>
      </section>

      {githubUrl && !brief?.relatedRepos?.length ? (
        <a
          href={githubUrl}
          target="_blank"
          rel="noreferrer"
          className="paper-card flex items-center justify-between gap-4 rounded-2xl px-5 py-4 hover:bg-muted"
        >
          <span className="flex min-w-0 items-center gap-3">
            <FolderGit2 size={20} />
            <span className="min-w-0">
              <span className="block text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Repository
              </span>
              <span className="block truncate font-medium">
                {githubUrl.replace(/^https:\/\/github\.com\//, "")}
              </span>
            </span>
          </span>
          <span className="shrink-0 text-sm text-muted-foreground">Open on GitHub</span>
        </a>
      ) : null}

      {showPrompt ? (
        <section className="paper-card rounded-2xl p-5">
          <h2 className="font-display text-xl font-semibold">Keep or stash?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep it in your active list, or stash it to archive.
          </p>
          <div className="mt-4 flex gap-3">
            <Button type="button" disabled={!!loading} onClick={() => runAction("keep")}>
              Keep
            </Button>
            <Button type="button" variant="secondary" disabled={!!loading} onClick={() => runAction("stash")}>
              Stash
            </Button>
          </div>
        </section>
      ) : null}

      {(item.status === "stashed" || item.status === "expired") && (
        <section>
          <Button type="button" variant="secondary" disabled={!!loading} onClick={() => runAction("reopen")}>
            Move back to Active
          </Button>
        </section>
      )}

      {brief?.relatedRepos?.length ? <RelatedRepos repos={brief.relatedRepos} /> : null}

      {brief?.setupCommands?.length ? <SetupCommands commands={brief.setupCommands} /> : null}

      {category === "recipe" ? (
        <RecipePanel ingredients={brief?.ingredients} steps={brief?.steps} />
      ) : null}

      {brief?.takeaways?.length ? (
        <section className="paper-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Takeaways
          </h2>
          <ul className="mt-4 space-y-3">
            {brief.takeaways.map((line) => (
              <li key={line} className="flex gap-3 text-[15px] leading-7">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {brief?.keyFeatures?.length ? (
        <section className="paper-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Features
          </h2>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {brief.keyFeatures.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {!processing ? (
        <button
          type="button"
          disabled={!!loading}
          onClick={() => runAction("retry")}
          className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
        >
          {loading === "retry" ? "Regenerating…" : "Regenerate note"}
        </button>
      ) : null}

      {item.transcript ? (
        <details className="paper-card rounded-2xl p-5">
          <summary className="cursor-pointer font-medium">Full transcript</summary>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
            {item.transcript}
          </p>
        </details>
      ) : null}

      {item.caption ? (
        <details className="paper-card rounded-2xl p-5">
          <summary className="cursor-pointer font-medium">Caption</summary>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{item.caption}</p>
        </details>
      ) : null}

      {item.processing_error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted px-4 py-3">
          <p className="text-sm">Partial extraction: {item.processing_error}</p>
          <Button type="button" size="sm" disabled={!!loading} onClick={() => runAction("retry")}>
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}
