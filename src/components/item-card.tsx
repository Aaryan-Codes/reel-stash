import Link from "next/link";
import type { ItemRow } from "@/lib/types";
import { categoryLabel, daysUntil, statusLabel } from "@/lib/utils";

export function ItemCard({ item }: { item: ItemRow }) {
  const daysLeft = daysUntil(item.expires_at);

  return (
    <Link
      href={`/items/${item.id}`}
      className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        {item.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnail_url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-sm font-semibold text-violet-700">
            {categoryLabel(item.category).slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
              {categoryLabel(item.category)}
            </span>
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
              {statusLabel(item.status)}
            </span>
            {item.status === "processing" ? (
              <span className="text-xs text-amber-600">Processing...</span>
            ) : null}
            {item.confidence !== null && item.confidence < 0.5 ? (
              <span className="text-xs text-amber-600">Partial extraction</span>
            ) : null}
            {daysLeft !== null && item.status === "active" ? (
              <span className="text-xs text-zinc-500">{daysLeft}d left</span>
            ) : null}
          </div>
          <h3 className="truncate font-semibold text-zinc-900">
            {item.title ?? "Saved link"}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
            {item.summary ?? item.caption ?? item.url}
          </p>
        </div>
      </div>
    </Link>
  );
}
