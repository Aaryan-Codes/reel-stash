"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Archive, Inbox, Settings, Sparkles } from "lucide-react";
import { isAuthBypassed } from "@/lib/auth/bypass";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/active", label: "Active", icon: Sparkles },
  { href: "/archive", label: "Archive", icon: Archive },
  { href: "/settings", label: "Settings", icon: Settings },
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
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div>
          <Link href="/inbox" className="font-display text-xl font-semibold tracking-tight">
            Reel Stash
          </Link>
          <p className="text-xs text-muted-foreground">Save links. Get structure.</p>
        </div>
        {!isAuthBypassed() ? (
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Auth off</span>
        )}
      </div>
      <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-3">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <link.icon size={15} strokeWidth={1.75} />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
