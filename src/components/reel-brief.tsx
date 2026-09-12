"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function TakeawayBadges({ badges }: { badges: string[] }) {
  if (!badges.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge, index) => (
        <span
          key={`${badge}-${index}`}
          className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium"
        >
          {badge}
        </span>
      ))}
    </div>
  );
}

export function SetupCommands({ commands }: { commands: string[] }) {
  const [copied, setCopied] = useState<number | null>(null);
  if (!commands.length) return null;

  async function copy(command: string, index: number) {
    await navigator.clipboard.writeText(command);
    setCopied(index);
    setTimeout(() => setCopied(null), 1200);
  }

  return (
    <section className="paper-card rounded-2xl p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Setup</h2>
      <p className="mt-1 text-sm text-muted-foreground">Copy these in order.</p>
      <ol className="mt-4 space-y-2">
        {commands.map((command, index) => (
          <li
            key={`${index}-${command}`}
            className="flex items-start gap-2 rounded-xl border border-border bg-muted/60 px-3 py-2.5"
          >
            <code className="flex-1 overflow-x-auto whitespace-pre font-mono text-[13px] leading-6">
              {command}
            </code>
            <button
              type="button"
              onClick={() => copy(command, index)}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-card hover:text-foreground"
            >
              {copied === index ? <Check size={14} /> : <Copy size={14} />}
              {copied === index ? "Copied" : "Copy"}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function RelatedRepos({
  repos,
}: {
  repos: Array<{
    fullName: string;
    url: string;
    description: string | null;
    stars: number;
  }>;
}) {
  if (!repos.length) return null;

  return (
    <section className="paper-card rounded-2xl p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Matching GitHub repos
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Top matches for the project in this reel.</p>
      <ul className="mt-4 divide-y divide-border">
        {repos.map((repo, index) => (
          <li key={repo.url}>
            <a
              href={repo.url}
              target="_blank"
              rel="noreferrer"
              className="-mx-2 flex items-start justify-between gap-4 rounded-xl px-2 py-3 hover:bg-muted"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-[11px] font-semibold">
                    {index + 1}
                  </span>
                  <span className="truncate font-medium">{repo.fullName}</span>
                </span>
                {repo.description ? (
                  <span className="mt-1 block pl-8 text-sm leading-6 text-muted-foreground">
                    {repo.description}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                {repo.stars.toLocaleString()} stars
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RecipePanel({
  ingredients,
  steps,
}: {
  ingredients?: string[];
  steps?: string[];
}) {
  const hasRecipe = Boolean(ingredients?.length || steps?.length);

  return (
    <section className="paper-card overflow-hidden rounded-2xl">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-display text-lg font-semibold">From the reel</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasRecipe
            ? "Ingredients and method that were actually spoken."
            : "The reel named the dish but did not speak ingredients or cooking steps."}
        </p>
      </div>
      {hasRecipe ? (
        <div className="grid gap-6 p-5 md:grid-cols-2">
          {ingredients?.length ? (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Ingredients
              </h3>
              <ul className="mt-3 space-y-2">
                {ingredients.map((item) => (
                  <li key={item} className="flex gap-3 text-sm">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {steps?.length ? (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Instructions
              </h3>
              <ol className="mt-3 space-y-3">
                {steps.map((item, index) => (
                  <li key={item} className="flex gap-3 text-sm leading-6">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold">
                      {index + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="p-5 text-sm leading-6 text-muted-foreground">
          We only keep what the voiceover said. If the cook listed amounts or steps on screen but
          not out loud, they will not show up here.
        </p>
      )}
    </section>
  );
}
