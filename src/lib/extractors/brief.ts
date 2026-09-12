import { findGitHubRepoInText } from "@/lib/utils";

export type ItemCategory = "recipe" | "github_repo" | "website" | "learning" | "other";

export interface RelatedRepo {
  fullName: string;
  url: string;
  description: string | null;
  stars: number;
}

export interface ReelBrief {
  type: ItemCategory;
  name: string;
  summary: string;
  badges: string[];
  githubUrl: string | null;
  relatedRepos: RelatedRepo[];
  setupCommands: string[];
  takeaways: string[];
  ingredients?: string[];
  steps?: string[];
  keyFeatures?: string[];
  purpose?: string;
  whyPopular?: string;
  markdown?: string;
}

export function emptyBrief(partial: Partial<ReelBrief> = {}): ReelBrief {
  return {
    type: "other",
    name: "Saved link",
    summary: "Saved for later review.",
    badges: [],
    githubUrl: null,
    relatedRepos: [],
    setupCommands: [],
    takeaways: [],
    ...partial,
  };
}

export function asBrief(value: unknown): ReelBrief | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const badges = Array.isArray(data.badges)
    ? data.badges.filter((item): item is string => typeof item === "string")
    : [];
  const setupCommands = Array.isArray(data.setupCommands)
    ? data.setupCommands.filter((item): item is string => typeof item === "string")
    : [];
  const takeaways = Array.isArray(data.takeaways)
    ? data.takeaways.filter((item): item is string => typeof item === "string")
    : [];
  const markdown = typeof data.markdown === "string" ? data.markdown : undefined;
  const summary = typeof data.summary === "string" ? data.summary : "";
  const relatedRepos = parseRelatedRepos(data.relatedRepos);
  const githubUrl =
    (typeof data.githubUrl === "string" && data.githubUrl) ||
    (typeof data.github_url === "string" && data.github_url) ||
    relatedRepos[0]?.url ||
    findGitHubRepoInText([markdown ?? "", summary].join("\n"));

  return emptyBrief({
    type: (
      typeof data.type === "string"
        ? data.type
        : typeof data.category === "string"
          ? data.category
          : githubUrl
            ? "github_repo"
            : "other"
    ) as ReelBrief["type"],
    name: typeof data.name === "string" ? data.name : "",
    summary,
    badges,
    githubUrl,
    relatedRepos,
    setupCommands,
    takeaways,
    ingredients: Array.isArray(data.ingredients)
      ? data.ingredients.filter((item): item is string => typeof item === "string")
      : undefined,
    steps: Array.isArray(data.steps)
      ? data.steps.filter((item): item is string => typeof item === "string")
      : undefined,
    keyFeatures: Array.isArray(data.keyFeatures)
      ? data.keyFeatures.filter((item): item is string => typeof item === "string")
      : undefined,
    purpose: typeof data.purpose === "string" ? data.purpose : undefined,
    whyPopular: typeof data.whyPopular === "string" ? data.whyPopular : undefined,
    markdown,
  });
}

export function noteMarkdown(brief: ReelBrief): string {
  const lines = [`# ${brief.name}`, ""];
  if (brief.relatedRepos.length) {
    lines.push("## Related GitHub repos", "");
    for (const repo of brief.relatedRepos) {
      lines.push(
        `- [${repo.fullName}](${repo.url}) (${repo.stars.toLocaleString()} stars)${repo.description ? ` — ${repo.description}` : ""}`,
      );
    }
    lines.push("");
  }
  lines.push("## Overview", "", brief.summary, "");
  if (brief.purpose) {
    lines.push("## Why it matters", "", brief.purpose, "");
  }
  if (brief.takeaways.length) {
    lines.push("## Key takeaways", "", ...brief.takeaways.map((item) => `- ${item}`), "");
  }
  if (brief.keyFeatures?.length) {
    lines.push("## Features", "", ...brief.keyFeatures.map((item) => `- ${item}`), "");
  }
  if (brief.setupCommands.length) {
    lines.push("## Setup", "", "```bash", ...brief.setupCommands, "```", "");
  }
  if (brief.ingredients?.length) {
    lines.push("## Ingredients", "", ...brief.ingredients.map((item) => `- ${item}`), "");
  }
  if (brief.steps?.length) {
    lines.push(
      "## Instructions",
      "",
      ...brief.steps.map((item, index) => `${index + 1}. ${item}`),
      "",
    );
  }
  if (brief.whyPopular) {
    lines.push("## Why it stands out", "", brief.whyPopular, "");
  }
  return lines.join("\n").trim();
}

export function displayBadges(brief: ReelBrief): string[] {
  if (brief.badges.length) return brief.badges;
  const badges: string[] = [];
  if (brief.githubUrl || brief.type === "github_repo") badges.push("GitHub", "Open source");
  if (brief.type === "recipe") badges.push("Recipe", "Step by step");
  if (brief.type === "learning") badges.push("Learning");
  if (brief.type === "website") badges.push("Website");
  if (brief.setupCommands.length) badges.push("Quick setup");
  if (brief.ingredients?.length) badges.push("Ingredients listed");
  if (brief.relatedRepos.length) badges.push("GitHub matches");
  return badges.slice(0, 6);
}

function parseRelatedRepos(value: unknown): RelatedRepo[] {
  if (!Array.isArray(value)) return [];
  const repos: RelatedRepo[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const fullName = typeof row.fullName === "string" ? row.fullName : "";
    const url = typeof row.url === "string" ? row.url : "";
    if (!fullName || !url) continue;
    repos.push({
      fullName,
      url,
      description: typeof row.description === "string" ? row.description : null,
      stars: typeof row.stars === "number" ? row.stars : 0,
    });
  }
  return repos.slice(0, 5);
}
