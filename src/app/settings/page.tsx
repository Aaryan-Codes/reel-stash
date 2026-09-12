import { AppNav } from "@/components/app-nav";
import { PageHeader } from "@/components/page-header";
import { SettingsPanel } from "@/components/settings-panel";
import { getProfile } from "@/lib/data/items";

export default async function SettingsPage() {
  const profile = await getProfile();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <PageHeader
          title="Settings"
          description="Configure capture from Instagram and manage your API key."
        />
        <SettingsPanel
          initialKey={profile?.capture_api_key ?? null}
          initialExpiryDays={profile?.expiry_days ?? 60}
          appUrl={appUrl}
        />
      </main>
    </>
  );
}
