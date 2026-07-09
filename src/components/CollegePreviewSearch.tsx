'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { College } from '@/lib/types';
import { getCollegeActivity, getCollegeStats, getSeedCollegeProfileData } from '@/lib/data';

type CollegePreviewSearchProps = {
  colleges: College[];
};

export function CollegePreviewSearch({ colleges }: CollegePreviewSearchProps) {
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  const openPreview = (college: College, trigger: HTMLButtonElement) => {
    lastTriggerRef.current = trigger;
    setSelectedCollege(college);
  };

  const closePreview = () => {
    setSelectedCollege(null);
  };

  useEffect(() => {
    if (!selectedCollege) {
      lastTriggerRef.current?.focus();
    }
  }, [selectedCollege]);

  return (
    <>
      <div className="grid gap-5">
        {colleges.map((college) => {
          const stats = getCollegeStats(college.id);
          return (
            <article className="liquid-glass-card rounded-3xl p-5" key={college.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-iris">{college.city}, {college.state}</p>
                  <button
                    className="mt-1 block text-left text-xl font-semibold text-ink outline-none hover:text-iris focus:text-iris"
                    onClick={(event) => openPreview(college, event.currentTarget)}
                    type="button"
                  >
                    {college.name}
                  </button>
                  <p className="mt-2 text-sm text-ink/65">
                    Student space for {college.courses.slice(0, 2).join(' and ')} context.
                  </p>
                </div>
                <button
                  className="button-secondary px-4 py-2 text-center focus:border-iris focus:text-iris"
                  onClick={(event) => openPreview(college, event.currentTarget)}
                  type="button"
                >
                  Preview space
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {college.courses.slice(0, 4).map((course) => (
                  <span className="soft-badge px-3" key={course}>
                    {course}
                  </span>
                ))}
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-ink/50">Live threads</dt>
                  <dd className="font-semibold text-ink">Recently active</dd>
                </div>
                <div>
                  <dt className="text-ink/50">Student voices</dt>
                  <dd className="font-semibold text-ink">{stats.experiences > 0 ? 'Sharing context' : 'Inviting context'}</dd>
                </div>
                <div>
                  <dt className="text-ink/50">Activity</dt>
                  <dd className="font-semibold text-ink">{getCollegeActivity(college.id)}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>

      {selectedCollege && (
        <CollegePreviewModal college={selectedCollege} onClose={closePreview} />
      )}
    </>
  );
}

function CollegePreviewModal({ college, onClose }: { college: College; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const profile = getSeedCollegeProfileData(college.id);
  const latestThreads = profile.questions.slice(0, 2);
  const experiences = profile.experiences.slice(0, 2);
  const whatWorks = profile.whatWorks.slice(0, 2);
  const contextBadge =
    latestThreads.find((thread) => thread.contextBadge)?.contextBadge ??
    experiences.find((experience) => experience.contextBadge)?.contextBadge ??
    whatWorks.find((post) => post.contextBadge)?.contextBadge;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialog) return;

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      aria-labelledby="college-preview-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/42 px-3 py-3 backdrop-blur-2xl sm:items-center sm:px-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <div
        className="liquid-glass-modal liquid-glass-strong showcase-glass max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-[2.25rem] p-5 outline-none sm:rounded-[2.5rem] sm:p-6"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-iris">{college.city}, {college.state}</p>
            <h2 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl" id="college-preview-title">
              {college.name}
            </h2>
            <p className="mt-2 text-sm text-ink/65">{college.affiliation}</p>
          </div>
          <button
            aria-label="Close college preview"
            className="button-secondary px-3 py-2"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded bg-leaf/10 px-2 py-1 text-leaf">{getCollegeActivity(college.id)}</span>
          <span className="rounded bg-iris/10 px-2 py-1 text-iris">Branch context available</span>
          <span className="rounded bg-leaf/10 px-2 py-1 text-leaf">Current students responding</span>
          {contextBadge && <span className="soft-badge">{contextBadge}</span>}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="liquid-glass-panel rounded-3xl p-4">
            <h3 className="font-semibold text-ink">Latest live threads</h3>
            <div className="mt-3 grid gap-3">
              {latestThreads.map((thread) => (
                <article className="rounded-2xl border border-white/38 bg-surface/64 p-3 dark:border-white/10" key={thread.id}>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="text-leaf">{thread.freshnessLabel}</span>
                    {thread.branch && <span className="text-ink/55">{thread.branch}</span>}
                  </div>
                  <h4 className="mt-2 text-sm font-semibold text-ink">{thread.title}</h4>
                  <p className="mt-1 text-xs leading-5 text-ink/65">{thread.latestReplies[0]}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="liquid-glass-panel rounded-3xl p-4">
            <h3 className="font-semibold text-ink">Student experiences</h3>
            <div className="mt-3 grid gap-3">
              {experiences.map((experience) => (
                <article className="rounded-2xl border border-white/38 bg-surface/64 p-3 dark:border-white/10" key={experience.id}>
                  <p className="text-xs font-semibold text-ink/55">{experience.studentContext}</p>
                  <h4 className="mt-2 text-sm font-semibold text-ink">{experience.title}</h4>
                  <p className="mt-1 text-xs leading-5 text-ink/65">{experience.whoThisMayHelp}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="liquid-glass-panel mt-5 rounded-3xl p-4">
          <h3 className="font-semibold text-ink">What Actually Works</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {whatWorks.map((post) => (
              <article className="rounded-2xl border border-white/38 bg-surface/64 p-3 dark:border-white/10" key={post.id}>
                <p className="text-xs font-semibold text-iris">{post.category}</p>
                <h4 className="mt-2 text-sm font-semibold text-ink">{post.title}</h4>
                <p className="mt-1 text-xs leading-5 text-ink/65">{post.body}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link
            className="button-primary text-center"
            href={`/colleges/${college.slug}`}
          >
            Open Full Page
          </Link>
          <button className="button-secondary" type="button">
            Ask Students
          </button>
          <button className="button-secondary" type="button">
            Save / Follow College
          </button>
        </div>
      </div>
    </div>
  );
}
