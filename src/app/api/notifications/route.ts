import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireCurrentUser } from '@/lib/auth';
import {
  getNotificationUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  MAX_NOTIFICATION_LIMIT,
} from '@/lib/notifications';
import { apiErrorResponse } from '@/lib/api-response';
import { featureEnabled } from '@/lib/release-controls';

export async function GET(request: NextRequest) {
  if (!await featureEnabled('notifications')) return NextResponse.json({ ok: true, notifications: [], unreadCount: 0, disabled: true });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: true, notifications: [], unreadCount: 0 });

  const { searchParams } = new URL(request.url);
  const countOnly = searchParams.get('count') === '1';
  const unreadCount = await getNotificationUnreadCount(user.id);
  if (countOnly) return NextResponse.json({ ok: true, unreadCount });

  const requestedLimit = Number(searchParams.get('limit') ?? MAX_NOTIFICATION_LIMIT);
  const notifications = await listNotifications(user.id, requestedLimit);
  return NextResponse.json({
    ok: true,
    unreadCount,
    notifications: notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      targetType: notification.targetType,
      targetId: notification.targetId,
      destinationUrl: notification.destinationUrl,
      read: Boolean(notification.readAt),
      createdAt: notification.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(request: NextRequest) {
  try {
    if (!await featureEnabled('notifications')) return NextResponse.json({ ok: false, error: 'Notifications are temporarily unavailable.' }, { status: 503 });
    const user = await requireCurrentUser();
    const body = (await request.json()) as { notificationId?: string; all?: boolean };
    if (body.all) {
      await markAllNotificationsRead(user.id);
      return NextResponse.json({ ok: true });
    }
    if (!body.notificationId) return NextResponse.json({ ok: false, error: 'Missing notification.' }, { status: 400 });
    await markNotificationRead(user.id, body.notificationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Could not update notifications.', request, 'notifications');
  }
}
