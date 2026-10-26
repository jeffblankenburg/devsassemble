import * as z from "zod";

const noteField = z
  .string()
  .trim()
  .max(500, { error: "Keep your note under 500 characters." })
  .optional()
  .or(z.literal(""));

export const repoSubmitSchema = z.object({
  github_url: z
    .url({ error: "Paste a GitHub repository URL." })
    .max(300),
  note: noteField,
});

/** Editing an existing project only touches the user-authored note. */
export const repoNoteSchema = z.object({ note: noteField });
