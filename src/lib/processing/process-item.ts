import { createAdminClient } from "@/lib/supabase/admin";
import { deleteTempAudio, persistThumbnail, uploadTempAudio } from "@/lib/storage";
import {
  extractInstagramAudio,
  extractLinksFromCaption,
  fetchInstagramMetadata,
} from "@/lib/extractors/instagram";
import { transcribeAudio } from "@/lib/extractors/groq-transcribe";
import { fetchGitHubRepo, findGitHubUrl } from "@/lib/extractors/github";
import { extractStructuredContent } from "@/lib/extractors/nemotron";
import { fetchWebpage, findFirstWebUrl } from "@/lib/extractors/webpage";
import { detectSource, extractUrls, normalizeUrl, sleep } from "@/lib/utils";

const MAX_RETRIES = 5;

export async function processItem(itemId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: item, error } = await supabase.from("items").select("*").eq("id", itemId).single();

  if (error || !item) {
    throw new Error(error?.message ?? "Item not found");
  }

  if (item.next_retry_at && new Date(item.next_retry_at) > new Date()) {
    return;
  }

  try {
    const url = normalizeUrl(item.url);
    const source = detectSource(url);

    let caption: string | null = item.caption;
    let thumbnailUrl: string | null = item.thumbnail_url;
    let transcript: string | null = item.transcript;

    if (source === "instagram") {
      const meta = await fetchInstagramMetadata(url);
      caption = meta.caption ?? caption;
      thumbnailUrl = meta.thumbnailUrl ?? thumbnailUrl;
      if (thumbnailUrl) {
        thumbnailUrl =
          (await persistThumbnail(item.user_id, itemId, thumbnailUrl)) ?? thumbnailUrl;
      }
    }

    if (!transcript && source === "instagram" && process.env.GROQ_API_KEY) {
      const audio = await extractInstagramAudio(url);
      if (audio) {
        const tempPath = await uploadTempAudio(item.user_id, itemId, audio);
        try {
          transcript = await transcribeAudio(audio);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Transcription failed";
          if (message.includes("429") || message.toLowerCase().includes("rate")) {
            await scheduleRetry(supabase, itemId, item.retry_count ?? 0, message);
            return;
          }
        } finally {
          if (tempPath) await deleteTempAudio(tempPath);
        }
      }
    }

    const linkedUrls = [
      ...extractLinksFromCaption(caption),
      ...extractUrls(transcript ?? ""),
    ];
    const githubUrl = findGitHubUrl(linkedUrls) ?? (source === "github" ? url : null);
    const webUrl = findFirstWebUrl(linkedUrls, githubUrl ? [githubUrl] : []);

    let githubInfo: string | null = null;
    if (githubUrl) {
      const repo = await fetchGitHubRepo(githubUrl);
      if (repo) {
        githubInfo = [
          `Repo: ${repo.name}`,
          repo.description ? `Description: ${repo.description}` : "",
          `Stars: ${repo.stars}, Forks: ${repo.forks}`,
          repo.readmeExcerpt ? `README excerpt:\n${repo.readmeExcerpt}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      }
    }

    let webpageInfo: string | null = null;
    const pageUrl = webUrl ?? (source === "web" ? url : null);
    if (pageUrl) {
      const page = await fetchWebpage(pageUrl);
      webpageInfo = [page.title, page.description, page.excerpt].filter(Boolean).join("\n");
    }

    const extraction = await extractStructuredContent({
      url,
      source,
      caption,
      transcript,
      githubInfo,
      webpageInfo,
    });

    const { error: updateError } = await supabase
      .from("items")
      .update({
        url,
        source,
        status: "inbox",
        category: extraction.category,
        title: extraction.title,
        summary: extraction.summary,
        caption,
        transcript,
        structured_data: extraction.structuredData,
        confidence: extraction.confidence,
        thumbnail_url: thumbnailUrl,
        processing_error: null,
        retry_count: 0,
        next_retry_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId);

    if (updateError) throw new Error(updateError.message);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    if (message.includes("429") || message.toLowerCase().includes("rate")) {
      await scheduleRetry(supabase, itemId, item.retry_count ?? 0, message);
      return;
    }

    await supabase
      .from("items")
      .update({
        status: "inbox",
        processing_error: message,
        title: item.title ?? "Saved link",
        summary: item.summary ?? "Processing completed with partial data.",
        confidence: 0.2,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId);
  }
}

async function scheduleRetry(
  supabase: ReturnType<typeof createAdminClient>,
  itemId: string,
  retryCount: number,
  message: string,
) {
  const nextRetry = retryCount + 1;
  if (nextRetry > MAX_RETRIES) {
    await supabase
      .from("items")
      .update({
        status: "inbox",
        processing_error: message,
        confidence: 0.2,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId);
    return;
  }

  const delayMinutes = Math.min(60, 2 ** nextRetry);
  const nextRetryAt = new Date(Date.now() + delayMinutes * 60_000).toISOString();

  await supabase
    .from("items")
    .update({
      retry_count: nextRetry,
      next_retry_at: nextRetryAt,
      processing_error: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  await sleep(50);
}

export async function processPendingItems(limit = 10): Promise<number> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data: items } = await supabase
    .from("items")
    .select("id")
    .eq("status", "processing")
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!items?.length) return 0;

  for (const item of items) {
    await processItem(item.id);
  }

  return items.length;
}

export async function expireStaleActiveItems(): Promise<number> {
  const supabase = createAdminClient();
  const { data: profiles } = await supabase.from("profiles").select("id, expiry_days");

  if (!profiles?.length) return 0;

  let expired = 0;
  for (const profile of profiles) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - profile.expiry_days);

    const { data: stale } = await supabase
      .from("items")
      .select("id")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .lt("visited_at", cutoff.toISOString());

    if (!stale?.length) continue;

    const ids = stale.map((row) => row.id);
    const { error } = await supabase
      .from("items")
      .update({
        status: "expired",
        stashed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in("id", ids);

    if (!error) expired += ids.length;
  }

  return expired;
}
