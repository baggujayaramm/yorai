import Link from 'next/link';
import type { College } from '@/lib/types';
import { getCollegeActivity, getCollegeStats } from '@/lib/data';

export function CollegeCard({ college }: { college: College }) {
  const stats = getCollegeStats(college.id);

  return (
    <article className="liquid-glass-card rounded-3xl p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-iris">{college.city}, {college.state}</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">
            <Link href={`/colleges/${college.slug}`}>{college.name}</Link>
          </h2>
          <p className="mt-2 text-sm text-ink/65">
            Student space for {college.courses.slice(0, 2).join(' and ')} context.
          </p>
        </div>
        <Link
          href={`/colleges/${college.slug}`}
          className="button-secondary px-4 py-2 text-center"
        >
          Enter space
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {college.courses.slice(0, 4).map((course) => (
          <span className="soft-badge px-3" key={course}>
            {course}
          </span>
        ))}
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-ink/50">Live threads</dt>
          <dd className="font-semibold text-ink">Recently active</dd>
        </div>
        <div>
          <dt className="text-ink/50">Student voices</dt>
          <dd className="font-semibold text-ink">{stats.experiences > 0 ? 'Sharing context' : 'Inviting context'}</dd>
        </div>
        <div>
          <dt className="text-ink/50">Activity</dt>
          <dd className="font-semibold text-ink">{getCollegeActivity(college.id)}</dd>
        </div>
      </dl>
    </article>
  );
}
