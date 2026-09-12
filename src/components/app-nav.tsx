"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/inbox", label: "Inbox" },
  { href: "/active", label: "Active" },
  { href: "/archive", label: "Archive" },
  { href: "/settings", label: "Settings" },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div>
          <Link href="/inbox" className="text-lg font-semibold tracking-tight text-zinc-900">
            Reel Stash
          </Link>
          <p className="text-xs text-zinc-500">Save links. Get structure.</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          Sign out
        </button>
      </div>
      <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-3">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
