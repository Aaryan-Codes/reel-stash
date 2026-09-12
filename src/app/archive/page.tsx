import { AppNav } from "@/components/app-nav";
import { ItemList } from "@/components/item-list";
import { PageHeader } from "@/components/page-header";
import { getItemsByStatus } from "@/lib/data/items";

export default async function ArchivePage() {
  const items = await getItemsByStatus(["stashed", "expired"]);

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <PageHeader
          title="Archive"
          description="Stashed items and auto-expired active items live here — still searchable."
        />
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
