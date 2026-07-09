import { NextRequest, NextResponse } from 'next/server';
import { formatPublicUserContext, requireDemoUserId, trustLabelFromRole } from '@/lib/demo-auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const userId = await requireDemoUserId();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const body = (await request.json()) as { collegeId?: string; title?: string; context?: string; tags?: string[]; body?: string };
    const title = body.title?.trim();
    const text = body.body?.trim();
    const collegeId = body.collegeId?.trim();

    if (!collegeId || !title || !text) {
      return NextResponse.json({ ok: false, error: 'Thread title and context are required.' }, { status: 400 });
    }

    const tags = (body.tags ?? []).map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8);
    const context = body.context?.trim() ?? '';
    const now = new Date();
    const thread = await prisma.question.create({
      data: {
        collegeId,
        userId,
        title,
        body: text,
        category: tags[0] ?? 'Student context',
        branch: context.split(',')[0]?.trim() || user.branch || undefined,
        branchYearContext: context || undefined,
        topicTags: tags,
        freshnessLabel: 'Fresh student context',
        participantContext: `${formatPublicUserContext(user)} started this thread. Awaiting student context.`,
        contextBadge: 'Context added',
        currentStudentSignal: trustLabelFromRole(user.role) === 'Current student' ? 'Current students responding' : 'Awaiting student context',
        reconfirmationSignal: 'Recently active',
        speakerContext: formatPublicUserContext(user),
        trustLabel: trustLabelFromRole(user.role),
        lastActiveAt: now,
      },
    });

    return NextResponse.json({ ok: true, threadId: thread.id });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Could not save this yet. Try again.' }, { status: 400 });
  }
}
