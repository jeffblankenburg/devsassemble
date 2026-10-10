import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import {
  listDraftTweets,
  listScheduledTweets,
  listRecentPostedTweets,
} from "@/lib/tweets/queries";
import { getAutopilot } from "@/lib/settings";
import {
  GenerateButton,
  TweetConsole,
  PostedAt,
} from "@/components/admin/tweet-queue";
import { AutopilotPanel } from "@/components/admin/autopilot-panel";

export const metadata: Metadata = { title: "Tweets" };

export default async function AdminTweetsPage() {
  await requireAdmin();
  const [drafts, scheduled, posted, autopilot] = await Promise.all([
    listDraftTweets(),
    listScheduledTweets(),
    listRecentPostedTweets(10),
    getAutopilot(),
  ]);
  const pendingBatch = drafts.filter((d) => d.batch_date).length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-5xl uppercase tracking-wide text-brand-ink">
          Tweets
        </h1>
        <GenerateButton />
      </div>

      <AutopilotPanel
        enabled={autopilot.enabled}
        mode={autopilot.mode}
        pending={pendingBatch}
      />

      <TweetConsole drafts={drafts} scheduled={scheduled} />

      {posted.length > 0 && (
        <>
          <h2 className="mt-12 font-display text-2xl uppercase tracking-wide text-brand-ink">
            Recently posted
          </h2>
          <ul className="mt-4 flex flex-col gap-2">
            {posted.map((t) => (
              <li
                key={t.id}
                className="rounded-[var(--radius-comic)] border-[2px] border-brand-ink/30 bg-surface p-3 text-sm"
              >
                <div className="mb-1 flex items-center gap-2">
                  <PostedAt iso={t.posted_at} />
                </div>
                <p className="text-brand-ink/85">{t.body}</p>
                <div className="mt-1 flex flex-wrap gap-3">
                  {t.posted_url && (
                    <a
                      href={t.posted_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-comic font-mono text-xs text-brand-blue underline"
                    >
                      View on X
                    </a>
                  )}
                  {t.bluesky_url && (
                    <a
                      href={t.bluesky_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-comic font-mono text-xs text-brand-blue underline"
                    >
                      View on Bluesky
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
