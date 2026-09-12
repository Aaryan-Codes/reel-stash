import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-10">
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">Sign in to Reel Stash</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Use a magic link to access your inbox on any device.
          </p>
          {params.error ? (
            <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              Sign-in failed. Please try again.
            </p>
          ) : null}
          <div className="mt-6">
            <LoginForm />
          </div>
          <p className="mt-6 text-sm text-zinc-500">
            Need API keys first? See <code>docs/API_KEYS.md</code> in the project.
          </p>
        </div>
      </main>
  );
}
