import { NextResponse } from "next/server";
import { processItem, processPendingItems } from "@/lib/processing/process-item";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");

  if (itemId) {
    await processItem(itemId);
    return NextResponse.json({ ok: true, processed: 1 });
  }

  const count = await processPendingItems(10);
  return NextResponse.json({ ok: true, processed: count });
}
