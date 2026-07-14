import Link from 'next/link';

export function AdminHeader({ title }: { title: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-iris">Admin only</p>
      <h1 className="mt-1 text-3xl font-semibold text-ink">{title}</h1>
      <nav aria-label="Admin navigation" className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
        <Link className="soft-badge" href="/admin/colleges">Records</Link>
        <Link className="soft-badge" href="/admin/colleges/review">Review</Link>
        <Link className="soft-badge" href="/admin/colleges/imports">Imports</Link>
        <Link className="soft-badge" href="/admin/analytics">Analytics</Link>
        <Link className="soft-badge" href="/admin/system">System</Link>
        <Link className="soft-badge" href="/admin/beta">Beta</Link>
        <Link className="soft-badge" href="/admin/feedback">Feedback</Link>
        <Link className="soft-badge" href="/admin/data-quality">Data quality</Link>
        <Link className="soft-badge" href="/admin/releases">Releases</Link>
      </nav>
    </div>
  );
}

export function AdminDenied() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <section className="liquid-glass-panel liquid-glass-strong rounded-3xl p-6">
        <p className="text-sm font-semibold text-iris">Admin only</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">This area is only for Yorai administrators.</h1>
        <p className="mt-3 text-sm text-ink/65">Moderators can review student safety queues, but college data publishing is a separate admin permission.</p>
      </section>
    </main>
  );
}
