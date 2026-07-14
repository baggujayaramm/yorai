import { CollegeClaimForm } from '@/components/CollegeClaimForm';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function CollegeClaimPage() {
  const [user, colleges] = await Promise.all([
    getCurrentUser(),
    prisma.college.findMany({ where: { recordStatus: 'PUBLISHED' }, orderBy: [{ state: 'asc' }, { name: 'asc' }], take: 150, select: { id: true, name: true, city: true, state: true } }),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold text-iris">College representative request</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">Request factual metadata access</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">
        Yorai protects student independence. Approved representatives can request factual college metadata corrections with sources, but cannot edit student discussions, reports, ordering, or moderation notes.
      </p>
      <div className="mt-6">
        <CollegeClaimForm colleges={colleges} signedIn={Boolean(user)} />
      </div>
    </main>
  );
}
