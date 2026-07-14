import Link from 'next/link';
import { OfficialCorrectionForm } from '@/components/OfficialCorrectionForm';
import { getCurrentUser } from '@/lib/auth';
import { isCollegeRepresentativeRole } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export default async function CorrectionRequestsPage() {
  const user = await getCurrentUser();
  if (!user || !isCollegeRepresentativeRole(user.role)) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <section className="liquid-glass-panel rounded-3xl p-6">
          <h1 className="text-2xl font-semibold text-ink">Approved representative access required</h1>
          <p className="mt-3 text-sm leading-6 text-ink/65">Official metadata corrections require an approved college representative request. Institutional email alone is not enough.</p>
          <Link className="button-primary mt-5 inline-flex px-5 py-3" href="/college-claim">Request access</Link>
        </section>
      </main>
    );
  }

  const colleges = await prisma.college.findMany({ where: { recordStatus: 'PUBLISHED' }, orderBy: [{ state: 'asc' }, { name: 'asc' }], take: 150, select: { id: true, name: true, city: true, state: true } });
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold text-iris">Official metadata correction</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">Request a factual update</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">Use this only for factual college metadata. Student experiences, live threads, reports, and moderation decisions remain independent.</p>
      <div className="mt-6">
        <OfficialCorrectionForm colleges={colleges} />
      </div>
    </main>
  );
}
