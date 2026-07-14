'use client';

import { useCallback, useEffect, useState } from 'react';

type ModeratorReport = {
  id: string; targetType: string; targetId: string; reason: string; details: string; preview: string;
  status: string; riskLevel: string; visibility: string; moderatorNotes: string; createdAt: string;
  assignedModerator: { id: string; label: string } | null; reportCount: number;
};

type Filters = { status: string; targetType: string; riskLevel: string; reason: string; assigned: string; collegeId: string; from: string; to: string; sort: string };
const initialFilters: Filters = { status: '', targetType: '', riskLevel: '', reason: '', assigned: '', collegeId: '', from: '', to: '', sort: 'highest-risk' };

export function ModeratorQueue() {
  const [reports, setReports] = useState<ModeratorReport[]>([]);
  const [filters, setFilters] = useState(initialFilters);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [colleges, setColleges] = useState<Array<{ id: string; name: string; city: string }>>([]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: '15' });
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    const response = await fetch(`/api/reports?${params}`, { cache: 'no-store' }).catch(() => null);
    if (!response) return setError('Could not reach the moderation queue.');
    const data = await response.json() as { reports?: ModeratorReport[]; pagination?: { pages: number }; error?: string };
    if (!response.ok) return setError(data.error ?? 'Could not load reports.');
    setReports(data.reports ?? []);
    setPages(Math.max(data.pagination?.pages ?? 1, 1));
    setError('');
  }, [filters, page]);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: '15' });
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    void fetch(`/api/reports?${params}`, { cache: 'no-store' })
      .then((response) => response.json() as Promise<{ reports?: ModeratorReport[]; pagination?: { pages: number }; error?: string }>)
      .then((data) => { setReports(data.reports ?? []); setPages(Math.max(data.pagination?.pages ?? 1, 1)); })
      .catch(() => setError('Could not reach the moderation queue.'));
  }, [filters, page]);

  useEffect(() => {
    void fetch('/api/moderation/overview?section=colleges', { cache: 'no-store' })
      .then((response) => response.json() as Promise<{ colleges?: Array<{ id: string; name: string; city: string }> }>)
      .then((data) => setColleges(data.colleges ?? []))
      .catch(() => undefined);
  }, []);

  const update = async (report: ModeratorReport, input: Record<string, unknown>) => {
    setBusy(report.id);
    setError('');
    const response = await fetch('/api/reports', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: report.id, moderatorNotes: notes[report.id] ?? report.moderatorNotes, ...input }) }).catch(() => null);
    const data = response ? await response.json() as { ok?: boolean; error?: string } : null;
    setBusy('');
    if (!response?.ok || !data?.ok) return setError(data?.error ?? 'Could not update this report.');
    await load();
  };

  const setFilter = (key: keyof Filters, value: string) => { setPage(1); setFilters((current) => ({ ...current, [key]: value })); };

  return (
    <div className="grid gap-4">
      <div className="liquid-glass-panel grid gap-3 rounded-2xl p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Filter label="Status" value={filters.status} onChange={(value) => setFilter('status', value)} options={['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED']} />
        <Filter label="Risk" value={filters.riskLevel} onChange={(value) => setFilter('riskLevel', value)} options={['HIGH', 'MEDIUM', 'LOW']} />
        <Filter label="Content" value={filters.targetType} onChange={(value) => setFilter('targetType', value)} options={['THREAD', 'REPLY', 'EXPERIENCE', 'INSIGHT']} />
        <Filter label="Assignment" value={filters.assigned} onChange={(value) => setFilter('assigned', value)} options={['me', 'unassigned']} labels={{ me: 'Assigned to me', unassigned: 'Unassigned' }} />
        <Filter label="Reason" value={filters.reason} onChange={(value) => setFilter('reason', value)} options={['Harassment', 'Private information', 'Impersonation', 'Spam', 'Misleading context', 'Unsupported accusation', 'Irrelevant content', 'Other']} />
        <label className="grid gap-1 text-xs font-semibold text-ink/60">College<select className="rounded-xl border border-line bg-surface/85 px-3 py-2 text-sm text-ink" onChange={(event) => setFilter('collegeId', event.target.value)} value={filters.collegeId}><option value="">All colleges</option>{colleges.map((college) => <option key={college.id} value={college.id}>{college.name} · {college.city}</option>)}</select></label>
        <TextFilter label="From date" value={filters.from} onChange={(value) => setFilter('from', value)} type="date" />
        <TextFilter label="To date" value={filters.to} onChange={(value) => setFilter('to', value)} type="date" />
        <Filter label="Sort" value={filters.sort} onChange={(value) => setFilter('sort', value)} options={['highest-risk', 'oldest', 'newest', 'most-reported']} labels={{ 'highest-risk': 'Highest risk', oldest: 'Oldest unresolved', newest: 'Newest', 'most-reported': 'Most reported' }} includeAll={false} />
      </div>
      {error && <p aria-live="assertive" className="rounded-2xl bg-sun/10 p-3 text-sm font-semibold text-sun" role="alert">{error}</p>}
      {reports.length === 0 ? <div className="liquid-glass-panel rounded-2xl p-6 text-sm text-ink/65">No reports match these filters.</div> : reports.map((report) => (
        <article className="content-solid rounded-2xl border border-line p-5 shadow-soft" key={report.id}>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <Badge label={report.targetType} tone="iris" /><Badge label={report.reason} /><Badge label={`${report.riskLevel} risk`} tone={report.riskLevel === 'HIGH' ? 'amber' : 'neutral'} />
            <Badge label={report.status.toLowerCase()} /><Badge label={report.visibility.toLowerCase().replace('_', ' ')} />
            {report.reportCount > 1 && <Badge label={`${report.reportCount} reports`} tone="amber" />}
          </div>
          <p className="mt-3 line-clamp-4 text-sm leading-6 text-ink/70">{report.preview}</p>
          {report.details && <p className="mt-3 rounded-xl bg-mist/75 p-3 text-sm text-ink/70">Reporter context: {report.details}</p>}
          <p className="mt-3 text-xs text-ink/50">{new Date(report.createdAt).toLocaleString()} · {report.assignedModerator ? `Assigned to ${report.assignedModerator.label}` : 'Unassigned'}</p>
          <label className="mt-4 grid gap-2 text-sm font-semibold text-ink">Private moderator note
            <textarea className="min-h-20 rounded-xl border border-line bg-surface/85 px-3 py-2 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20" onChange={(event) => setNotes((current) => ({ ...current, [report.id]: event.target.value }))} value={notes[report.id] ?? report.moderatorNotes} />
          </label>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            {!report.assignedModerator && <Action label="Assign to me" disabled={busy === report.id} onClick={() => update(report, { operation: 'assign-self' })} />}
            {report.assignedModerator && <Action label="Release" disabled={busy === report.id} onClick={() => update(report, { operation: 'release' })} />}
            <Action label="Under review" disabled={busy === report.id} onClick={() => update(report, { status: 'UNDER_REVIEW' })} />
            <Action label="Dismiss" disabled={busy === report.id} onClick={() => update(report, { status: 'DISMISSED' })} />
            <Action label="Hide" disabled={busy === report.id} onClick={() => update(report, { operation: 'visibility', visibility: 'HIDDEN' })} />
            <Action label="Restore" disabled={busy === report.id} onClick={() => update(report, { operation: 'visibility', visibility: 'VISIBLE' })} />
            <Action label="Remove" disabled={busy === report.id} onClick={() => update(report, { operation: 'visibility', visibility: 'REMOVED' })} />
            <Action label="Request clarification" disabled={busy === report.id} onClick={() => update(report, { operation: 'request-clarification' })} />
            <Action label="Archive" disabled={busy === report.id} onClick={() => update(report, { operation: 'archive' })} />
            <Action label="Escalate to admin" disabled={busy === report.id} onClick={() => update(report, { operation: 'escalate-admin' })} />
            <Action label="Warn contributor" disabled={busy === report.id} onClick={() => update(report, { operation: 'warning', warningSeverity: report.riskLevel })} />
            <Action label="Restrict posting 24h" disabled={busy === report.id} onClick={() => update(report, { operation: 'restriction', restrictionType: 'POSTING', restrictionHours: 24 })} />
          </div>
        </article>
      ))}
      <div className="flex items-center justify-between text-sm text-ink/65">
        <button className="button-secondary px-4 py-2 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} type="button">Previous</button>
        <span>Page {page} of {pages}</span>
        <button className="button-secondary px-4 py-2 disabled:opacity-40" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} type="button">Next</button>
      </div>
    </div>
  );
}

function Filter({ label, value, options, labels = {}, includeAll = true, onChange }: { label: string; value: string; options: string[]; labels?: Record<string, string>; includeAll?: boolean; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-xs font-semibold text-ink/60">{label}<select className="rounded-xl border border-line bg-surface/85 px-3 py-2 text-sm text-ink" onChange={(event) => onChange(event.target.value)} value={value}>{includeAll && <option value="">All</option>}{options.map((option) => <option key={option} value={option}>{labels[option] ?? option.replaceAll('_', ' ').toLowerCase()}</option>)}</select></label>;
}
function TextFilter({ label, value, placeholder, type = 'text', onChange }: { label: string; value: string; placeholder?: string; type?: 'text' | 'date'; onChange: (value: string) => void }) { return <label className="grid gap-1 text-xs font-semibold text-ink/60">{label}<input className="rounded-xl border border-line bg-surface/85 px-3 py-2 text-sm text-ink" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} value={value} /></label>; }
function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'iris' | 'amber' }) { return <span className={`rounded-full px-2.5 py-1 ${tone === 'iris' ? 'bg-iris/12 text-iris' : tone === 'amber' ? 'bg-sun/12 text-sun' : 'bg-mist text-ink/65'}`}>{label}</span>; }
function Action({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) { return <button className="rounded-full border border-line px-3 py-2 text-xs font-semibold text-ink/70 transition hover:border-iris hover:text-iris disabled:opacity-40" disabled={disabled} onClick={onClick} type="button">{label}</button>; }
