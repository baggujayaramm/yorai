'use client';

import { FormEvent, useState } from 'react';

export function AccountDataControls() {
  const [message, setMessage] = useState('');
  const [exportSummary, setExportSummary] = useState('');

  const requestExport = async () => {
    setMessage('');
    setExportSummary('');
    const response = await fetch('/api/account/export', { method: 'POST' }).catch(() => null);
    const result = response ? await response.json() as { error?: string; requestId?: string; data?: { contributions?: Record<string, unknown[]> } } : {};
    if (!response?.ok) return setMessage(result.error ?? 'Could not prepare your export yet.');
    const counts = result.data?.contributions ? Object.entries(result.data.contributions).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.length : 0}`).join(' · ') : '';
    setExportSummary(`Export ready. Request ${result.requestId}. ${counts}`);
  };

  const requestDeletion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    const form = event.currentTarget;
    const response = await fetch('/api/account/deletion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) }).catch(() => null);
    const result = response ? await response.json() as { error?: string; message?: string } : {};
    if (!response?.ok) return setMessage(result.error ?? 'Could not request account deletion yet.');
    setMessage(result.message ?? 'Account deletion request created.');
    form.reset();
    window.dispatchEvent(new Event('yorai-auth-change'));
  };

  return (
    <section className="liquid-glass-panel mt-5 rounded-3xl p-5">
      <h2 className="font-semibold text-ink">Data and account controls</h2>
      <p className="mt-2 text-sm leading-6 text-ink/62">Exports include your own profile, contributions, saves, follows, watches, notifications, feedback, and submitted reports. They exclude moderator notes and other users&apos; private data.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="button-secondary px-4 py-2" onClick={requestExport} type="button">Request data export</button>
      </div>
      {exportSummary && <p className="mt-3 text-sm font-semibold text-iris" aria-live="polite">{exportSummary}</p>}
      <form className="mt-5 grid gap-3 rounded-2xl bg-sun/10 p-4" onSubmit={requestDeletion}>
        <h3 className="font-semibold text-ink">Account deletion foundation</h3>
        <p className="text-sm leading-6 text-ink/65">Type DELETE to request deletion. Yorai uses a cooling-off period, revokes sessions, hides your profile, and preserves public discussion structure with privacy-safe handling.</p>
        <input className="rounded-xl border border-line bg-surface/80 px-3 py-2 text-sm text-ink" name="confirmText" placeholder="Type DELETE" />
        <textarea className="rounded-xl border border-line bg-surface/80 px-3 py-2 text-sm text-ink" name="note" placeholder="Optional note" rows={2} />
        <button className="button-secondary w-fit px-4 py-2">Request deletion</button>
      </form>
      {message && <p className="mt-3 text-sm font-semibold text-iris" aria-live="polite">{message}</p>}
    </section>
  );
}
