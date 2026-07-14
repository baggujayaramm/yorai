import { prisma } from './prisma';

export const analyticsEventTypes = ['PAGE_VIEW', 'SEARCH', 'THREAD_CREATED', 'REPLY_CREATED', 'EXPERIENCE_CREATED', 'INSIGHT_CREATED', 'FOLLOW', 'WATCH', 'SAVE_EXPERIENCE', 'SAVE_INSIGHT', 'REPORT_CREATED', 'ONBOARDING_COMPLETED'] as const;
export type AnalyticsEventType = (typeof analyticsEventTypes)[number];
export const routeCategories = ['HOME', 'SEARCH', 'COLLEGE', 'THREAD', 'EXPERIENCE', 'INSIGHT', 'ACCOUNT', 'MODERATION', 'ADMIN', 'POLICY', 'OTHER'] as const;

export function isAnalyticsEventType(value: string): value is AnalyticsEventType { return (analyticsEventTypes as readonly string[]).includes(value); }
export function isRouteCategory(value?: string): value is (typeof routeCategories)[number] { return Boolean(value && (routeCategories as readonly string[]).includes(value)); }

export function routeCategoryForPath(pathname: string) {
  if (pathname === '/') return 'HOME';
  if (pathname.startsWith('/search')) return 'SEARCH';
  if (pathname.includes('/threads/')) return 'THREAD';
  if (pathname.startsWith('/colleges/')) return 'COLLEGE';
  if (pathname.startsWith('/experiences/')) return 'EXPERIENCE';
  if (pathname.startsWith('/what-works/')) return 'INSIGHT';
  if (pathname.startsWith('/admin/')) return 'ADMIN';
  if (pathname.startsWith('/moderation')) return 'MODERATION';
  if (pathname.startsWith('/settings') || pathname === '/me' || pathname === '/notifications') return 'ACCOUNT';
  if (['/privacy', '/terms', '/safety', '/community-guidelines', '/content-policy', '/grievance'].includes(pathname)) return 'POLICY';
  return 'OTHER';
}

export async function recordAnalytics(eventType: AnalyticsEventType, input: { userId?: string | null; routeCategory?: string } = {}) {
  try {
    await prisma.analyticsEvent.create({ data: { eventType, userId: input.userId ?? undefined, routeCategory: isRouteCategory(input.routeCategory) ? input.routeCategory : undefined } });
  } catch {
    // Analytics must never block the student workflow.
  }
}
