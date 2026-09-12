import { extractInstagramAudio } from "@/lib/extractors/instagram";
import { fetchInstagramTranscript } from "@/lib/extractors/instagram-transcript";
import { transcribeAudio } from "@/lib/extractors/groq-transcribe";

export async function getBestTranscript(url: string): Promise<{
  transcript: string | null;
  error: string | null;
}> {
  const errors: string[] = [];
  let captapiText: string | null = null;
  let groqText: string | null = null;

  if (process.env.CAPTAPI_API_KEY) {
    const result = await fetchInstagramTranscript(url, { cache: false });
    if (result.transcript) captapiText = result.transcript;
    else if (result.error) errors.push(result.error);
  }

  if (process.env.GROQ_API_KEY) {
    const { audio, error } = await extractInstagramAudio(url);
    if (!audio) {
      if (error) errors.push(error);
    } else {
      try {
        groqText = await transcribeAudio(audio);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Groq transcription failed";
        errors.push(message);
        if (message.includes("429") || message.toLowerCase().includes("rate")) {
          return { transcript: pickTranscript(captapiText, groqText), error: `429 ${message}` };
        }
      }
    }
  }

  const transcript = pickTranscript(captapiText, groqText);
  if (transcript) return { transcript, error: null };

  if (!process.env.CAPTAPI_API_KEY && !process.env.GROQ_API_KEY) {
    return { transcript: null, error: "Add CAPTAPI_API_KEY to transcribe Instagram reels from a URL." };
  }

  return { transcript: null, error: errors[0] ?? "Could not transcribe this reel." };
}

function pickTranscript(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  const aScore = recipeSignal(a);
  const bScore = recipeSignal(b);
  if (bScore !== aScore) return bScore > aScore ? b : a;
  return a.length >= b.length ? a : b;
}

function recipeSignal(text: string): number {
  return (text.match(/\b(tbsp|tablespoon|teaspoon|cup|grams?|onion|garlic|heat|saute|sauté|add|minutes|salt|pepper|oil|ghee|rice|mix|stir|boil|simmer|chop|fry)\b/gi) ?? [])
    .length;
}
