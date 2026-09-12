import { AppNav } from "@/components/app-nav";
import { ItemList } from "@/components/item-list";
import { getItemsByStatus } from "@/lib/data/items";

export default async function ArchivePage() {
  const items = await getItemsByStatus(["stashed", "expired"]);

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900">Archive</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Stashed items and auto-expired active items live here — still searchable.
          </p>
        </div>
        <ItemList
          items={items}
          showCategoryFilters
          emptyTitle="Archive is empty"
          emptyBody="Stash items you have visited but do not need in your active list."
        />
      </main>
    </>
  );
}
