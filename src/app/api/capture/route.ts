import { NextResponse } from "next/server";
import { z } from "zod";
import { processItem } from "@/lib/processing/process-item";
import { isCaptureRateLimited } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectSource, normalizeUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  url: z.string().url(),
  note: z.string().optional(),
});

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body. Expected { url: string }" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("capture_api_key", token)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Invalid capture API key" }, { status: 401 });
  }

  if (await isCaptureRateLimited(profile.id)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in a minute." },
      { status: 429 },
    );
  }

  const url = normalizeUrl(body.url);
  const source = detectSource(url);

  const { data: item, error: insertError } = await supabase
    .from("items")
    .insert({
      user_id: profile.id,
      url,
      source,
      status: "processing",
      caption: body.note ?? null,
      processing_stage: "queued",
      processing_progress: 8,
    })
    .select("id, status, created_at")
    .single();

  if (insertError || !item) {
    return NextResponse.json({ error: insertError?.message ?? "Failed to save item" }, { status: 500 });
  }

  void processItem(item.id).catch((err) => {
    console.error("Background processing failed:", err);
  });

  return NextResponse.json({
    ok: true,
    message: "Saved — processing in background",
    item,
  });
}
