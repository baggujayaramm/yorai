'use client';

import { useEffect, useState } from 'react';
import type { College } from '@/lib/types';
import { ContextAttachmentInfo } from './ContextAttachmentInfo';
import { CurrentContextNote } from './CurrentContextNote';

type ExperienceDraft = {
  title: string;
  studentType: string;
  branch: string;
  yearOrBatch: string;
  hostelStatus: string;
  body: string;
  whatWorked: string;
  wishIKnewEarlier: string;
  recentChanges: string;
  whoThisMayHelp: string;
  tags: string[];
};

type InsightDraft = {
  title: string;
  category: string;
  branch: string;
  practicalAdvice: string;
  whyItHelps: string;
  whoShouldKnow: string;
  tags: string[];
};

const emptyExperience: ExperienceDraft = {
  title: '',
  studentType: 'Current student',
  branch: '',
  yearOrBatch: '',
  hostelStatus: '',
  body: '',
  whatWorked: '',
  wishIKnewEarlier: '',
  recentChanges: '',
  whoThisMayHelp: '',
  tags: [],
};

const emptyInsight: InsightDraft = {
  title: '',
  category: '',
  branch: '',
  practicalAdvice: '',
  whyItHelps: '',
  whoShouldKnow: '',
  tags: [],
};

type ExperienceStep = 'context' | 'experience' | 'preview';
type InsightStep = 'form' | 'preview';

export function CreateExperienceForm({ college }: { college: College }) {
  const draftKey = `yorai-experience-draft:${college.id}`;
  const [draft, setDraft] = useState<ExperienceDraft>(() => readDraft(draftKey, emptyExperience));
  const [step, setStep] = useState<ExperienceStep>('context');
  const [shared, setShared] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    window.localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draftKey, draft]);

  const update = (key: keyof ExperienceDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setShared(false);
  };

  const share = async () => {
    setError('');
    setNotice('');
    setSubmitting(true);
    const response = await fetch('/api/experiences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collegeId: college.id,
        title: draft.title,
        body: draft.body,
        branch: draft.branch,
        studyPeriod: draft.yearOrBatch,
        tags: draft.tags,
        whatHelped: draft.whatWorked,
        wishIKnewEarlier: draft.wishIKnewEarlier,
        personalExperience: true,
      }),
    }).catch(() => null);
    setSubmitting(false);
    if (!response) {
      setError('Could not reach Yorai. Try again.');
      return;
    }
    const data = await response.json() as { ok?: boolean; error?: string; warning?: string };
    if (!response.ok || !data.ok) {
      setError(data.error ?? 'Could not share this experience.');
      return;
    }
    window.localStorage.removeItem(draftKey);
    setShared(true);
    setNotice(data.warning ?? '');
    setStep('context');
    setDraft(emptyExperience);
  };

  return (
    <section className="solid-readable rounded-3xl p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-ink">Share student experience</h3>
          <p className="mt-1 text-sm text-ink/60">A short lived-context post for future students.</p>
        </div>
        <StepPills current={step} steps={['context', 'experience', 'preview']} />
      </div>
      <div className="mt-4">
        <CurrentContextNote />
      </div>

      {step === 'context' && (
        <div className="mt-5 grid gap-3">
          <InputField value={draft.title} onChange={(value) => update('title', value)} placeholder="A specific student path or lesson" label="Title" />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Student type
              <select className={fieldClass} value={draft.studentType} onChange={(event) => update('studentType', event.target.value)}>
                <option>Current student</option>
                <option>Alumni</option>
              </select>
            </label>
            <InputField value={draft.branch} onChange={(value) => update('branch', value)} placeholder="CSE, ECE, BCA..." label="Branch" />
            <InputField value={draft.yearOrBatch} onChange={(value) => update('yearOrBatch', value)} placeholder="2nd year, batch 2027..." label="Year or batch" />
          </div>
          <button className="button-primary w-fit px-4 py-2.5" onClick={() => setStep('experience')} type="button">
            Continue
          </button>
        </div>
      )}

      {step === 'experience' && (
        <div className="mt-5 grid gap-3">
          <TextareaField value={draft.body} onChange={(value) => update('body', value)} label="My experience" placeholder="Share what you lived, calmly and specifically." />
          <TextareaField value={draft.whatWorked} onChange={(value) => update('whatWorked', value)} label="What helped me" placeholder="People, routines, resources, clubs, labs..." />
          <TextareaField value={draft.wishIKnewEarlier} onChange={(value) => update('wishIKnewEarlier', value)} label="What I wish I knew earlier" placeholder="Useful context for future students." />

          <details className="rounded-2xl border border-line bg-surface/64 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-iris">Optional context</summary>
            <div className="mt-4 grid gap-3">
              <InputField value={draft.hostelStatus} onChange={(value) => update('hostelStatus', value)} placeholder="Hostel, day scholar, mixed..." label="Hostel/day scholar" />
              <TextareaField value={draft.recentChanges} onChange={(value) => update('recentChanges', value)} label="What changed recently" placeholder="Leave blank if you are not sure." />
              <TextareaField value={draft.whoThisMayHelp} onChange={(value) => update('whoThisMayHelp', value)} label="Who this may help" placeholder="Aspirants, first-years, hostel students..." />
              <TagField tags={draft.tags} onChange={(tags) => setDraft((current) => ({ ...current, tags }))} />
              <p className="text-xs leading-5 text-ink/55">Add context only after removing private information.</p>
              <ContextAttachmentInfo />
            </div>
          </details>

          <div className="flex flex-wrap gap-3">
            <button className="button-primary px-4 py-2.5" onClick={() => setStep('preview')} type="button">
              Prepare experience
            </button>
            <button className="button-secondary px-4 py-2.5" onClick={() => setStep('context')} type="button">
              Back
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <Preview
          title={draft.title}
          context={[draft.studentType, draft.branch, draft.yearOrBatch, draft.hostelStatus].filter(Boolean).join(' · ')}
          body={draft.body}
          tags={draft.tags}
          note="This is how it will appear to others. Make sure it is respectful, useful, and free of private information."
          action="Share experience"
          onAction={share}
          submitting={submitting}
          onEdit={() => setStep('experience')}
        />
      )}

      {shared && <p className="mt-4 text-sm font-semibold text-leaf">Experience shared.</p>}
      {notice && <p className="mt-4 text-sm font-semibold text-sun">{notice}</p>}
      {error && <p aria-live="assertive" className="mt-4 text-sm font-semibold text-sun" role="alert">{error}</p>}
    </section>
  );
}

export function CreateWhatWorksForm({ college }: { college: College }) {
  const draftKey = `yorai-insight-draft:${college.id}`;
  const [draft, setDraft] = useState<InsightDraft>(() => readDraft(draftKey, emptyInsight));
  const [step, setStep] = useState<InsightStep>('form');
  const [shared, setShared] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    window.localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draftKey, draft]);

  const update = (key: keyof InsightDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setShared(false);
  };

  const share = async () => {
    setError('');
    setNotice('');
    setSubmitting(true);
    const response = await fetch('/api/what-works', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collegeId: college.id,
        title: draft.title,
        category: draft.category,
        branch: draft.branch,
        advice: draft.practicalAdvice,
        whyItHelps: draft.whyItHelps,
        whoShouldKnow: draft.whoShouldKnow,
        tags: draft.tags,
      }),
    }).catch(() => null);
    setSubmitting(false);
    if (!response) {
      setError('Could not reach Yorai. Try again.');
      return;
    }
    const data = await response.json() as { ok?: boolean; error?: string; warning?: string };
    if (!response.ok || !data.ok) {
      setError(data.error ?? 'Could not share this insight.');
      return;
    }
    window.localStorage.removeItem(draftKey);
    setShared(true);
    setNotice(data.warning ?? '');
    setStep('form');
    setDraft(emptyInsight);
  };

  return (
    <section className="solid-readable rounded-3xl p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-ink">Share what actually works</h3>
        <p className="text-sm text-ink/60">Practical guidance students can use inside college life.</p>
      </div>
      <div className="mt-4">
        <CurrentContextNote />
      </div>
      {notice && <p className="mt-4 text-sm font-semibold text-sun">{notice}</p>}

      {step === 'form' && (
        <div className="mt-5 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField value={draft.title} onChange={(value) => update('title', value)} placeholder="A practical insight students can use" label="Title" />
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Category
              <select className={fieldClass} value={draft.category} onChange={(event) => update('category', event.target.value)}>
                <option value="">Choose category</option>
                <option value="academics">Academics</option>
                <option value="placements">Placements</option>
                <option value="internships">Internships</option>
                <option value="clubs">Clubs</option>
                <option value="projects">Projects</option>
                <option value="hostel">Hostel</option>
                <option value="commuting">Commuting</option>
                <option value="administration">Administration</option>
              </select>
            </label>
          </div>
          <TextareaField value={draft.practicalAdvice} onChange={(value) => update('practicalAdvice', value)} label="What works?" placeholder="Share the practical action." />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextareaField value={draft.whyItHelps} onChange={(value) => update('whyItHelps', value)} label="Why it helps" placeholder="Explain the benefit." />
            <TextareaField value={draft.whoShouldKnow} onChange={(value) => update('whoShouldKnow', value)} label="Who should know this?" placeholder="Aspirants, first-years, project builders..." />
          </div>

          <details className="rounded-2xl border border-line bg-surface/64 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-iris">Optional context</summary>
            <div className="mt-4 grid gap-3">
              <InputField value={draft.branch} onChange={(value) => update('branch', value)} placeholder="CSE, first year, hostel..." label="Branch/context" />
              <TagField tags={draft.tags} onChange={(tags) => setDraft((current) => ({ ...current, tags }))} />
              <p className="text-xs leading-5 text-ink/55">Add context only after removing private information.</p>
              <ContextAttachmentInfo />
            </div>
          </details>

          <button className="button-primary w-fit px-4 py-2.5" onClick={() => setStep('preview')} type="button">
            Prepare insight
          </button>
        </div>
      )}

      {step === 'preview' && (
        <Preview
          title={draft.title}
          context={[draft.category, draft.branch].filter(Boolean).join(' · ')}
          body={draft.practicalAdvice}
          tags={draft.tags}
          note="This is how it will appear to others. Make sure it helps students prepare, not panic, and includes no private information."
          action="Share insight"
          onAction={share}
          submitting={submitting}
          onEdit={() => setStep('form')}
        />
      )}

      {shared && <p className="mt-4 text-sm font-semibold text-leaf">Insight shared for {college.name}.</p>}
      {error && <p aria-live="assertive" className="mt-4 text-sm font-semibold text-sun" role="alert">{error}</p>}
    </section>
  );
}

const fieldClass = 'rounded-xl border border-line bg-surface/82 px-3 py-2.5 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20';

function InputField({ value, label, placeholder, onChange }: { value: string; label: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <input className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function TextareaField({ value, label, placeholder, onChange }: { value: string; label: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <textarea className={`${fieldClass} min-h-24`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function TagField({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      Tags
      <input className={fieldClass} value={tags.join(', ')} onChange={(event) => onChange(splitTags(event.target.value))} placeholder="first year, hostel, projects" />
    </label>
  );
}

function Preview({ title, context, body, tags, note, action, submitting = false, onAction, onEdit }: { title: string; context: string; body: string; tags: string[]; note: string; action: string; submitting?: boolean; onAction: () => void; onEdit: () => void }) {
  return (
    <div className="glass-panel mt-5 rounded-3xl p-4">
      <p className="text-sm font-semibold text-leaf">Preview</p>
      <h4 className="mt-2 text-lg font-semibold text-ink">{title || 'Untitled student context'}</h4>
      {context && <p className="mt-1 text-sm font-semibold text-iris">{context}</p>}
      <p className="mt-2 text-sm leading-6 text-ink/70">{body || 'Add enough context so another student can understand what you mean.'}</p>
      {!!tags.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => <span className="rounded-full bg-iris/10 px-2 py-1 text-xs font-semibold text-iris" key={tag}>{tag}</span>)}
        </div>
      )}
      <p className="mt-4 rounded-2xl bg-mist/72 p-3 text-sm leading-6 text-ink/65">{note}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="button-primary px-4 py-2.5 disabled:opacity-60" disabled={submitting} onClick={onAction} type="button">{submitting ? 'Sharing...' : action}</button>
        <button className="button-secondary px-4 py-2.5" disabled={submitting} onClick={onEdit} type="button">Edit first</button>
      </div>
    </div>
  );
}

function StepPills({ current, steps }: { current: string; steps: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {steps.map((step, index) => (
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${current === step ? 'bg-iris/10 text-iris' : 'bg-mist text-ink/45'}`} key={step}>
          {index + 1}. {step}
        </span>
      ))}
    </div>
  );
}

function splitTags(value: string) {
  return value.split(',').map((tag) => tag.trim()).filter(Boolean);
}

function readDraft<T>(key: string, fallback: T) {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) as T : fallback;
  } catch {
    return fallback;
  }
}
