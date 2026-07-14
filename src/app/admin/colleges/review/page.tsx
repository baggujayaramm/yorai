import Link from 'next/link';
import { AdminDenied, AdminHeader } from '@/components/AdminCollegeShell';
import { getCurrentUser } from '@/lib/auth';
import { canAdminCollegeData } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export default async function AdminCollegeReviewPage() {
  const user = await getCurrentUser();
  if (!canAdminCollegeData(user?.role)) return <AdminDenied />;

  const colleges = await prisma.college.findMany({
    where: { recordStatus: { in: ['DRAFT', 'PENDING_REVIEW'] } },
    orderBy: [{ importedAt: 'desc' }, { updatedAt: 'desc' }],
    take: 80,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <AdminHeader title="College review queue" />
      <p className="mt-5 max-w-3xl text-sm leading-6 text-ink/65">
        Imported colleges stay out of public discovery until an admin reviews source metadata, duplicate warnings, and factual fields.
      </p>
      <section className="mt-6 grid gap-3">
        {colleges.map((college) => (
          <Link className="liquid-glass-panel rounded-3xl p-4 transition hover:border-iris/40" href={`/admin/colleges/${college.id}`} key={college.id}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold text-ink">{college.name}</h2>
                <p className="mt-1 text-sm text-ink/62">{college.city}, {college.state} · Source: {college.sourceName ?? 'Missing source name'}</p>
                <p className="mt-1 text-xs text-ink/50">{college.sourceUrl ?? 'No source URL'} · {college.sourceRecordId ?? 'No source record ID'}</p>
              </div>
              <span className="soft-badge">{college.recordStatus.replace('_', ' ')}</span>
            </div>
          </Link>
        ))}
        {colleges.length === 0 && <p className="liquid-glass-panel rounded-3xl p-5 text-sm text-ink/65">No imported records are waiting for review.</p>}
      </section>
    </main>
  );
}
