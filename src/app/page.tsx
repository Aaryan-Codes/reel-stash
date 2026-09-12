import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/inbox");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16">
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-600">
          Personal link organizer
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900">
          Reel Stash
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-zinc-600">
          Share Instagram reels and links from your iPhone, get transcripts and structured
          summaries, and keep everything organized across devices.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white hover:bg-violet-500"
          >
            Sign in
          </Link>
        </div>
        <p className="mt-6 text-sm text-zinc-500">
          See <code>docs/API_KEYS.md</code> in the repo for free service signup links.
        </p>
      </div>
    </main>
  );
}
