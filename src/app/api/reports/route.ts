import { NextRequest, NextResponse } from 'next/server';
import { requireDemoUserId } from '@/lib/demo-auth';
import { prisma } from '@/lib/prisma';
import { reportReasons } from '@/lib/report-storage';

const statuses = ['PENDING', 'REVIEWED', 'ACTIONED', 'REJECTED'];

export async function GET() {
  try {
    const userId = await requireDemoUserId();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.role !== 'MODERATOR') {
      return NextResponse.json({ ok: false, error: 'This area is only for Yorai moderators.' }, { status: 403 });
    }

    const reports = await prisma.report.findMany({ orderBy: { createdAt: 'desc' } });
    const items = await Promise.all(reports.map(async (report) => ({
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      details: report.details ?? '',
      status: report.status,
      moderatorNotes: report.moderatorNotes ?? '',
      createdAt: report.createdAt.toISOString().slice(0, 10),
      preview: await getTargetPreview(report.targetType, report.targetId),
    })));

    return NextResponse.json({ ok: true, reports: items });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Could not load reports.' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const reporterUserId = await requireDemoUserId();
    const body = (await request.json()) as { targetType?: string; targetId?: string; reason?: string; details?: string };
    const reason = body.reason && reportReasons.includes(body.reason) ? body.reason : 'Other';

    if (!body.targetType || !body.targetId) {
      return NextResponse.json({ ok: false, error: 'Missing reported content.' }, { status: 400 });
    }

    await prisma.report.create({
      data: {
        reporterUserId,
        targetType: body.targetType,
        targetId: body.targetId,
        reason,
        details: body.details?.trim() || undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Could not save this yet. Try again.' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireDemoUserId();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.role !== 'MODERATOR') {
      return NextResponse.json({ ok: false, error: 'This area is only for Yorai moderators.' }, { status: 403 });
    }

    const body = (await request.json()) as {
      id?: string;
      status?: string;
      moderatorNotes?: string;
      targetType?: string;
      targetId?: string;
      contentAction?: string;
    };

    if (!body.id) return NextResponse.json({ ok: false, error: 'Missing report.' }, { status: 400 });

    if (body.contentAction && body.targetType && body.targetId) {
      await applyContentAction(body.targetType, body.targetId, body.contentAction);
    }

    const report = await prisma.report.update({
      where: { id: body.id },
      data: {
        status: statuses.includes(body.status ?? '') ? body.status as never : undefined,
        moderatorNotes: body.moderatorNotes?.trim() || undefined,
      },
    });

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Could not update this yet. Try again.' }, { status: 400 });
  }
}

async function getTargetPreview(targetType: string, targetId: string) {
  const type = targetType.toLowerCase();
  if (type.includes('thread')) {
    const item = await prisma.question.findUnique({ where: { id: targetId }, select: { title: true, body: true } }).catch(() => null);
    return item ? `${item.title}: ${item.body}` : 'Thread preview unavailable in database.';
  }
  if (type.includes('reply')) {
    const item = await prisma.answer.findUnique({ where: { id: targetId }, select: { body: true } }).catch(() => null);
    return item?.body ?? 'Reply preview unavailable in database.';
  }
  if (type.includes('experience')) {
    const item = await prisma.experiencePost.findUnique({ where: { id: targetId }, select: { title: true, body: true } }).catch(() => null);
    return item ? `${item.title}: ${item.body}` : 'Experience preview unavailable in database.';
  }
  if (type.includes('insight') || type.includes('what')) {
    const item = await prisma.whatWorksPost.findUnique({ where: { id: targetId }, select: { title: true, body: true } }).catch(() => null);
    return item ? `${item.title}: ${item.body}` : 'Insight preview unavailable in database.';
  }
  if (type.includes('attachment')) return 'Context attachment submitted for privacy review.';
  return 'Content preview unavailable.';
}

async function applyContentAction(targetType: string, targetId: string, action: string) {
  const type = targetType.toLowerCase();
  const hidden = action === 'hide';
  const outdated = action === 'outdated';
  const needsContext = action === 'needs-context';
  const disputed = action === 'disputed';

  if (type.includes('thread')) {
    await prisma.question.update({
      where: { id: targetId },
      data: {
        status: hidden ? 'FLAGGED' : undefined,
        freshnessLabel: outdated ? 'Past experience' : needsContext ? 'Needs current context' : undefined,
        reconfirmationSignal: needsContext ? 'Needs current student update' : disputed ? 'Disputed context' : undefined,
      },
    }).catch(() => undefined);
  }

  if (type.includes('reply')) {
    await prisma.answer.update({ where: { id: targetId }, data: { moderationStatus: hidden ? 'HIDDEN' : disputed ? 'DISPUTED' : undefined } }).catch(() => undefined);
  }

  if (type.includes('experience')) {
    await prisma.experiencePost.update({
      where: { id: targetId },
      data: { moderationStatus: hidden ? 'HIDDEN' : disputed ? 'DISPUTED' : undefined, freshnessLabel: outdated ? 'Past experience' : undefined },
    }).catch(() => undefined);
  }

  if (type.includes('insight') || type.includes('what')) {
    await prisma.whatWorksPost.update({ where: { id: targetId }, data: { freshnessLabel: outdated ? 'Needs current context' : undefined } }).catch(() => undefined);
  }
}
