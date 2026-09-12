import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAuthBypassed } from "@/lib/auth/bypass";

export { isAuthBypassed };

const DEMO_EMAIL = "demo@reel-stash.app";

let demoUserId: string | null = null;

async function ensureDemoUser(): Promise<string> {
  if (demoUserId) return demoUserId;

  const admin = createAdminClient();
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = list.users.find((user) => user.email === DEMO_EMAIL);

  if (existing) {
    demoUserId = existing.id;
    await admin.from("profiles").upsert({ id: existing.id }, { onConflict: "id" });
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    email_confirm: true,
    password: `${crypto.randomUUID()}Aa1!`,
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Could not create the demo user.");
  }

  demoUserId = data.user.id;
  await admin.from("profiles").upsert({ id: data.user.id }, { onConflict: "id" });
  return data.user.id;
}

export async function getAppUser(): Promise<{ id: string } | null> {
  if (isAuthBypassed()) {
    return { id: await ensureDemoUser() };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getDb() {
  if (isAuthBypassed()) return createAdminClient();
  return createClient();
}
