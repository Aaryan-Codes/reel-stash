import { AppNav } from "@/components/app-nav";
import { InboxRefresh } from "@/components/inbox-refresh";
import { ItemList } from "@/components/item-list";
import { PageHeader } from "@/components/page-header";
import { SaveLinkForm } from "@/components/save-link-form";
import { getItemsByStatus } from "@/lib/data/items";

export default async function InboxPage() {
  const items = await getItemsByStatus(["processing", "inbox"]);
  const processing = items.some((item) => item.status === "processing");

  return (
    <>
      <AppNav />
      <InboxRefresh enabled={processing} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <PageHeader
          title="Inbox"
          description="New saves land here while we transcribe the reel and turn spoken content into a brief."
        />
        <SaveLinkForm />
        <ItemList
          items={items}
          emptyTitle="Nothing in your inbox yet"
          emptyBody="Paste a link above, or share a reel from Instagram using the iOS Shortcut in Settings."
        />
      </main>
    </>
  );
}
