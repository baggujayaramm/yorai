import { NextRequest, NextResponse } from 'next/server';
import { formatPublicUserContext, requireDemoUserId, trustLabelFromRole } from '@/lib/demo-auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const userId = await requireDemoUserId();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const body = (await request.json()) as { threadId?: string; collegeId?: string; body?: string; context?: string; attachmentLabel?: string };
    const text = body.body?.trim();
    const threadId = body.threadId?.trim();
    const collegeId = body.collegeId?.trim();

    if (!threadId || !collegeId || !text) {
      return NextResponse.json({ ok: false, error: 'Reply text is required.' }, { status: 400 });
    }

    const trustLabel = trustLabelFromRole(user.role);
    const [reply] = await prisma.$transaction([
      prisma.answer.create({
        data: {
          questionId: threadId,
          collegeId,
          userId,
          body: text,
          branchContext: body.context?.trim() || user.branch || undefined,
          batchContext: user.batch,
          studentTypeContext: trustLabel,
          speakerContext: formatPublicUserContext(user),
          trustLabel,
          contextBadge: body.attachmentLabel ? 'Context attached' : 'Context added',
          communityContext: trustLabel === 'Current student' ? 'Fresh student context' : 'I can add context',
        },
      }),
      prisma.question.update({
        where: { id: threadId },
        data: {
          status: 'ANSWERED',
          lastActiveAt: new Date(),
          currentStudentSignal: trustLabel === 'Current student' ? 'Current students responding' : 'Recently active',
        },
      }),
    ]);

    return NextResponse.json({ ok: true, replyId: reply.id });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Could not save this yet. Try again.' }, { status: 400 });
  }
}
