import * as z from "zod";

export const repoSubmitSchema = z.object({
  github_url: z
    .url({ error: "Paste a GitHub repository URL." })
    .max(300),
  kind: z.enum(["build", "recommendation"]),
  note: z
    .string()
    .trim()
    .max(500, { error: "Keep your note under 500 characters." })
    .optional()
    .or(z.literal("")),
});
