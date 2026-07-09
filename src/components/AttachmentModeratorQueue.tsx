'use client';

import { useEffect, useState } from 'react';
import type { SafeContextAttachment } from '@/lib/context-attachments';

type ModeratorAttachment = SafeContextAttachment & { sharedBy?: string; moderatorNote?: string };

const actions = [
  { label: 'Approve for public display', moderationStatus: 'APPROVED', visibility: 'PUBLIC_AFTER_REVIEW' },
  { label: 'Keep moderator-only', moderationStatus: 'PENDING', visibility: 'MODERATOR_ONLY' },
  { label: 'Mark needs redaction', moderationStatus: 'NEEDS_REDACTION', visibility: 'MODERATOR_ONLY' },
  { label: 'Reject/remove attachment', moderationStatus: 'REJECTED', visibility: 'MODERATOR_ONLY' },
];

export function AttachmentModeratorQueue() {
  const [attachments, setAttachments] = useState<ModeratorAttachment[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const load = async () => {
    const response = await fetch('/api/context-attachments/moderate', { cache: 'no-store' }).catch(() => null);
    if (!response) return;
    const data = (await response.json()) as { attachments?: ModeratorAttachment[] };
    setAttachments(data.attachments ?? []);
  };

  useEffect(() => {
    void fetch('/api/context-attachments/moderate', { cache: 'no-store' })
      .then((response) => response.json() as Promise<{ attachments?: ModeratorAttachment[] }>)
      .then((data) => setAttachments(data.attachments ?? []))
      .catch(() => undefined);
  }, []);

  const update = async (id: string, moderationStatus: string, visibility: string) => {
    setError('');
    const response = await fetch('/api/context-attachments/moderate', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, moderationStatus, visibility, moderatorNote: notes[id] }),
    });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setError(data.error ?? 'Could not update this yet. Try again.');
      return;
    }
    await load();
  };

  return (
    <div className="grid gap-4">
      {error && <p className="rounded bg-sun/10 p-3 text-sm font-semibold text-sun">{error}</p>}
      {attachments.length === 0 ? (
        <div className="rounded border border-dashed border-line bg-surface/72 p-6 text-sm text-ink/65 shadow-soft backdrop-blur-xl">
          No context attachments waiting for review.
        </div>
      ) : (
        attachments.map((attachment) => (
          <article className="rounded border border-line bg-surface/72 p-5 shadow-soft backdrop-blur-xl" key={attachment.id}>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded bg-iris/10 px-2 py-1 text-iris">{attachment.targetType}</span>
              <span className="rounded bg-mist px-2 py-1 text-ink/65">{attachment.fileType}</span>
              <span className="rounded bg-sun/10 px-2 py-1 text-sun">{attachment.moderationStatus}</span>
              <span className="rounded bg-mist px-2 py-1 text-ink/65">{attachment.visibility}</span>
              <span className="rounded bg-leaf/10 px-2 py-1 text-leaf">Privacy checked</span>
            </div>
            <p className="mt-3 text-sm text-ink/65">Shared by {attachment.sharedBy ?? 'student context user'} for {attachment.targetId}.</p>
            {attachment.caption && <p className="mt-2 text-sm font-medium text-ink/70">{attachment.caption}</p>}
            <label className="mt-4 grid gap-2 text-sm font-semibold text-ink">
              Moderator note
              <textarea
                className="min-h-20 rounded border border-line bg-surface/75 px-3 py-2 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20"
                onChange={(event) => setNotes((current) => ({ ...current, [attachment.id]: event.target.value }))}
                placeholder="Add privacy review notes."
                value={notes[attachment.id] ?? attachment.moderatorNote ?? ''}
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              {actions.map((action) => (
                <button
                  className="rounded border border-line px-3 py-2 text-xs font-semibold text-ink/65 hover:border-iris hover:text-iris"
                  key={action.label}
                  onClick={() => update(attachment.id, action.moderationStatus, action.visibility)}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </article>
        ))
      )}
    </div>
  );
}
