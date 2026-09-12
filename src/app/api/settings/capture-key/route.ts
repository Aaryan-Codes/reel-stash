import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { regenerate?: boolean };
  let captureApiKey: string | undefined;

  if (body.regenerate) {
    captureApiKey = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase
      .from("profiles")
      .update({ capture_api_key: captureApiKey })
      .eq("id", user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { data: profile } = await supabase
      .from("profiles")
      .select("capture_api_key")
      .eq("id", user.id)
      .single();
    captureApiKey = profile?.capture_api_key;
  }

  return NextResponse.json({ captureApiKey });
}
