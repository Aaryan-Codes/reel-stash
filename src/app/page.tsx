import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/inbox");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16">
      <div className="paper-card rounded-2xl p-8 sm:p-10">
        <p className="text-sm text-muted-foreground">Personal reel notebook</p>
        <h1 className="font-display mt-2 text-5xl font-semibold tracking-tight">Reel Stash</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
          Share Instagram reels from your iPhone, get structured notes, GitHub matches, and
          recipes from what was actually said.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
