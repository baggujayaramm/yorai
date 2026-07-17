'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { reportReasons } from '@/lib/report-policy';

type ReportButtonProps = {
  targetType: string;
  targetId: string;
};

export function ReportButton({ targetType, targetId }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), select, textarea, input, a[href], [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialogRef.current?.focus();
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); trigger?.focus(); };
  }, [open]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetType,
        targetId,
        reason: String(form.get('reason') ?? 'Other'),
        details: String(form.get('details') ?? '').trim(),
      }),
    });
    const data = (await response.json()) as { ok: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setError(data.error ?? 'Could not save this yet. Try again.');
      return;
    }
    setSubmitted(true);
  };

  return (
    <>
      <button
        aria-haspopup="dialog"
        className="rounded-full px-2 py-1 text-xs font-semibold text-ink/50 hover:bg-mist"
        onClick={() => {
          setSubmitted(false);
          setOpen(true);
        }}
        ref={triggerRef}
        type="button"
      >
        Report concern
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 px-3 py-3 backdrop-blur-xl sm:items-center dark:bg-black/58"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          role="presentation"
        >
          <div
            aria-labelledby="report-dialog-title"
            aria-describedby="report-dialog-description"
            aria-modal="true"
            className="elevated-dialog w-full max-w-lg rounded-t-[2rem] p-5 outline-none sm:rounded-[2rem]"
            ref={dialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink" id="report-dialog-title">Report concern</h2>
                <p className="mt-2 text-sm leading-6 text-ink/65" id="report-dialog-description">
                  Reports help keep Yorai useful and safe for students.
                </p>
              </div>
              <button aria-label="Close report dialog" className="rounded-full px-2 py-1 text-sm font-semibold text-ink/60 hover:bg-mist" onClick={() => setOpen(false)} type="button">
                Close
              </button>
            </div>

            {submitted ? (
              <p className="mt-5 rounded-2xl bg-leaf/10 p-4 text-sm font-semibold text-leaf">
                Thanks. This has been sent for review.
              </p>
            ) : (
              <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  Reason
                  <select className="form-field rounded-xl px-3 py-3 font-normal" name="reason">
                    {reportReasons.map((reason) => (
                      <option key={reason}>{reason}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  Optional details
                  <textarea className="form-field min-h-28 rounded-2xl px-3 py-3 font-normal" name="details" placeholder="Add calm context for moderators." />
                </label>
                <button className="button-primary px-5 py-3" type="submit">
                  Submit report
                </button>
                {error && <p aria-live="assertive" className="text-sm font-semibold text-sun" role="alert">{error}</p>}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
