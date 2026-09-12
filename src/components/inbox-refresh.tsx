"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function InboxRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => router.refresh(), 4000);
    return () => window.clearInterval(id);
  }, [enabled, router]);

  return null;
}
