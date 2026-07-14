'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function ThreadStateActions({ threadId, status }: { threadId: string; status: string }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState('');

  const act = async (action: string) => {
    setMessage('');
    setLoading(action);
    const response = await fetch('/api/threads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, action }),
    }).catch(() => null);
    setLoading('');
    if (!response) {
      setMessage('Could not reach Yorai. Try again.');
      return;
    }
    const data = await response.json() as { ok?: boolean; error?: string };
    setMessage(response.ok && data.ok ? 'Thread updated.' : data.error ?? 'Could not update thread.');
    router.refresh();
  };

  return (
    <section className="rounded-3xl border border-line bg-surface/72 p-4 text-sm shadow-soft backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold text-ink">Thread state: {status}</span>
        <button className="button-secondary px-3 py-2" disabled={Boolean(loading)} onClick={() => act('mark-answered')} type="button">{loading === 'mark-answered' ? 'Updating...' : 'Mark answered'}</button>
        <button className="button-secondary px-3 py-2" disabled={Boolean(loading)} onClick={() => act('close')} type="button">{loading === 'close' ? 'Closing...' : 'Close thread'}</button>
      </div>
      {message && <p className="mt-3 font-semibold text-iris">{message}</p>}
    </section>
  );
}

export function ReplyManageActions({ replyId, initialBody, initialContext }: { replyId: string; initialBody: string; initialContext?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/replies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replyId, body: String(form.get('body') ?? ''), context: String(form.get('context') ?? '') }),
    }).catch(() => null);
    setLoading(false);
    if (!response) {
      setMessage('Could not reach Yorai. Try again.');
      return;
    }
    const data = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setMessage(data.error ?? 'Could not update reply.');
      return;
    }
    setEditing(false);
    setMessage('Reply updated.');
    router.refresh();
  };

  const remove = async () => {
    setLoading(true);
    setMessage('');
    const response = await fetch(`/api/replies?replyId=${encodeURIComponent(replyId)}`, { method: 'DELETE' }).catch(() => null);
    setLoading(false);
    if (!response) {
      setMessage('Could not reach Yorai. Try again.');
      return;
    }
    const data = await response.json() as { ok?: boolean; error?: string };
    setMessage(response.ok && data.ok ? 'Reply removed.' : data.error ?? 'Could not remove reply.');
    router.refresh();
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap justify-end gap-2">
        <button className="button-secondary px-3 py-2" disabled={loading} onClick={() => setEditing((value) => !value)} type="button">Edit</button>
        <button className="button-secondary px-3 py-2" disabled={loading} onClick={remove} type="button">{loading ? 'Working...' : 'Remove'}</button>
      </div>
      {editing && (
        <form className="grid gap-3 rounded-2xl border border-line bg-surface/70 p-3" onSubmit={save}>
          <input className="rounded-xl border border-line bg-surface/82 px-3 py-2.5 text-ink" defaultValue={initialContext ?? ''} name="context" placeholder="Branch / batch context" />
          <textarea className="min-h-24 rounded-2xl border border-line bg-surface/82 px-3 py-2.5 text-ink" defaultValue={initialBody} name="body" />
          <button className="button-primary w-fit px-4 py-2.5" disabled={loading} type="submit">{loading ? 'Saving...' : 'Save reply'}</button>
        </form>
      )}
      {message && <p className="text-sm font-semibold text-iris">{message}</p>}
    </div>
  );
}
