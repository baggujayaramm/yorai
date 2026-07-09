'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { reportReasons } from '@/lib/report-storage';

type ReportButtonProps = {
  targetType: string;
  targetId: string;
};

export function ReportButton({ targetType, targetId }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    dialogRef.current?.focus();
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
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
        className="rounded-full px-2 py-1 text-xs font-semibold text-ink/50 hover:bg-mist"
        onClick={() => {
          setSubmitted(false);
          setOpen(true);
        }}
        type="button"
      >
        Report concern
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-3 py-3 backdrop-blur-xl sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          role="presentation"
        >
          <div
            aria-modal="true"
            className="w-full max-w-lg rounded-t-[2rem] border border-white/42 bg-surface/78 p-5 shadow-glass outline-none backdrop-blur-2xl dark:border-white/10 dark:bg-surface/66 sm:rounded-[2rem]"
            ref={dialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Report concern</h2>
                <p className="mt-2 text-sm leading-6 text-ink/65">
                  Reports help keep Yorai useful and safe for students.
                </p>
              </div>
              <button className="rounded-full px-2 py-1 text-sm font-semibold text-ink/60 hover:bg-mist" onClick={() => setOpen(false)} type="button">
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
                  <select className="rounded-xl border border-line bg-surface/82 px-3 py-3 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20" name="reason">
                    {reportReasons.map((reason) => (
                      <option key={reason}>{reason}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-ink">
                  Optional details
                  <textarea className="min-h-28 rounded-2xl border border-line bg-surface/82 px-3 py-3 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20" name="details" placeholder="Add calm context for moderators." />
                </label>
                <button className="button-primary px-5 py-3" type="submit">
                  Submit report
                </button>
                {error && <p className="text-sm font-semibold text-sun">{error}</p>}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
