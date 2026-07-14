'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { colleges, experiences, questions, whatWorksPosts } from '@/lib/seed-data';
import { getAllLocalExperiences, getAllLocalWhatWorks, LOCAL_POST_EVENT } from '@/lib/local-post-storage';
import { getLocalThreads, LOCAL_THREAD_EVENT } from '@/lib/local-thread-storage';
import { fetchPersonalRecords, PERSONAL_STATE_EVENT, type PersonalRecord } from '@/lib/personal-state-storage';
import { freshnessClass } from './ThreadCard';

type ActivityItem = {
  type?: string;
  title: string;
  meta?: string;
  message?: string;
  href?: string;
  signal?: string;
  read?: boolean;
};

type ActivityPayload = {
  recentContributions?: ActivityItem[];
  recentNotifications?: ActivityItem[];
  followUps?: ActivityItem[];
};

export function MyYoraiDashboard() {
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [activity, setActivity] = useState<ActivityPayload>({});
  const [localSignal, setLocalSignal] = useState(0);

  useEffect(() => {
    const load = () => {
      fetchPersonalRecords().then(setRecords).catch(() => setRecords([]));
      fetch('/api/activity', { cache: 'no-store' })
        .then((response) => response.json() as Promise<ActivityPayload>)
        .then(setActivity)
        .catch(() => setActivity({}));
      setLocalSignal((value) => value + 1);
    };
    load();
    window.addEventListener(PERSONAL_STATE_EVENT, load);
    window.addEventListener(LOCAL_THREAD_EVENT, load);
    window.addEventListener(LOCAL_POST_EVENT, load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener(PERSONAL_STATE_EVENT, load);
      window.removeEventListener(LOCAL_THREAD_EVENT, load);
      window.removeEventListener(LOCAL_POST_EVENT, load);
      window.removeEventListener('storage', load);
    };
  }, []);

  const data = useMemo(() => {
    void localSignal;
    const allThreads = [...getLocalThreads(), ...questions];
    const allExperiences = [...getAllLocalExperiences(), ...experiences];
    const allInsights = [...getAllLocalWhatWorks(), ...whatWorksPosts];
    const followed = ids(records, 'college').map((id) => colleges.find((college) => college.id === id)).filter(Boolean);
    const watched = ids(records, 'thread').map((id) => allThreads.find((thread) => thread.id === id)).filter(Boolean);
    const savedExperiences = ids(records, 'experience').map((id) => allExperiences.find((experience) => experience.id === id)).filter(Boolean);
    const savedInsights = ids(records, 'insight').map((id) => allInsights.find((insight) => insight.id === id)).filter(Boolean);
    const needsContext = watched.filter((thread) => needsCurrentContext(`${thread?.freshnessLabel ?? ''} ${thread?.currentStudentSignal ?? ''} ${thread?.reconfirmationSignal ?? ''}`));
    const activeWatched = [...watched].sort((a, b) => Date.parse(b?.lastActiveDate ?? '') - Date.parse(a?.lastActiveDate ?? '')).slice(0, 4);

    return { followed, watched, savedExperiences, savedInsights, needsContext, activeWatched };
  }, [localSignal, records]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-sm font-semibold text-iris">My Yorai</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">Saved student context</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
          Return to colleges, live threads, experiences, and practical insights you want to keep close.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <DashboardSection title="Recent contribution activity" empty="Start or answer a thread to see your recent Yorai activity here.">
          {(activity.recentContributions ?? []).map((item, index) => (
            <CompactCard href={item.href} key={`${item.title}-${index}`} title={item.title} meta={`${item.type ?? 'Contribution'} · ${item.meta ?? 'Student context'}`} badges={['Recently active']} />
          ))}
        </DashboardSection>

        <DashboardSection title="Follow-ups" empty="No follow-ups right now. Yorai will only nudge you when context is actually useful.">
          {(activity.followUps ?? []).map((item, index) => (
            <CompactCard href={item.href} key={`${item.title}-${index}`} title={item.title} meta={item.message ?? item.meta ?? 'Useful context update'} badges={['Needs current context']} />
          ))}
        </DashboardSection>

        <DashboardSection title="Followed colleges" empty="You haven’t followed any colleges yet.">
          {data.followed.map((college) => college && (
            <CompactCard href={`/colleges/${college.slug}`} key={college.id} title={college.name} meta={`${college.city}, ${college.state}`} badges={['Recently active', 'Student context']} />
          ))}
        </DashboardSection>

        <DashboardSection title="Watched live threads" empty="Watch a thread to follow student updates.">
          {data.watched.map((thread) => thread && (
            <CompactCard href={`/colleges/${collegeSlug(thread.collegeId)}/threads/${thread.id}`} key={thread.id} title={thread.title} meta={thread.participantContext} badges={[thread.freshnessLabel, thread.currentStudentSignal, thread.reconfirmationSignal]} />
          ))}
        </DashboardSection>

        <DashboardSection title="Saved student experiences" empty="Save useful experiences so you can return later.">
          {data.savedExperiences.map((experience) => experience && (
            <CompactCard href={experience.id.startsWith('local-') ? undefined : `/experiences/${experience.id}`} key={experience.id} title={experience.title} meta={experience.studentContext} badges={[experience.freshnessLabel, experience.contextBadge ?? 'Student experience']} />
          ))}
        </DashboardSection>

        <DashboardSection title="Saved what-works insights" empty="Save useful insights so you can return later.">
          {data.savedInsights.map((insight) => insight && (
            <CompactCard href={insight.id.startsWith('local-') ? undefined : `/what-works/${insight.id}`} key={insight.id} title={insight.title} meta={insight.category} badges={[insight.freshnessLabel ?? 'Fresh', insight.contextBadge ?? 'Practical context']} />
          ))}
        </DashboardSection>

        <DashboardSection title="Threads needing current context" empty="No watched threads need current context right now.">
          {data.needsContext.map((thread) => thread && (
            <CompactCard href={`/colleges/${collegeSlug(thread.collegeId)}/threads/${thread.id}`} key={thread.id} title={thread.title} meta={thread.participantContext} badges={['Needs current context', thread.currentStudentSignal]} />
          ))}
        </DashboardSection>

        <DashboardSection title="Recently active watched threads" empty="Watch a thread to see recent activity here.">
          {data.activeWatched.map((thread) => thread && (
            <CompactCard href={`/colleges/${collegeSlug(thread.collegeId)}/threads/${thread.id}`} key={thread.id} title={thread.title} meta={`Last active ${thread.lastActiveDate}`} badges={[thread.lastActivity, thread.freshnessLabel]} />
          ))}
        </DashboardSection>

        <DashboardSection title="Recent notifications" empty="No notifications yet. Follow colleges or watch threads to get calm updates.">
          {(activity.recentNotifications ?? []).map((item, index) => (
            <CompactCard href={item.href ?? '/notifications'} key={`${item.title}-${index}`} title={item.title} meta={item.message ?? 'Yorai update'} badges={[item.read ? 'Read' : 'Recently active']} />
          ))}
        </DashboardSection>
      </div>
    </main>
  );
}

function DashboardSection({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const isEmpty = Array.isArray(items) ? items.length === 0 : !items;

  return (
    <section className="liquid-glass-panel liquid-glass-strong rounded-3xl p-5">
      <h2 className="font-semibold text-ink">{title}</h2>
      <div className="mt-4 grid gap-3">
        {isEmpty ? <p className="rounded-2xl border border-dashed border-white/40 bg-surface/62 p-4 text-sm text-ink/60 dark:border-white/10">{empty}</p> : items}
      </div>
    </section>
  );
}

function CompactCard({ href, title, meta, badges }: { href?: string; title: string; meta: string; badges: Array<string | undefined> }) {
  const content = (
    <article className="liquid-glass-card rounded-2xl p-4">
      <h3 className="font-semibold text-ink">{title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/62">{meta}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {badges.filter(Boolean).map((badge) => (
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${freshnessClass(badge)}`} key={badge}>
            {badge}
          </span>
        ))}
      </div>
    </article>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function ids(records: PersonalRecord[], targetType: PersonalRecord['targetType']) {
  return records.filter((record) => record.targetType === targetType).map((record) => record.targetId);
}

function collegeSlug(collegeId: string) {
  return colleges.find((college) => college.id === collegeId)?.slug ?? 'aster-valley-institute-of-technology';
}

function needsCurrentContext(text: string) {
  const value = text.toLowerCase();
  return value.includes('needs current') || value.includes('past experience') || value.includes('changed recently') || value.includes('should update');
}
