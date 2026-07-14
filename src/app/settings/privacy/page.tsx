import Link from 'next/link';
import { PrivacySettingsForm } from '@/components/ProfileSettingsForm';
import { getCurrentUser } from '@/lib/auth';
import { mapVisibilityToProduct } from '@/lib/profile';

export default async function PrivacySettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <section className="liquid-glass-panel liquid-glass-strong rounded-3xl p-6">
          <p className="text-sm font-semibold text-iris">Privacy settings</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Sign in to manage privacy</h1>
          <p className="mt-3 text-sm leading-6 text-ink/65">Your privacy controls are attached to your Yorai account.</p>
          <Link className="button-primary mt-5 inline-flex px-5 py-3" href="/login">Sign in</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <p className="text-sm font-semibold text-iris">Privacy settings</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">Control profile visibility</h1>
        <p className="mt-2 text-sm leading-6 text-ink/65">
          Yorai keeps identity contextual. Choose how much profile context others can see.
        </p>
      </div>
      <PrivacySettingsForm visibility={mapVisibilityToProduct(user.profileVisibility)} />
    </main>
  );
}
