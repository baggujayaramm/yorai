import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { analyticsEventTypes, isAnalyticsEventType, isRouteCategory, recordAnalytics } from '@/lib/analytics';
import { consumeInMemoryLimit } from '@/lib/abuse-prevention';

export async function POST(request: NextRequest) {
  const limit = consumeInMemoryLimit(`analytics:${request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local'}`, { limit: 60, windowMs: 60_000, message: 'Too many analytics events.' });
  if (!limit.allowed) return NextResponse.json({ ok: false }, { status: 429 });
  const body = await request.json().catch(() => ({})) as { eventType?: string; routeCategory?: string };
  if (!body.eventType || !isAnalyticsEventType(body.eventType) || body.eventType !== 'PAGE_VIEW' || !isRouteCategory(body.routeCategory)) return NextResponse.json({ ok: false }, { status: 400 });
  const user = await getCurrentUser();
  await recordAnalytics(body.eventType, { userId: user?.id, routeCategory: body.routeCategory });
  return NextResponse.json({ ok: true, accepted: analyticsEventTypes.includes(body.eventType) });
}
