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

export function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("github.com")) return null;
    const [, owner, repo] = parsed.pathname.split("/");
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/, "") };
  } catch {
    return null;
  }
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
