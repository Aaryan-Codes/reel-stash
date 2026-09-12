import { notFound } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { ItemDetail } from "@/components/item-detail";
import { getItem, markItemVisited } from "@/lib/data/items";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await markItemVisited(id);
  const item = await getItem(id);

  if (!item) notFound();

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <ItemDetail item={item} />
      </main>
    </>
  );
}
