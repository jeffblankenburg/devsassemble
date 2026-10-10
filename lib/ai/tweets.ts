import "server-only";

import Anthropic from "@anthropic-ai/sdk";
// Tweets syndicate off-site, so links must always be the prod origin — never a
// localhost/preview NEXT_PUBLIC_SITE_URL. PUBLIC_SITE_URL guarantees that.
import { PUBLIC_SITE_URL as SITE_URL } from "@/lib/email/config";

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
 * Generate 2-3 tweet options for today from the community material (and, if
 * provided, a dev-news digest). Structured output guarantees a parseable shape.
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
    newsDigest
      ? `Fresh items right now from Reddit (vibe-coding / AI-dev communities), Hacker News, and Dev.to. The Reddit items are listed first and are our most on-topic, timely signal — lean into them. Link each source URL EXACTLY as given:\n${newsDigest}\n`
      : "",
    newsDigest
      ? "Write 4-6 distinct tweet options for today. Weight them toward the news above: at least 3 should react to specific items (favor the Reddit community posts) with your own builder's-eye take — a reaction, a question, a hot take — not just a restated headline, and link the source. 1-2 should spotlight DevsAssemble community activity (an upcoming event, a fresh project/tool, an active discussion) with a devsassemble.ai link. Optionally one evergreen. Favor timely, specific posts over generic ones; each must follow every rule in your instructions."
      : "Write 2-3 distinct tweet options for today drawn from the DevsAssemble community activity (an upcoming event, a fresh project/tool, an active discussion), plus optionally one evergreen. Favor timely, specific posts over generic ones. Each must follow every rule in your instructions.",
  ].join("\n");

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
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
