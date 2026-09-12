"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FolderGit2 } from "lucide-react";
import type { ItemRow } from "@/lib/types";
import { asBrief, displayBadges } from "@/lib/extractors/brief";
import { categoryLabel, daysUntil, statusLabel } from "@/lib/utils";
import { ProcessingBar } from "@/components/processing-bar";
import { TakeawayBadges } from "@/components/reel-brief";
import { ItemGlyph } from "@/components/item-glyph";
import { iconTone } from "@/lib/item-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ItemCard({
  item,
  allowRemove = false,
}: {
  item: ItemRow;
  allowRemove?: boolean;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const daysLeft = daysUntil(item.expires_at);
  const processing = item.status === "processing";
  const brief = asBrief(item.structured_data);
  const title = brief?.name || item.title || (processing ? "Working on this link…" : "Saved link");
  const summary = processing ? item.url : brief?.summary || item.summary || item.caption || item.url;
  const badges = brief ? displayBadges(brief) : [];
  const category = brief?.type || item.category;
  const tone = iconTone(category);

  async function removeFromActive(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setRemoving(true);
    await fetch(`/api/items/${item.id}/stash`, { method: "POST" });
    setRemoving(false);
    router.refresh();
  }

  return (
    <div className="paper-card relative rounded-2xl">
      {allowRemove ? (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={removeFromActive}
          disabled={removing}
          className="absolute right-3 top-3 z-10"
        >
          {removing ? "Removing…" : "Remove"}
        </Button>
      ) : null}
      <Link href={`/items/${item.id}`} className="block p-4 pr-24">
        <div className="flex items-start gap-4">
          <ItemGlyph
            category={category}
            brief={brief}
            title={title}
            summary={summary}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone.chip}`}>
                {categoryLabel(category)}
              </span>
              <Badge>{statusLabel(item.status)}</Badge>
              {daysLeft !== null && item.status === "active" ? (
                <span className="text-xs text-muted-foreground">{daysLeft}d left</span>
              ) : null}
            </div>
            <h3 className="truncate text-[17px] font-semibold tracking-tight">{title}</h3>
            {brief?.githubUrl || brief?.relatedRepos?.[0] ? (
              <p className={`mt-0.5 flex items-center gap-1 truncate text-xs font-medium ${tone.accent}`}>
                <FolderGit2 size={13} />
                {(brief.githubUrl ?? brief.relatedRepos[0].url).replace(/^https:\/\//, "")}
                {(brief.relatedRepos?.length ?? 0) > 1 ? ` · ${brief.relatedRepos.length} matches` : ""}
              </p>
            ) : null}
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{summary}</p>
            {!processing && badges.length ? (
              <div className="mt-3">
                <TakeawayBadges badges={badges.slice(0, 4)} />
              </div>
            ) : null}
            {processing ? (
              <ProcessingBar
                progress={item.processing_progress ?? 8}
                stage={item.processing_stage}
              />
            ) : null}
          </div>
        </div>
      </Link>
    </div>
  );
}
