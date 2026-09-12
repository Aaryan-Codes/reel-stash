import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="paper-card rounded-2xl p-8">
        <p className="text-sm text-muted-foreground">Magic link</p>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">Sign in to Reel Stash</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Use a magic link to access your inbox on any device.
        </p>
        {params.error ? (
          <p className="mt-4 rounded-lg border border-border bg-muted px-4 py-3 text-sm">
            Sign-in failed. Please try again.
          </p>
        ) : null}
        <div className="mt-6">
          <LoginForm />
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Need API keys first? See <code>docs/API_KEYS.md</code> in the project.
        </p>
      </div>
    </main>
  );
}
