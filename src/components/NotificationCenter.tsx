'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { NOTIFICATION_EVENT } from './NotificationIndicator';
import { freshnessClass } from './ThreadCard';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  targetType: string;
  targetId: string;
  destinationUrl?: string | null;
  read: boolean;
  createdAt: string;
};

type Preferences = {
  repliesToMyContent: boolean;
  watchedThreadUpdates: boolean;
  followedCollegeUpdates: boolean;
  savedContentUpdates: boolean;
  reportModerationUpdates: boolean;
};

const preferenceLabels: Array<[keyof Preferences, string]> = [
  ['repliesToMyContent', 'Replies to my content'],
  ['watchedThreadUpdates', 'Watched thread updates'],
  ['followedCollegeUpdates', 'Followed college updates'],
  ['savedContentUpdates', 'Saved content updates'],
  ['reportModerationUpdates', 'Reports and moderation updates'],
];

export function NotificationCenter() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    const [notificationResponse, preferenceResponse] = await Promise.all([
      fetch('/api/notifications?limit=40', { cache: 'no-store' }).catch(() => null),
      fetch('/api/notification-preferences', { cache: 'no-store' }).catch(() => null),
    ]);
    if (notificationResponse) {
      const data = (await notificationResponse.json().catch(() => ({}))) as { notifications?: NotificationItem[]; unreadCount?: number; error?: string };
      if (!notificationResponse.ok) setError(data.error ?? 'Choose a Yorai user to view updates.');
      setItems(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    }
    if (preferenceResponse?.ok) {
      const data = (await preferenceResponse.json().catch(() => ({}))) as { preferences?: Preferences };
      setPreferences(data.preferences ?? null);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const markRead = async (notificationId: string) => {
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId }),
    });
    if (!response.ok) return;
    window.dispatchEvent(new Event(NOTIFICATION_EVENT));
    await load();
  };

  const markAllRead = async () => {
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    if (!response.ok) return;
    window.dispatchEvent(new Event(NOTIFICATION_EVENT));
    await load();
  };

  const togglePreference = async (key: keyof Preferences) => {
    if (!preferences) return;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    const response = await fetch('/api/notification-preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: next[key] }),
    });
    if (!response.ok) await load();
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-iris">Useful updates</p>
          <h1 className="mt-1 text-3xl font-semibold text-ink">Notifications</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
            Calm reminders about threads, saved context, reports, and college updates you chose to follow.
          </p>
        </div>
        <button className="rounded-full border border-iris/25 bg-iris/10 px-4 py-2 text-sm font-semibold text-iris transition hover:border-iris/50" onClick={markAllRead} type="button">
          Mark all read
        </button>
      </div>

      {error ? <p className="mb-4 rounded-2xl border border-sun/20 bg-sun/10 p-4 text-sm font-semibold text-sun">{error}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <section className="liquid-glass-panel liquid-glass-strong rounded-3xl p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-ink">Recent updates</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${freshnessClass(unreadCount ? 'Recently active' : 'Fresh')}`}>
              {unreadCount} unread
            </span>
          </div>
          <div className="grid gap-3">
            {items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/40 bg-surface/62 p-4 text-sm text-ink/60 dark:border-white/10">
                No updates yet. Watch threads, follow colleges, or save useful context to see meaningful updates here.
              </p>
            ) : (
              items.map((item) => (
                <article className={`liquid-glass-card rounded-2xl p-4 ${item.read ? 'opacity-75' : 'ring-1 ring-iris/25'}`} key={item.id}>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-iris/10 px-2 py-1 text-iris">{labelType(item.type)}</span>
                    <span className="rounded-full bg-mint/12 px-2 py-1 text-mint">{item.read ? 'Read' : 'Unread'}</span>
                    <span className="text-ink/50">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <h3 className="mt-3 font-semibold text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/65">{item.message}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.destinationUrl ? (
                      <Link className="rounded-full bg-gradient-to-r from-iris to-violet px-3 py-2 text-xs font-semibold text-white shadow-soft" href={item.destinationUrl} onClick={() => markRead(item.id)}>
                        Open context
                      </Link>
                    ) : null}
                    {!item.read ? (
                      <button className="rounded-full border border-line px-3 py-2 text-xs font-semibold text-ink/65 hover:border-iris hover:text-iris" onClick={() => markRead(item.id)} type="button">
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="liquid-glass-panel rounded-3xl p-5">
          <h2 className="font-semibold text-ink">Preferences</h2>
          <p className="mt-2 text-sm leading-6 text-ink/60">Email and push are not enabled. These settings only control Yorai in-app updates.</p>
          <div className="mt-4 grid gap-3">
            {preferences ? preferenceLabels.map(([key, label]) => (
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/30 bg-surface/55 px-3 py-2 text-sm font-semibold text-ink/70 dark:border-white/10" key={key}>
                <span>{label}</span>
                <input checked={preferences[key]} className="h-4 w-4 accent-violet" onChange={() => togglePreference(key)} type="checkbox" />
              </label>
            )) : (
              <p className="text-sm text-ink/60">Choose a Yorai user to manage preferences.</p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

function labelType(type: string) {
  return type.toLowerCase().replaceAll('_', ' ');
}
