'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getLocalThread, LOCAL_THREAD_EVENT, type LocalThread } from '@/lib/local-thread-storage';
import type { College } from '@/lib/types';
import { CommunityContextButtons } from './CommunityContextButtons';
import { ContextAttachmentInfo, ContextAttachmentSection } from './ContextAttachmentInfo';
import { LocalReplies } from './LocalReplies';
import { ReplyForm } from './ThreadForms';
import { ThreadCard } from './ThreadCard';

export function LocalThreadDetail({ college, threadId }: { college: College; threadId: string }) {
  const [thread, setThread] = useState<LocalThread | null | undefined>(undefined);

  useEffect(() => {
    const load = () => setThread(getLocalThread(threadId) ?? null);
    load();
    window.addEventListener(LOCAL_THREAD_EVENT, load);
    window.addEventListener('storage', load);

    return () => {
      window.removeEventListener(LOCAL_THREAD_EVENT, load);
      window.removeEventListener('storage', load);
    };
  }, [threadId]);

  if (thread === undefined) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 text-sm text-ink/65 sm:px-6">
        Loading local thread...
      </main>
    );
  }

  if (!thread) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link className="text-sm font-semibold text-iris" href={`/colleges/${college.slug}#live-threads`}>
          Back to {college.name}
        </Link>
        <div className="mt-6 rounded border border-line bg-surface/72 p-6 text-sm text-ink/65 shadow-soft backdrop-blur-xl">
          This local thread was not found in this browser.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link className="text-sm font-semibold text-iris" href={`/colleges/${college.slug}#live-threads`}>
        Back to {college.name}
      </Link>
      <section className="mt-6 grid gap-6">
        <ThreadCard college={college} thread={thread} />
        <ContextAttachmentInfo targetType="THREAD" targetId={thread.id} />
        <ContextAttachmentSection targetType="THREAD" targetId={thread.id} />
        <CommunityContextButtons targetType="thread" targetId={thread.id} initialFreshness={thread.freshnessLabel} />
        <section className="grid gap-4">
          <h1 className="text-2xl font-semibold text-ink">Student replies</h1>
          <LocalReplies threadId={thread.id} />
          {thread.status === 'OPEN' && (
            <div className="rounded border border-dashed border-line bg-surface/72 p-6 text-sm text-ink/65 shadow-soft backdrop-blur-xl">
              No replies yet. Current students and alumni can add context below.
            </div>
          )}
        </section>
        <ReplyForm collegeId={college.id} threadId={thread.id} />
      </section>
    </main>
  );
}
