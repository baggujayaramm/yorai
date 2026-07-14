import Link from 'next/link';
import { AccountDataControls } from '@/components/AccountDataControls';
import { AccountLogoutButton, ProfileSettingsForm } from '@/components/ProfileSettingsForm';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { mapVisibilityToProduct, relationshipFromRole } from '@/lib/profile';
import { betaStatusLabel } from '@/lib/beta-access';

type SettingsProfilePageProps = {
  searchParams: Promise<{ welcome?: string }>;
};

export default async function SettingsProfilePage({ searchParams }: SettingsProfilePageProps) {
  const user = await getCurrentUser();
  const { welcome } = await searchParams;

  if (!user) {
    return <SignedOutSettings title="Profile settings" />;
  }

  const [freshUser, colleges] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
    prisma.college.findMany({ where: { recordStatus: 'PUBLISHED' }, orderBy: [{ state: 'asc' }, { name: 'asc' }], take: 80 }),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <p className="text-sm font-semibold text-iris">Profile settings</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">Your student context</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">
          Add only what helps others understand your perspective. You can skip optional fields and update them later.
        </p>
      </div>
      <ProfileSettingsForm
        colleges={colleges.map((college) => ({ id: college.id, name: college.name, city: college.city, state: college.state }))}
        user={{
          displayName: freshUser.displayName ?? freshUser.name,
          username: freshUser.username ?? '',
          relationship: relationshipFromRole(freshUser.role),
          collegeId: freshUser.collegeId ?? '',
          branch: freshUser.branch ?? '',
          year: freshUser.year ?? freshUser.batch ?? '',
          bio: freshUser.publicBio ?? '',
          visibility: mapVisibilityToProduct(freshUser.profileVisibility),
        }}
        welcome={welcome === '1'}
      />
      <section className="liquid-glass-panel mt-5 rounded-3xl p-5">
        <h2 className="font-semibold text-ink">Account</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink/50">Email</dt>
            <dd className="font-semibold text-ink">{freshUser.email}</dd>
          </div>
          <div>
            <dt className="text-ink/50">Account role</dt>
            <dd className="font-semibold text-ink">{freshUser.role}</dd>
          </div>
          <div>
            <dt className="text-ink/50">Joined</dt>
            <dd className="font-semibold text-ink">{freshUser.createdAt.toISOString().slice(0, 10)}</dd>
          </div>
          <div>
            <dt className="text-ink/50">Closed beta access</dt>
            <dd className="font-semibold text-ink">{betaStatusLabel(freshUser.betaStatus)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-ink/62">Email is visible only to you. Representative and policy controls never expose your email publicly.</p>
        <AccountLogoutButton />
      </section>
      <AccountDataControls />
    </main>
  );
}

function SignedOutSettings({ title }: { title: string }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <section className="liquid-glass-panel liquid-glass-strong rounded-3xl p-6">
        <p className="text-sm font-semibold text-iris">{title}</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Sign in to manage your profile</h1>
        <p className="mt-3 text-sm leading-6 text-ink/65">Public browsing stays open, but profile settings belong to your private account.</p>
        <Link className="button-primary mt-5 inline-flex px-5 py-3" href="/login">Sign in</Link>
      </section>
    </main>
  );
}
