import { CollegePreviewSearch } from '@/components/CollegePreviewSearch';
import { EmptyState } from '@/components/EmptyState';
import { FilterSidebar } from '@/components/FilterSidebar';
import { SearchBar } from '@/components/SearchBar';
import { searchColleges, searchContributionSnippets } from '@/lib/college-search';
import Link from 'next/link';
import { recordAnalytics } from '@/lib/analytics';
import { featureEnabled } from '@/lib/release-controls';

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  if (!await featureEnabled('public_browsing')) return <PublicBrowsingPaused />;
  const { q = '' } = await searchParams;
  const query = q.trim();
  if (query) await recordAnalytics('SEARCH', { routeCategory: 'SEARCH' });
  const [results, contributionResults] = await Promise.all([
    searchColleges(query),
    searchContributionSnippets(query),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-iris">Student spaces</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink sm:text-5xl">Find people, paths, and lived insight</h1>
        <p className="mt-3 text-ink/65">Search by college, city, branch, or the kind of student context you want to understand.</p>
      </div>
      <div className="liquid-glass-panel liquid-glass-strong showcase-glass mt-8 rounded-[2rem] p-4 sm:p-5">
        <SearchBar compact defaultValue={query} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <FilterSidebar />
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink">{results.length} student spaces found</h2>
            {query && <p className="text-sm text-ink/55">Search: {query}</p>}
          </div>
          {results.length > 0 ? (
            <CollegePreviewSearch colleges={results} />
          ) : (
            <EmptyState title="No matching colleges yet" body="Try a city, branch, or university from the current seed data." />
          )}
          {contributionResults.length > 0 && (
            <section className="mt-8 grid gap-3">
              <h2 className="font-semibold text-ink">Student context matching this search</h2>
              {contributionResults.map((item) => (
                <Link className="liquid-glass-panel rounded-3xl p-4 transition hover:border-iris/40" href={item.href} key={`${item.type}-${item.id}`}>
                  <p className="text-xs font-semibold text-iris">{item.type} · {item.college}</p>
                  <p className="mt-1 font-semibold text-ink">{item.title}</p>
                </Link>
              ))}
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

function PublicBrowsingPaused() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <section className="liquid-glass-panel rounded-3xl p-6">
        <h1 className="text-2xl font-semibold text-ink">Public browsing is temporarily paused</h1>
        <p className="mt-3 text-sm leading-6 text-ink/65">College search will return when launch access is reopened.</p>
      </section>
    </main>
  );
}
