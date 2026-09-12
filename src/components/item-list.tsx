"use client";

import { useMemo, useState } from "react";
import type { ItemRow } from "@/lib/types";
import { categoryLabel } from "@/lib/utils";
import { ItemCard } from "@/components/item-card";

const CATEGORIES = ["all", "recipe", "github_repo", "website", "learning", "other"] as const;

export function ItemList({
  items,
  emptyTitle,
  emptyBody,
  showCategoryFilters = false,
}: {
  items: ItemRow[];
  emptyTitle: string;
  emptyBody: string;
  showCategoryFilters?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("all");

  const filtered = useMemo(() => {
    let result = items;

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
  }, [items, query, category]);

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search saved items..."
        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-violet-500 focus:ring-2"
      />

      {showCategoryFilters ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                category === value
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {value === "all" ? "All" : categoryLabel(value)}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">{emptyTitle}</h2>
          <p className="mt-2 text-sm text-zinc-600">{emptyBody}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
