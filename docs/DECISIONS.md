# Build decisions & review notes

## Session summary (what shipped while you were away)

**MVP is functionally complete.** Stacked PRs — **merge in this order**, each
retargets to `main` after the one before it merges:

1. **#37** `build/baseline` → `main` — version-controls the previously-uncommitted scaffold + plan.
2. **#38** `build/events` — events, RSVP, sign-up funnel, admin authoring, who's-going. (Migration `0002` already applied to Supabase.)
3. **#39** `build/profiles` — public `/u/[username]` pages + "assembling at".
4. **#40** `build/home-events` — home page wired to real events.
5. **#41** `build/forum` — discussions, replies, moderation, XSS-safe markdown (#9/#17/#31). Migrations `0003` + `0004` applied.

All five: `tsc --noEmit` + `eslint` clean. Sample data seeded in Supabase (3
events, 1 topic + reply) so pages render for review.

**🔴 Top things to verify first (in a browser, with `npm run dev` on :3005):**
1. The **RSVP → GitHub OAuth → back-to-event** funnel (the #1 risk). Also check the Supabase GitHub provider callback allows `…/auth/callback` with a `next` query param.
2. **Markdown XSS** — post `<img src=x onerror=alert(1)>` and `[x](javascript:alert(1))` in a topic/reply; confirm neither executes.
3. Event times display as intended (UTC wall-clock + tz label — see below).
4. `/events`, `/events/[slug]`, `/u/[username]`, `/discussions`, `/admin/*` render on-brand.

**Not built yet (queued):** home-page live broadcast flag (#35 — needs your Restream plan + embed URL), search (#19), feed (#16). Tasks tracked in the session task list.

---


Running log of judgment calls made while building autonomously, and — more
importantly — **what needs your eyes**. Newest sections at the bottom.

Legend: 🔴 needs your verification · 🟡 a simplification to revisit · 🟢 FYI

---

## Git topology

- 🟢 The entire pre-existing app was **uncommitted** (untracked on `main`). I
  committed it as a baseline (`build/baseline`, PR #37) so each feature chunk has
  a clean diff.
- 🟢 Feature branches are **stacked on `build/baseline`**; their PRs target
  `build/baseline`. **Merge order:** merge #37 first, then retarget/merge each
  feature PR to `main`. GitHub will show clean diffs once the base is merged.
- 🟢 I never push `main` and never deploy — per your guardrails.
- 🟡 `.env.example` is covered by `.gitignore` (`.env*`), so it is NOT committed.
  You may want to force-add it (`git add -f .env.example`) as a template for new
  contributors. I did not override your ignore rule.

## Events chunk (branch `build/events`)

- 🔴 **RSVP sign-up funnel** — I threaded a `next` destination through GitHub
  OAuth *and* email OTP so an RSVP while logged out returns to the event after
  sign-in (`?next=/events/<slug>`). I **cannot test the OAuth round trip
  headless** — please verify: logged-out → click "RSVP — sign in to join" →
  GitHub → land back on the event page, then RSVP completes. This is the funnel
  you flagged as the #1 risk.
- 🟢 Open-redirect hardening: `lib/auth/redirects.ts#safeNext` restricts `next`
  to same-origin absolute paths; applied in the login page, both auth actions,
  and the callback + confirm routes.
- 🟡 **Event time handling** — times are stored as the admin's wall-clock
  interpreted as **UTC** and always displayed in **UTC** with a timezone *label*
  (e.g. "1:00 PM ET"). So the displayed time equals exactly what was entered.
  This is predictable and bug-free for a single-community listing, but is NOT
  true multi-timezone handling. Revisit with a TZ library if events ever span
  zones. See `lib/events/format.ts`.
- 🟢 **Admin-only event authoring** at launch (per the MVP decision): members
  cannot create events; RLS gates writes to `is_admin()`. Admin UI at
  `/admin/events`.
- 🟡 **Dynamic route pages use inline param types** (`{ params: Promise<{ slug:
  string }> }`) instead of the repo's `PageProps<"/route">` convention, because
  Next's generated route types (`.next/types`) can't be regenerated in my
  environment (that needs `next dev`/`next build`, which are yours). Once you run
  the app, you may switch these two files back to `PageProps<...>` if you prefer
  the convention: `app/events/[slug]/page.tsx`,
  `app/(app)/admin/events/[id]/edit/page.tsx`.
- 🟢 **Verification ceiling:** `tsc --noEmit` and `eslint` both pass. I did not
  run `next build` (it shares `.next` with your dev server) or exercise the UI in
  a browser. Treat runtime/visual behavior as unverified pending your pass.
- 🟢 **Seed data:** I inserted 3 sample **published** events directly in Supabase
  so `/events` and the (soon) wired home page render real content for your review.
  Delete them anytime via `/admin/events`. They have `created_by = null`.
- 🟢 **Live broadcast groundwork:** the event detail page renders a Restream
  `<iframe>` when `is_live` + `stream_embed_url` are set (full home-page live flow
  is issue #35). Needs your Restream plan + embed URL, and a CSP `frame-src` entry
  before production.

## Forum chunk (branch `build/forum`)

- 🟢 Migrations `0003` (forum) + `0004` (harden) applied to Supabase. Tables:
  `categories` (seeded with 4), `topics`, `posts`, `reports`. All have RLS:
  public read of categories/topics/posts; authenticated self-write; author-or-admin
  edit/delete; reports are insert-self + admin-only read/update.
- 🔴 **XSS — verify this directly.** Markdown is rendered by `react-markdown` +
  `rehype-sanitize` (safe default schema), with **no `rehype-raw`**, so embedded
  HTML is escaped, not executed (`components/markdown/markdown.tsx`). Please smoke-test
  by posting a topic/reply containing `<img src=x onerror=alert(1)>` and
  `[click](javascript:alert(1))` and confirming **neither fires**. This is the one
  piece I most want you to verify in a browser.
- 🟢 Added deps: `react-markdown@^9`, `remark-gfm@^4`, `rehype-sanitize@^6`.
- 🟡 **Permanent URLs (#31):** a topic's `slug` is **frozen at creation**
  (base-slug + random suffix) and never regenerated on title edits, so links never
  break. I chose a readable frozen slug over a bare uuid; it still satisfies
  "survives title edits." The plan's id-based-canonical-with-redirects option
  remains available if you later want title-in-URL that updates.
- 🟡 **Flat replies** for MVP (`posts.parent_id` column exists, reserved for future
  threading, but the UI renders a flat list).
- 🟢 Banned users blocked at the DAL (`requireUser`); topic **lock** enforced in the
  action + UI (not RLS). Reply-count kept in sync by the `bump_topic_on_post`
  trigger; `0004` revokes its RPC execute grant (cleared the one new advisor warning).
- 🟡 Admin report queue shows `target_type` + `target_id` (no slug lookup / deep
  link yet) — enough to act on; a convenience link can come later.
- 🟢 Seed: 1 sample topic + 1 reply (author `null`) so the pages render for review.

## Pre-existing security advisor warnings (NOT introduced here)

From the `0001_profiles` migration; flagged for a future hardening pass (relates
to issue #6 / #32), not fixed in the events PR to keep scope clean:

- `set_updated_at` has a mutable `search_path` (set it to `''`/`pg_catalog`).
- `citext` extension installed in `public` schema (move to an `extensions` schema).
- `SECURITY DEFINER` helpers (`is_admin`, `current_user_role`, `handle_new_user`,
  `guard_profile_privileges`, `rls_auto_enable`) are `EXECUTE`-able by
  anon/authenticated via RPC. Low risk (boolean/role helpers) but best practice is
  to `revoke execute ... from anon, authenticated`.
