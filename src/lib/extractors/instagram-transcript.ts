export async function fetchInstagramTranscript(
  url: string,
  options: { cache?: boolean } = {},
): Promise<{
  transcript: string | null;
  error: string | null;
}> {
  const apiKey = process.env.CAPTAPI_API_KEY?.trim();
  if (!apiKey) {
    return { transcript: null, error: "CAPTAPI_API_KEY is not set." };
  }

  const endpoint = new URL("https://api.captapi.com/v1/instagram/transcript");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("cache", options.cache === false ? "false" : "true");
  endpoint.searchParams.set("language", "en");

  try {
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "x-api-key": apiKey,
      },
    });

    const body = (await res.json()) as {
      success?: boolean;
      error?: string | { message?: string };
      data?: {
        text?: string;
        segments?: Array<{ text?: string }>;
      };
      message?: string;
    };

    if (!res.ok) {
      const message =
        typeof body.error === "string"
          ? body.error
          : body.error?.message ?? body.message ?? `Captapi HTTP ${res.status}`;
      if (res.status === 429) {
        return { transcript: null, error: `429 ${message}` };
      }
      return { transcript: null, error: message };
    }

    const fromSegments = (body.data?.segments ?? [])
      .map((segment) => segment.text?.trim())
      .filter((text): text is string => Boolean(text))
      .join(" ")
      .trim();
    const fromText = body.data?.text?.trim() ?? "";
    const text = fromSegments.length > fromText.length ? fromSegments : fromText;

    if (!text) {
      return { transcript: null, error: "Captapi returned an empty transcript." };
    }

    return { transcript: text, error: null };
  } catch (err) {
    return {
      transcript: null,
      error: err instanceof Error ? err.message : "Captapi request failed.",
    };
  }
}
