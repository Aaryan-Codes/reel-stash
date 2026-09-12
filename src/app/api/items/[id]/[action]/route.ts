import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["keep", "stash", "reopen", "retry"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data: item } = await supabase.from("items").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const { data: profile } = await supabase
    .from("profiles")
    .select("expiry_days")
    .eq("id", user.id)
    .single();

  const expiryDays = profile?.expiry_days ?? 60;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  let update: Record<string, unknown> = { updated_at: now };

  if (action === "retry") {
    const { error: retryError } = await supabase
      .from("items")
      .update({
        status: "processing",
        processing_error: null,
        retry_count: 0,
        next_retry_at: null,
        updated_at: now,
      })
      .eq("id", id);

    if (retryError) {
      return NextResponse.json({ error: retryError.message }, { status: 500 });
    }

    const { processItem } = await import("@/lib/processing/process-item");
    void processItem(id).catch((err) => console.error("Retry processing failed:", err));
    return NextResponse.json({ ok: true });
  }

  if (action === "keep") {
    update = {
      ...update,
      status: "active",
      visited_at: item.visited_at ?? now,
      expires_at: expiresAt.toISOString(),
      stashed_at: null,
    };
  }

  if (action === "stash") {
    update = {
      ...update,
      status: "stashed",
      visited_at: item.visited_at ?? now,
      stashed_at: now,
      expires_at: null,
    };
  }

  if (action === "reopen") {
    update = {
      ...update,
      status: "active",
      visited_at: now,
      expires_at: expiresAt.toISOString(),
      stashed_at: null,
    };
  }

  const { data: updated, error } = await supabase
    .from("items")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: updated });
}
