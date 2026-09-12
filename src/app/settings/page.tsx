import { AppNav } from "@/components/app-nav";
import { SettingsPanel } from "@/components/settings-panel";
import { getProfile } from "@/lib/data/items";

export default async function SettingsPage() {
  const profile = await getProfile();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Configure capture from Instagram and manage your API key.
          </p>
        </div>
        <SettingsPanel
          initialKey={profile?.capture_api_key ?? null}
          initialExpiryDays={profile?.expiry_days ?? 60}
          appUrl={appUrl}
        />
      </main>
    </>
  );
}
