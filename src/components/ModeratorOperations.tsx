'use client';

import { useEffect, useState } from 'react';

type FlaggedItem = { id: string; type: string; preview: string; riskLevel: string; visibility: string };
type Metrics = { openReports: number; unresolvedHighRisk: number; activeRestrictions: number; reportVolume30Days: number; averageResolutionHours: number; actionsByType: Array<{ action: string; count: number }> };

export function ModeratorOperations({ admin }: { admin: boolean }) {
  const [items, setItems] = useState<FlaggedItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    void fetch('/api/moderation/overview?section=flagged', { cache: 'no-store' }).then((response) => response.json()).then((data: { items?: FlaggedItem[] }) => setItems(data.items ?? [])).catch(() => undefined);
    if (admin) void fetch('/api/moderation/overview?section=metrics', { cache: 'no-store' }).then((response) => response.json()).then((data: { metrics?: Metrics }) => setMetrics(data.metrics ?? null)).catch(() => undefined);
  }, [admin]);

  return (
    <div className="grid gap-6">
      {admin && metrics && <section className="liquid-glass-panel rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-ink">Admin operations overview</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Open reports" value={metrics.openReports} /><Metric label="High-risk unresolved" value={metrics.unresolvedHighRisk} /><Metric label="Active restrictions" value={metrics.activeRestrictions} /><Metric label="Reports, 30 days" value={metrics.reportVolume30Days} /><Metric label="Avg. resolution" value={`${metrics.averageResolutionHours}h`} />
        </div>
      </section>}
      <section className="content-solid rounded-2xl border border-line p-5" id="flagged">
        <h2 className="text-xl font-semibold text-ink">Flagged content</h2>
        <p className="mt-2 text-sm text-ink/65">Rule-based checks surface possible risks for human review. They do not make final decisions.</p>
        <div className="mt-4 grid gap-3">
          {items.length === 0 ? <p className="rounded-xl bg-mist/70 p-4 text-sm text-ink/60">No risk-flagged contributions are waiting.</p> : items.map((item) => <article className="rounded-xl border border-line bg-surface/72 p-4" key={`${item.type}:${item.id}`}>
            <div className="flex gap-2 text-xs font-semibold"><span className="rounded-full bg-iris/10 px-2 py-1 text-iris">{item.type}</span><span className="rounded-full bg-sun/10 px-2 py-1 text-sun">{item.riskLevel} risk</span><span className="rounded-full bg-mist px-2 py-1 text-ink/65">{item.visibility.toLowerCase().replace('_', ' ')}</span></div>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/70">{item.preview}</p>
          </article>)}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl bg-mist/70 p-3"><p className="text-xs text-ink/55">{label}</p><p className="mt-1 text-xl font-semibold text-ink">{value}</p></div>; }
