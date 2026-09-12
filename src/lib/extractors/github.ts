import { parseGitHubRepo } from "@/lib/utils";

export interface GitHubRepoInfo {
  repoUrl: string;
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  readmeExcerpt: string | null;
}

export async function fetchGitHubRepo(url: string): Promise<GitHubRepoInfo | null> {
  const parsed = parseGitHubRepo(url);
  if (!parsed) return null;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ReelStash/1.0",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

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
    repoUrl: repo.html_url,
    name: repo.full_name,
    description: repo.description,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    readmeExcerpt,
  };
}

export function findGitHubUrl(urls: string[]): string | null {
  return urls.find((u) => parseGitHubRepo(u)) ?? null;
}
