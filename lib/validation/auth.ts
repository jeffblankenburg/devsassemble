import * as z from "zod";

export const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .max(60, { error: "Keep your display name under 60 characters." })
    .optional()
    .or(z.literal("")),
  bio: z
    .string()
    .trim()
    .max(280, { error: "Bios are limited to 280 characters." })
    .optional()
    .or(z.literal("")),
  website_url: z
    .url({ error: "Enter a valid URL." })
    .max(200)
    .optional()
    .or(z.literal("")),
  x_url: z.url({ error: "Enter a valid URL." }).max(200).optional().or(z.literal("")),
  linkedin_url: z
    .url({ error: "Enter a valid URL." })
    .max(200)
    .optional()
    .or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;
