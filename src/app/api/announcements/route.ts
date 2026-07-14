import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse, ApiError } from '@/lib/api-response';
import { getCurrentUser, requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { announcementAudiencesFor } from '@/lib/release-controls';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const now = new Date();
    const dismissed = user ? await prisma.announcementDismissal.findMany({ where: { userId: user.id }, select: { announcementId: true }, take: 100 }) : [];
    const items = await prisma.betaAnnouncement.findMany({
      where: {
        active: true,
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        audience: { in: [...announcementAudiencesFor(user)] },
        id: { notIn: dismissed.map((item) => item.announcementId) },
      },
      orderBy: { startsAt: 'desc' },
      take: 3,
      select: { id: true, title: true, message: true, expiresAt: true },
    });
    return NextResponse.json({ ok: true, announcements: items });
  } catch (error) {
    return apiErrorResponse(error, 'Could not load beta announcements.', request, 'announcements');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json() as { id?: string };
    if (!body.id) throw new ApiError(400, 'Choose a valid announcement.', 'invalid_announcement');
    await prisma.announcementDismissal.upsert({
      where: { announcementId_userId: { announcementId: body.id, userId: user.id } },
      update: { dismissedAt: new Date() },
      create: { announcementId: body.id, userId: user.id },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Could not dismiss this announcement.', request, 'announcements');
  }
}
