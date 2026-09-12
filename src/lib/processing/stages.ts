export const PROCESSING_STAGES = {
  queued: { progress: 8, label: "Queued…" },
  fetching_metadata: { progress: 18, label: "Reading caption and preview…" },
  extracting_audio: { progress: 38, label: "Downloading reel audio…" },
  transcribing: { progress: 62, label: "Getting transcript from the reel…" },
  fetching_links: { progress: 78, label: "Finding GitHub repos and recipes…" },
  summarizing: { progress: 90, label: "Summarizing with Nemotron…" },
  complete: { progress: 100, label: "Done" },
  waiting_retry: { progress: 15, label: "Rate limited — will retry…" },
} as const;

export type ProcessingStage = keyof typeof PROCESSING_STAGES;

export function processingStageLabel(stage: string | null | undefined): string {
  if (!stage) return "Processing…";
  return PROCESSING_STAGES[stage as ProcessingStage]?.label ?? "Processing…";
}

export function processingStageProgress(stage: string | null | undefined, fallback = 8): number {
  if (!stage) return fallback;
  return PROCESSING_STAGES[stage as ProcessingStage]?.progress ?? fallback;
}
