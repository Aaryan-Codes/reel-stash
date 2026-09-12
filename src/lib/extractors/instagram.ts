import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { extractUrls } from "@/lib/utils";

const execFileAsync = promisify(execFile);

export interface InstagramMetadata {
  caption: string | null;
  thumbnailUrl: string | null;
  title: string | null;
}

export async function fetchInstagramMetadata(url: string): Promise<InstagramMetadata> {
  const og = await fetchOpenGraph(url);
  return {
    caption: og.description,
    thumbnailUrl: og.image,
    title: og.title,
  };
}

async function fetchOpenGraph(url: string): Promise<{
  title: string | null;
  description: string | null;
  image: string | null;
}> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ReelStash/1.0; +https://reel-stash.app)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    const html = await res.text();
    return {
      title: matchMeta(html, "og:title") ?? matchMeta(html, "title"),
      description: matchMeta(html, "og:description") ?? matchMeta(html, "description"),
      image: matchMeta(html, "og:image"),
    };
  } catch {
    return { title: null, description: null, image: null };
  }
}

function matchMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`property=["']${property}["']\\s+content=["']([^"']+)["']`, "i"),
    new RegExp(`content=["']([^"']+)["']\\s+property=["']${property}["']`, "i"),
    new RegExp(`name=["']${property}["']\\s+content=["']([^"']+)["']`, "i"),
    new RegExp(`<title>([^<]+)</title>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1].trim());
  }
  return null;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export async function extractInstagramAudio(url: string): Promise<Buffer | null> {
  const ytdlp = await findYtDlp();
  if (!ytdlp) return null;

  const dir = await mkdtemp(join(tmpdir(), "reel-stash-"));
  const output = join(dir, "audio.m4a");

  try {
    await execFileAsync(
      ytdlp,
      [
        url,
        "-f",
        "bestaudio[ext=m4a]/bestaudio/best",
        "--no-playlist",
        "-o",
        output,
        "--quiet",
        "--no-warnings",
      ],
      { timeout: 120_000 },
    );

    const candidates = [output, output.replace(".m4a", ".webm"), output.replace(".m4a", ".mp4")];
    for (const file of candidates) {
      try {
        return await readFile(/* turbopackIgnore: true */ file);
      } catch {
        // try next extension
      }
    }

    const { stdout } = await execFileAsync(ytdlp, ["--print", "filename", "-o", output, url], {
      timeout: 120_000,
    });
    const resolved = stdout.trim();
    if (resolved) return await readFile(resolved);
    return null;
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function findYtDlp(): Promise<string | null> {
  const candidates = ["yt-dlp", "yt-dlp3", "/opt/homebrew/bin/yt-dlp", "/usr/local/bin/yt-dlp"];
  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ["--version"], { timeout: 5_000 });
      return bin;
    } catch {
      // continue
    }
  }
  return null;
}

export function extractLinksFromCaption(caption: string | null): string[] {
  if (!caption) return [];
  return extractUrls(caption);
}
