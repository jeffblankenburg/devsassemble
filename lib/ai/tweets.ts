import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { SITE_URL } from "@/lib/email/config";

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic() : null;

export function aiConfigured(): boolean {
  return client !== null;
}

export type TweetKind =
  | "event"
  | "tool"
  | "discussion"
  | "project"
  | "evergreen"
  | "news";

export type TweetOption = {
  kind: TweetKind;
  body: string;
  source_url: string | null;
  rationale: string;
};

const MODEL = "claude-sonnet-4-6";

const SYSTEM = `You write tweets for @devsassembleAI on X — the account of DevsAssemble, a community where developers share what they're building with AI, swap tools and prompts, and meet up at events.

Voice: upbeat, builder-to-builder, a little playful (comic-book energy), never corporate or hypey. You're one of them, not a brand mascot.

Hard rules for every tweet:
- 280 characters MAX, including the link. Shorter is better.
- At most ONE link, and only a devsassemble.ai link or a cited news source URL. Never invent URLs — use only URLs present in the material.
- At most 1-2 hashtags, and only if they add reach (#buildinpublic, #AI). No hashtag soup.
- No clickbait, no "🚀🚀🚀", at most one tasteful emoji.
- Write like a human sharing something genuinely interesting, not an ad.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    options: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          kind: {
            type: "string",
            enum: ["event", "tool", "discussion", "project", "evergreen", "news"],
          },
          body: { type: "string", description: "The tweet text, <=280 chars." },
          source_url: {
            type: ["string", "null"],
            description: "The single link in the tweet, or null.",
          },
          rationale: {
            type: "string",
            description: "One sentence: why this is worth posting today.",
          },
        },
        required: ["kind", "body", "source_url", "rationale"],
      },
    },
  },
  required: ["options"],
} as const;

/** Join the text blocks of a message response. */
function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/**
 * Best-effort current AI/dev news digest via server-side web search. Returns a
 * short text block (with source URLs) or null — any failure degrades silently
 * so the draft still ships from site activity alone.
 */
export async function fetchAiNewsDigest(): Promise<string | null> {
  if (!client) return null;
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }],
      messages: [
        {
          role: "user",
          content:
            "Find 2-3 genuinely notable AI or developer-tooling news items from the last 2 days (model releases, major tool launches, noteworthy posts). For each: a one-line summary and the source URL. Be brief and factual.",
        },
      ],
    });
    const text = textOf(res).trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

/**
 * Generate 2-3 tweet options for today from the community material (and, if
 * available, a news digest). Structured output guarantees a parseable shape.
 */
export async function generateTweetOptions(
  material: string,
  newsDigest: string | null,
): Promise<TweetOption[]> {
  if (!client) {
    // Dev stub so the pipeline + queue are testable without a key.
    return [
      {
        kind: "evergreen",
        body: "Builders helping builders. Share what you're making with AI, swap the tools that actually work, and show up for the next meetup. 👋",
        source_url: SITE_URL,
        rationale: "Dev stub — ANTHROPIC_API_KEY not set.",
      },
    ];
  }

  const prompt = [
    "Here is today's DevsAssemble community activity:",
    "",
    material || "(quiet day — lean on an evergreen angle)",
    "",
    newsDigest ? `Recent AI/developer news (cite the source URL if you use one):\n${newsDigest}\n` : "",
    "Write 2-3 distinct tweet options for today. Favor timely, specific items (an upcoming event, a fresh project/tool, an active discussion) over generic posts. Vary the angle across options. Each must follow every rule in your instructions.",
  ].join("\n");

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: prompt }],
  });

  let parsed: { options?: TweetOption[] };
  try {
    parsed = JSON.parse(textOf(res));
  } catch {
    return [];
  }
  return (parsed.options ?? [])
    .filter((o) => o && typeof o.body === "string" && o.body.trim().length > 0)
    .map((o) => ({
      kind: o.kind,
      body: o.body.trim(),
      source_url: o.source_url?.trim() || null,
      rationale: o.rationale ?? "",
    }));
}
