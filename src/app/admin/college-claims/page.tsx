import Link from 'next/link';
import { AdminCollegeClaimsPanel } from '@/components/AdminCollegeClaimsPanel';
import { getCurrentUser } from '@/lib/auth';
import { canAdminCollegeData } from '@/lib/permissions';

export default async function AdminCollegeClaimsPage() {
  const user = await getCurrentUser();
  if (!canAdminCollegeData(user?.role)) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <section className="liquid-glass-panel rounded-3xl p-6">
          <h1 className="text-2xl font-semibold text-ink">Admin access required</h1>
          <p className="mt-3 text-sm text-ink/65">College representative queues are available only to Yorai administrators.</p>
          <Link className="button-secondary mt-5 inline-flex px-4 py-2" href="/">Return home</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold text-iris">Admin operations</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">College representative review</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65">
        Review representative requests and official correction requests. Approval records status and account context; factual college data still changes only after source review.
      </p>
      <div className="mt-6">
        <AdminCollegeClaimsPanel />
      </div>
    </main>
  );
}
