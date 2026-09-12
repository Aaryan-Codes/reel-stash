import { AppNav } from "@/components/app-nav";
import { ItemList } from "@/components/item-list";
import { PageHeader } from "@/components/page-header";
import { getItemsByStatus } from "@/lib/data/items";

export default async function ActivePage() {
  const items = await getItemsByStatus(["active"]);

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <PageHeader
          title="Active"
          description="Items you kept. Remove sends them to Archive — they are not deleted."
        />
        <ItemList
          items={items}
          allowRemove
          emptyTitle="No active items"
          emptyBody="Open something from Inbox and choose Keep to track it here."
        />
      </main>
    </>
  );
}
