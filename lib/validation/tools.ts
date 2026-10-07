import * as z from "zod";
import { TOOL_CATEGORIES } from "@/lib/tools/categories";

const CATEGORY_VALUES = TOOL_CATEGORIES.map((c) => c.value) as [
  string,
  ...string[],
];

export const toolSubmitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Give the tool a name." })
    .max(80, { error: "Keep the name under 80 characters." }),
  url: z.url({ error: "Paste the tool's URL (https://…)." }).max(500),
  category: z.enum(CATEGORY_VALUES, { error: "Pick a category." }),
  description: z
    .string()
    .trim()
    .max(500, { error: "Keep your note under 500 characters." })
    .optional()
    .or(z.literal("")),
});
