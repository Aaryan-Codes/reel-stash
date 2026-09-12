import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isZohoMailConfigured, sendLoginCodeEmail } from "@/lib/mail/zoho";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
});

function isSupabaseEmailRateLimit(error: { message?: string; status?: number; code?: string }) {
  const message = error.message ?? "";
  return (
    error.status === 429 ||
    error.code === "over_email_send_rate_limit" ||
    /rate limit|too many/i.test(message)
  );
}

async function sendCodeViaZoho(email: string) {
  if (!isZohoMailConfigured()) {
    throw new Error("Supabase email is rate-limited, and Zoho mail is not configured yet.");
  }

  const admin = createAdminClient();
  let generated = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (generated.error) {
    generated = await admin.auth.admin.generateLink({
      type: "signup",
      email,
    });
  }

  if (generated.error || !generated.data.properties.email_otp) {
    throw new Error(generated.error?.message ?? "Could not create a sign-in code.");
  }

  await sendLoginCodeEmail(email, generated.data.properties.email_otp);
}

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });

  if (!error) {
    return NextResponse.json({ ok: true, via: "supabase" });
  }

  if (!isSupabaseEmailRateLimit(error)) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    await sendCodeViaZoho(email);
    return NextResponse.json({ ok: true, via: "zoho" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not send email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
