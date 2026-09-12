"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ItemRow } from "@/lib/types";
import { categoryLabel, cn } from "@/lib/utils";
import { ItemCard } from "@/components/item-card";
import { Input } from "@/components/ui/input";

const CATEGORIES = ["all", "recipe", "github_repo", "website", "learning", "other"] as const;

type ProgressRow = {
  id: string;
  status: string;
  processing_stage: string | null;
  processing_progress: number;
  title: string | null;
  processing_error: string | null;
};

export function ItemList({
  items,
  emptyTitle,
  emptyBody,
  showCategoryFilters = false,
  allowRemove = false,
}: {
  items: ItemRow[];
  emptyTitle: string;
  emptyBody: string;
  showCategoryFilters?: boolean;
  allowRemove?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("all");
  const [liveProgress, setLiveProgress] = useState<Record<string, ProgressRow>>({});

  const processingIds = useMemo(
    () => items.filter((item) => item.status === "processing").map((item) => item.id),
    [items],
  );

  useEffect(() => {
    if (processingIds.length === 0) {
      setLiveProgress({});
      return;
    }

    let cancelled = false;

    async function poll() {
      const res = await fetch("/api/items/progress", { cache: "no-store" });
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { items?: ProgressRow[] };
      const rows = data.items ?? [];
      const next: Record<string, ProgressRow> = {};
      for (const row of rows) next[row.id] = row;
      if (!cancelled) setLiveProgress(next);

      const stillProcessing = processingIds.some((id) => rows.some((row) => row.id === id));
      if (!stillProcessing) router.refresh();
    }

    void poll();
    const id = window.setInterval(() => void poll(), 1500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [processingIds, router]);

  const merged = useMemo(
    () =>
      items.map((item) => {
        const live = liveProgress[item.id];
        if (!live) return item;
        return {
          ...item,
          processing_stage: live.processing_stage,
          processing_progress: live.processing_progress,
          title: live.title ?? item.title,
        };
      }),
    [items, liveProgress],
  );

  const filtered = useMemo(() => {
    let result = merged;

    if (category !== "all") {
      result = result.filter((item) => item.category === category);
    }

    const q = query.trim().toLowerCase();
    if (!q) return result;

    return result.filter((item) =>
      [item.title, item.summary, item.caption, item.transcript, item.category, item.url]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [merged, query, category]);

  return (
    <div className="space-y-4">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search saved items..."
      />

      {showCategoryFilters ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition",
                category === value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {value === "all" ? "All" : categoryLabel(value)}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="paper-card rounded-2xl border-dashed p-8 text-center">
          <h2 className="font-display text-lg font-semibold">{emptyTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{emptyBody}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} allowRemove={allowRemove} />
          ))}
        </div>
      )}
    </div>
  );
}
