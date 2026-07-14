import Link from 'next/link';
import { AccountSafetyPanel } from '@/components/AccountSafetyPanel';
import { getCurrentUser } from '@/lib/auth';

export default async function SafetySettingsPage() {
  const user = await getCurrentUser();
  if (!user) return <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><section className="liquid-glass-panel rounded-3xl p-6"><h1 className="text-2xl font-semibold text-ink">Private safety notices</h1><p className="mt-3 text-sm text-ink/65">Sign in to view notices or restrictions affecting your account.</p><Link className="button-primary mt-5 inline-flex px-5 py-3" href="/login">Sign in</Link></section></main>;
  return <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6"><p className="text-sm font-semibold text-iris">Account safety</p><h1 className="mt-2 text-3xl font-semibold text-ink">Private notices and clarifications</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">Warnings and restrictions are private. They explain specific community-safety context without creating a public score.</p><div className="mt-6"><AccountSafetyPanel /></div></main>;
}
