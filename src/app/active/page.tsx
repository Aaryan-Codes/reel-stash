import { AppNav } from "@/components/app-nav";
import { ItemList } from "@/components/item-list";
import { getItemsByStatus } from "@/lib/data/items";

export default async function ActivePage() {
  const items = await getItemsByStatus(["active"]);

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900">Active</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Items you kept. Unvisited ones auto-move to archive after 60 days.
          </p>
        </div>
        <ItemList
          items={items}
          emptyTitle="No active items"
          emptyBody="Open something from Inbox and choose Keep to track it here."
        />
      </main>
    </>
  );
}
