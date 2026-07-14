import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { defaultNotificationPreferences, ensureNotificationPreferences } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';
import { apiErrorResponse } from '@/lib/api-response';

const preferenceKeys = [
  'repliesToMyContent',
  'watchedThreadUpdates',
  'followedCollegeUpdates',
  'savedContentUpdates',
  'reportModerationUpdates',
] as const;

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const preferences = await ensureNotificationPreferences(user.id);
    return NextResponse.json({ ok: true, preferences: pickPreferences(preferences) });
  } catch (error) {
    return apiErrorResponse(error, 'Could not load notification preferences.', request, 'notifications');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json()) as Partial<Record<(typeof preferenceKeys)[number], boolean>>;
    const data = Object.fromEntries(preferenceKeys.filter((key) => typeof body[key] === 'boolean').map((key) => [key, body[key]]));
    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...defaultNotificationPreferences, ...data },
    });
    return NextResponse.json({ ok: true, preferences: pickPreferences(preferences) });
  } catch (error) {
    return apiErrorResponse(error, 'Could not update notification preferences.', request, 'notifications');
  }
}

function pickPreferences<T extends Record<string, unknown>>(preferences: T) {
  return Object.fromEntries(preferenceKeys.map((key) => [key, preferences[key]]));
}
