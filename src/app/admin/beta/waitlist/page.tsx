import { AdminDenied, AdminHeader } from '@/components/AdminCollegeShell';
import { BetaWaitlistPanel } from '@/components/BetaWaitlistPanel';
import { getCurrentUser } from '@/lib/auth';
import { canAdminCollegeData } from '@/lib/permissions';

export default async function BetaWaitlistPage() {
  const user = await getCurrentUser();
  if (!canAdminCollegeData(user?.role)) return <AdminDenied />;
  return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><AdminHeader title="Beta waitlist" /><div className="mt-6"><BetaWaitlistPanel /></div></main>;
}
