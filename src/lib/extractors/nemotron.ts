import OpenAI from "openai";
import { z } from "zod";
import { emptyBrief, noteMarkdown, type ItemCategory, type ReelBrief } from "@/lib/extractors/brief";
import type { GitHubRepoHit } from "@/lib/extractors/github";
import { findGitHubRepoInText, parseGitHubRepo } from "@/lib/utils";

function getNemotronClient() {
  return new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY ?? "placeholder",
    baseURL: "https://integrate.api.nvidia.com/v1",
  });
}

const briefSchema = z.object({
  category: z.enum(["recipe", "github_repo", "website", "learning", "other"]),
  name: z.string().min(1),
  summary: z.string().min(1),
  badges: z.array(z.string()).default([]),
  githubUrl: z.string().nullable().optional(),
  setupCommands: z.array(z.string()).default([]),
  takeaways: z.array(z.string()).default([]),
  ingredients: z.array(z.string()).optional(),
  steps: z.array(z.string()).optional(),
  keyFeatures: z.array(z.string()).optional(),
  purpose: z.string().optional(),
  whyPopular: z.string().optional(),
  markdown: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export interface ExtractionInput {
  url: string;
  source: string;
  caption: string | null;
  transcript: string | null;
  githubInfo?: string | null;
  githubUrl?: string | null;
  githubName?: string | null;
  webpageInfo?: string | null;
  relatedRepos?: GitHubRepoHit[];
}

export interface ScoutResult {
  category: ItemCategory;
  name: string;
  githubQueries: string[];
  dishName: string | null;
}

export interface ExtractionResult {
  category: ItemCategory;
  title: string;
  summary: string;
  confidence: number;
  structuredData: ReelBrief;
}

const SYSTEM_PROMPT = `You turn an Instagram reel into a structured knowledge card a person can actually use.

Return ONLY valid JSON. Never paste or paraphrase the raw transcript. Ignore background music lyrics.

JSON shape:
{
  "category": "recipe" | "github_repo" | "website" | "learning" | "other",
  "name": "product or dish name, never Saved link",
  "summary": "2-3 original sentences in your own words",
  "badges": ["CLI", "Local scan", "Open source"],
  "githubUrl": "https://github.com/owner/repo or null",
  "setupCommands": ["git clone ...", "cd ...", "pip install ..."],
  "takeaways": ["short original bullets, not the transcript"],
  "ingredients": ["500g chicken thighs", "1 tsp black pepper"],
  "steps": ["Heat oil.", "Fry onions until gold.", "Add chicken and cook 8 minutes."],
  "keyFeatures": ["feature"],
  "purpose": "one sentence",
  "whyPopular": "one sentence",
  "confidence": 0.0
}

Hard rules:
- name MUST be the tool, repo, or dish. Never "Saved link".
- badges: 3-6 chips. takeaways: 3-5 original points. Do not copy the transcript.
- Software / CLI / GitHub Action / VS Code / open-source tool => category github_repo. Set githubUrl to the BEST match from the candidate repo list. setupCommands must be real clone/install/run steps.
- Food / cooking / a named dish => category recipe. ingredients and steps MUST be taken only from the caption and transcript (what was actually said). Include amounts only if spoken. If the reel never lists ingredients or how to cook, leave those arrays empty. Never invent a recipe from outside knowledge. Put macros the reel mentioned (protein, calories) in badges and takeaways.
- If the reel withholds the GitHub link, still pick the best matching candidate repo. Prefer the repo whose name matches the product (even with a one-letter spelling difference like Skyloss vs skylos). Do not pick a more popular unrelated repo.`;

const PRIMARY_MODEL = "nvidia/nemotron-3-ultra-550b-a55b";
const FALLBACK_MODEL = "nvidia/llama-3.1-nemotron-70b-instruct";

export async function extractStructuredContent(input: ExtractionInput): Promise<ExtractionResult> {
  if (!process.env.NVIDIA_API_KEY) {
    return fallbackExtraction(input);
  }

  const models = uniqueModels([
    process.env.NVIDIA_MODEL,
    PRIMARY_MODEL,
    FALLBACK_MODEL,
  ]);
  const context = buildContext(input);
  let lastError: unknown;

  for (const model of models) {
    try {
      const raw = await completeJson(model, SYSTEM_PROMPT, context, 3500);
      const parsed = briefSchema.parse(JSON.parse(extractJson(raw)));
      const brief = hydrateBrief(parsed, input);
      return {
        category: brief.type,
        title: brief.name,
        summary: brief.summary,
        confidence: parsed.confidence ?? 0.8,
        structuredData: brief,
      };
    } catch (error) {
      lastError = error;
      console.error(`Nemotron extraction failed (${model}):`, error);
    }
  }

  console.error("Nemotron extraction failed on all models:", lastError);
  return fallbackExtraction(input);
}

async function completeJson(
  model: string,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const nemotron = getNemotronClient();
  let lastError: unknown;

  for (const json of [true, false]) {
    try {
      const response = await nemotron.chat.completions.create({
        model,
        temperature: 0.3,
        max_tokens: maxTokens,
        stream: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        ...(json ? { response_format: { type: "json_object" as const } } : {}),
      });
      const raw = stripThinking(response.choices[0]?.message?.content ?? "");
      if (!raw.trim()) throw new Error("Empty model response");
      return raw;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("JSON completion failed");
}

const SCOUT_PROMPT = `Classify this Instagram reel. Return ONLY JSON.
{
  "category": "recipe" | "github_repo" | "website" | "learning" | "other",
  "name": "tool or dish name",
  "githubQueries": ["search terms to find matching GitHub repos"],
  "dishName": "dish name or null"
}
Rules: ignore song lyrics. Software/CLI/GitHub Action/VS Code/open source => github_repo and 1-3 githubQueries (product name first). Food/cooking/macros => recipe and dishName. name is never Saved link.`;

export async function scoutReel(input: {
  caption: string | null;
  transcript: string | null;
}): Promise<ScoutResult> {
  const blob = `${input.caption ?? ""}\n${input.transcript ?? ""}`;
  const fallback: ScoutResult = {
    category: looksLikeSoftware(blob) ? "github_repo" : looksLikeRecipe(blob) ? "recipe" : "other",
    name: guessName(blob),
    githubQueries: looksLikeSoftware(blob) ? [guessName(blob)].filter((n) => n !== "Saved link") : [],
    dishName: looksLikeRecipe(blob) ? guessDishName(blob) : null,
  };

  if (!process.env.NVIDIA_API_KEY) return fallback;

  try {
    const nemotron = getNemotronClient();
    const response = await nemotron.chat.completions.create({
      model: FALLBACK_MODEL,
      temperature: 0,
      max_tokens: 400,
      stream: false,
      messages: [
        { role: "system", content: SCOUT_PROMPT },
        {
          role: "user",
          content: [input.caption ? `Caption:\n${input.caption}` : "", input.transcript ? `Transcript:\n${input.transcript}` : ""]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
      response_format: { type: "json_object" },
    } as never);
    const raw = stripThinking(
      (response as { choices?: Array<{ message?: { content?: string | null } }> }).choices?.[0]
        ?.message?.content ?? "",
    );
    const parsed = z
      .object({
        category: z.enum(["recipe", "github_repo", "website", "learning", "other"]),
        name: z.string().min(1),
        githubQueries: z.array(z.string()).default([]),
        dishName: z.string().nullable().optional(),
      })
      .parse(JSON.parse(extractJson(raw)));
    return {
      category: parsed.category,
      name: parsed.name.trim() || fallback.name,
      githubQueries: uniqueShort(
        [...parsed.githubQueries, parsed.name, ...(fallback.githubQueries)],
        3,
        80,
      ),
      dishName: parsed.dishName?.trim() || fallback.dishName,
    };
  } catch (error) {
    console.error("Reel scout failed:", error);
    return fallback;
  }
}

function hydrateBrief(
  parsed: z.infer<typeof briefSchema>,
  input: ExtractionInput,
): ReelBrief {
  const blob = `${parsed.githubUrl ?? ""}\n${parsed.markdown ?? ""}\n${input.caption ?? ""}\n${input.transcript ?? ""}`;
  const relatedRepos = input.relatedRepos ?? [];
  const inferredGithub =
    cleanGithub(input.githubUrl) ??
    cleanGithub(parsed.githubUrl) ??
    relatedRepos[0]?.url ??
    findGitHubRepoInText(blob);

  const name = cleanName(
    parsed.name.trim() ||
      input.githubName ||
      inferredGithub?.replace("https://github.com/", "") ||
      guessName(`${input.caption ?? ""}\n${input.transcript ?? ""}`),
  );

  const summary = rejectDump(
    tightenSummary(parsed.summary),
    `${input.caption ?? ""}\n${input.transcript ?? ""}`,
  ) || parsed.purpose || `${name} saved from a reel.`;
  const takeaways = uniqueShort(parsed.takeaways, 5, 180).filter(
    (item) => !isTranscriptDump(item, `${input.caption ?? ""}\n${input.transcript ?? ""}`),
  );
  const ingredients = uniqueShort(parsed.ingredients ?? [], 20, 120);
  const steps = uniqueShort(parsed.steps ?? [], 16, 280);
  let setupCommands = uniqueShort(parsed.setupCommands, 8, 240);

  let category = parsed.category;
  if (inferredGithub && category !== "recipe") category = "github_repo";
  if (relatedRepos.length && category !== "recipe") category = "github_repo";
  if (category !== "github_repo" && looksLikeRecipe(`${input.caption ?? ""}\n${input.transcript ?? ""}`)) {
    category = "recipe";
  }

  if (inferredGithub && !setupCommands.some((cmd) => /git clone/i.test(cmd))) {
    const slug = inferredGithub.replace("https://github.com/", "");
    setupCommands = [
      `git clone ${inferredGithub}.git`,
      `cd ${slug.split("/")[1] ?? "repo"}`,
      ...setupCommands,
    ].slice(0, 8);
  }

  const badges = uniqueShort(
    [
      ...parsed.badges,
      ...extractMacros(`${input.caption ?? ""}\n${input.transcript ?? ""}`),
      ...defaultBadges(category, inferredGithub, setupCommands, ingredients),
    ],
    6,
    42,
  );

  const brief = emptyBrief({
    type: category,
    name,
    summary,
    badges,
    githubUrl: inferredGithub,
    relatedRepos,
    setupCommands,
    takeaways,
    ingredients: ingredients.length ? ingredients : undefined,
    steps: steps.length ? steps : undefined,
    keyFeatures: uniqueShort(parsed.keyFeatures ?? [], 8, 80),
    purpose: parsed.purpose,
    whyPopular: parsed.whyPopular,
  });
  brief.markdown = unescapeMarkdown(noteMarkdown(brief));
  return brief;
}

function buildContext(input: ExtractionInput): string {
  return [
    `Original URL: ${input.url}`,
    `Source: ${input.source}`,
    input.githubName ? `Known GitHub name: ${input.githubName}` : "",
    input.githubUrl
      ? `Known GitHub URL (MUST set githubUrl to this unless a better candidate is listed): ${input.githubUrl}`
      : "",
    input.relatedRepos?.length
      ? `Candidate GitHub repos (choose githubUrl from this list; prefer the closest product match):\n${input.relatedRepos
          .map(
            (repo, index) =>
              `${index + 1}. ${repo.fullName} (${repo.stars} stars) ${repo.url}${repo.description ? ` — ${repo.description}` : ""}`,
          )
          .join("\n")}`
      : "No GitHub candidates yet. Still extract a repo if the reel names one.",
    input.caption ? `Caption:\n${input.caption}` : "",
    input.transcript
      ? `Transcript (ONLY source for recipes — extract ingredients and steps if spoken, ignore song lyrics, do not invent):\n${input.transcript}`
      : "",
    input.githubInfo ? `GitHub metadata:\n${input.githubInfo}` : "",
    input.webpageInfo ? `Webpage:\n${input.webpageInfo}` : "",
    "Return structured JSON. Never dump the transcript. For recipes, only include ingredients and steps that appear in the transcript or caption.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

async function fallbackExtraction(input: ExtractionInput): Promise<ExtractionResult> {
  const blob = `${input.caption ?? ""}\n${input.transcript ?? ""}`;
  const relatedRepos = input.relatedRepos ?? [];
  const githubUrl = cleanGithub(input.githubUrl) ?? relatedRepos[0]?.url ?? findGitHubRepoInText(blob);
  const recipe = !githubUrl && looksLikeRecipe(blob);
  const name = cleanName(
    input.githubName ?? githubUrl?.replace("https://github.com/", "") ?? guessName(blob),
  );
  const category: ItemCategory =
    recipe && !githubUrl ? "recipe" : githubUrl || relatedRepos.length ? "github_repo" : recipe ? "recipe" : "other";
  const setupCommands = githubUrl
    ? [`git clone ${githubUrl}.git`, `cd ${githubUrl.split("/").at(-1) ?? "repo"}`]
    : [];

  const brief = emptyBrief({
      type: category,
      name,
      summary: recipe
        ? `${name} from the reel.`
        : githubUrl
          ? `${name} is the closest GitHub match for this reel.`
          : "Structured note from the reel.",
      githubUrl,
      relatedRepos,
      badges: uniqueShort(
        [...defaultBadges(category, githubUrl, setupCommands, []), ...extractMacros(blob)],
        6,
        42,
      ),
      setupCommands,
      takeaways: [],
    });
  brief.markdown = unescapeMarkdown(noteMarkdown(brief));

  return {
    category: brief.type,
    title: brief.name,
    summary: brief.summary,
    confidence: input.transcript ? 0.4 : 0.25,
    structuredData: brief,
  };
}

function tightenSummary(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const sentences = cleaned.split(/(?<=[.!?])\s+/).slice(0, 3);
  const joined = sentences.join(" ");
  return joined.length > 420 ? `${joined.slice(0, 417).trim()}…` : joined;
}

function uniqueShort(values: string[], max: number, maxLen: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const item = value.replace(/\s+/g, " ").trim();
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item.slice(0, maxLen));
    if (result.length >= max) break;
  }
  return result;
}

function defaultBadges(
  category: ItemCategory,
  githubUrl: string | null,
  setupCommands: string[],
  ingredients: string[],
): string[] {
  const badges: string[] = [];
  if (category === "github_repo" || githubUrl) badges.push("GitHub", "Open source");
  if (category === "recipe") badges.push("Recipe");
  if (category === "learning") badges.push("Learning");
  if (category === "website") badges.push("Website");
  if (setupCommands.length) badges.push("Quick setup");
  if (ingredients.length) badges.push("Ingredients listed");
  return badges;
}

function looksLikeRecipe(text: string): boolean {
  return /\b(ingredient|tbsp|tablespoon|teaspoon|preheat|bake|recipe|cup of|saute|sauté|oven|whisk|marinate|pulao|biryani|curry|chicken|protein|calories|serving|cook this|dish)\b/i.test(
    text,
  );
}

function looksLikeSoftware(text: string): boolean {
  return /\b(github|cli|vscode|vs code|pip install|npm |open.?source|pull request|repo|extension|self-hosted|github action|scanner|lint|snyk)\b/i.test(
    text,
  );
}

function guessName(text: string): string {
  const dish = guessDishName(text);
  if (dish) return dish;
  const match = text.match(/\b([A-Z][A-Za-z0-9]{2,30})\b(?:\s+is\s+a|\s+is\s+an)/);
  if (match?.[1] && !["This", "The", "And", "You"].includes(match[1])) return match[1];
  return "Saved link";
}

function guessDishName(text: string): string | null {
  const match = text.match(/\bthis is\s+([A-Z][A-Za-z0-9' ]{3,60}?)(?:\s+and\s+you|\.|$)/i);
  return match?.[1]?.trim() ?? null;
}

function cleanName(name: string): string {
  const trimmed = name.replace(/\s+/g, " ").trim();
  if (!trimmed || /^saved link$/i.test(trimmed)) return "Untitled reel";
  return trimmed;
}

function isTranscriptDump(value: string, source: string): boolean {
  const left = value.toLowerCase().replace(/\s+/g, " ").trim();
  const right = source.toLowerCase().replace(/\s+/g, " ").trim();
  if (!left || !right) return false;
  if (left.length > 220 && right.includes(left.slice(0, 80))) return true;
  return right.startsWith(left.slice(0, 60)) && left.length > 120;
}

function rejectDump(value: string, source: string): string {
  return isTranscriptDump(value, source) ? "" : value;
}

function uniqueModels(models: Array<string | undefined>): string[] {
  return [...new Set(models.filter((model): model is string => Boolean(model)))];
}

function unescapeMarkdown(text: string): string {
  const trimmed = text.trim();
  if (trimmed.includes("\n")) return trimmed;
  if (trimmed.includes("\\n")) {
    return trimmed.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
  }
  return trimmed;
}

function stripThinking(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\|thinking\|>[\s\S]*?<\|\/thinking\|>/gi, "")
    .trim();
}

function extractMacros(text: string): string[] {
  const badges: string[] = [];
  const protein = text.match(/(\d+)\s*g(?:rams?)?\s+protein/i);
  if (protein) badges.push(`${protein[1]}g protein`);
  const calories = text.match(/(\d+)\s*calories/i);
  if (calories) badges.push(`${calories[1]} cal`);
  return badges;
}

function cleanGithub(url: string | null | undefined): string | null {
  if (!url) return null;
  const parsed = parseGitHubRepo(url.startsWith("http") ? url : `https://${url}`);
  return parsed ? `https://github.com/${parsed.owner}/${parsed.repo}` : null;
}
