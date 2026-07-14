'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { routeCategoryForPath } from '@/lib/analytics';

export function AnalyticsTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const routeCategory = routeCategoryForPath(pathname);
    void fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventType: 'PAGE_VIEW', routeCategory }), keepalive: true }).catch(() => undefined);
  }, [pathname]);
  return null;
}
