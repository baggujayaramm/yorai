import Link from 'next/link';
import { AdminDenied, AdminHeader } from '@/components/AdminCollegeShell';
import { getCurrentUser } from '@/lib/auth';
import { canAdminCollegeData } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

type CountRow = { count: number };

export default async function DataQualityPage() {
  const user = await getCurrentUser();
  if (!canAdminCollegeData(user?.role)) return <AdminDenied />;
  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);

  const [incomplete, unpublished, missingLocation, invalidWebsite, missingSource, staleReview, duplicates, orphaned, unanswered, staleThreads, moderation, oldExperiences, reports] = await Promise.all([
    prisma.college.count({ where: { OR: [{ officialWebsite: '' }, { affiliation: '' }, { courses: { isEmpty: true } }] } }),
    prisma.college.count({ where: { recordStatus: { not: 'PUBLISHED' }, dataOrigin: 'IMPORTED' } }),
    prisma.college.count({ where: { OR: [{ city: '' }, { state: '' }] } }),
    prisma.college.count({ where: { NOT: { officialWebsite: { startsWith: 'https://' } } } }),
    prisma.college.count({ where: { OR: [{ sourceName: null }, { sourceUrl: null }] } }),
    prisma.college.count({ where: { OR: [{ lastReviewedAt: null }, { lastReviewedAt: { lt: cutoff } }] } }),
    prisma.$queryRaw<CountRow[]>`SELECT COUNT(*)::int AS count FROM (SELECT COALESCE("normalizedName", LOWER("name")), LOWER("city"), LOWER("state") FROM "College" GROUP BY 1, 2, 3 HAVING COUNT(*) > 1) AS candidates`,
    prisma.$queryRaw<CountRow[]>`SELECT COUNT(*)::int AS count FROM "ContextAttachment" a WHERE (a."targetType" = 'THREAD' AND NOT EXISTS (SELECT 1 FROM "Question" q WHERE q.id = a."targetId")) OR (a."targetType" = 'REPLY' AND NOT EXISTS (SELECT 1 FROM "Answer" r WHERE r.id = a."targetId")) OR (a."targetType" = 'EXPERIENCE' AND NOT EXISTS (SELECT 1 FROM "ExperiencePost" e WHERE e.id = a."targetId")) OR (a."targetType" = 'INSIGHT' AND NOT EXISTS (SELECT 1 FROM "WhatWorksPost" w WHERE w.id = a."targetId"))`,
    prisma.question.count({ where: { answers: { none: {} }, visibility: 'VISIBLE' } }),
    prisma.question.count({ where: { lastActiveAt: { lt: cutoff }, visibility: 'VISIBLE' } }),
    prisma.question.count({ where: { visibility: 'UNDER_REVIEW' } }),
    prisma.experiencePost.count({ where: { createdAt: { lt: cutoff }, visibility: 'VISIBLE' } }),
    prisma.report.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW', 'PENDING', 'REVIEWED'] } } }),
  ]);

  const rows: Array<[string, number]> = [
    ['Incomplete colleges', incomplete], ['Unpublished imports', unpublished], ['Duplicate candidates', duplicates[0]?.count ?? 0],
    ['Missing location', missingLocation], ['Invalid website format', invalidWebsite], ['Missing source', missingSource],
    ['Needs recent review', staleReview], ['Orphaned context references', orphaned[0]?.count ?? 0], ['Unanswered threads', unanswered],
    ['Stale threads', staleThreads], ['Awaiting moderation', moderation], ['Old experiences', oldExperiences], ['Unresolved reports', reports],
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <AdminHeader title="Data quality review" />
      <p className="mt-4 text-sm text-ink/65">Operational indicators only. No record is changed silently; website reachability is reviewed manually after format checks.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => <div className="content-solid flex justify-between rounded-2xl border border-line p-4" key={label}><span className="text-sm text-ink/70">{label}</span><strong className="text-ink">{value}</strong></div>)}
      </div>
      <Link className="button-primary mt-6 inline-flex px-5 py-3" href="/admin/colleges/review">Open college review queue</Link>
    </main>
  );
}
