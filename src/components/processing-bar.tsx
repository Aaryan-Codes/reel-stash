"use client";

import { processingStageLabel } from "@/lib/processing/stages";

export function ProcessingBar({
  progress,
  stage,
}: {
  progress: number;
  stage: string | null;
}) {
  const pct = Math.max(4, Math.min(100, Math.round(progress)));

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="truncate text-muted-foreground">{processingStageLabel(stage)}</span>
        <span className="shrink-0 font-medium tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={processingStageLabel(stage)}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
