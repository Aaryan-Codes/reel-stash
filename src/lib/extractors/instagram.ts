import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { extractUrls } from "@/lib/utils";

const execFileAsync = promisify(execFile);

const YTDLP_ENV = {
  ...process.env,
  PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ""}`,
};

const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface InstagramMetadata {
  caption: string | null;
  thumbnailUrl: string | null;
  title: string | null;
}

export interface AudioExtractionResult {
  audio: Buffer | null;
  error: string | null;
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
        "User-Agent": DESKTOP_UA,
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

export async function extractInstagramAudio(url: string): Promise<AudioExtractionResult> {
  const ytdlp = await findYtDlp();
  if (!ytdlp) {
    return {
      audio: null,
      error: "yt-dlp is not on PATH. Install with `brew install yt-dlp` and restart the server.",
    };
  }

  const dir = await mkdtemp(join(tmpdir(), "reel-stash-"));
  const output = join(dir, "audio.%(ext)s");
  const browsers = cookieBrowsers();
  let lastError = "Instagram blocked the download.";

  try {
    for (const browser of browsers) {
      const args = [
        canonicalizeInstagramUrl(url),
        "-f",
        "bestaudio/best",
        "--no-playlist",
        "--no-warnings",
        "--user-agent",
        DESKTOP_UA,
        "-o",
        output,
      ];
      if (browser) {
        args.push("--cookies-from-browser", browser);
      }

      try {
        await execFileAsync(ytdlp, args, {
          timeout: 120_000,
          env: YTDLP_ENV,
          maxBuffer: 20 * 1024 * 1024,
        });
        const audio = await readDownloadedAudio(dir);
        if (audio) return { audio, error: null };
        lastError = "yt-dlp finished but no audio file was written.";
      } catch (err) {
        lastError = formatYtDlpError(err);
        if (/cookies|login|empty media|not available|rate-limit|please wait/i.test(lastError)) {
          continue;
        }
      }
    }

    return {
      audio: null,
      error: `${lastError} Log into Instagram in ${browsers.find(Boolean) ?? "Chrome"} and retry. Set YTDLP_COOKIES_FROM_BROWSER=chrome (or safari) in .env.`,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function cookieBrowsers(): Array<string | null> {
  const configured = process.env.YTDLP_COOKIES_FROM_BROWSER?.trim();
  if (configured === "none") return [null];
  if (configured) return [configured];
  return ["chrome"];
}

function canonicalizeInstagramUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    parsed.pathname = parsed.pathname.replace(/\/+$/, "/");
    return parsed.toString();
  } catch {
    return url;
  }
}

async function readDownloadedAudio(dir: string): Promise<Buffer | null> {
  const files = await readdir(dir);
  const match = files.find((name) => /\.(m4a|mp3|mp4|webm|ogg|wav|aac)$/i.test(name));
  if (!match) return null;
  return readFile(/* turbopackIgnore: true */ join(dir, match));
}

function formatYtDlpError(err: unknown): string {
  if (!err || typeof err !== "object") return "yt-dlp failed.";
  const execErr = err as { stderr?: string; stdout?: string; message?: string };
  const text = `${execErr.stderr ?? ""} ${execErr.stdout ?? ""} ${execErr.message ?? ""}`.trim();
  const line =
    text
      .split("\n")
      .map((entry) => entry.trim())
      .reverse()
      .find((entry) => entry.startsWith("ERROR:")) ?? text;
  return line.replace(/^ERROR:\s*/i, "").slice(0, 400) || "yt-dlp failed.";
}

async function findYtDlp(): Promise<string | null> {
  const candidates = ["/opt/homebrew/bin/yt-dlp", "/usr/local/bin/yt-dlp", "yt-dlp"];
  for (const bin of candidates) {
    try {
      await execFileAsync(bin, ["--version"], { timeout: 5_000, env: YTDLP_ENV });
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
