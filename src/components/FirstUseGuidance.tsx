'use client';

import { useEffect, useState } from 'react';

const items = [
  ['Live threads', 'Ask a focused question and let current students or alumni add timely context.'],
  ['Student experiences', 'Personal journeys are lived context, not a verdict about a college.'],
  ['Freshness', 'Fresh, past, changed, and reconfirmed labels show when context may need an update.'],
  ['Community confirmation', 'Context actions help students confirm, qualify, or update what was shared.'],
  ['Privacy and reports', 'Share only safe context. Report private data, attacks, spam, or misleading information.'],
] as const;

export function FirstUseGuidance() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    void fetch('/api/guidance', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { dismissed?: string[] }) => setVisible(!data.dismissed?.includes('getting-started')))
      .catch(() => setVisible(false));
  }, []);

  if (!visible) return null;

  const dismiss = async () => {
    const response = await fetch('/api/guidance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'getting-started' }),
    }).catch(() => null);
    if (response?.ok) setVisible(false);
  };

  return (
    <section className="liquid-glass-panel liquid-glass-strong mb-5 rounded-3xl p-5" aria-labelledby="first-use-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-iris">A quick orientation</p>
          <h2 className="mt-1 font-semibold text-ink" id="first-use-title">Useful context works better together</h2>
        </div>
        <button className="button-secondary px-3 py-2 text-xs" onClick={dismiss} type="button">Dismiss</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map(([title, text]) => (
          <div className="rounded-2xl bg-surface/58 p-3" key={title}>
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            <p className="mt-1 text-xs leading-5 text-ink/65">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
