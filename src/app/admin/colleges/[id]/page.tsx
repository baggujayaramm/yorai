import { notFound } from 'next/navigation';
import { AdminCollegeActions } from '@/components/AdminCollegeActions';
import { AdminDenied, AdminHeader } from '@/components/AdminCollegeShell';
import { getCurrentUser } from '@/lib/auth';
import { canAdminCollegeData } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

type AdminCollegeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminCollegeDetailPage({ params }: AdminCollegeDetailPageProps) {
  const user = await getCurrentUser();
  if (!canAdminCollegeData(user?.role)) return <AdminDenied />;

  const { id } = await params;
  const college = await prisma.college.findUnique({
    where: { id },
    include: {
      reviewedBy: { select: { displayName: true, name: true, username: true } },
      importBatch: true,
      changeRecords: { orderBy: { createdAt: 'desc' }, take: 20, include: { changedBy: { select: { displayName: true, name: true, username: true } } } },
    },
  });

  if (!college) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <AdminHeader title={college.name} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="liquid-glass-panel rounded-3xl p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="soft-badge">{college.recordStatus.replace('_', ' ')}</span>
            <span className="soft-badge">{college.dataOrigin.replace('_', ' ')}</span>
          </div>
          <AdminCollegeActions college={college} />
        </section>
        <aside className="grid gap-4">
          <section className="liquid-glass-panel rounded-3xl p-5">
            <h2 className="font-semibold text-ink">Source metadata</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <Info label="Source" value={college.sourceName ?? 'Not recorded'} />
              <Info label="Source URL" value={college.sourceUrl ?? 'Not recorded'} />
              <Info label="Source record ID" value={college.sourceRecordId ?? 'Not recorded'} />
              <Info label="Source updated" value={college.sourceUpdatedAt?.toISOString().slice(0, 10) ?? 'Unknown'} />
              <Info label="Imported" value={college.importedAt?.toISOString().slice(0, 10) ?? 'Not imported'} />
              <Info label="Last reviewed" value={college.lastReviewedAt?.toISOString().slice(0, 10) ?? 'Not reviewed'} />
              <Info label="Reviewed by" value={college.reviewedBy?.displayName ?? college.reviewedBy?.name ?? 'Not reviewed'} />
            </dl>
          </section>
          <section className="liquid-glass-panel rounded-3xl p-5">
            <h2 className="font-semibold text-ink">Import batch</h2>
            {college.importBatch ? (
              <p className="mt-3 text-sm leading-6 text-ink/65">{college.importBatch.fileName} · {college.importBatch.status.replaceAll('_', ' ')}</p>
            ) : (
              <p className="mt-3 text-sm text-ink/65">No import batch attached.</p>
            )}
          </section>
        </aside>
      </div>
      <section className="liquid-glass-panel mt-6 rounded-3xl p-5">
        <h2 className="font-semibold text-ink">Private change history</h2>
        <div className="mt-4 grid gap-3">
          {college.changeRecords.map((record) => (
            <article className="rounded-2xl border border-white/35 bg-surface/60 p-3 text-sm dark:border-white/10" key={record.id}>
              <p className="font-semibold text-ink">{record.actionType.replaceAll('_', ' ')}</p>
              <p className="mt-1 text-ink/62">{record.createdAt.toISOString().slice(0, 10)} · {record.changedBy?.displayName ?? record.changedBy?.name ?? 'system import'}</p>
              {record.note && <p className="mt-2 text-ink/65">{record.note}</p>}
            </article>
          ))}
          {college.changeRecords.length === 0 && <p className="text-sm text-ink/65">No change history yet.</p>}
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink/50">{label}</dt>
      <dd className="font-semibold text-ink break-words">{value}</dd>
    </div>
  );
}
