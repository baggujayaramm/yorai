'use client';

import { useEffect, useState } from 'react';

type ModeratorReport = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string;
  preview: string;
  status: string;
  moderatorNotes: string;
  createdAt: string;
};

const statusActions = [
  { label: 'Mark reviewed', status: 'REVIEWED' },
  { label: 'Mark actioned', status: 'ACTIONED' },
  { label: 'Reject report', status: 'REJECTED' },
];

const contentActions = [
  { label: 'Hide content', action: 'hide' },
  { label: 'Mark as needs context', action: 'needs-context' },
  { label: 'Mark as outdated', action: 'outdated' },
  { label: 'Mark as disputed', action: 'disputed' },
  { label: 'Keep visible', action: 'visible' },
];

export function ModeratorQueue() {
  const [reports, setReports] = useState<ModeratorReport[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const load = async () => {
    const response = await fetch('/api/reports', { cache: 'no-store' }).catch(() => null);
    if (!response) return;
    const data = (await response.json()) as { reports?: ModeratorReport[]; error?: string };
    if (!response.ok) {
      setError(data.error ?? 'Could not load reports.');
      return;
    }
    setReports(data.reports ?? []);
  };

  useEffect(() => {
    void fetch('/api/reports', { cache: 'no-store' })
      .then((response) => response.json() as Promise<{ reports?: ModeratorReport[]; error?: string }>)
      .then((data) => setReports(data.reports ?? []))
      .catch(() => undefined);
  }, []);

  const update = async (report: ModeratorReport, input: { status?: string; contentAction?: string }) => {
    setError('');
    const response = await fetch('/api/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        moderatorNotes: notes[report.id] ?? report.moderatorNotes,
        ...input,
      }),
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
      {reports.length === 0 ? (
        <div className="rounded border border-dashed border-line bg-surface/72 p-6 text-sm text-ink/65 shadow-soft backdrop-blur-xl">
          No submitted reports yet.
        </div>
      ) : (
        reports.map((report) => (
          <article className="rounded border border-line bg-surface/72 p-5 shadow-soft backdrop-blur-xl" key={report.id}>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded bg-iris/10 px-2 py-1 text-iris">{report.targetType}</span>
              <span className="rounded bg-mist px-2 py-1 text-ink/65">{report.reason}</span>
              <span className="rounded bg-sun/10 px-2 py-1 text-sun">{report.status.toLowerCase()}</span>
              <span className="rounded bg-mist px-2 py-1 text-ink/65">{report.createdAt}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/65">{report.preview}</p>
            {report.details && <p className="mt-3 rounded bg-mist p-3 text-sm leading-6 text-ink/65">{report.details}</p>}
            <label className="mt-4 grid gap-2 text-sm font-semibold text-ink">
              Moderator note
              <textarea
                className="min-h-20 rounded border border-line bg-surface/75 px-3 py-2 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20"
                onChange={(event) => setNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                placeholder="Add a calm note for future moderators."
                value={notes[report.id] ?? report.moderatorNotes}
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              {statusActions.map((action) => (
                <button className="rounded border border-line px-3 py-2 text-xs font-semibold text-ink/65 hover:border-iris hover:text-iris" key={action.status} onClick={() => update(report, { status: action.status })} type="button">
                  {action.label}
                </button>
              ))}
              {contentActions.map((action) => (
                <button className="rounded border border-line px-3 py-2 text-xs font-semibold text-ink/65 hover:border-iris hover:text-iris" key={action.action} onClick={() => update(report, { contentAction: action.action })} type="button">
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
