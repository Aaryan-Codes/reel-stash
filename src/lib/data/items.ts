import { getAppUser, getDb } from "@/lib/auth/session";
import type { ItemRow } from "@/lib/types";

export async function getItemsByStatus(statuses: string[]): Promise<ItemRow[]> {
  const user = await getAppUser();
  if (!user) return [];

  const supabase = await getDb();
  const { data } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", user.id)
    .in("status", statuses)
    .order("created_at", { ascending: false });

  return (data ?? []) as ItemRow[];
}

export async function getItem(id: string): Promise<ItemRow | null> {
  const user = await getAppUser();
  if (!user) return null;

  const supabase = await getDb();
  const { data } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  return (data as ItemRow | null) ?? null;
}

export async function markItemVisited(id: string) {
  const user = await getAppUser();
  if (!user) return;

  const supabase = await getDb();
  const { data: item } = await supabase
    .from("items")
    .select("visited_at, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!item || item.visited_at) return;

  await supabase
    .from("items")
    .update({ visited_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function getProfile() {
  const user = await getAppUser();
  if (!user) return null;

  const supabase = await getDb();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data;
}
