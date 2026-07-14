'use client';

import { useEffect, useState } from 'react';
import { getLocalReplies, LOCAL_THREAD_EVENT, type LocalReply } from '@/lib/local-thread-storage';
import { freshnessClass } from './ThreadCard';
import { ReportButton } from './ReportButton';
import { ContextBadge } from './ContextBadge';
import { CommunityContextButtons } from './CommunityContextButtons';
import { ContextAttachmentInfo, ContextAttachmentSection } from './ContextAttachmentInfo';

export function LocalReplies({ threadId }: { threadId: string }) {
  const [replies, setReplies] = useState<LocalReply[]>([]);

  useEffect(() => {
    const load = () => setReplies(getLocalReplies(threadId));
    load();
    window.addEventListener(LOCAL_THREAD_EVENT, load);
    window.addEventListener('storage', load);

    return () => {
      window.removeEventListener(LOCAL_THREAD_EVENT, load);
      window.removeEventListener('storage', load);
    };
  }, [threadId]);

  if (replies.length === 0) return null;

  return (
    <>
      {replies.map((reply) => (
        <article className="thread-reply rounded-3xl p-5" key={reply.id}>
          <div className="mb-3">
            <span className="state-label state-label-reply">Reply</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <ContextBadge label={reply.speakerContext ?? reply.authorLabel} tone={reply.trustLabel === 'Current student' ? 'student' : 'trust'} />
            <span className="rounded bg-iris/10 px-2 py-1 text-iris">{reply.studentTypeContext}</span>
            <span className={`rounded px-2 py-1 ${freshnessClass(reply.freshnessLabel)}`}>{reply.freshnessLabel}</span>
            {reply.contextBadge && <span className="rounded bg-mist px-2 py-1 text-ink/65">{reply.contextBadge}</span>}
            <ContextBadge label={reply.trustLabel} tone="trust" />
          </div>
          <p className="mt-4 text-sm leading-6 text-ink/70">{reply.body}</p>
          <div className="mt-4">
            <ContextAttachmentInfo targetType="REPLY" targetId={reply.id} compact />
          </div>
          <div className="mt-4">
            <ContextAttachmentSection targetType="REPLY" targetId={reply.id} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-ink/50">
            {reply.branchContext && <span>{reply.branchContext}</span>}
            {reply.communityContext && <span>{reply.communityContext}</span>}
            <span>{reply.postedAt}</span>
          </div>
          <div className="mt-4">
            <CommunityContextButtons targetType="reply" targetId={reply.id} initialFreshness={reply.freshnessLabel} />
          </div>
          <div className="mt-4 flex justify-end border-t border-line pt-4">
            <ReportButton targetId={reply.id} targetType="reply" />
          </div>
        </article>
      ))}
    </>
  );
}
