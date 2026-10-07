/** Tool categories — keep in sync with the tool_category enum (migration 0010). */
export const TOOL_CATEGORIES = [
  { value: "ai", label: "AI" },
  { value: "devops", label: "DevOps" },
  { value: "design", label: "Design" },
  { value: "productivity", label: "Productivity" },
  { value: "other", label: "Other" },
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number]["value"];

export function isToolCategory(value: string): value is ToolCategory {
  return TOOL_CATEGORIES.some((c) => c.value === value);
}

export function toolCategoryLabel(value: string): string {
  return TOOL_CATEGORIES.find((c) => c.value === value)?.label ?? "Other";
}
