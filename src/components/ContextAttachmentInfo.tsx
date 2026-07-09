'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { ContextAttachmentTargetType, ContextAttachmentVisibility } from '@prisma/client';
import {
  attachmentStatusCopy,
  attachmentWarning,
  privacyChecklist,
  type SafeContextAttachment,
} from '@/lib/context-attachments';

export type ContextAttachmentHandle = {
  uploadForTarget: (targetType: ContextAttachmentTargetType, targetId: string) => Promise<void>;
};

type ContextAttachmentInfoProps = {
  targetType?: ContextAttachmentTargetType;
  targetId?: string;
  compact?: boolean;
};

export const ContextAttachmentInfo = forwardRef<ContextAttachmentHandle, ContextAttachmentInfoProps>(function ContextAttachmentInfo(
  { targetType, targetId, compact = false },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<ContextAttachmentVisibility>('MODERATOR_ONLY');
  const [checks, setChecks] = useState([false, false, false, false]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const uploadForTarget = async (nextTargetType: ContextAttachmentTargetType, nextTargetId: string) => {
    if (!file) return;
    setError('');
    const form = new FormData();
    form.set('targetType', nextTargetType);
    form.set('targetId', nextTargetId);
    form.set('visibility', visibility);
    form.set('caption', caption);
    form.set('file', file);
    checks.forEach((checked, index) => {
      if (checked) form.set(['check-private', 'check-rights', 'check-no-private-data', 'check-helpful'][index], 'on');
    });

    const response = await fetch('/api/context-attachments', { method: 'POST', body: form });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setError(data.error ?? 'Could not save this yet. Try again.');
      throw new Error(data.error ?? 'Could not save this yet. Try again.');
    }
    setStatus('Context attached · Privacy checked');
    setFile(null);
    setCaption('');
    setChecks([false, false, false, false]);
    window.dispatchEvent(new Event('yorai-context-attachments-change'));
  };

  useImperativeHandle(ref, () => ({ uploadForTarget }));

  return (
    <div className={`${compact ? '' : 'mt-4'} rounded-2xl border border-white/38 bg-surface/62 p-4 backdrop-blur-xl dark:border-white/10`}>
      <button className="text-sm font-semibold text-iris hover:text-iris/80" onClick={() => setOpen((value) => !value)} type="button">
        Add context
      </button>
      {open && (
        <div className="mt-4 grid gap-4 text-sm leading-6 text-ink/65">
          <p className="rounded-2xl bg-sun/10 p-3 font-medium text-sun">{attachmentWarning}</p>
          <div className="grid gap-2">
            {privacyChecklist.map((item, index) => (
              <label className="flex gap-2 text-sm text-ink/70" key={item}>
                <input
                  checked={checks[index]}
                  onChange={(event) => setChecks((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.checked : value))}
                  type="checkbox"
                />
                {item}
              </label>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Image context
              <input accept="image/png,image/jpeg,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Visibility
              <select className="rounded-xl border border-line bg-surface/82 px-3 py-2 font-normal text-ink" value={visibility} onChange={(event) => setVisibility(event.target.value as ContextAttachmentVisibility)}>
                <option value="MODERATOR_ONLY">Moderator-only</option>
                <option value="SUMMARY_ONLY">Summary-only</option>
                <option value="PUBLIC_AFTER_REVIEW">Public after review</option>
              </select>
            </label>
          </div>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Caption optional
            <input className="rounded-xl border border-line bg-surface/82 px-3 py-2 font-normal text-ink" value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Photo context, lab schedule, club notice..." />
          </label>
          {targetType && targetId && (
            <button className="button-primary w-fit px-4 py-2.5" onClick={() => uploadForTarget(targetType, targetId).catch(() => undefined)} type="button">
              Share context for review
            </button>
          )}
          {status && <p className="font-semibold text-leaf">{status}</p>}
          {error && <p className="font-semibold text-sun">{error}</p>}
        </div>
      )}
    </div>
  );
});

export function ContextAttachmentSection({ targetType, targetId }: { targetType: ContextAttachmentTargetType; targetId: string }) {
  const [attachments, setAttachments] = useState<SafeContextAttachment[]>([]);

  useEffect(() => {
    const load = async () => {
      const params = new URLSearchParams({ targetType, targetId });
      const response = await fetch(`/api/context-attachments?${params.toString()}`, { cache: 'no-store' }).catch(() => null);
      if (!response) return;
      const data = (await response.json()) as { attachments?: SafeContextAttachment[] };
      setAttachments(data.attachments ?? []);
    };
    load();
    window.addEventListener('yorai-context-attachments-change', load);
    return () => window.removeEventListener('yorai-context-attachments-change', load);
  }, [targetId, targetType]);

  if (!attachments.length) return null;

  return (
    <section className="solid-readable rounded-2xl p-5">
      <h2 className="font-semibold text-ink">Shared context</h2>
      <div className="mt-4 grid gap-3">
        {attachments.map((attachment) => (
          <article className="rounded-2xl border border-line bg-surface/72 p-4" key={attachment.id}>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="soft-badge">Context attached</span>
              <span className="rounded-full bg-iris/10 px-2 py-1 text-iris">{formatVisibility(attachment.visibility)}</span>
              <span className="rounded-full bg-leaf/10 px-2 py-1 text-leaf">Privacy checked</span>
            </div>
            <p className="mt-3 text-sm text-ink/65">{attachmentStatusCopy(attachment)}</p>
            {attachment.caption && <p className="mt-2 text-sm font-medium text-ink/70">{attachment.caption}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function formatVisibility(value: string) {
  if (value === 'PUBLIC_AFTER_REVIEW') return 'Public after review';
  if (value === 'SUMMARY_ONLY') return 'Summary-only';
  return 'Moderator-only';
}
