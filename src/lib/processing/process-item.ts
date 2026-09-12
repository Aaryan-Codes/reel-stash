import { createAdminClient } from "@/lib/supabase/admin";
import { persistThumbnail } from "@/lib/storage";
import { extractLinksFromCaption, fetchInstagramMetadata } from "@/lib/extractors/instagram";
import { getBestTranscript } from "@/lib/extractors/best-transcript";
import { fetchGitHubRepo, findGitHubUrl, searchGitHubRepos } from "@/lib/extractors/github";
import { extractStructuredContent, scoutReel } from "@/lib/extractors/nemotron";
import { fetchWebpage, findFirstWebUrl } from "@/lib/extractors/webpage";
import { PROCESSING_STAGES, type ProcessingStage } from "@/lib/processing/stages";
import { detectSource, extractUrls, findGitHubRepoInText, normalizeUrl, sleep } from "@/lib/utils";

const MAX_RETRIES = 5;

type AdminClient = ReturnType<typeof createAdminClient>;

async function setStage(
  supabase: AdminClient,
  itemId: string,
  stage: ProcessingStage,
  extra: Record<string, unknown> = {},
) {
  await supabase
    .from("items")
    .update({
      processing_stage: stage,
      processing_progress: PROCESSING_STAGES[stage].progress,
      updated_at: new Date().toISOString(),
      ...extra,
    })
    .eq("id", itemId);
}

export async function processItem(itemId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: item, error } = await supabase.from("items").select("*").eq("id", itemId).single();

  if (error || !item) {
    throw new Error(error?.message ?? "Item not found");
  }

  if (item.next_retry_at && new Date(item.next_retry_at) > new Date()) {
    return;
  }

  const warnings: string[] = [];

  try {
    await setStage(supabase, itemId, "queued", {
      status: "processing",
      processing_error: null,
    });

    const url = normalizeUrl(item.url);
    const source = detectSource(url);

    let caption: string | null = item.caption;
    let thumbnailUrl: string | null = item.thumbnail_url;
    let transcript: string | null = item.transcript;

    if (source === "instagram") {
      await setStage(supabase, itemId, "fetching_metadata");
      const meta = await fetchInstagramMetadata(url);
      caption = meta.caption ?? caption;
      thumbnailUrl = meta.thumbnailUrl ?? thumbnailUrl;
      if (thumbnailUrl) {
        thumbnailUrl =
          (await persistThumbnail(item.user_id, itemId, thumbnailUrl)) ?? thumbnailUrl;
      }
    }

    if (source === "instagram") {
      await setStage(supabase, itemId, "transcribing");
      const result = await getBestTranscript(url);
      if (result.transcript) {
        transcript = result.transcript;
      } else if (result.error?.includes("429")) {
        await scheduleRetry(supabase, itemId, item.retry_count ?? 0, result.error);
        return;
      } else {
        warnings.push(result.error ?? "Could not transcribe this reel.");
      }
    }

    await setStage(supabase, itemId, "fetching_links");

    const linkedUrls = [
      ...extractLinksFromCaption(caption),
      ...extractUrls(transcript ?? ""),
    ];
    const githubUrl =
      findGitHubUrl(linkedUrls) ??
      findGitHubRepoInText(`${caption ?? ""}\n${transcript ?? ""}`) ??
      (source === "github" ? url : null);
    const webUrl = findFirstWebUrl(linkedUrls, githubUrl ? [githubUrl] : []);

    const scout = await scoutReel({ caption, transcript });
    let relatedRepos =
      scout.category === "recipe"
        ? []
        : await searchGitHubRepos({
            productName: scout.name,
            queries: scout.githubQueries,
            context: `${caption ?? ""}\n${transcript ?? ""}`,
          });

    if (githubUrl && !relatedRepos.some((repo) => repo.url === githubUrl)) {
      const repo = await fetchGitHubRepo(githubUrl);
      if (repo) {
        relatedRepos = [
          {
            fullName: repo.fullName,
            url: repo.url,
            description: repo.description,
            stars: repo.stars,
          },
          ...relatedRepos,
        ].slice(0, 5);
      }
    }

    const primaryGithub = githubUrl ?? relatedRepos[0]?.url ?? null;
    let githubInfo: string | null = null;
    let githubName: string | null = scout.category === "github_repo" ? scout.name : null;
    if (primaryGithub) {
      const repo = await fetchGitHubRepo(primaryGithub);
      if (repo) {
        githubName = repo.name;
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

    await setStage(supabase, itemId, "summarizing");

    const extraction = await extractStructuredContent({
      url,
      source,
      caption,
      transcript,
      githubInfo,
      githubUrl: primaryGithub,
      githubName: githubName ?? scout.name,
      webpageInfo,
      relatedRepos,
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
        confidence: warnings.length ? Math.min(extraction.confidence, 0.45) : extraction.confidence,
        thumbnail_url: thumbnailUrl,
        processing_error: warnings.length ? warnings.join(" ") : null,
        processing_stage: "complete",
        processing_progress: 100,
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
        processing_stage: "complete",
        processing_progress: 100,
        title: item.title ?? "Saved link",
        summary: item.summary ?? "Processing completed with partial data.",
        confidence: 0.2,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId);
  }
}

async function scheduleRetry(
  supabase: AdminClient,
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
        processing_stage: "complete",
        processing_progress: 100,
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
      processing_stage: "waiting_retry",
      processing_progress: PROCESSING_STAGES.waiting_retry.progress,
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
