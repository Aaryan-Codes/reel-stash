import type { ItemCategory, ReelBrief } from "@/lib/extractors/brief";

export type ItemIconName =
  | "github"
  | "recipe"
  | "website"
  | "learning"
  | "spark"
  | "terminal"
  | "brain"
  | "database"
  | "phone"
  | "shield"
  | "video"
  | "music"
  | "palette"
  | "lock"
  | "globe"
  | "book";

export function pickItemIcon(input: {
  category?: string | null;
  brief?: ReelBrief | null;
  title?: string | null;
  summary?: string | null;
}): ItemIconName {
  const category = (input.brief?.type || input.category || "other") as ItemCategory;
  const haystack = [
    input.brief?.name,
    input.title,
    input.summary,
    input.brief?.summary,
    ...(input.brief?.badges ?? []),
    ...(input.brief?.keyFeatures ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(oauth|auth|security|password|encrypt)\b/.test(haystack)) return "shield";
  if (/\b(llm|openai|gpt|claude|ai model|machine learning|neural)\b/.test(haystack)) {
    return "brain";
  }
  if (/\b(postgres|sqlite|mysql|mongodb|database|sql)\b/.test(haystack)) return "database";
  if (/\b(ios|android|mobile|swift|react native)\b/.test(haystack)) return "phone";
  if (/\b(cli|terminal|shell|docker|kubernetes|bash)\b/.test(haystack)) return "terminal";
  if (/\b(music|spotify|audio|podcast)\b/.test(haystack)) return "music";
  if (/\b(design|figma|ui kit|palette)\b/.test(haystack)) return "palette";
  if (/\b(video|youtube|reel editor)\b/.test(haystack)) return "video";
  if (/\b(lock|secret|vault|keychain)\b/.test(haystack)) return "lock";

  switch (category) {
    case "github_repo":
      return "github";
    case "recipe":
      return "recipe";
    case "website":
      return "globe";
    case "learning":
      return "book";
    default:
      return input.brief?.githubUrl ? "github" : "spark";
  }
}

const TILE = "border border-border bg-muted text-foreground";
const CHIP = "border border-border bg-card text-muted-foreground";

export function iconTone(_category?: string | null): {
  tile: string;
  chip: string;
  accent: string;
} {
  return {
    tile: TILE,
    chip: CHIP,
    accent: "text-foreground",
  };
}
