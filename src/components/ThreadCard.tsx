import Link from 'next/link';
import type { College, Question } from '@/lib/types';
import { ReportButton } from './ReportButton';
import { ContextBadge } from './ContextBadge';
import { CommunityContextSummary } from './CommunityContextButtons';
import { PersonalActionButton } from './PersonalActionButton';

export function freshnessClass(label = '') {
  if (label.includes('Past')) return 'rounded-full border border-line bg-mist/70 text-ink/58';
  if (label.includes('Needs')) return 'rounded-full border border-sun/30 bg-sun/15 text-sun';
  if (label.includes('Reconfirmed')) return 'rounded-full border border-leaf/25 bg-iris/10 text-iris ring-1 ring-leaf/25';
  if (label.includes('Updated') || label.includes('Recent')) return 'rounded-full border border-iris/20 bg-iris/12 text-iris';
  if (label.includes('Fresh')) return 'rounded-full border border-leaf/20 bg-leaf/12 text-leaf';
  return 'rounded-full border border-iris/20 bg-iris/12 text-iris';
}

type ThreadCardProps = {
  college: College;
  thread: Question;
  variant?: 'card' | 'detail';
};

export function ThreadCard({ college, thread, variant = 'card' }: ThreadCardProps) {
  const detail = variant === 'detail';
  return (
    <article className={`${detail ? 'thread-question' : 'liquid-glass-card dark-readable-glass live-thread-card'} rounded-3xl p-5`}>
      {detail && <span className="state-label state-label-question mb-3">Question</span>}
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <span className={`rounded px-2 py-1 ${freshnessClass(thread.freshnessLabel)}`}>
          {thread.freshnessLabel}
        </span>
        <span className="rounded border border-iris/20 bg-iris/12 px-2 py-1 text-iris dark:border-cyan/25 dark:bg-cyan/15 dark:text-cyan">{thread.currentStudentSignal}</span>
        <span className={thread.reconfirmationSignal.includes('Reconfirmed') ? 'state-label state-label-reconfirmed' : 'rounded border border-sun/20 bg-sun/12 px-2 py-1 text-sun dark:border-sun/30 dark:bg-sun/15 dark:text-sun'}>{thread.reconfirmationSignal}</span>
        {thread.contextBadge && (
          <span className="soft-badge">{thread.contextBadge}</span>
        )}
        <ContextBadge label={thread.speakerContext} tone={thread.trustLabel === 'Current student' ? 'student' : 'trust'} />
        <ContextBadge label={thread.trustLabel} tone="trust" />
        <CommunityContextSummary targetType="thread" targetId={thread.id} initialFreshness={thread.freshnessLabel} />
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className={`${detail ? 'text-2xl sm:text-3xl' : 'text-lg'} font-semibold text-ink`}>
            <Link className="hover:text-iris" href={`/colleges/${college.slug}/threads/${thread.id}`}>
              {thread.title}
            </Link>
          </h3>
          <p className="mt-2 text-sm leading-6 text-ink/65 dark:text-ink/78">{thread.body}</p>
        </div>
        <div className="shrink-0 text-sm font-semibold text-leaf">{thread.lastActivity}</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {thread.branch && <span className="soft-badge">{thread.branch}</span>}
        {thread.topicTags.map((tag) => (
          <span className="soft-badge" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm font-medium text-ink/70 dark:text-ink/82">{thread.participantContext}</p>
      <div className="mt-3 grid gap-2">
        {thread.latestReplies.slice(0, 2).map((reply) => (
          <p className="thread-reply-preview rounded-2xl border border-white/38 bg-surface/66 px-3 py-2 text-sm text-ink/65 backdrop-blur-xl dark:border-white/16 dark:text-ink/82" key={reply}>
            {reply}
          </p>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-xs font-semibold text-ink/50 dark:border-white/14 dark:text-ink/68">
        <span>Last active {thread.lastActiveDate}</span>
        <div className="flex flex-wrap items-center gap-2">
          <PersonalActionButton targetType="thread" targetId={thread.id} label="Watch thread" activeLabel="Watching" compact />
          <ReportButton targetId={thread.id} targetType="live thread" />
        </div>
      </div>
    </article>
  );
}
