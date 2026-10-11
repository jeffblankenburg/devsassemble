// Shared registration-survey definition — used by the onboarding form AND the
// admin aggregation + server-side validation, so they can never drift.

export type SingleKey = "persona" | "experience";
export type MultiKey = "coding_tools" | "observability" | "goals";

export type SurveyQuestion = {
  key: SingleKey | MultiKey;
  label: string;
  multi: boolean;
  options: readonly string[];
};

export const SURVEY_QUESTIONS: readonly SurveyQuestion[] = [
  {
    key: "persona",
    label: "What best describes you?",
    multi: false,
    options: [
      "Professional software engineer",
      "Indie hacker / solo builder",
      "Founder / entrepreneur",
      "Designer or PM who builds with AI",
      "Student / learning",
      "Hobbyist",
    ],
  },
  {
    key: "experience",
    label: "How long have you been building with AI?",
    multi: false,
    options: [
      "Just started (< 3 months)",
      "A few months",
      "About a year",
      "2+ years",
    ],
  },
  {
    key: "coding_tools",
    label: "Which AI coding tools do you use?",
    multi: true,
    options: [
      "Claude Code",
      "Claude (chat)",
      "Cursor",
      "GitHub Copilot",
      "ChatGPT",
      "Codex",
      "Windsurf",
      "v0",
      "Lovable",
      "Bolt",
      "Other",
    ],
  },
  {
    key: "observability",
    label: "What do you use for AI observability?",
    multi: true,
    options: [
      "Nothing yet",
      "Not sure what that is",
      "LangSmith",
      "Langfuse",
      "Helicone",
      "Braintrust",
      "Arize",
      "Phoenix",
      "W&B Weave",
      "Datadog",
      "Dynatrace",
      "OpenTelemetry (DIY)",
      "Other",
    ],
  },
  {
    key: "goals",
    label: "What are you most here for?",
    multi: true,
    options: [
      "Share what I'm building",
      "Discover tools & projects",
      "Join discussions",
      "Meet builders / events",
      "Keep up with AI dev news",
    ],
  },
] as const;

export const BUILDING_MAX = 280;

export type SurveyInput = {
  persona: string;
  experience: string;
  coding_tools: string[];
  observability: string[];
  goals: string[];
  building: string;
};

function optionsFor(key: SurveyQuestion["key"]): readonly string[] {
  return SURVEY_QUESTIONS.find((q) => q.key === key)?.options ?? [];
}

/** Keep only allowed values; dedupe. Guards the DB from arbitrary input. */
function cleanMulti(values: unknown, key: MultiKey): string[] {
  const allowed = new Set(optionsFor(key));
  const arr = Array.isArray(values) ? values : [];
  return [...new Set(arr.filter((v): v is string => typeof v === "string" && allowed.has(v)))];
}

function cleanSingle(value: unknown, key: SingleKey): string | null {
  return typeof value === "string" && optionsFor(key).includes(value) ? value : null;
}

export type CleanResult =
  | { ok: true; data: SurveyInput }
  | { ok: false; error: string };

/** Validate a submitted survey: all choice questions required, free text optional. */
export function cleanSurveyInput(input: Partial<SurveyInput>): CleanResult {
  const persona = cleanSingle(input.persona, "persona");
  const experience = cleanSingle(input.experience, "experience");
  const coding_tools = cleanMulti(input.coding_tools, "coding_tools");
  const observability = cleanMulti(input.observability, "observability");
  const goals = cleanMulti(input.goals, "goals");

  if (!persona) return { ok: false, error: "Pick what best describes you." };
  if (!experience) return { ok: false, error: "Pick how long you've been building with AI." };
  if (coding_tools.length === 0) return { ok: false, error: "Pick at least one AI coding tool." };
  if (observability.length === 0) return { ok: false, error: "Pick at least one observability answer." };
  if (goals.length === 0) return { ok: false, error: "Pick at least one reason you're here." };

  const building = (typeof input.building === "string" ? input.building : "")
    .trim()
    .slice(0, BUILDING_MAX);

  return {
    ok: true,
    data: { persona, experience, coding_tools, observability, goals, building },
  };
}
