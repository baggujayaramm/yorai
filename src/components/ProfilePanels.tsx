'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ExperiencePost, Question, WhatWorksPost } from '@/lib/types';
import type { College } from '@/lib/types';
import { getLocalThreadsForCollege, LOCAL_THREAD_EVENT, type LocalThread } from '@/lib/local-thread-storage';
import {
  getLocalExperiences,
  getLocalWhatWorks,
  LOCAL_POST_EVENT,
  type LocalExperience,
  type LocalWhatWorks,
} from '@/lib/local-post-storage';
import {
  COMMUNITY_CONTEXT_EVENT,
  getCommunityContextRecords,
  getCommunitySummary,
  type CommunityTargetType,
} from '@/lib/community-context-storage';
import { ThreadCard, freshnessClass } from './ThreadCard';
import { ReportButton } from './ReportButton';
import { CommunityContextSummary } from './CommunityContextButtons';
import { ContextBadge } from './ContextBadge';
import { PersonalActionButton } from './PersonalActionButton';

export function AskStudentsPanel({ questions }: { questions: Question[] }) {
  return (
    <div className="glass-panel rounded-3xl p-6">
      <h3 className="text-lg font-semibold text-ink">Ask people who lived it</h3>
      <p className="mt-2 text-sm leading-6 text-ink/65">
        Start from a real student question, then add branch, batch, hostel, or year context as the conversation grows.
      </p>
      <div className="mt-5 grid gap-3">
        {questions.slice(0, 2).map((question) => (
          <article className="rounded-2xl border border-white/38 bg-surface/64 p-4 dark:border-white/10" key={question.id}>
            <p className="text-xs font-semibold text-leaf">{question.currentStudentSignal}</p>
            <h4 className="mt-2 font-semibold text-ink">{question.title}</h4>
            <p className="mt-2 text-sm text-ink/65">{question.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function LiveThreadsPanel({ college, questions }: { college: College; questions: Question[] }) {
  const [filters, setFilters] = useState(defaultFilters);
  const [localThreads, setLocalThreads] = useState<LocalThread[]>([]);
  const contextSignal = useCommunityContextSignal();

  useEffect(() => {
    const load = () => setLocalThreads(getLocalThreadsForCollege(college.id));
    load();
    window.addEventListener(LOCAL_THREAD_EVENT, load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener(LOCAL_THREAD_EVENT, load);
      window.removeEventListener('storage', load);
    };
  }, [college.id]);

  const threads = useMemo(
    () => {
      void contextSignal;
      return sortItems([...localThreads, ...questions].filter((thread) => matchesFilters(toCommunityFilterText(thread, 'thread', thread.freshnessLabel), filters)), filters.sort);
    },
    [contextSignal, filters, localThreads, questions],
  );

  return (
    <div className="grid gap-4">
      <ContextFilterBar filters={filters} onChange={setFilters} />
      {threads.length === 0 && <EmptyContextState filters={filters} kind="threads" />}
      {threads.map((thread) => (
        <ThreadCard college={college} thread={thread} key={thread.id} />
      ))}
    </div>
  );
}

export function ExperiencePanel({ experiences, college, filtered = false }: { experiences: ExperiencePost[]; college?: College; filtered?: boolean }) {
  const [filters, setFilters] = useState(defaultFilters);
  const [localExperiences, setLocalExperiences] = useState<LocalExperience[]>([]);
  const contextSignal = useCommunityContextSignal();

  useEffect(() => {
    if (!college || !filtered) return;
    const load = () => setLocalExperiences(getLocalExperiences(college.id));
    load();
    window.addEventListener(LOCAL_POST_EVENT, load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener(LOCAL_POST_EVENT, load);
      window.removeEventListener('storage', load);
    };
  }, [college, filtered]);

  const visibleExperiences = useMemo(() => {
    void contextSignal;
    const all = filtered ? [...localExperiences, ...experiences] : experiences;
    const next = filtered ? all.filter((experience) => matchesFilters(toCommunityFilterText(experience, 'experience', experience.freshnessLabel), filters)) : all;
    return sortItems(next, filters.sort);
  }, [contextSignal, experiences, filtered, filters, localExperiences]);

  return (
    <div className="grid gap-3">
      {filtered && <ContextFilterBar filters={filters} onChange={setFilters} />}
      {filtered && visibleExperiences.length === 0 && <EmptyContextState filters={filters} kind="experiences" />}
      {visibleExperiences.slice(0, filtered ? 8 : 3).map((experience) => (
        <article className="solid-readable rounded-3xl p-5" key={experience.id}>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-ink/55">
            <span>{experience.studentContext}</span>
            <ContextBadge label={experience.trustLabel} tone={experience.trustLabel === 'Current student' ? 'student' : 'trust'} />
            <span className={`rounded px-2 py-1 ${freshnessClass(experience.freshnessLabel)}`}>
              {experience.freshnessLabel}
            </span>
            {experience.contextBadge && <span className="soft-badge">{experience.contextBadge}</span>}
          </div>
          <h3 className="mt-3 text-lg font-semibold text-ink">
            {experience.id.startsWith('local-') ? (
              experience.title
            ) : (
              <Link className="hover:text-iris" href={`/experiences/${experience.id}`}>
                {experience.title}
              </Link>
            )}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-ink/55">
            {experience.branch && <span className="soft-badge">{experience.branch}</span>}
            {(experience.yearOrBatch ?? experience.batch) && <span className="soft-badge">{experience.yearOrBatch ?? experience.batch}</span>}
            {experience.hostelStatus && <span className="soft-badge">{experience.hostelStatus}</span>}
            {experience.tags?.map((tag) => (
              <span className="rounded bg-iris/10 px-2 py-1 text-iris" key={tag}>{tag}</span>
            ))}
          </div>
          <div className="mt-4 grid gap-3 text-sm text-ink/68 sm:grid-cols-2">
            <p><span className="font-semibold text-ink">My experience:</span> {experience.body}</p>
            <p><span className="font-semibold text-ink">What helped me:</span> {experience.whatWorked}</p>
            <p><span className="font-semibold text-ink">What I wish I knew earlier:</span> {experience.wishIKnewEarlier}</p>
            <p><span className="font-semibold text-ink">What actually works here:</span> {experience.actuallyWorksHere}</p>
            <p><span className="font-semibold text-ink">What changed recently:</span> {experience.recentChanges ?? experience.freshnessLabel}</p>
            <p><span className="font-semibold text-ink">Who this may help:</span> {experience.whoThisMayHelp}</p>
            <p><span className="font-semibold text-ink">Community context:</span> {experience.communityContext}</p>
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <CommunityContextSummary targetType="experience" targetId={experience.id} initialFreshness={experience.freshnessLabel} />
          </div>
          <div className="mt-4 flex justify-end gap-2 border-t border-line pt-4">
            <PersonalActionButton targetType="experience" targetId={experience.id} label="Save" activeLabel="Saved" compact />
            <ReportButton targetId={experience.id} targetType="student experience" />
          </div>
        </article>
      ))}
    </div>
  );
}

export function WhatWorksPanel({ posts }: { posts: WhatWorksPost[] }) {
  const [filters, setFilters] = useState(defaultFilters);
  const [localPosts, setLocalPosts] = useState<LocalWhatWorks[]>([]);
  const contextSignal = useCommunityContextSignal();
  const collegeId = posts[0]?.collegeId;

  useEffect(() => {
    if (!collegeId) return;
    const load = () => setLocalPosts(getLocalWhatWorks(collegeId));
    load();
    window.addEventListener(LOCAL_POST_EVENT, load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener(LOCAL_POST_EVENT, load);
      window.removeEventListener('storage', load);
    };
  }, [collegeId]);

  const visiblePosts = useMemo(() => {
    void contextSignal;
    const all = [...localPosts, ...posts];
    return sortItems(all.filter((post) => matchesFilters(toCommunityFilterText(post, 'insight', post.freshnessLabel), filters)), filters.sort);
  }, [contextSignal, filters, localPosts, posts]);

  return (
    <div className="grid gap-3">
      <ContextFilterBar filters={filters} onChange={setFilters} />
      {visiblePosts.length === 0 && <EmptyContextState filters={filters} kind="insights" />}
      {visiblePosts.slice(0, 8).map((post) => (
        <article className="solid-readable rounded-3xl p-4" key={post.id}>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded bg-iris/10 px-2 py-1 text-iris">{post.category}</span>
            {post.freshnessLabel && (
              <span className={`rounded px-2 py-1 ${freshnessClass(post.freshnessLabel)}`}>
                {post.freshnessLabel}
              </span>
            )}
            <ContextBadge label={post.studentContext} tone={post.trustLabel === 'Current student' ? 'student' : 'trust'} />
            <ContextBadge label={post.trustLabel} tone="trust" />
            {post.contextBadge && <span className="soft-badge">{post.contextBadge}</span>}
          </div>
          <h3 className="mt-2 font-semibold text-ink">
            {post.id.startsWith('local-') ? (
              post.title
            ) : (
              <Link className="hover:text-iris" href={`/what-works/${post.id}`}>
                {post.title}
              </Link>
            )}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-ink/55">
            {post.branch && <span className="soft-badge">{post.branch}</span>}
            {post.studentContext && <span className="soft-badge">{post.studentContext}</span>}
            {post.tags?.map((tag) => (
              <span className="rounded bg-iris/10 px-2 py-1 text-iris" key={tag}>{tag}</span>
            ))}
          </div>
          <div className="mt-4 grid gap-3 text-sm text-ink/68 sm:grid-cols-2">
            <p><span className="font-semibold text-ink">What works:</span> {post.practicalAdvice ?? post.body}</p>
            {post.whyItHelps && <p><span className="font-semibold text-ink">Why it helps:</span> {post.whyItHelps}</p>}
            {post.whoShouldKnow && <p><span className="font-semibold text-ink">Who should know this:</span> {post.whoShouldKnow}</p>}
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <CommunityContextSummary targetType="insight" targetId={post.id} initialFreshness={post.freshnessLabel} />
          </div>
          <div className="mt-4 flex justify-end gap-2 border-t border-line pt-4">
            <PersonalActionButton targetType="insight" targetId={post.id} label="Save" activeLabel="Saved" compact />
            <ReportButton targetId={post.id} targetType="what works post" />
          </div>
        </article>
      ))}
    </div>
  );
}

type FilterState = {
  branch: string;
  studentType: string;
  year: string;
  freshness: string;
  topic: string;
  status: string;
  sort: string;
};

const defaultFilters: FilterState = {
  branch: 'All branches',
  studentType: 'All',
  year: 'All',
  freshness: 'All',
  topic: 'All',
  status: 'All',
  sort: 'Recently active first',
};

const filterOptions = {
  branch: ['All branches', 'CSE', 'ECE', 'Mechanical', 'Civil', 'Other'],
  studentType: ['All', 'Aspirant', 'Current Student', 'Alumni'],
  year: ['All', 'First year', 'Second year', 'Third year', 'Final year', 'Alumni context'],
  freshness: ['All', 'Fresh', 'Recent', 'Needs current context', 'Past experience', 'Reconfirmed'],
  topic: ['All', 'Labs', 'Hostel', 'Clubs', 'Attendance', 'Placements', 'Events', 'Hackathons', 'First year', 'Projects', 'Safety', 'Management'],
  status: ['All', 'Context attached', 'Current students responding', 'Changed recently', 'Needs current student update', 'Branch-specific', 'Mostly matched by students'],
  sort: ['Recently active first', 'Newest first', 'Fresh student context first', 'Reconfirmed first', 'Needs current context first'],
};

function ContextFilterBar({ filters, onChange }: { filters: FilterState; onChange: (filters: FilterState) => void }) {
  const update = (key: keyof FilterState, value: string) => onChange({ ...filters, [key]: value });
  const activeCount = Object.entries(filters).filter(([key, value]) => key !== 'sort' && !value.startsWith('All')).length;

  return (
    <details className="glass-panel rounded-3xl p-3">
      <summary className="cursor-pointer text-sm font-semibold text-ink">
        Filters and sort{activeCount ? ` · ${activeCount} active` : ''}
      </summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SelectFilter label="Branch" value={filters.branch} options={filterOptions.branch} onChange={(value) => update('branch', value)} />
        <SelectFilter label="Student type" value={filters.studentType} options={filterOptions.studentType} onChange={(value) => update('studentType', value)} />
        <SelectFilter label="Year / batch" value={filters.year} options={filterOptions.year} onChange={(value) => update('year', value)} />
        <SelectFilter label="Freshness" value={filters.freshness} options={filterOptions.freshness} onChange={(value) => update('freshness', value)} />
        <SelectFilter label="Topic" value={filters.topic} options={filterOptions.topic} onChange={(value) => update('topic', value)} />
        <SelectFilter label="Context status" value={filters.status} options={filterOptions.status} onChange={(value) => update('status', value)} />
        <SelectFilter label="Sort" value={filters.sort} options={filterOptions.sort} onChange={(value) => update('sort', value)} />
        <button className="self-end rounded border border-white/45 bg-surface/60 px-3 py-2 text-xs font-semibold text-ink/65 transition hover:border-iris/55 hover:text-iris dark:border-white/10" onClick={() => onChange(defaultFilters)} type="button">
          Clear filters
        </button>
      </div>
    </details>
  );
}

function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-ink/60">
      {label}
      <select className="rounded border border-white/45 bg-surface/82 px-2 py-2 text-sm font-medium text-ink outline-none backdrop-blur focus:border-iris focus:ring-4 focus:ring-iris/20 dark:border-white/10" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function EmptyContextState({ filters, kind }: { filters: FilterState; kind: 'threads' | 'experiences' | 'insights' }) {
  const topic = filters.topic !== 'All' ? filters.topic.toLowerCase() : '';
  const branch = filters.branch !== 'All branches' ? filters.branch : '';
  let message = `No matching student ${kind} found yet.`;

  if (filters.freshness === 'Fresh' && branch) message = `No fresh ${branch} ${kind} yet. Start one and ask current students.`;
  else if (topic === 'hostel') message = 'No hostel context found for this college yet.';
  else if (filters.studentType === 'Current Student') message = `No current student ${kind} yet. This topic needs fresh context.`;
  else if (filters.freshness === 'Past experience') message = 'Only past experiences found. Ask current students for an update.';

  return (
    <div className="rounded-2xl border border-dashed border-white/45 bg-surface/68 p-5 text-sm leading-6 text-ink/65 shadow-soft backdrop-blur-2xl dark:border-white/10">
      {message}
    </div>
  );
}

function matchesFilters(text: string, filters: FilterState) {
  return (
    matchesBranch(text, filters.branch) &&
    matchesToken(text, filters.studentType, { all: 'All' }) &&
    matchesYear(text, filters.year) &&
    matchesFreshness(text, filters.freshness) &&
    matchesTopic(text, filters.topic) &&
    matchesStatus(text, filters.status)
  );
}

function matchesBranch(text: string, branch: string) {
  if (branch === 'All branches') return true;
  if (branch === 'Other') return !['cse', 'computer', 'ece', 'electronics', 'mechanical', 'civil'].some((item) => text.includes(item));
  if (branch === 'CSE') return text.includes('cse') || text.includes('computer');
  if (branch === 'ECE') return text.includes('ece') || text.includes('electronics');
  return text.includes(branch.toLowerCase());
}

function matchesYear(text: string, year: string) {
  if (year === 'All') return true;
  if (year === 'First year') return text.includes('first year') || text.includes('1st year');
  if (year === 'Second year') return text.includes('second year') || text.includes('2nd year');
  if (year === 'Third year') return text.includes('third year') || text.includes('3rd year');
  if (year === 'Final year') return text.includes('final year') || text.includes('4th year');
  return text.includes('alumni') || text.includes('batch');
}

function matchesFreshness(text: string, freshness: string) {
  if (freshness === 'All') return true;
  if (freshness === 'Fresh') return text.includes('fresh');
  if (freshness === 'Recent') return text.includes('recent') || text.includes('updated');
  if (freshness === 'Needs current context') return text.includes('needs current');
  if (freshness === 'Past experience') return text.includes('past experience') || text.includes('past context');
  return text.includes('reconfirmed');
}

function matchesStatus(text: string, status: string) {
  if (status === 'All') return true;
  if (status === 'Mostly matched by students') return text.includes('mostly matched') || text.includes('matches my experience');
  if (status === 'Branch-specific') return text.includes('branch-specific') || text.includes('not true for my branch');
  return text.includes(status.toLowerCase());
}

function matchesToken(text: string, token: string, options: { all: string }) {
  if (token === options.all) return true;
  return text.includes(token.toLowerCase());
}

function matchesTopic(text: string, topic: string) {
  if (topic === 'All') return true;
  const lookup: Record<string, string[]> = {
    Labs: ['labs', 'lab'],
    Hostel: ['hostel'],
    Clubs: ['clubs', 'club'],
    Attendance: ['attendance'],
    Placements: ['placements', 'placement', 'internship'],
    Events: ['events', 'event'],
    Hackathons: ['hackathons', 'hackathon'],
    'First year': ['first year', '1st year'],
    Projects: ['projects', 'project'],
    Safety: ['safety'],
    Management: ['management'],
  };
  return (lookup[topic] ?? [topic.toLowerCase()]).some((term) => text.includes(term));
}

function sortItems<T>(items: T[], sort: string) {
  return [...items].sort((a, b) => scoreItem(b, sort) - scoreItem(a, sort));
}

function scoreItem(item: unknown, sort: string) {
  const text = toFilterText(item);
  if (sort === 'Fresh student context first') return text.includes('fresh') ? 5 : text.includes('recent') ? 3 : 0;
  if (sort === 'Reconfirmed first') return text.includes('reconfirmed') ? 5 : 0;
  if (sort === 'Needs current context first') return text.includes('needs current') || text.includes('past') ? 5 : 0;
  if (sort === 'Newest first') return Date.parse(getDate(item)) || 0;
  return Date.parse(getDate(item)) || freshnessScore(text);
}

function freshnessScore(text: string) {
  if (text.includes('fresh')) return 5;
  if (text.includes('recent')) return 4;
  if (text.includes('reconfirmed')) return 3;
  if (text.includes('needs current')) return 2;
  return 1;
}

function getDate(item: unknown) {
  if (isRecord(item) && typeof item.lastActiveDate === 'string') return item.lastActiveDate;
  return '';
}

function toFilterText(item: unknown) {
  if (!isRecord(item)) return '';
  return Object.values(item)
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map((value) => (typeof value === 'string' ? value : ''))
    .join(' ')
    .toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toCommunityFilterText(item: unknown, targetType: CommunityTargetType, freshness?: string) {
  const id = isRecord(item) && typeof item.id === 'string' ? item.id : '';
  const records = id ? getCommunityContextRecords(targetType, id) : [];
  const summary = getCommunitySummary({ records, initialFreshness: freshness, compact: true });
  return `${toFilterText(item)} ${summary}`.toLowerCase();
}

function useCommunityContextSignal() {
  const [signal, setSignal] = useState(0);

  useEffect(() => {
    const update = () => setSignal((value) => value + 1);
    window.addEventListener(COMMUNITY_CONTEXT_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(COMMUNITY_CONTEXT_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return signal;
}
