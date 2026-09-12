import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  expiryDays: z.number().int().min(7).max(365),
});

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid expiry days (7–365)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ expiry_days: body.expiryDays })
    .eq("id", user.id)
    .select("expiry_days")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expiryDays: data.expiry_days });
}
