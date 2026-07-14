'use client';

import { FormEvent, useEffect, useState } from 'react';

type Data = {
  defaults: Record<string, boolean>;
  flags: Array<{ key: string; enabled: boolean }>;
  releases: Array<{ id: string; version: string; releaseDate: string; migrationVersion: string; environment: string }>;
  announcements: Array<{ id: string; title: string; audience: string; startsAt: string; expiresAt?: string | null; active: boolean }>;
  current: { version: string; environment: string; migrationVersion: string; buildIdentifier?: string | null };
};

export function ReleaseControls() {
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    const response = await fetch('/api/admin/release', { cache: 'no-store' }).catch(() => null);
    const result = response ? await response.json() as Data & { error?: string } : null;
    if (!response?.ok || !result) return setMessage(result?.error ?? 'Could not load release controls.');
    setData(result);
  };

  useEffect(() => {
    void fetch('/api/admin/release', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result: Data) => setData(result))
      .catch(() => setMessage('Could not load release controls.'));
  }, []);

  const request = async (method: 'POST' | 'PATCH', body: Record<string, unknown>) => {
    setMessage('');
    const response = await fetch('/api/admin/release', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    const result = response ? await response.json() as { error?: string } : {};
    if (!response?.ok) return setMessage(result.error ?? 'Could not update release controls.');
    setMessage('Release controls updated.');
    await load();
  };

  if (!data) return <p className="text-sm text-ink/60">{message || 'Loading release controls...'}</p>;
  const values = { ...data.defaults, ...Object.fromEntries(data.flags.map((item) => [item.key, item.enabled])) };

  const announce = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    await request('POST', { type: 'announcement', ...Object.fromEntries(fields) });
    form.reset();
  };

  return (
    <div className="grid gap-6">
      {message && <p aria-live="polite" className="text-sm font-semibold text-iris">{message}</p>}
      <section className="content-solid rounded-2xl border border-line p-5">
        <h2 className="font-semibold text-ink">Current build</h2>
        <p className="mt-2 text-sm text-ink/65">v{data.current.version} · {data.current.environment} · migration {data.current.migrationVersion}{data.current.buildIdentifier ? ` · build ${data.current.buildIdentifier}` : ''}</p>
        <button className="button-secondary mt-3 px-4 py-2" onClick={() => request('POST', { type: 'release' })} type="button">Record release</button>
      </section>
      <section className="content-solid rounded-2xl border border-line p-5">
        <h2 className="font-semibold text-ink">Feature flags</h2>
        <p className="mt-1 text-xs text-ink/55">Environment overrides take precedence over these database values.</p>
        <div className="mt-4 grid gap-2">
          {Object.entries(values).map(([key, enabled]) => (
            <div className="flex items-center justify-between rounded-xl bg-mist/70 p-3" key={key}>
              <span className="text-sm text-ink">{key.replaceAll('_', ' ')}</span>
              <button className="button-secondary px-3 py-2 text-xs" onClick={() => request('PATCH', { type: 'flag', key, enabled: !enabled })} type="button">{enabled ? 'Enabled' : 'Disabled'}</button>
            </div>
          ))}
        </div>
      </section>
      <form className="content-solid grid gap-3 rounded-2xl border border-line p-5" onSubmit={announce}>
        <h2 className="font-semibold text-ink">Beta announcement</h2>
        <label className="grid gap-1 text-xs font-semibold text-ink/65">Title<input className={fieldClass} maxLength={100} name="title" required /></label>
        <label className="grid gap-1 text-xs font-semibold text-ink/65">Message<textarea className={fieldClass} maxLength={500} name="message" required /></label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-xs font-semibold text-ink/65">Audience<select className={fieldClass} name="audience"><option>ALL_USERS</option><option>BETA_USERS</option><option>MODERATORS</option><option>ADMINS</option></select></label>
          <label className="grid gap-1 text-xs font-semibold text-ink/65">Starts optional<input className={fieldClass} name="startsAt" type="datetime-local" /></label>
          <label className="grid gap-1 text-xs font-semibold text-ink/65">Expires optional<input className={fieldClass} name="expiresAt" type="datetime-local" /></label>
        </div>
        <button className="button-primary w-fit px-4 py-2">Publish announcement</button>
      </form>
      <section className="content-solid rounded-2xl border border-line p-5">
        <h2 className="font-semibold text-ink">Announcements</h2>
        <div className="mt-3 grid gap-2">
          {data.announcements.length === 0 && <p className="text-sm text-ink/60">No beta announcements yet.</p>}
          {data.announcements.map((announcement) => (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-mist/70 p-3" key={announcement.id}>
              <div><p className="text-sm font-semibold text-ink">{announcement.title}</p><p className="mt-1 text-xs text-ink/55">{announcement.audience.replaceAll('_', ' ')} · {announcement.active ? 'Active' : 'Inactive'}</p></div>
              <button className="button-secondary px-3 py-2 text-xs" onClick={() => request('PATCH', { type: 'announcement', id: announcement.id, active: !announcement.active })} type="button">{announcement.active ? 'Deactivate' : 'Activate'}</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const fieldClass = 'rounded-xl border border-line bg-surface/82 px-3 py-2.5 font-normal text-ink';
