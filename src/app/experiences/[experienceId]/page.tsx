import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContextBadge } from '@/components/ContextBadge';
import { CommunityContextButtons } from '@/components/CommunityContextButtons';
import { ContextAttachmentInfo, ContextAttachmentSection } from '@/components/ContextAttachmentInfo';
import { ReportButton } from '@/components/ReportButton';
import { freshnessClass } from '@/components/ThreadCard';
import { PersonalActionButton } from '@/components/PersonalActionButton';
import { getExperienceByIdWithDb } from '@/lib/data';
import { experiences } from '@/lib/seed-data';

export const dynamic = 'force-dynamic';

type ExperienceDetailProps = {
  params: Promise<{ experienceId: string }>;
};

export function generateStaticParams() {
  return experiences.map((experience) => ({ experienceId: experience.id }));
}

export default async function ExperienceDetailPage({ params }: ExperienceDetailProps) {
  const { experienceId } = await params;
  const result = await getExperienceByIdWithDb(experienceId);
  const experience = result?.experience;
  const college = result?.college;

  if (!experience) {
    notFound();
  }

  if (!college) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link className="text-sm font-semibold text-iris" href={`/colleges/${college.slug}#student-experiences`}>
        Back to {college.name}
      </Link>
      <article className="mt-6 rounded border border-line bg-surface/72 p-5 shadow-soft backdrop-blur-xl">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <ContextBadge label={experience.studentContext} tone={experience.trustLabel === 'Current student' ? 'student' : 'trust'} />
          <ContextBadge label={experience.trustLabel ?? 'Context added'} tone="trust" />
          <span className={`rounded px-2 py-1 ${freshnessClass(experience.freshnessLabel)}`}>{experience.freshnessLabel}</span>
          {experience.contextBadge && <span className="rounded bg-mist px-2 py-1 text-ink/65">{experience.contextBadge}</span>}
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-ink">{experience.title}</h1>
        <div className="mt-5 grid gap-4 text-sm leading-6 text-ink/70 sm:grid-cols-2">
          <p><span className="font-semibold text-ink">My experience:</span> {experience.body}</p>
          <p><span className="font-semibold text-ink">What helped me:</span> {experience.whatWorked}</p>
          <p><span className="font-semibold text-ink">What I wish I knew earlier:</span> {experience.wishIKnewEarlier}</p>
          <p><span className="font-semibold text-ink">What changed recently:</span> {experience.recentChanges ?? experience.freshnessLabel}</p>
          <p><span className="font-semibold text-ink">Who this may help:</span> {experience.whoThisMayHelp}</p>
          <p><span className="font-semibold text-ink">Community context:</span> {experience.communityContext}</p>
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <ContextAttachmentInfo targetType="EXPERIENCE" targetId={experience.id} />
          <div className="mt-4">
            <ContextAttachmentSection targetType="EXPERIENCE" targetId={experience.id} />
          </div>
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <CommunityContextButtons targetType="experience" targetId={experience.id} initialFreshness={experience.freshnessLabel} />
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
          <PersonalActionButton targetType="experience" targetId={experience.id} label="Save" activeLabel="Saved" compact />
          <ReportButton targetId={experience.id} targetType="student experience" />
        </div>
      </article>
    </main>
  );
}
