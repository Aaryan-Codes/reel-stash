import { createAdminClient } from "@/lib/supabase/admin";

const CAPTURE_LIMIT = 30;
const CAPTURE_WINDOW_MS = 60_000;

export async function isCaptureRateLimited(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - CAPTURE_WINDOW_MS).toISOString();

  const { count, error } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) return false;
  return (count ?? 0) >= CAPTURE_LIMIT;
}
