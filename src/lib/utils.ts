import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX) ?? [];
  return [...new Set(matches.map((u) => u.replace(/[.,!?]+$/, "")))];
}

export function detectSource(url: string): "instagram" | "github" | "web" {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("instagram.com")) return "instagram";
    if (host === "github.com") return "github";
    return "web";
  } catch {
    return "web";
  }
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

const GITHUB_SKIP_OWNERS = new Set([
  "settings",
  "orgs",
  "features",
  "topics",
  "about",
  "pricing",
  "login",
  "marketplace",
  "sponsors",
  "explore",
  "notifications",
  "pulls",
  "issues",
  "new",
  "apps",
  "collections",
  "events",
  "customer-stories",
  "security",
  "enterprise",
  "team",
]);

export function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (!parsed.hostname.includes("github.com")) return null;
    const [, owner, repo] = parsed.pathname.split("/");
    if (!owner || !repo || GITHUB_SKIP_OWNERS.has(owner.toLowerCase())) return null;
    if (["issues", "pulls", "actions", "projects", "wiki", "pulse"].includes(repo.toLowerCase())) {
      return null;
    }
    return { owner, repo: repo.replace(/\.git$/, "").replace(/[.,!?)]+$/, "") };
  } catch {
    return null;
  }
}

export function githubRepoUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo.replace(/\.git$/, "")}`;
}

/** Finds owner/repo even when the reel only says it out loud. */
export function findGitHubRepoInText(text: string | null | undefined): string | null {
  if (!text) return null;

  const tryPair = (owner?: string, repo?: string) => {
    if (!owner || !repo) return null;
    const parsed = parseGitHubRepo(`https://github.com/${owner}/${repo}`);
    return parsed ? githubRepoUrl(parsed.owner, parsed.repo) : null;
  };

  const patterns: RegExp[] = [
    /https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/gi,
    /(?:^|[\s("'([{])github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/gi,
    /github(?:\.com)?(?:\s+slash\s+|\s+|\/)([A-Za-z0-9_.-]+)\s*(?:\/|slash)\s*([A-Za-z0-9_.-]+)/gi,
    /(?:check out|repo(?:sitory)?|clone|star)\s+([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/gi,
    /([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\s+(?:on|at|from)\s+)github/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const found = tryPair(match[1], match[2]);
      if (found) return found;
    }
  }

  return null;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function categoryLabel(category: string | null): string {
  switch (category) {
    case "recipe":
      return "Recipe";
    case "github_repo":
      return "GitHub";
    case "website":
      return "Website";
    case "learning":
      return "Learning";
    default:
      return "Other";
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "processing":
      return "Processing";
    case "inbox":
      return "Inbox";
    case "active":
      return "Active";
    case "stashed":
      return "Stashed";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

export function daysUntil(dateIso: string | null): number | null {
  if (!dateIso) return null;
  const diff = new Date(dateIso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
