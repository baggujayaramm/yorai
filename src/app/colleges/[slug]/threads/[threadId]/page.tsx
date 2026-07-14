import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CommunityContextButtons } from '@/components/CommunityContextButtons';
import { LocalReplies } from '@/components/LocalReplies';
import { LocalThreadDetail } from '@/components/LocalThreadDetail';
import { ReplyForm } from '@/components/ThreadForms';
import { ThreadCard, freshnessClass } from '@/components/ThreadCard';
import { ReportButton } from '@/components/ReportButton';
import { ContextBadge } from '@/components/ContextBadge';
import { ReplyManageActions, ThreadStateActions } from '@/components/ContributionActions';
import { ContextAttachmentInfo, ContextAttachmentSection } from '@/components/ContextAttachmentInfo';
import { getCollegeBySlugWithDb, getThreadByIdWithDb, getThreadRepliesWithDb } from '@/lib/data';
import { colleges, questions } from '@/lib/seed-data';

export const dynamic = 'force-dynamic';

type ThreadDetailPageProps = {
  params: Promise<{ slug: string; threadId: string }>;
};

export function generateStaticParams() {
  return questions.flatMap((thread) => {
    const college = colleges.find((item) => item.id === thread.collegeId);
    return college ? [{ slug: college.slug, threadId: thread.id }] : [];
  });
}

export default async function ThreadDetailPage({ params }: ThreadDetailPageProps) {
  const { slug, threadId } = await params;
  const college = await getCollegeBySlugWithDb(slug);
  const thread = await getThreadByIdWithDb(threadId);

  if (!college) {
    notFound();
  }

  if (!thread) {
    return <LocalThreadDetail college={college} threadId={threadId} />;
  }

  if (thread.collegeId !== college.id) {
    notFound();
  }

  const replies = await getThreadRepliesWithDb(thread.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link className="text-sm font-semibold text-iris" href={`/colleges/${college.slug}#live-threads`}>
        Back to {college.name}
      </Link>

      <section className="mt-6 grid gap-6">
        <ThreadCard college={college} thread={thread} variant="detail" />
        <ThreadStateActions threadId={thread.id} status={thread.status} />
        <ContextAttachmentInfo targetType="THREAD" targetId={thread.id} />
        <ContextAttachmentSection targetType="THREAD" targetId={thread.id} />

        {thread.summary && (
          <section className="surface-section rounded-3xl p-5">
            <h2 className="font-semibold text-ink">Thread summary</h2>
            <p className="mt-2 text-sm leading-6 text-ink/70">{thread.summary}</p>
            {thread.freshnessSummary && (
              <p className="mt-3 rounded bg-leaf/10 px-3 py-2 text-sm font-semibold text-leaf">
                {thread.freshnessSummary}
              </p>
            )}
          </section>
        )}

        {thread.attachment && (
          <section className="community-context-panel rounded-3xl p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold text-ink">{thread.attachment.label}</h2>
                <p className="mt-2 text-sm leading-6 text-ink/65">{thread.attachment.description}</p>
              </div>
              <span className="rounded bg-mist px-3 py-2 text-xs font-semibold text-ink/65">
                {thread.attachment.status}
              </span>
            </div>
          </section>
        )}

        {thread.freshnessLabel.includes('Past') || thread.freshnessLabel.includes('Needs') ? (
          <div className="rounded border border-line bg-surface/72 p-4 text-sm leading-6 text-sun shadow-soft backdrop-blur-xl">
            This thread may be older. Ask current students for recent branch, batch, hostel, or year context before depending on it.
          </div>
        ) : null}

        <CommunityContextButtons targetType="thread" targetId={thread.id} initialFreshness={thread.freshnessLabel} />

        <section className="grid gap-4">
          <h1 className="text-2xl font-semibold text-ink">Student replies</h1>
          <LocalReplies threadId={thread.id} />
          {replies.length > 0 ? (
            replies.map((reply) => (
              <article className={`thread-reply rounded-3xl p-5 ${reply.userId === thread.userId ? 'thread-author-reply' : ''}`} key={reply.id}>
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="state-label state-label-reply">Reply</span>
                  {reply.userId === thread.userId && <span className="state-label state-label-question">Thread Author</span>}
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
                  {reply.batchContext && <span>{reply.batchContext}</span>}
                  {reply.communityContext && <span>{reply.communityContext}</span>}
                  <span>{reply.postedAt}</span>
                  {reply.editedAt && <span>Edited {reply.editedAt}</span>}
                </div>
                {reply.communityCounts && reply.communityCounts.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                    {reply.communityCounts.map((item) => (
                      <span className="rounded bg-mist px-3 py-2 text-xs font-semibold text-ink/65" key={`${reply.id}-${item.label}`}>
                        {item.label}: {item.count}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4">
                  <CommunityContextButtons
                    targetType="reply"
                    targetId={reply.id}
                    initialFreshness={reply.freshnessLabel}
                    initialCounts={reply.communityCounts}
                  />
                </div>
                <div className="mt-4 flex justify-end border-t border-line pt-4">
                  <ReportButton targetId={reply.id} targetType="reply" />
                </div>
                {!reply.deletedAt && (
                  <div className="mt-4 border-t border-line pt-4">
                    <ReplyManageActions replyId={reply.id} initialBody={reply.body} initialContext={reply.branchContext} />
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className="thread-reply rounded-3xl border-dashed p-6 text-sm text-ink/65">
              No replies yet. Current students and alumni can add context below.
            </div>
          )}
        </section>

        {thread.status === 'CLOSED' || thread.status === 'ARCHIVED' ? (
          <div className="surface-section rounded-3xl p-5 text-sm font-semibold text-ink/65">
            This thread is closed for new replies, but remains readable for context.
          </div>
        ) : (
          <ReplyForm collegeId={college.id} threadId={thread.id} />
        )}
      </section>
    </main>
  );
}
