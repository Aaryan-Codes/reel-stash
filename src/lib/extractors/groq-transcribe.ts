import OpenAI from "openai";

function getGroqClient() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY ?? "placeholder",
    baseURL: "https://api.groq.com/openai/v1",
  });
}

export async function transcribeAudio(audio: Buffer, filename = "audio.m4a"): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const groq = getGroqClient();
  const file = new File([new Uint8Array(audio)], filename, { type: "audio/mp4" });

  const response = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3-turbo",
    response_format: "text",
    prompt:
      "Instagram reel voiceover. Transcribe every spoken word, including recipe ingredients, quantities, and cooking steps. Skip background music lyrics when possible.",
  });

  if (typeof response === "string") return response.trim();
  return String(response).trim();
}
