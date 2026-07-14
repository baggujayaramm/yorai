'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export const NOTIFICATION_EVENT = 'yorai-notifications-change';

export function NotificationIndicator() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/notifications?count=1', { cache: 'no-store' }).catch(() => null);
      if (!response) return;
      const data = (await response.json().catch(() => ({}))) as { unreadCount?: number };
      setCount(data.unreadCount ?? 0);
    };
    void load();
    window.addEventListener(NOTIFICATION_EVENT, load);
    window.addEventListener('focus', load);
    return () => {
      window.removeEventListener(NOTIFICATION_EVENT, load);
      window.removeEventListener('focus', load);
    };
  }, []);

  return (
    <Link className="relative rounded-full px-3 py-2 transition hover:bg-surface/70 hover:text-iris hover:ring-1 hover:ring-sun/25" href="/notifications">
      Updates
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 rounded-full bg-gradient-to-br from-iris to-violet px-1.5 py-0.5 text-[10px] font-bold text-white shadow-soft">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );
}
