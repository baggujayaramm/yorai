import { NextRequest, NextResponse } from 'next/server';
import type { ContextAttachmentModerationStatus, ContextAttachmentVisibility } from '@prisma/client';
import { requireModeratorUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiErrorResponse } from '@/lib/api-response';
import { featureEnabled } from '@/lib/release-controls';

const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REDACTION'];
const visibilityOptions = ['MODERATOR_ONLY', 'SUMMARY_ONLY', 'PUBLIC_AFTER_REVIEW'];

export async function GET(request: NextRequest) {
  try {
    if (!await featureEnabled('moderation_tools')) return NextResponse.json({ ok: false, error: 'Moderation tools are temporarily unavailable.' }, { status: 503 });
    await requireModeratorUser();
  } catch (error) {
    return apiErrorResponse(error, 'Could not load attachments.', request, 'moderation');
  }

  const attachments = await prisma.contextAttachment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { anonymousDisplayName: true, role: true } } },
    take: 50,
  });

  return NextResponse.json({
    ok: true,
    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      targetType: attachment.targetType,
      targetId: attachment.targetId,
      fileType: attachment.fileType,
      visibility: attachment.visibility,
      moderationStatus: attachment.moderationStatus,
      privacyChecked: attachment.privacyChecked,
      caption: attachment.caption ?? undefined,
      moderatorNote: attachment.moderatorNote ?? undefined,
      createdAt: attachment.createdAt.toISOString(),
      sharedBy: attachment.user.anonymousDisplayName ?? attachment.user.role,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  try {
    if (!await featureEnabled('moderation_tools')) return NextResponse.json({ ok: false, error: 'Moderation tools are temporarily unavailable.' }, { status: 503 });
    const moderator = await requireModeratorUser();

    const body = (await request.json()) as {
      id?: string;
      moderationStatus?: ContextAttachmentModerationStatus;
      visibility?: ContextAttachmentVisibility;
      moderatorNote?: string;
    };

    if (!body.id || !body.moderationStatus || !statuses.includes(body.moderationStatus)) {
      return NextResponse.json({ ok: false, error: 'Choose a valid moderation action.' }, { status: 400 });
    }

    if (body.visibility && !visibilityOptions.includes(body.visibility)) {
      return NextResponse.json({ ok: false, error: 'Choose a valid visibility.' }, { status: 400 });
    }

    const attachment = await prisma.$transaction(async (tx) => {
      const updated = await tx.contextAttachment.update({
        where: { id: body.id },
        data: {
          moderationStatus: body.moderationStatus,
          visibility: body.visibility,
          moderatorNote: body.moderatorNote?.trim() || undefined,
        },
      });

      await tx.moderationAction.create({
        data: {
          actionType: `attachment:${body.moderationStatus}`,
          moderatorId: moderator.id,
          targetType: updated.targetType,
          targetId: updated.targetId,
          internalNote: body.moderatorNote?.trim() || undefined,
        },
      });

      return updated;
    });

    return NextResponse.json({ ok: true, attachment });
  } catch (error) {
    return apiErrorResponse(error, 'Could not update this yet. Try again.', request, 'moderation');
  }
}
