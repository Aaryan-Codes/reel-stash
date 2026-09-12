export interface WebpageInfo {
  url: string;
  title: string | null;
  description: string | null;
  excerpt: string | null;
}

export async function fetchWebpage(url: string): Promise<WebpageInfo> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ReelStash/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    const html = await res.text();
    const title = matchMeta(html, "og:title") ?? matchTitle(html);
    const description = matchMeta(html, "og:description") ?? matchMeta(html, "description");
    const text = stripHtml(html).slice(0, 3000);

    return {
      url: res.url || url,
      title,
      description,
      excerpt: text || description,
    };
  } catch {
    return { url, title: null, description: null, excerpt: null };
  }
}

function matchMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`property=["']${property}["']\\s+content=["']([^"']+)["']`, "i"),
    new RegExp(`name=["']${property}["']\\s+content=["']([^"']+)["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function matchTitle(html: string): string | null {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findFirstWebUrl(urls: string[], skip: string[] = []): string | null {
  return (
    urls.find((u) => {
      try {
        const host = new URL(u).hostname;
        if (host.includes("instagram.com")) return false;
        if (host.includes("github.com")) return false;
        if (skip.includes(u)) return false;
        return true;
      } catch {
        return false;
      }
    }) ?? null
  );
}
