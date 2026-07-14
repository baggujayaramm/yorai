import { AdminDenied, AdminHeader } from '@/components/AdminCollegeShell';
import { getCurrentUser } from '@/lib/auth';
import { canAdminCollegeData } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export default async function AdminCollegeImportsPage() {
  const user = await getCurrentUser();
  if (!canAdminCollegeData(user?.role)) return <AdminDenied />;

  const batches = await prisma.collegeImportBatch.findMany({
    orderBy: { startedAt: 'desc' },
    take: 60,
    include: { importActor: { select: { displayName: true, name: true, username: true } } },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <AdminHeader title="College import batches" />
      <section className="mt-6 grid gap-3">
        {batches.map((batch) => (
          <article className="liquid-glass-panel rounded-3xl p-4" key={batch.id}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold text-ink">{batch.fileName}</h2>
                <p className="mt-1 text-sm text-ink/62">{batch.sourceName ?? 'Mixed sources'} · {batch.importerVersion}</p>
                <p className="mt-1 text-xs text-ink/50">Started {batch.startedAt.toISOString().slice(0, 10)} · Completed {batch.completedAt?.toISOString().slice(0, 10) ?? 'not completed'}</p>
              </div>
              <span className="soft-badge">{batch.status.replaceAll('_', ' ')}</span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
              <Metric label="Rows" value={batch.totalRows} />
              <Metric label="Successful" value={batch.successfulRows} />
              <Metric label="Failed/skipped" value={batch.failedRows} />
              <Metric label="Warnings" value={batch.warningCount} />
            </dl>
          </article>
        ))}
        {batches.length === 0 && <p className="liquid-glass-panel rounded-3xl p-5 text-sm text-ink/65">No import batches have been recorded yet. CLI dry-runs do not create database batches.</p>}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/35 bg-surface/60 p-3 dark:border-white/10">
      <dt className="text-ink/50">{label}</dt>
      <dd className="mt-1 font-semibold text-ink">{value}</dd>
    </div>
  );
}
