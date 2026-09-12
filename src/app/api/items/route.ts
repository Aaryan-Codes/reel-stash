import { NextResponse } from "next/server";
import { z } from "zod";
import { processItem } from "@/lib/processing/process-item";
import { getAppUser, getDb } from "@/lib/auth/session";
import { detectSource, normalizeUrl } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  url: z.string().url(),
  note: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body. Expected { url: string }" }, { status: 400 });
  }

  const url = normalizeUrl(body.url);
  const source = detectSource(url);
  const supabase = await getDb();

  const { data: item, error: insertError } = await supabase
    .from("items")
    .insert({
      user_id: user.id,
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
