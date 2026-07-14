import Link from 'next/link';
import { AdminDenied, AdminHeader } from '@/components/AdminCollegeShell';
import { getCurrentUser } from '@/lib/auth';
import { canAdminCollegeData } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { boundedSearchTerm } from '@/lib/query-limits';

type AdminCollegesPageProps = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export default async function AdminCollegesPage({ searchParams }: AdminCollegesPageProps) {
  const user = await getCurrentUser();
  if (!canAdminCollegeData(user?.role)) return <AdminDenied />;

  const { q = '', status = '' } = await searchParams;
  const term = boundedSearchTerm(q);
  const safeStatus = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED'].includes(status) ? status : '';
  const colleges = await prisma.college.findMany({
    where: {
      ...(safeStatus ? { recordStatus: safeStatus as never } : {}),
      ...(term ? {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { shortName: { contains: term, mode: 'insensitive' } },
          { city: { contains: term, mode: 'insensitive' } },
          { state: { contains: term, mode: 'insensitive' } },
        ],
      } : {}),
    },
    orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
    take: 80,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <AdminHeader title="College data management" />
      <form className="liquid-glass-panel mt-6 flex flex-col gap-3 rounded-3xl p-4 sm:flex-row">
        <label className="sr-only" htmlFor="admin-college-search">Search college records</label>
        <input className="rounded-xl border border-line bg-surface/82 px-3 py-2.5 text-ink" defaultValue={term} id="admin-college-search" name="q" placeholder="Search college records" />
        <label className="sr-only" htmlFor="admin-college-status">Record status</label>
        <select className="rounded-xl border border-line bg-surface/82 px-3 py-2.5 text-ink" defaultValue={safeStatus} id="admin-college-status" name="status">
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING_REVIEW">Pending review</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button className="button-primary px-4 py-2.5" type="submit">Filter</button>
      </form>
      <section className="mt-6 grid gap-3">
        {colleges.map((college) => (
          <Link className="liquid-glass-panel rounded-3xl p-4 transition hover:border-iris/40" href={`/admin/colleges/${college.id}`} key={college.id}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold text-ink">{college.name}</h2>
                <p className="mt-1 text-sm text-ink/62">{college.city}, {college.state} · {college.institutionType ?? college.collegeType ?? 'Institution type not set'}</p>
                <p className="mt-1 text-xs text-ink/50">{college.sourceName ?? 'No source'} · {college.dataOrigin}</p>
              </div>
              <span className="soft-badge">{college.recordStatus.replace('_', ' ')}</span>
            </div>
          </Link>
        ))}
        {colleges.length === 0 && <p className="liquid-glass-panel rounded-3xl p-5 text-sm text-ink/65">No college records match this filter.</p>}
      </section>
    </main>
  );
}
