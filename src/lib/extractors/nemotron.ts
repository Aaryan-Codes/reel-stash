import OpenAI from "openai";
import { z } from "zod";
import type { ItemCategory, StructuredData } from "@/lib/db/schema";

function getNemotronClient() {
  return new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY ?? "placeholder",
    baseURL: "https://integrate.api.nvidia.com/v1",
  });
}

const extractionSchema = z.object({
  category: z.enum(["recipe", "github_repo", "website", "learning", "other"]),
  title: z.string(),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  structuredData: z.record(z.string(), z.unknown()),
});

export interface ExtractionInput {
  url: string;
  source: string;
  caption: string | null;
  transcript: string | null;
  githubInfo?: string | null;
  webpageInfo?: string | null;
}

export interface ExtractionResult {
  category: ItemCategory;
  title: string;
  summary: string;
  confidence: number;
  structuredData: StructuredData;
}

export async function extractStructuredContent(input: ExtractionInput): Promise<ExtractionResult> {
  if (!process.env.NVIDIA_API_KEY) {
    return fallbackExtraction(input);
  }

  const model = process.env.NVIDIA_MODEL ?? "nvidia/llama-3.1-nemotron-70b-instruct";
  const context = buildContext(input);
  const nemotron = getNemotronClient();

  try {
    const response = await nemotron.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 2048,
      messages: [
        {
          role: "system",
          content: `You extract structured knowledge from saved social links.
Return ONLY valid JSON with keys:
category (recipe|github_repo|website|learning|other),
title,
summary,
confidence (0-1),
structuredData (object shaped by category:
  recipe -> { type, ingredients[], steps[], sourceLinks[] }
  github_repo -> { type, repoUrl, stars, forks, readmeSummary, whyPopular }
  website -> { type, canonicalUrl, purpose, keyFeatures[] }
  learning -> { type, topics[], takeaways[], resources[] }
  other -> { type, notes }
)`,
        },
        {
          role: "user",
          content: context,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const jsonText = extractJson(raw);
    const parsed = extractionSchema.parse(JSON.parse(jsonText));

    return {
      category: parsed.category,
      title: parsed.title,
      summary: parsed.summary,
      confidence: parsed.confidence,
      structuredData: {
        type: parsed.category,
        ...parsed.structuredData,
      } as StructuredData,
    };
  } catch (error) {
    console.error("Nemotron extraction failed:", error);
    return fallbackExtraction(input);
  }
}

function buildContext(input: ExtractionInput): string {
  return [
    `URL: ${input.url}`,
    `Source: ${input.source}`,
    input.caption ? `Caption:\n${input.caption}` : "",
    input.transcript ? `Transcript:\n${input.transcript}` : "",
    input.githubInfo ? `GitHub:\n${input.githubInfo}` : "",
    input.webpageInfo ? `Webpage:\n${input.webpageInfo}` : "",
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

function fallbackExtraction(input: ExtractionInput): ExtractionResult {
  const title =
    input.caption?.split("\n")[0]?.slice(0, 120) ??
    input.transcript?.slice(0, 120) ??
    "Saved link";
  const summary =
    input.transcript?.slice(0, 400) ??
    input.caption?.slice(0, 400) ??
    "Saved for later review.";
  const confidence = input.transcript ? 0.55 : input.caption ? 0.45 : 0.25;

  return {
    category: "other",
    title,
    summary,
    confidence,
    structuredData: {
      type: "other",
      notes: summary,
    },
  };
}
