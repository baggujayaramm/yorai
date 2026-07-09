import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CommunityContextButtons } from '@/components/CommunityContextButtons';
import { ContextBadge } from '@/components/ContextBadge';
import { ContextAttachmentInfo, ContextAttachmentSection } from '@/components/ContextAttachmentInfo';
import { ReportButton } from '@/components/ReportButton';
import { freshnessClass } from '@/components/ThreadCard';
import { PersonalActionButton } from '@/components/PersonalActionButton';
import { getWhatWorksById } from '@/lib/data';
import { colleges, whatWorksPosts } from '@/lib/seed-data';

type WhatWorksDetailProps = {
  params: Promise<{ postId: string }>;
};

export function generateStaticParams() {
  return whatWorksPosts.map((post) => ({ postId: post.id }));
}

export default async function WhatWorksDetailPage({ params }: WhatWorksDetailProps) {
  const { postId } = await params;
  const post = getWhatWorksById(postId);

  if (!post) {
    notFound();
  }

  const college = colleges.find((item) => item.id === post.collegeId);

  if (!college) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link className="text-sm font-semibold text-iris" href={`/colleges/${college.slug}#what-actually-works`}>
        Back to {college.name}
      </Link>
      <article className="mt-6 rounded border border-line bg-surface/72 p-5 shadow-soft backdrop-blur-xl">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded bg-iris/10 px-2 py-1 text-iris">{post.category}</span>
          <ContextBadge label={post.studentContext} tone={post.trustLabel === 'Current student' ? 'student' : 'trust'} />
          <ContextBadge label={post.trustLabel ?? 'Context added'} tone="trust" />
          {post.freshnessLabel && <span className={`rounded px-2 py-1 ${freshnessClass(post.freshnessLabel)}`}>{post.freshnessLabel}</span>}
          {post.contextBadge && <span className="rounded bg-mist px-2 py-1 text-ink/65">{post.contextBadge}</span>}
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-ink">{post.title}</h1>
        <div className="mt-5 grid gap-4 text-sm leading-6 text-ink/70 sm:grid-cols-2">
          <p><span className="font-semibold text-ink">What works:</span> {post.practicalAdvice ?? post.body}</p>
          {post.whyItHelps && <p><span className="font-semibold text-ink">Why it helps:</span> {post.whyItHelps}</p>}
          {post.whoShouldKnow && <p><span className="font-semibold text-ink">Who should know this:</span> {post.whoShouldKnow}</p>}
          {post.branch && <p><span className="font-semibold text-ink">Branch/context:</span> {post.branch}</p>}
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <ContextAttachmentInfo targetType="INSIGHT" targetId={post.id} />
          <div className="mt-4">
            <ContextAttachmentSection targetType="INSIGHT" targetId={post.id} />
          </div>
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <CommunityContextButtons targetType="insight" targetId={post.id} initialFreshness={post.freshnessLabel} />
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
          <PersonalActionButton targetType="insight" targetId={post.id} label="Save" activeLabel="Saved" compact />
          <ReportButton targetId={post.id} targetType="what works post" />
        </div>
      </article>
    </main>
  );
}
