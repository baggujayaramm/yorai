import { NextRequest, NextResponse } from 'next/server';
import type { ContextAttachmentModerationStatus, ContextAttachmentVisibility } from '@prisma/client';
import { requireDemoUserId } from '@/lib/demo-auth';
import { prisma } from '@/lib/prisma';

const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REDACTION'];
const visibilityOptions = ['MODERATOR_ONLY', 'SUMMARY_ONLY', 'PUBLIC_AFTER_REVIEW'];

export async function GET() {
  try {
    const userId = await requireDemoUserId();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (user.role !== 'MODERATOR') {
      return NextResponse.json({ ok: false, error: 'Choose the Moderator demo user to review attachments.' }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Could not load attachments.' }, { status: 403 });
  }

  const attachments = await prisma.contextAttachment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { anonymousDisplayName: true, role: true } } },
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
    const userId = await requireDemoUserId();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (user.role !== 'MODERATOR') {
      return NextResponse.json({ ok: false, error: 'Choose the Moderator demo user to review attachments.' }, { status: 403 });
    }

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

    const attachment = await prisma.contextAttachment.update({
      where: { id: body.id },
      data: {
        moderationStatus: body.moderationStatus,
        visibility: body.visibility,
        moderatorNote: body.moderatorNote?.trim() || undefined,
      },
    });

    return NextResponse.json({ ok: true, attachment });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Could not update this yet. Try again.' }, { status: 400 });
  }
}
