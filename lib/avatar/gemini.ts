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

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Once-per-week generation limit. Kept here (not in a component render) so the
 * current-time read stays out of render — the purity lint flags Date.now() there.
 */
export function heroCooldown(heroGeneratedAt: string | null): {
  canGenerate: boolean;
  nextLabel: string | null;
} {
  if (!heroGeneratedAt) return { canGenerate: true, nextLabel: null };
  const next = new Date(new Date(heroGeneratedAt).getTime() + WEEK_MS);
  if (next.getTime() > Date.now()) {
    return { canGenerate: false, nextLabel: next.toLocaleDateString() };
  }
  return { canGenerate: true, nextLabel: null };
}

const HERO_PROMPT =
  "Transform the person in this photo into a bold comic-book SUPERHERO portrait. " +
  "Keep their face clearly recognizable — same features, hairstyle, and skin tone. " +
  "Heavy black ink outlines, Ben-Day halftone shading, dramatic comic lighting, and " +
  "vivid electric-blue, lime-green, and purple accents on a warm cream background. " +
  "Head-and-shoulders, square composition, confident heroic pose. " +
  // Safety / appropriateness constraints — keep it tasteful for all genders.
  "The character must be FULLY CLOTHED in a modest, practical, tasteful superhero costume " +
  "with full coverage. Absolutely no sexualization, no revealing or skin-tight-for-effect " +
  "clothing, no exaggerated or emphasized body parts, no suggestive poses. Respectful, " +
  "family-friendly, and appropriate for all audiences regardless of gender. " +
  "No text, no watermark, no logos.";

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

export type GenerateResult = { image: ImageData | null; error?: string };

/** Send the source image + hero prompt to Gemini; return the generated image. */
export async function generateHeroImage(
  source: ImageData,
): Promise<GenerateResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { image: null, error: "GEMINI_API_KEY is not set." };
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

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const msg = `Gemini ${res.status} (model "${model}"): ${body.slice(0, 300)}`;
      console.error("[hero-avatar]", msg);
      return { image: null, error: msg };
    }

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
        return { image: { base64, mimeType } };
      }
    }
    return {
      image: null,
      error: "No image in the Gemini response (it may have been safety-blocked).",
    };
  } catch (e) {
    const msg = `Request failed: ${String(e).slice(0, 200)}`;
    console.error("[hero-avatar]", msg);
    return { image: null, error: msg };
  }
}
