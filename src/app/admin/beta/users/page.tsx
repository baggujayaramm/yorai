import { AdminDenied, AdminHeader } from '@/components/AdminCollegeShell';
import { BetaUsersPanel } from '@/components/BetaUsersPanel';
import { getCurrentUser } from '@/lib/auth';
import { canAdminCollegeData } from '@/lib/permissions';

export default async function BetaUsersPage() {
  const user = await getCurrentUser();
  if (!canAdminCollegeData(user?.role)) return <AdminDenied />;
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <AdminHeader title="Beta user access" />
      <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/65">Statuses affect contribution access only. Public browsing and existing user content remain intact.</p>
      <div className="mt-6"><BetaUsersPanel /></div>
    </main>
  );
}
