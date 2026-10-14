// Granular admin capabilities. role='admin' is a superuser (implicitly all of
// these); everyone else's access to each admin tool is driven by these flags.
// Shared by the DAL (server) and the user-management UI (client), so it stays
// framework-neutral — no "server-only" import here.

export const CAPABILITIES = [
  {
    key: "manage_users",
    label: "Manage users",
    desc: "Assign roles & capabilities, ban members",
  },
  {
    key: "moderate",
    label: "Moderate",
    desc: "Reports, lock/pin topics, take down content",
  },
  {
    key: "manage_events",
    label: "Manage events",
    desc: "Create & edit any event, set broadcast fields",
  },
  {
    key: "manage_social",
    label: "Manage social",
    desc: "Tweets, handle registry, captured news",
  },
  {
    key: "manage_feedback",
    label: "Manage feedback",
    desc: "Triage the feedback queue",
  },
  {
    key: "view_insights",
    label: "View insights",
    desc: "Survey results & analytics",
  },
] as const;

export type Capability = (typeof CAPABILITIES)[number]["key"];

export const CAPABILITY_KEYS = CAPABILITIES.map((c) => c.key) as Capability[];
