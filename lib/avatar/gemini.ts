import "server-only";

// Google "Nano Banana" (Gemini Flash Image) via the AI Studio REST API.
// Free tier: get a key at https://aistudio.google.com/apikey and set GEMINI_API_KEY.
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/** Feature flag: on only when a key is configured AND explicitly enabled. */
export function heroAvatarEnabled(): boolean {
  return (
    Boolean(process.env.GEMINI_API_KEY) &&
    process.env.HERO_AVATAR_ENABLED === "true"
  );
}

const HERO_PROMPT =
  "Transform the person in this photo into a bold comic-book SUPERHERO portrait. " +
  "Keep their face clearly recognizable — same features, hairstyle, and skin tone. " +
  "Heavy black ink outlines, Ben-Day halftone shading, dramatic comic lighting, and " +
  "vivid electric-blue, lime-green, and purple accents on a warm cream background. " +
  "Head-and-shoulders, square composition, confident heroic pose. No text, no watermark.";

export type ImageData = { base64: string; mimeType: string };

/** Fetch a remote image (e.g. GitHub avatar) and return it as base64. */
export async function fetchImageAsBase64(url: string): Promise<ImageData | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const mimeType = res.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    return { base64: buf.toString("base64"), mimeType };
  } catch {
    return null;
  }
}

/** Send the source image + hero prompt to Gemini; return the generated image. */
export async function generateHeroImage(
  source: ImageData,
): Promise<ImageData | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

  try {
    const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: HERO_PROMPT },
              {
                inline_data: {
                  mime_type: source.mimeType,
                  data: source.base64,
                },
              },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      candidates?: {
        content?: {
          parts?: {
            inlineData?: { data?: string; mimeType?: string };
            inline_data?: { data?: string; mime_type?: string };
          }[];
        };
      }[];
    };

    const parts = data.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      const inline = p.inlineData ?? p.inline_data;
      const base64 = inline?.data;
      if (base64) {
        const mimeType =
          (inline as { mimeType?: string; mime_type?: string }).mimeType ??
          (inline as { mimeType?: string; mime_type?: string }).mime_type ??
          "image/png";
        return { base64, mimeType };
      }
    }
    return null;
  } catch {
    return null;
  }
}
