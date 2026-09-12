import { AppNav } from "@/components/app-nav";
import { InboxRefresh } from "@/components/inbox-refresh";
import { ItemList } from "@/components/item-list";
import { SaveLinkForm } from "@/components/save-link-form";
import { getItemsByStatus } from "@/lib/data/items";

export default async function InboxPage() {
  const items = await getItemsByStatus(["processing", "inbox"]);
  const processing = items.some((item) => item.status === "processing");

  return (
    <>
      <AppNav />
      <InboxRefresh enabled={processing} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900">Inbox</h1>
          <p className="mt-1 text-sm text-zinc-600">
            New saves land here while Groq transcribes and Nemotron summarizes.
          </p>
        </div>
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
