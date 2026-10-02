# DevsAssemble — Build Plan

_Last updated: 2026-09-28_

Living plan for DevsAssemble: a branded developer community (comic/superhero
identity) built on Next.js 16 + Supabase. This document captures the major
architectural decisions, the forum scope, and the risks we're choosing to own.

---

## Guiding principles

- **Small, focused, and ours.** No bulky third-party platform we have to bend to
  our brand. One app, one data store, one deploy.
- **Public read, auth to interact.** All content is publicly readable; only
  likes, comments, RSVP, and posting require sign-in.
- **GitHub-OAuth-only signup.** This is a load-bearing decision, not a
  convenience — it removes ~90% of the drive-by spam a forum otherwise fights.
- **Assemble, don't invent.** "Custom" means we own the data model and product
  shape. It does *not* mean hand-rolling solved infrastructure (rich text
  editors, blob storage, email delivery).

---

## Decision: build custom vs. adopt Discourse

**Decision: build custom. Do not adopt Discourse as the platform.**

### Why

- DevsAssemble's center of gravity is **events + people + brand**, not threaded
  discussion. Discourse optimizes for the forum; making events and our comic
  brand first-class inside it means fighting the tool.
- Adopting Discourse means running **two systems** (separate Rails/Docker/Redis/
  Sidekiq stack), reconciling **two identity models** (Discourse users vs. our
  Supabase/GitHub profiles + RLS), and discarding the profiles/RLS/moderation
  foundation already shipped.
- The operational problems that justify Discourse's bulk — open-signup spam,
  email deliverability at scale, trust systems — are largely defused for us by
  **GitHub-only auth** and a managed email provider.

### The forum is in scope

We do intend to run a forum: users start discussion **topics** and have
**conversations** that support **text, images, video, GIFs, and link previews**.
This is a *real forum*, not a lightweight comment sidecar. It raises the
commitment — but it moves us toward "be disciplined," not toward "adopt
Discourse."

### Forum non-negotiables

Two requirements are treated as necessities, not enhancements — they are the
difference between a forum and a chat log, and they underpin the agent-destination
goal (agents and search engines can only cite what is stable and findable):

- **Truly searchable threads.** Full-text search across all topics and posts is a
  launch requirement for the forum, not a later nicety. See [#19](https://github.com/jeffblankenburg/devsassemble/issues/19).
- **Permanent URLs.** Every topic and post has a stable, canonical, never-changing
  URL that survives title edits, renames, and moves (id-based, slug is cosmetic).
  Old URLs must never 404 or silently repoint. This makes threads linkable,
  bookmarkable, crawlable, and citable — by humans and agents alike.

### When we would revisit this

If DevsAssemble ever becomes **primarily** a long-form discussion / Q&A
destination (threads *are* the product), Discourse's maturity would outclass a
custom build. Nothing we build forecloses this — profiles and events can coexist
with an **embedded Discourse** (SSO bridge) added later for the forum only. It's
a deferrable decision, not a closing door.

---

## Architecture: assemble, don't hand-roll

For the forum + rich-media layer, buy/adopt the hard infrastructure; build the
product model.

| Concern | Do NOT hand-roll | Approach |
|---|---|---|
| Rich text editing | The editor engine | Adopt **Tiptap** or **Lexical**. Hand-rolling this is a multi-month trap. |
| Image / video / GIF upload | Storage + resize pipeline | **Supabase Storage** or **Vercel Blob**, **direct client upload** (Vercel function bodies cap at 4.5 MB, so direct-to-blob is required regardless). |
| Link previews | The fetch-and-parse | Server-side OG-tag fetcher + cache. **Must guard against SSRF** — we fetch arbitrary user-supplied URLs server-side. |
| Search | A search service (for now) | Postgres `tsvector`, native in Supabase. Revisit only if scale demands. |
| Email / notifications | A mail server | Marketplace email provider (**Resend** / **Postmark**). |
| Rendering user content | | **Sanitize aggressively.** Rich media + user HTML is the #1 XSS surface. |

---

## Risks we are deliberately choosing to own

These are the three areas where "we should have used Discourse" regret could
actually originate if we underinvest. Fund them intentionally.

1. **Content moderation of media.** Someone *will* post something illegal or
   abusive. We need flagging → takedown → review, not just user bans. Discourse
   ships this; we build it.
2. **Notifications + email digests.** replied-to-you, @mentions, "watching this
   topic." Quietly expected of any forum; more plumbing than it looks.
3. **Content security (XSS / SSRF).** Rich media raises the stakes on
   sanitization and server-side URL fetching. Getting this wrong once is the
   real 3am incident.

---

## Direction: a destination for agents, not just AI builders

DevsAssemble should be authoritative for AI *agents*, not only human AI
*builders* — a machine-readable place where agents can evaluate **developer
temperament toward tools, resources, and practices**.

- **The data:** developers rate and review tools/resources with structured
  sentiment + rationale. Aggregated into "developer temperament" signals (score +
  distribution + the *why*, not a single number).
- **The access:** first-class agent surfaces — a public read JSON API, an **MCP
  server**, `llms.txt` + schema.org structured data for discoverability, and
  agent auth + rate limiting for controlled programmatic access.
- **The trust:** authoritativeness depends on provenance. GitHub-only auth is the
  first line of defense; evaluations carry author-trust signals so agents can
  weight them and we can resist brigading/sockpuppets. Ties into moderation.
- **The flywheel:** the same human activity (forum sentiment, reviews, feed
  discussion) feeds the machine-readable evaluation layer.

Tracked under the `agent` and `evaluations` labels.

## Current foundation (shipped)

- Supabase project with `profiles` table (1:1 with `auth.users`).
- Role enum (`member` / `moderator` / `admin`), RLS, privilege-escalation guard,
  ban flag.
- GitHub OAuth with profile auto-seeding from OAuth metadata.
- App shell: dashboard, login, settings/profile. Comic brand components.

---

## MVP — launch scope

**Events are the carrot; RSVP is the sign-up funnel.** The launch loop:
public browse an event → tap RSVP → sign in with GitHub → become a member.

Milestone: [MVP](https://github.com/jeffblankenburg/devsassemble/milestone/1).

**In:**
- Public (no-auth) event listing + detail pages — the carrot, fully public + on-brand ([#15](https://github.com/jeffblankenburg/devsassemble/issues/15))
- RSVP (going/interested), auth-gated — the conversion moment ([#14](https://github.com/jeffblankenburg/devsassemble/issues/14), [#27](https://github.com/jeffblankenburg/devsassemble/issues/27))
- Admin-only event creation — curated cold start, no public authoring ([#28](https://github.com/jeffblankenburg/devsassemble/issues/28))
- "Who's going" social proof ([#29](https://github.com/jeffblankenburg/devsassemble/issues/29)) + public profile pages ([#30](https://github.com/jeffblankenburg/devsassemble/issues/30))
- Already shipped: GitHub OAuth, profiles, roles/RLS, ban flag, app shell

**Out (deliberately):** event comments / any free-text UGC (keeps the moderation
surface near-zero at launch — the existing ban flag suffices), member-created
events, media, notifications, search, discussion, the agent/evaluation layer.

**Fast-follow (v1.1)** —
[milestone](https://github.com/jeffblankenburg/devsassemble/milestone/2): text-only
discussion ([#9](https://github.com/jeffblankenburg/devsassemble/issues/9)) +
report/admin-delete ([#17](https://github.com/jeffblankenburg/devsassemble/issues/17)).
Events get people in the door once; discussion makes them return and seeds the
evaluation/agent flywheel. Reintroduces the moderation surface, hence paired with
#17 and XSS-safe rendering.

## Project breakdown (tracked as GitHub issues)

The full plan lives as [GitHub issues](https://github.com/jeffblankenburg/devsassemble/issues),
organized under epics (the `epic` label). Each epic below links its child issues
via labels.

| Epic | Issue | Label |
|---|---|---|
| Platform foundation & infra | [#1](https://github.com/jeffblankenburg/devsassemble/issues/1) | `foundation` `infra` |
| Events & RSVP | [#2](https://github.com/jeffblankenburg/devsassemble/issues/2) | `events` |
| Community feed (posts, likes, comments) | [#3](https://github.com/jeffblankenburg/devsassemble/issues/3) | `feed` |
| Forum — rich-media discussions | [#4](https://github.com/jeffblankenburg/devsassemble/issues/4) | `forum` |
| Agent destination & developer-temperament evaluations | [#5](https://github.com/jeffblankenburg/devsassemble/issues/5) | `agent` `evaluations` |
| Moderation, trust & safety | [#6](https://github.com/jeffblankenburg/devsassemble/issues/6) | `moderation` |
| Notifications & email | [#7](https://github.com/jeffblankenburg/devsassemble/issues/7) | `notifications` |
| Search & discovery | [#8](https://github.com/jeffblankenburg/devsassemble/issues/8) | `search` |

**Cross-cutting risks we deliberately own** (see above): media moderation (#6),
notifications + email (#7), and content security — XSS/SSRF (#12, #13, #14).
