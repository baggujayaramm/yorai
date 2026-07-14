import Link from 'next/link';
import { LaunchDashboard } from '@/components/LaunchDashboard';
import { getCurrentUser } from '@/lib/auth';
import { canAdminCollegeData } from '@/lib/permissions';

export default async function AdminLaunchPage() {
  const user = await getCurrentUser();
  if (!canAdminCollegeData(user?.role)) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <section className="liquid-glass-panel rounded-3xl p-6">
          <h1 className="text-2xl font-semibold text-ink">Admin access required</h1>
          <p className="mt-3 text-sm text-ink/65">Launch operations are limited to Yorai administrators.</p>
          <Link className="button-secondary mt-5 inline-flex px-4 py-2" href="/">Return home</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold text-iris">Public launch readiness</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">Launch controls</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/65">
        Control access mode, emergency pauses, registration, and launch-health indicators without changing student content or data.
      </p>
      <div className="mt-6">
        <LaunchDashboard />
      </div>
    </main>
  );
}
