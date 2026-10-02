# Build decisions & review notes

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

## Pre-existing security advisor warnings (NOT introduced here)

From the `0001_profiles` migration; flagged for a future hardening pass (relates
to issue #6 / #32), not fixed in the events PR to keep scope clean:

- `set_updated_at` has a mutable `search_path` (set it to `''`/`pg_catalog`).
- `citext` extension installed in `public` schema (move to an `extensions` schema).
- `SECURITY DEFINER` helpers (`is_admin`, `current_user_role`, `handle_new_user`,
  `guard_profile_privileges`, `rls_auto_enable`) are `EXECUTE`-able by
  anon/authenticated via RPC. Low risk (boolean/role helpers) but best practice is
  to `revoke execute ... from anon, authenticated`.
