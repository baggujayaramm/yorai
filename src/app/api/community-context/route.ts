import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { normalizeText, validateContent } from '@/lib/content-quality';
import { formatPublicUserContext } from '@/lib/demo-auth';
import { prisma } from '@/lib/prisma';
import { contributionContextLabel } from '@/lib/profile';
import { notifyCommunityContextAdded } from '@/lib/notifications';
import { consumeInMemoryLimit, ratePolicies } from '@/lib/abuse-prevention';
import { getModerationTarget } from '@/lib/moderation-targets';
import { apiErrorResponse } from '@/lib/api-response';
import { assertBetaWriteAccess } from '@/lib/release-controls';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetType = searchParams.get('targetType');
  const targetId = searchParams.get('targetId');

  if (!targetType || !targetId) return NextResponse.json({ ok: true, records: [] });

  const target = await getModerationTarget(prisma, targetType, targetId);
  if (target && target.visibility !== 'VISIBLE') return NextResponse.json({ ok: true, records: [] });
  const records = await prisma.contextAction.findMany({ where: { targetType, targetId }, orderBy: { createdAt: 'desc' }, take: 200 });
  return NextResponse.json({
    ok: true,
    records: records.map((record) => ({
      targetType: record.targetType,
      targetId: record.targetId,
      actionType: record.actionType,
      userId: record.userId,
      createdDate: record.createdAt.toISOString().slice(0, 10),
      userContext: record.userContext ?? '',
      userRole: record.userRole ?? '',
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await assertBetaWriteAccess(user);
    const limit = consumeInMemoryLimit(`context:${user.id}`, ratePolicies.context);
    if (!limit.allowed) return NextResponse.json({ ok: false, error: limit.message }, { status: 429 });
    const body = (await request.json()) as { targetType?: string; targetId?: string; actionType?: string; note?: string };

    if (!body.targetType || !body.targetId || !body.actionType) {
      return NextResponse.json({ ok: false, error: 'Missing context action.' }, { status: 400 });
    }
    const targetType = normalizeText(body.targetType);
    const targetId = normalizeText(body.targetId);
    const actionType = normalizeText(body.actionType);
    const note = normalizeText(body.note);
    const target = await getModerationTarget(prisma, targetType, targetId);
    if (target && target.visibility !== 'VISIBLE') return NextResponse.json({ ok: false, error: 'This contribution is not open for community context right now.' }, { status: 409 });
    if (note) {
      const quality = validateContent(note, { label: 'Context note', minLength: 12, maxLength: 500, allowLinks: 1 });
      if (quality.errors.length || quality.warnings.length) return NextResponse.json({ ok: false, error: [...quality.errors, ...quality.warnings][0] }, { status: 400 });
    }

    await prisma.contextAction.upsert({
      where: {
        targetType_targetId_actionType_userId: {
          targetType,
          targetId,
          actionType,
          userId: user.id,
        },
      },
      update: { userContext: note || contributionContextLabel(user) || formatPublicUserContext(user) },
      create: {
        targetType,
        targetId,
        actionType,
        userId: user.id,
        userContext: note || contributionContextLabel(user) || formatPublicUserContext(user),
        userRole: user.role === 'CURRENT_STUDENT' ? 'Current student' : user.role === 'ALUMNI' ? 'Alumni' : user.role === 'MODERATOR' ? 'Moderator' : 'Aspirant',
      },
    });

    await updateTargetFreshness(targetType, targetId, actionType, user.role);
    await notifyCommunityContextAdded(user, targetType, targetId, actionType);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Could not save this yet. Try again.', request, 'community-context');
  }
}

async function updateTargetFreshness(targetType: string, targetId: string, actionType: string, role: string) {
  const changed = actionType === 'CHANGED_RECENTLY' || actionType === 'Changed recently';
  const needs = actionType === 'NEEDS_CONTEXT' || actionType === 'CURRENT_STUDENTS_UPDATE' || actionType === 'Needs more context' || actionType === 'Current students should update this';
  const reconfirmed = (actionType === 'MATCHES' || actionType === 'Matches my experience') && role === 'CURRENT_STUDENT';
  const data = {
    reconfirmationSignal: changed ? 'Changed recently. Check newer replies.' : needs ? 'Needs current student update.' : reconfirmed ? 'Reconfirmed by current students' : undefined,
    freshnessLabel: needs ? 'Needs current context' : reconfirmed ? 'Reconfirmed' : undefined,
  };
  if (targetType.toLowerCase().includes('thread')) {
    await prisma.question.update({ where: { id: targetId }, data }).catch(() => undefined);
  }
  if (targetType.toLowerCase().includes('experience')) {
    await prisma.experiencePost.update({ where: { id: targetId }, data: { freshnessLabel: data.freshnessLabel, communityContext: data.reconfirmationSignal } }).catch(() => undefined);
  }
  if (targetType.toLowerCase().includes('insight')) {
    await prisma.whatWorksPost.update({ where: { id: targetId }, data: { freshnessLabel: data.freshnessLabel } }).catch(() => undefined);
  }
}
