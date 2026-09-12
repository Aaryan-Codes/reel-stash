import { createAdminClient } from "@/lib/supabase/admin";

export async function uploadTempAudio(
  userId: string,
  itemId: string,
  audio: Buffer,
): Promise<string | null> {
  const supabase = createAdminClient();
  const path = `${userId}/${itemId}.m4a`;

  const { error } = await supabase.storage.from("temp-audio").upload(path, audio, {
    contentType: "audio/mp4",
    upsert: true,
  });

  if (error) {
    console.error("Temp audio upload failed:", error.message);
    return null;
  }

  return path;
}

export async function deleteTempAudio(path: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.storage.from("temp-audio").remove([path]);
}

export async function persistThumbnail(
  userId: string,
  itemId: string,
  thumbnailUrl: string,
): Promise<string | null> {
  try {
    const res = await fetch(thumbnailUrl, {
      headers: { "User-Agent": "ReelStash/1.0" },
    });
    if (!res.ok) return thumbnailUrl;

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const path = `${userId}/${itemId}.${ext}`;

    const supabase = createAdminClient();
    const { error } = await supabase.storage.from("thumbnails").upload(path, buffer, {
      contentType,
      upsert: true,
    });

    if (error) return thumbnailUrl;

    const { data } = supabase.storage.from("thumbnails").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return thumbnailUrl;
  }
}
