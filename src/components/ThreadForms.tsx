'use client';

import { FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { College } from '@/lib/types';
import type { LocalThreadDraft } from '@/lib/local-thread-storage';
import { ContextAttachmentInfo, type ContextAttachmentHandle } from './ContextAttachmentInfo';
import { CurrentContextNote } from './CurrentContextNote';

export function CreateThreadForm({ college }: { college: College }) {
  const router = useRouter();
  const [draft, setDraft] = useState<LocalThreadDraft | null>(null);
  const [error, setError] = useState('');
  const attachmentRef = useRef<ContextAttachmentHandle | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const tags = String(form.get('tags') ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    setDraft({
      title: String(form.get('title') ?? '').trim(),
      context: String(form.get('context') ?? '').trim(),
      tags,
      body: String(form.get('body') ?? '').trim(),
    });
  };

  const postThread = async () => {
    if (!draft) return;
    setError('');
    const response = await fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, collegeId: college.id }),
    });
    const data = (await response.json()) as { ok: boolean; threadId?: string; error?: string };
    if (!response.ok || !data.ok || !data.threadId) {
      setError(data.error ?? 'Could not save this yet. Try again.');
      return;
    }
    try {
      await attachmentRef.current?.uploadForTarget('THREAD', data.threadId);
    } catch {
      setError('Thread saved, but context attachment could not be saved yet. Try again from the thread page.');
      return;
    }
    router.push(`/colleges/${college.slug}/threads/${data.threadId}`);
    router.refresh();
  };

  return (
    <div className="grid gap-5">
      <form className="solid-readable rounded-3xl p-4 sm:p-5" onSubmit={onSubmit}>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-ink">Start a live student thread</h1>
          <p className="text-sm leading-6 text-ink/65">
            Ask for lived context about {college.name}. Keep it specific and useful for future students.
          </p>
        </div>
        <div className="mt-4">
          <CurrentContextNote />
        </div>
        <div className="mt-5 grid gap-3">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Topic title
            <input name="title" className="rounded-xl border border-line bg-surface/82 px-3 py-2.5 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20" placeholder="What do you want to understand?" required />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Branch/year context
              <input name="context" className="rounded-xl border border-line bg-surface/82 px-3 py-2.5 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20" placeholder="CSE, first year, hostel..." />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Topic tags
              <input name="tags" className="rounded-xl border border-line bg-surface/82 px-3 py-2.5 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20" placeholder="labs, hostel, clubs" />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Your question and context
            <textarea name="body" className="min-h-28 rounded-2xl border border-line bg-surface/82 px-3 py-3 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20" placeholder="Share what context would help. Avoid private information or personal attacks." required />
          </label>
        </div>
        <p className="mt-3 text-xs leading-5 text-ink/55">
          Context attachments can come later. Check safe sharing before adding screenshots or photos.
        </p>
        <button className="button-primary mt-5 px-4 py-2.5" type="submit">
          Prepare thread
        </button>
      </form>

      {draft && (
        <section className="glass-panel rounded-3xl p-4 sm:p-5">
          <p className="text-sm font-semibold text-leaf">Preview before posting</p>
          <h2 className="mt-2 text-lg font-semibold text-ink">{draft.title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/70">{draft.body}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {draft.context && <span className="soft-badge px-3">{draft.context}</span>}
            {draft.tags.map((tag) => (
              <span className="rounded bg-iris/10 px-3 py-1 text-xs font-semibold text-iris" key={tag}>{tag}</span>
            ))}
          </div>
          <p className="mt-4 rounded-2xl bg-mist/72 p-3 text-sm leading-6 text-ink/65">
            This is how the thread will appear to others. Keep it respectful and useful, and check that no private information is included.
          </p>
          <ContextAttachmentInfo ref={attachmentRef} />
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="button-primary px-4 py-2.5" onClick={postThread} type="button">
              Start thread
            </button>
            <button className="button-secondary px-4 py-2.5" onClick={() => setDraft(null)} type="button">
              Edit first
            </button>
          </div>
          {error && <p className="mt-3 text-sm font-semibold text-sun">{error}</p>}
        </section>
      )}
    </div>
  );
}

export function ReplyForm({ collegeId, threadId }: { collegeId: string; threadId: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const attachmentRef = useRef<ContextAttachmentHandle | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    const response = await fetch('/api/replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collegeId,
        threadId,
        context: String(form.get('context') ?? '').trim(),
        body: String(form.get('body') ?? '').trim(),
        attachmentLabel: String(form.get('attachment') ?? '').trim() || undefined,
      }),
    });
    const data = (await response.json()) as { ok: boolean; replyId?: string; error?: string };
    if (!response.ok || !data.ok) {
      setError(data.error ?? 'Could not save this yet. Try again.');
      return;
    }
    if (data.replyId) {
      try {
        await attachmentRef.current?.uploadForTarget('REPLY', data.replyId);
      } catch {
        setError('Reply saved, but context attachment could not be saved yet. Try again from the thread page.');
        return;
      }
    }
    event.currentTarget.reset();
    setSubmitted(true);
    router.refresh();
  };

  return (
    <form className="solid-readable rounded-3xl p-5" onSubmit={onSubmit}>
      <h3 className="font-semibold text-ink">Reply with student context</h3>
      <div className="mt-3">
        <CurrentContextNote />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Your context
          <select name="role" className="rounded-xl border border-line bg-surface/82 px-3 py-3 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20">
            <option>Aspirant</option>
            <option>Current student</option>
            <option>Alumni</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Branch / batch
          <input name="context" className="rounded-xl border border-line bg-surface/82 px-3 py-3 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20" placeholder="CSE, batch 2027" />
        </label>
      </div>
      <label className="mt-4 grid gap-2 text-sm font-semibold text-ink">
        Reply
        <textarea name="body" className="min-h-32 rounded-2xl border border-line bg-surface/82 px-3 py-3 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20" placeholder="Share what you lived, what changed, or what needs current context." required />
      </label>
      <p className="mt-3 text-xs leading-5 text-ink/55">
        Context images are reviewed before anything can be shown publicly.
      </p>
      <ContextAttachmentInfo ref={attachmentRef} />
      <button className="button-primary mt-5 px-5 py-3" type="submit">
        Prepare Reply
      </button>
      {error && <p className="mt-4 text-sm font-semibold text-sun">{error}</p>}
      {submitted && <p className="mt-4 text-sm font-semibold text-leaf">Reply saved. Thanks for adding useful context.</p>}
    </form>
  );
}
