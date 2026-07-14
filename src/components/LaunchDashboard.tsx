'use client';

import { useEffect, useState } from 'react';

type Data = {
  launchState: Record<string, boolean | string>;
  metadata: { version: string; environment: string; migrationVersion: string };
  config: { ok: boolean; errors: string[]; warnings: string[] };
  metrics: {
    users: number; activeUsers: number; signupSuccess24h: number; contributionActivity24h: number; unresolvedReports: number; highRiskReports: number; feedbackVolume30d: number;
    dataQuality: { published: number; demoPublished: number; unpublished: number };
    recentApplicationErrors: Array<{ id: string; level: string; category: string; code: string; createdAt: string }>;
  };
};

const launchModes = ['CLOSED_BETA', 'INVITE_ONLY', 'LIMITED_PUBLIC', 'PUBLIC'];
const controlKeys = ['registration_paused', 'public_registration', 'invite_only_registration', 'approved_domain_registration', 'public_contributions', 'read_only_mode', 'emergency_pause_contributions', 'moderation_tools', 'notifications'];

export function LaunchDashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    const response = await fetch('/api/admin/launch', { cache: 'no-store' }).catch(() => null);
    const result = response ? await response.json() as Data & { error?: string } : null;
    if (!response?.ok || !result) return setMessage(result?.error ?? 'Could not load launch readiness.');
    setData(result);
  };

  useEffect(() => {
    let active = true;
    void fetch('/api/admin/launch', { cache: 'no-store' })
      .then((response) => response.json().then((result) => ({ response, result: result as Data & { error?: string } })))
      .then(({ response, result }) => {
        if (!active) return;
        if (!response.ok) setMessage(result.error ?? 'Could not load launch readiness.');
        else setData(result);
      })
      .catch(() => { if (active) setMessage('Could not load launch readiness.'); });
    return () => { active = false; };
  }, []);

  const request = async (body: Record<string, unknown>) => {
    setMessage('');
    const response = await fetch('/api/admin/launch', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    const result = response ? await response.json() as { error?: string } : {};
    if (!response?.ok) return setMessage(result.error ?? 'Could not update launch controls.');
    setMessage('Launch controls updated.');
    await load();
  };

  if (!data) return <p className="text-sm text-ink/60">{message || 'Loading launch readiness...'}</p>;
  const state = data.launchState;

  return (
    <div className="grid gap-6">
      {message && <p className="text-sm font-semibold text-iris" aria-live="polite">{message}</p>}
      <section className="content-solid rounded-3xl border border-line p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-ink">Launch mode</h2>
            <p className="mt-1 text-sm text-ink/60">Current: {String(state.label)} · Build v{data.metadata.version}</p>
          </div>
          <select className={fieldClass} value={String(state.launchMode)} onChange={(event) => request({ type: 'launch-mode', launchMode: event.target.value })}>
            {launchModes.map((mode) => <option key={mode}>{mode}</option>)}
          </select>
        </div>
        <p className="mt-3 text-xs leading-5 text-ink/55">Open public registration is not automatic. It requires both a compatible launch mode and server-side feature flags.</p>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Users" value={data.metrics.users} />
        <Metric label="Active users 30d" value={data.metrics.activeUsers} />
        <Metric label="Signups 24h" value={data.metrics.signupSuccess24h} />
        <Metric label="Contributions 24h" value={data.metrics.contributionActivity24h} />
        <Metric label="Unresolved reports" value={data.metrics.unresolvedReports} />
        <Metric label="High-risk backlog" value={data.metrics.highRiskReports} />
        <Metric label="Feedback 30d" value={data.metrics.feedbackVolume30d} />
        <Metric label="Published colleges" value={data.metrics.dataQuality.published} />
      </div>
      <section className="content-solid rounded-3xl border border-line p-5">
        <h2 className="font-semibold text-ink">Emergency controls</h2>
        <div className="mt-4 grid gap-2">
          {controlKeys.map((key) => {
            const enabled = Boolean(state[key]);
            return (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-mist/65 p-3" key={key}>
                <span className="text-sm text-ink">{key.replaceAll('_', ' ')}</span>
                <button className="button-secondary px-3 py-2 text-xs" onClick={() => request({ type: 'feature', key, enabled: !enabled })} type="button">{enabled ? 'Enabled' : 'Disabled'}</button>
              </div>
            );
          })}
        </div>
      </section>
      <section className="content-solid rounded-3xl border border-line p-5">
        <h2 className="font-semibold text-ink">Launch health</h2>
        <p className="mt-2 text-sm text-ink/65">Configuration: {data.config.ok ? 'Ready' : 'Needs attention'}. Demo published colleges: {data.metrics.dataQuality.demoPublished}. Unpublished records: {data.metrics.dataQuality.unpublished}.</p>
        <div className="mt-3 grid gap-2">
          {data.metrics.recentApplicationErrors.length === 0 ? <p className="text-sm text-ink/60">No recent application warnings or errors.</p> : data.metrics.recentApplicationErrors.map((item) => (
            <p className="rounded-2xl bg-sun/10 p-3 text-sm text-ink/70" key={item.id}>{item.level} · {item.category} · {item.code}</p>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="liquid-glass-panel rounded-3xl p-4"><p className="text-xs text-ink/55">{label}</p><p className="mt-1 text-xl font-semibold text-ink">{value}</p></div>;
}

const fieldClass = 'rounded-xl border border-line bg-surface/80 px-3 py-2 text-sm text-ink';
