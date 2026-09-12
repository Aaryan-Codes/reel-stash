import { parseGitHubRepo } from "@/lib/utils";

export interface GitHubRepoHit {
  fullName: string;
  url: string;
  description: string | null;
  stars: number;
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ReelStash/1.0",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

export async function searchGitHubRepos(
  input: {
    productName?: string;
    queries?: string[];
    context?: string;
    limit?: number;
  } | string[],
  limitArg = 5,
): Promise<GitHubRepoHit[]> {
  const options = Array.isArray(input)
    ? { queries: input, limit: limitArg }
    : input;
  const limit = options.limit ?? 5;
  const productName = options.productName?.trim() || options.queries?.[0] || "";
  const context = options.context ?? "";
  const queries = buildRepoQueries(productName, options.queries ?? [], context);
  const hits: GitHubRepoHit[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    const url = new URL("https://api.github.com/search/repositories");
    url.searchParams.set("q", query);
    url.searchParams.set("per_page", "10");

    try {
      const res = await fetch(url, { headers: githubHeaders() });
      if (!res.ok) continue;
      const body = (await res.json()) as {
        items?: Array<{
          full_name: string;
          html_url: string;
          description: string | null;
          stargazers_count: number;
        }>;
      };
      for (const item of body.items ?? []) {
        const key = item.full_name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({
          fullName: item.full_name,
          url: item.html_url,
          description: item.description,
          stars: item.stargazers_count ?? 0,
        });
      }
    } catch (error) {
      console.error(`GitHub search failed (${query}):`, error);
    }
  }

  return hits
    .sort((a, b) => scoreRepo(b, productName, context) - scoreRepo(a, productName, context))
    .slice(0, limit);
}

function buildRepoQueries(productName: string, extra: string[], context: string): string[] {
  const names = nameVariants(productName);
  const keywords = contextKeywords(context).slice(0, 4);
  const queries: string[] = [];

  for (const name of names) {
    queries.push(`${name} in:name`);
    queries.push(name);
    if (keywords.length) queries.push(`${name} ${keywords.join(" ")}`);
  }

  for (const term of extra) {
    const cleaned = term.trim();
    if (cleaned.length >= 2) queries.push(cleaned);
  }

  return [...new Set(queries)].slice(0, 6);
}

function nameVariants(name: string): string[] {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (base.length < 2) return [];
  const variants = new Set([base]);
  if (base.endsWith("ss") && base.length > 4) variants.add(base.slice(0, -1));
  if (base.endsWith("s") && !base.endsWith("ss") && base.length > 4) variants.add(base.slice(0, -1));
  return [...variants];
}

function contextKeywords(text: string): string[] {
  const stop = new Set([
    "the",
    "and",
    "for",
    "from",
    "with",
    "this",
    "that",
    "your",
    "you",
    "github",
    "instagram",
    "reel",
    "free",
    "tool",
    "open",
    "source",
    "before",
    "after",
    "into",
    "like",
    "just",
    "also",
    "then",
    "when",
    "what",
    "comment",
    "scan",
    "send",
    "repo",
    "link",
  ]);
  const counts = new Map<string, number>();
  for (const token of text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? []) {
    if (stop.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token);
}

function scoreRepo(hit: GitHubRepoHit, productName: string, context: string): number {
  const repo = hit.fullName.split("/")[1]?.toLowerCase() ?? "";
  const owner = hit.fullName.split("/")[0]?.toLowerCase() ?? "";
  const haystack = `${hit.fullName} ${hit.description ?? ""}`.toLowerCase();
  const names = nameVariants(productName);
  let score = Math.log10(hit.stars + 1);

  for (const name of names) {
    if (repo === name) score += 120;
    else if (repo.includes(name) || name.includes(repo)) score += 70;
    else if (levenshtein(repo, name) <= 1) score += 90;
    if (owner.includes(name)) score += 15;
  }

  for (const keyword of contextKeywords(context).slice(0, 8)) {
    if (haystack.includes(keyword)) score += 6;
  }

  return score;
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) grid[i][0] = i;
  for (let j = 0; j < cols; j += 1) grid[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      grid[i][j] =
        a[i - 1] === b[j - 1]
          ? grid[i - 1][j - 1]
          : 1 + Math.min(grid[i - 1][j], grid[i][j - 1], grid[i - 1][j - 1]);
    }
  }
  return grid[a.length][b.length];
}

export async function fetchGitHubRepo(url: string): Promise<
  | (GitHubRepoHit & { name: string; forks: number; readmeExcerpt: string | null; repoUrl: string })
  | null
> {
  const parsed = parseGitHubRepo(url);
  if (!parsed) return null;

  const headers = githubHeaders();
  const repoRes = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
    headers,
  });
  if (!repoRes.ok) return null;
  const repo = (await repoRes.json()) as {
    html_url: string;
    full_name: string;
    description: string | null;
    stargazers_count: number;
    forks_count: number;
  };

  let readmeExcerpt: string | null = null;
  const readmeRes = await fetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/readme`,
    { headers: { ...headers, Accept: "application/vnd.github.raw" } },
  );
  if (readmeRes.ok) {
    const text = await readmeRes.text();
    readmeExcerpt = text.slice(0, 4000);
  }

  return {
    fullName: repo.full_name,
    url: repo.html_url,
    repoUrl: repo.html_url,
    name: repo.full_name,
    description: repo.description,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    readmeExcerpt,
  };
}

export function findGitHubUrl(urls: string[]): string | null {
  for (const url of urls) {
    const parsed = parseGitHubRepo(url);
    if (parsed) return `https://github.com/${parsed.owner}/${parsed.repo}`;
  }
  return null;
}

export function formatRepoHits(hits: GitHubRepoHit[]): string {
  if (!hits.length) return "";
  return hits
    .map(
      (hit, index) =>
        `${index + 1}. ${hit.fullName} — ${hit.stars} stars — ${hit.url}${hit.description ? ` — ${hit.description}` : ""}`,
    )
    .join("\n");
}
