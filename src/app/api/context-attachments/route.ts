import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import type { ContextAttachmentTargetType, ContextAttachmentVisibility } from '@prisma/client';
import { getCurrentUser, requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { allowedAttachmentTypes, maxAttachmentBytes } from '@/lib/context-attachments';
import { getModerationTarget } from '@/lib/moderation-targets';
import { canModerate } from '@/lib/permissions';
import { apiErrorResponse, ApiError } from '@/lib/api-response';
import { assertBetaWriteAccess } from '@/lib/release-controls';

const targetTypes = ['THREAD', 'REPLY', 'EXPERIENCE', 'INSIGHT'];
const visibilityOptions = ['MODERATOR_ONLY', 'SUMMARY_ONLY', 'PUBLIC_AFTER_REVIEW'];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetType = searchParams.get('targetType') as ContextAttachmentTargetType | null;
  const targetId = searchParams.get('targetId');
  const currentUser = await getCurrentUser();

  if (!targetType || !targetId || !targetTypes.includes(targetType)) {
    return NextResponse.json({ ok: true, attachments: [] });
  }

  const attachments = await prisma.contextAttachment.findMany({
    where: { targetType, targetId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    ok: true,
    attachments: attachments.map((attachment) => {
      const privileged = currentUser?.id === attachment.userId || canModerate(currentUser?.role);
      const publiclyApproved = attachment.visibility === 'PUBLIC_AFTER_REVIEW' && attachment.moderationStatus === 'APPROVED';
      return {
      id: attachment.id,
      targetType: attachment.targetType,
      targetId: attachment.targetId,
      fileType: attachment.fileType,
      visibility: attachment.visibility,
      moderationStatus: attachment.moderationStatus,
      privacyChecked: attachment.privacyChecked,
      caption: privileged || publiclyApproved ? attachment.caption ?? undefined : undefined,
      createdAt: attachment.createdAt.toISOString(),
      privateReview: !publiclyApproved,
    }; }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    await assertBetaWriteAccess(user);
    if (process.env.NODE_ENV === 'production') throw new ApiError(503, 'Context attachments are temporarily unavailable while private object storage is configured.', 'attachment_storage_unavailable');
    const form = await request.formData();
    const targetType = String(form.get('targetType') ?? '') as ContextAttachmentTargetType;
    const targetId = String(form.get('targetId') ?? '').trim();
    const visibility = String(form.get('visibility') ?? 'MODERATOR_ONLY') as ContextAttachmentVisibility;
    const caption = String(form.get('caption') ?? '').trim();
    const file = form.get('file');
    const checks = ['check-private', 'check-rights', 'check-no-private-data', 'check-helpful'];

    if (!targetTypes.includes(targetType) || !targetId) {
      return NextResponse.json({ ok: false, error: 'Missing attachment target.' }, { status: 400 });
    }
    const target = await getModerationTarget(prisma, targetType, targetId);
    if (!target || target.userId !== user.id) return NextResponse.json({ ok: false, error: 'You can attach context only to your own contribution.' }, { status: 403 });

    if (!visibilityOptions.includes(visibility)) {
      return NextResponse.json({ ok: false, error: 'Choose a safe visibility option.' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Choose a PNG, JPG, JPEG, or WebP image.' }, { status: 400 });
    }

    if (!allowedAttachmentTypes.includes(file.type)) {
      return NextResponse.json({ ok: false, error: 'Only PNG, JPG/JPEG, and WebP images are supported for now.' }, { status: 400 });
    }

    if (file.size > maxAttachmentBytes) {
      return NextResponse.json({ ok: false, error: 'Keep image context under 3 MB for now.' }, { status: 400 });
    }

    if (!checks.every((key) => form.get(key) === 'on')) {
      return NextResponse.json({ ok: false, error: 'Confirm the privacy checklist before sharing context.' }, { status: 400 });
    }

    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const storageDir = path.join(process.cwd(), 'var', 'context-attachments');
    await mkdir(storageDir, { recursive: true });
    const storageKey = `${randomUUID()}.${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(storageDir, storageKey), bytes);

    const attachment = await prisma.contextAttachment.create({
      data: {
        targetType,
        targetId,
        userId: user.id,
        storageKey,
        fileType: file.type,
        visibility,
        privacyChecked: true,
        caption: caption || undefined,
      },
    });

    if (targetType === 'THREAD') {
      await prisma.question.update({ where: { id: targetId }, data: { contextBadge: 'Context attached' } }).catch(() => undefined);
    }

    if (targetType === 'REPLY') {
      await prisma.answer.update({ where: { id: targetId }, data: { contextBadge: 'Context attached' } }).catch(() => undefined);
    }

    return NextResponse.json({
      ok: true,
      attachment: {
        id: attachment.id,
        targetType: attachment.targetType,
        targetId: attachment.targetId,
        fileType: attachment.fileType,
        visibility: attachment.visibility,
        moderationStatus: attachment.moderationStatus,
        privacyChecked: attachment.privacyChecked,
        caption: attachment.caption ?? undefined,
        createdAt: attachment.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return apiErrorResponse(error, 'Could not save this yet. Try again.', request, 'context-attachments');
  }
}
