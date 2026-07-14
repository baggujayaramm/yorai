import Link from 'next/link';
import { AdminDenied, AdminHeader } from '@/components/AdminCollegeShell';
import { getCurrentUser } from '@/lib/auth';
import { canAdminCollegeData } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export default async function BetaDashboardPage() {
  const user = await getCurrentUser();
  if (!canAdminCollegeData(user?.role)) return <AdminDenied />;

  const now = new Date();
  const activeSince = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [invites, uses, active, waitlist, onboarded, feedback, bugs, moderation, activeUserRows, contributions] = await Promise.all([
    prisma.betaInvite.count({ where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
    prisma.betaInviteRedemption.count(),
    prisma.user.count({ where: { betaStatus: 'ACTIVE' } }),
    prisma.betaWaitlist.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { betaStatus: 'ACTIVE', username: { not: null } } }),
    prisma.feedback.count(),
    prisma.feedback.count({ where: { category: 'BUG', status: { notIn: ['RESOLVED', 'DECLINED'] } } }),
    prisma.report.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'PENDING', 'REVIEWED'] } } }),
    prisma.analyticsEvent.findMany({ where: { userId: { not: null }, createdAt: { gte: activeSince } }, distinct: ['userId'], select: { userId: true }, take: 1000 }),
    Promise.all([prisma.question.count(), prisma.answer.count(), prisma.experiencePost.count(), prisma.whatWorksPost.count()]),
  ]);

  const metrics: Array<[string, number]> = [
    ['Active invites', invites], ['Invite uses', uses], ['Active beta users', active], ['Waitlist', waitlist],
    ['Onboarding complete', onboarded], ['Active users, 30 days', activeUserRows.length],
    ['Contributions', contributions.reduce((sum, count) => sum + count, 0)], ['Feedback', feedback],
    ['Unresolved bugs', bugs], ['Pending moderation', moderation],
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <AdminHeader title="Closed beta operations" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map(([label, value]) => (
          <div className="liquid-glass-panel rounded-2xl p-4" key={label}>
            <p className="text-xs text-ink/55">{label}</p>
            <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="button-secondary px-4 py-2" href="/admin/beta/invites">Manage invites</Link>
        <Link className="button-secondary px-4 py-2" href="/admin/beta/waitlist">Review waitlist</Link>
        <Link className="button-secondary px-4 py-2" href="/admin/beta/users">Beta user access</Link>
        <Link className="button-secondary px-4 py-2" href="/admin/feedback">Review feedback</Link>
      </div>
    </main>
  );
}
