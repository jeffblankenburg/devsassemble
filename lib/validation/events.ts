import * as z from "zod";

export const eventAccentEnum = z.enum(["blue", "lime", "purple"]);
export const eventStatusEnum = z.enum(["draft", "published", "cancelled"]);
export const rsvpStatusEnum = z.enum(["going", "interested"]);

// Lowercase, hyphen-separated slug — the permanent URL segment for an event.
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const eventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { error: "Give the event a title." })
    .max(140, { error: "Keep the title under 140 characters." }),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, { error: "Slug must be at least 3 characters." })
    .max(80)
    .regex(slugRegex, {
      error: "Slug: lowercase letters, numbers, and hyphens only.",
    }),
  summary: z
    .string()
    .trim()
    .max(200, { error: "Summaries are limited to 200 characters." })
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .trim()
    .max(5000, { error: "Descriptions are limited to 5000 characters." })
    .optional()
    .or(z.literal("")),
  // datetime-local strings, e.g. "2026-10-09T13:00". Converted to UTC in the action.
  starts_at: z.string().min(1, { error: "Pick a start date and time." }),
  ends_at: z.string().optional().or(z.literal("")),
  timezone: z.string().trim().max(64).optional().or(z.literal("")),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  url: z
    .url({ error: "Enter a valid URL (https://…)." })
    .max(300)
    .optional()
    .or(z.literal("")),
  host: z.string().trim().max(80).optional().or(z.literal("")),
  accent: eventAccentEnum,
  status: eventStatusEnum,
  recurrence: z.enum(["none", "daily", "weekly", "biweekly", "monthly"]),
});

export type EventInput = z.infer<typeof eventSchema>;
