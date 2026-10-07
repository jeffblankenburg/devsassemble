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

// ── Fixed core — identity, emblem, and safety. These NEVER vary. ────────────
const HERO_CORE =
  "Restyle the PERSON in the FIRST image as a bold comic-book SUPERHERO. " +
  // Likeness is the #1 priority.
  "IDENTITY IS THE TOP PRIORITY: the result must be unmistakably the SAME individual. " +
  "Faithfully preserve their exact facial structure and proportions, bone structure, eye " +
  "shape and color, eyebrows, nose, mouth and smile, jawline, skin tone, and hairstyle, plus " +
  "any distinctive features (glasses, facial hair, freckles, piercings). Do NOT beautify, " +
  "idealize, slim, age, change gender, or alter their face — change ONLY the art style, pose, " +
  "costume, and background. The face must stay clearly recognizable and prominent in frame. " +
  // Emblem.
  "Give the costume a prominent CHEST EMBLEM that recreates the logo shown in the SECOND " +
  "image — the DevsAssemble 'DA' monogram — centered and clearly visible, in its bold comic " +
  "colors. " +
  // Safety / appropriateness constraints — keep it tasteful for all genders.
  "The character must be FULLY CLOTHED in a modest, practical, tasteful superhero costume with " +
  "full coverage. Absolutely no sexualization, no revealing or skin-tight-for-effect clothing, " +
  "no exaggerated or emphasized body parts, no suggestive poses. Respectful, family-friendly, " +
  "and appropriate for all audiences regardless of gender. " +
  "No extra text or watermark beyond the chest emblem. ";

// ── Variety pools — one picked at random per generation so no two match. ────
const FRAMINGS = [
  "Framing: a clear head-and-shoulders portrait with the face filling much of the frame.",
  "Framing: a waist-up hero shot with the face still large and sharply in focus.",
  "Framing: a dynamic three-quarter upper-body shot, face turned slightly but fully visible.",
  "Framing: a low-angle 'hero looking up' upper-body shot that still keeps the face prominent.",
];

const POSES = [
  "Pose: standing tall with arms crossed and a confident grin.",
  "Pose: hands planted on hips in a classic triumphant hero stance.",
  "Pose: one fist raised mid-air as if about to take flight.",
  "Pose: a ready-for-action stance with fists clenched at the sides.",
  "Pose: one arm extended forward palm-out, projecting energy.",
  "Pose: arms relaxed, a calm and reassuring protector's stance.",
];

const CAPES = [
  "Wardrobe: a long flowing cape billowing dramatically in the wind.",
  "Wardrobe: a short shoulder cape clasped at the collar.",
  "Wardrobe: a high-collared cape swept to one side.",
  "Wardrobe: no cape — a sleek streamlined suit with armored shoulders.",
  "Wardrobe: no cape — a utility-vest costume with a bold shoulder pauldron.",
];

const BACKGROUNDS = [
  "Background: a dramatic city skyline at golden hour.",
  "Background: a cosmic starfield with swirling nebula color.",
  "Background: explosive comic action-lines radiating from the hero.",
  "Background: a bold Ben-Day halftone dot field in brand colors.",
  "Background: a warm cream backdrop with a single spotlight glow.",
  "Background: a stormy sky split by lightning behind the hero.",
];

const ACCENTS = [
  "Color accent: lead with vivid electric-blue highlights.",
  "Color accent: lead with punchy lime-green highlights.",
  "Color accent: lead with rich purple highlights.",
  "Color accent: balance electric-blue, lime-green, and purple evenly.",
];

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Compose a fresh prompt: fixed identity/safety core + randomized variety. */
function buildHeroPrompt(): string {
  return (
    HERO_CORE +
    "Art style: heavy black ink outlines, Ben-Day halftone shading, and dramatic comic " +
    "lighting. " +
    `${pick(FRAMINGS)} ${pick(POSES)} ${pick(CAPES)} ${pick(BACKGROUNDS)} ${pick(ACCENTS)}`
  );
}

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

/** Load the DevsAssemble icon to place on the hero's chest (the second image). */
async function fetchBrandLogo(): Promise<ImageData | null> {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) return null;
  return fetchImageAsBase64(`${base.replace(/\/$/, "")}/logo-icon.png`);
}

export type GenerateResult = { image: ImageData | null; error?: string };

/** Send the source image + hero prompt to Gemini; return the generated image. */
export async function generateHeroImage(
  source: ImageData,
): Promise<GenerateResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { image: null, error: "GEMINI_API_KEY is not set." };
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

  const logo = await fetchBrandLogo();
  const requestParts: Array<Record<string, unknown>> = [
    { text: buildHeroPrompt() },
    { inline_data: { mime_type: source.mimeType, data: source.base64 } },
  ];
  if (logo) {
    requestParts.push({
      inline_data: { mime_type: logo.mimeType, data: logo.base64 },
    });
  }

  try {
    const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: requestParts }] }),
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
