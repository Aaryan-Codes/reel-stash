import { NextResponse } from "next/server";
import { getAppUser, getDb } from "@/lib/auth/session";

export async function GET() {
  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await getDb();
  const { data, error } = await supabase
    .from("items")
    .select("id, status, processing_stage, processing_progress, title, processing_error")
    .eq("user_id", user.id)
    .eq("status", "processing")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
