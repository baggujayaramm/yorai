import { getCurrentUser } from '@/lib/auth';
import { canAdminCollegeData } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export default async function AdminAnalyticsPage() {
  const user = await getCurrentUser();
  if (!canAdminCollegeData(user?.role)) return <Restricted />;

  const [{ since }] = await prisma.$queryRaw<Array<{ since: Date }>>`SELECT NOW() - INTERVAL '30 days' AS "since"`;
  const [activeUsers, newUsers, threads, replies, experiences, insights, searches, reports, resolvedReports, activeDiscussions, freshness, collegeActivity] = await Promise.all([
    prisma.analyticsEvent.groupBy({ by: ['userId'], where: { createdAt: { gte: since }, userId: { not: null } }, orderBy: { userId: 'asc' }, take: 10_000 }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.question.count({ where: { createdAt: { gte: since } } }),
    prisma.answer.count({ where: { createdAt: { gte: since } } }),
    prisma.experiencePost.count({ where: { createdAt: { gte: since } } }),
    prisma.whatWorksPost.count({ where: { createdAt: { gte: since } } }),
    prisma.analyticsEvent.count({ where: { eventType: 'SEARCH', createdAt: { gte: since } } }),
    prisma.report.count({ where: { createdAt: { gte: since } } }),
    prisma.report.count({ where: { resolvedAt: { gte: since } } }),
    prisma.question.count({ where: { lastActiveAt: { gte: since }, visibility: 'VISIBLE' } }),
    prisma.question.groupBy({ by: ['freshnessLabel'], where: { visibility: 'VISIBLE' }, _count: true, orderBy: { freshnessLabel: 'asc' }, take: 20 }),
    prisma.question.groupBy({ by: ['collegeId'], where: { lastActiveAt: { gte: since }, visibility: 'VISIBLE' }, _count: true, orderBy: { _count: { collegeId: 'desc' } }, take: 10 }),
  ]);
  const collegeNames = new Map((await prisma.college.findMany({ where: { id: { in: collegeActivity.map((item) => item.collegeId) } }, select: { id: true, name: true } })).map((college) => [college.id, college.name]));
  const metrics: Array<[string, number]> = [
    ['Active users', activeUsers.length], ['New users', newUsers], ['Threads', threads], ['Replies', replies],
    ['Experiences', experiences], ['Practical insights', insights], ['Searches', searches], ['Reports', reports],
    ['Reports resolved', resolvedReports], ['Active discussions', activeDiscussions],
  ];

  return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
    <p className="text-sm font-semibold text-iris">Private aggregate analytics</p><h1 className="mt-2 text-3xl font-semibold text-ink">Platform activity</h1>
    <p className="mt-3 text-sm text-ink/65">Last 30 days. No advertising identifiers, fingerprints, raw search queries, or contribution text are collected.</p>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([label, value]) => <Metric key={label} label={label} value={value} />)}</div>
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <Aggregate title="Freshness distribution" rows={freshness.map((item) => ({ label: item.freshnessLabel ?? 'Unlabelled', value: item._count }))} />
      <Aggregate title="Active college spaces" rows={collegeActivity.map((item) => ({ label: collegeNames.get(item.collegeId) ?? 'College space', value: item._count }))} />
    </div>
  </main>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="liquid-glass-panel rounded-2xl p-4"><p className="text-xs text-ink/55">{label}</p><p className="mt-1 text-xl font-semibold text-ink">{value}</p></div>; }
function Aggregate({ title, rows }: { title: string; rows: Array<{ label: string; value: number }> }) { return <section className="content-solid rounded-2xl border border-line p-5"><h2 className="font-semibold text-ink">{title}</h2><div className="mt-4 grid gap-2">{rows.length ? rows.map((row) => <div className="flex justify-between rounded-xl bg-mist/70 px-3 py-2 text-sm" key={row.label}><span className="text-ink/65">{row.label}</span><strong className="text-ink">{row.value}</strong></div>) : <p className="text-sm text-ink/60">No aggregate activity yet.</p>}</div></section>; }
function Restricted() { return <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><section className="liquid-glass-panel rounded-3xl p-6"><h1 className="text-2xl font-semibold text-ink">Admin access required</h1><p className="mt-3 text-sm text-ink/65">Aggregate analytics are limited to Yorai administrators.</p></section></main>; }
