import * as z from "zod";

export const topicSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, { error: "Give your topic a clear title." })
    .max(140, { error: "Keep the title under 140 characters." }),
  body: z
    .string()
    .trim()
    .min(10, { error: "Add some detail to start the discussion." })
    .max(10000, { error: "Posts are limited to 10,000 characters." }),
  category_id: z.uuid({ error: "Pick a category." }),
});

export const replySchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { error: "Write a reply." })
    .max(10000, { error: "Replies are limited to 10,000 characters." }),
});

export const reportSchema = z.object({
  target_type: z.enum(["topic", "post"]),
  target_id: z.uuid(),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});
