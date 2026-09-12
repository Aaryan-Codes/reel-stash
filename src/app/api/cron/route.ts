import { NextResponse } from "next/server";
import { expireStaleActiveItems, processPendingItems } from "@/lib/processing/process-item";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!process.env.CRON_SECRET || bearer !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const processed = await processPendingItems(20);
  const expired = await expireStaleActiveItems();

  return NextResponse.json({ ok: true, processed, expired });
}
