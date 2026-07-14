import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CreateThreadForm } from '@/components/ThreadForms';
import { getCollegeBySlugWithDb } from '@/lib/data';
import { colleges } from '@/lib/seed-data';

export const dynamic = 'force-dynamic';

type NewThreadPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return colleges.map((college) => ({ slug: college.slug }));
}

export default async function NewThreadPage({ params }: NewThreadPageProps) {
  const { slug } = await params;
  const college = await getCollegeBySlugWithDb(slug);

  if (!college) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link className="text-sm font-semibold text-iris" href={`/colleges/${college.slug}#live-threads`}>
        Back to {college.name}
      </Link>
      <div className="mt-6">
        <CreateThreadForm college={college} />
      </div>
    </main>
  );
}
