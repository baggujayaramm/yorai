import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { followUpForFreshness } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({
      ok: true,
      signedIn: false,
      recentContributions: [],
      followedColleges: [],
      watchedThreads: [],
      savedContent: [],
      followUps: [],
    });
  }

  const [questions, answers, experiences, insights, followedColleges, watchedThreads, savedExperiences, savedInsights, notifications] = await Promise.all([
    prisma.question.findMany({ where: { userId: user.id }, include: { college: { select: { slug: true, name: true } } }, orderBy: { updatedAt: 'desc' }, take: 6 }),
    prisma.answer.findMany({ where: { userId: user.id, deletedAt: null }, include: { question: { include: { college: { select: { slug: true, name: true } } } } }, orderBy: { updatedAt: 'desc' }, take: 4 }),
    prisma.experiencePost.findMany({ where: { userId: user.id, moderationStatus: { not: 'HIDDEN' } }, include: { college: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, take: 4 }),
    prisma.whatWorksPost.findMany({ where: { userId: user.id, moderationStatus: { not: 'HIDDEN' } }, include: { college: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, take: 4 }),
    prisma.followedCollege.findMany({ where: { userId: user.id }, include: { college: true }, orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.watchedThread.findMany({ where: { userId: user.id }, include: { thread: { include: { college: { select: { slug: true, name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.savedExperience.findMany({ where: { userId: user.id }, include: { experience: { include: { college: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 6 }),
    prisma.savedInsight.findMany({ where: { userId: user.id }, include: { insight: { include: { college: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 6 }),
    prisma.notification.findMany({ where: { recipientUserId: user.id }, orderBy: { createdAt: 'desc' }, take: 4 }),
  ]);

  const recentContributions = [
    ...questions.map((item) => ({ type: 'Thread', title: item.title, meta: item.college.name, href: `/colleges/${item.college.slug}/threads/${item.id}`, updatedAt: item.updatedAt.toISOString() })),
    ...answers.map((item) => ({ type: 'Reply', title: item.question.title, meta: item.question.college.name, href: `/colleges/${item.question.college.slug}/threads/${item.question.id}`, updatedAt: item.updatedAt.toISOString() })),
    ...experiences.map((item) => ({ type: 'Experience', title: item.title, meta: item.college.name, href: `/experiences/${item.id}`, updatedAt: item.updatedAt.toISOString() })),
    ...insights.map((item) => ({ type: 'Insight', title: item.title, meta: item.college.name, href: `/what-works/${item.id}`, updatedAt: item.updatedAt.toISOString() })),
  ].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 8);

  const savedContent = [
    ...savedExperiences.map((item) => ({ type: 'Experience', title: item.experience.title, meta: item.experience.college.name, href: `/experiences/${item.experienceId}`, signal: item.experience.freshnessLabel ?? 'Saved' })),
    ...savedInsights.map((item) => ({ type: 'Insight', title: item.insight.title, meta: item.insight.college.name, href: `/what-works/${item.insightId}`, signal: item.insight.freshnessLabel ?? 'Saved' })),
  ];

  const followUps = [
    ...watchedThreads
      .map((item) => {
        const message = followUpForFreshness(item.thread.freshnessLabel, item.thread.reconfirmationSignal);
        return message ? { title: item.thread.title, message, href: `/colleges/${item.thread.college.slug}/threads/${item.thread.id}` } : null;
      })
      .filter(Boolean),
    ...notifications.filter((item) => !item.readAt).map((item) => ({ title: item.title, message: item.message, href: item.destinationUrl ?? '/notifications' })),
  ].slice(0, 8);

  return NextResponse.json({
    ok: true,
    signedIn: true,
    recentContributions,
    followedColleges: followedColleges.map((item) => ({ title: item.college.name, meta: `${item.college.city}, ${item.college.state}`, href: `/colleges/${item.college.slug}`, signal: 'Following' })),
    watchedThreads: watchedThreads.map((item) => ({ title: item.thread.title, meta: item.thread.college.name, href: `/colleges/${item.thread.college.slug}/threads/${item.thread.id}`, signal: item.thread.reconfirmationSignal ?? item.thread.freshnessLabel ?? 'Watched' })),
    savedContent,
    recentNotifications: notifications.map((item) => ({ title: item.title, message: item.message, href: item.destinationUrl ?? '/notifications', read: Boolean(item.readAt) })),
    followUps,
  });
}
