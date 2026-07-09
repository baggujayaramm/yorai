import { CollegePreviewSearch } from '@/components/CollegePreviewSearch';
import { EmptyState } from '@/components/EmptyState';
import { FilterSidebar } from '@/components/FilterSidebar';
import { SearchBar } from '@/components/SearchBar';
import { colleges } from '@/lib/seed-data';

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = '' } = await searchParams;
  const query = q.trim().toLowerCase();
  const results = query
    ? colleges.filter((college) =>
        [
          college.name,
          college.city,
          college.state,
          college.affiliation,
          ...college.courses,
        ].some((value) => value.toLowerCase().includes(query)),
      )
    : colleges;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-iris">Student spaces</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink sm:text-5xl">Find people, paths, and lived insight</h1>
        <p className="mt-3 text-ink/65">Search by college, city, branch, or the kind of student context you want to understand.</p>
      </div>
      <div className="liquid-glass-panel liquid-glass-strong showcase-glass mt-8 rounded-[2rem] p-4 sm:p-5">
        <SearchBar compact defaultValue={q} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <FilterSidebar />
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink">{results.length} student spaces found</h2>
            {query && <p className="text-sm text-ink/55">Search: {q}</p>}
          </div>
          {results.length > 0 ? (
            <CollegePreviewSearch colleges={results} />
          ) : (
            <EmptyState title="No matching colleges yet" body="Try a city, branch, or university from the current seed data." />
          )}
        </section>
      </div>
    </main>
  );
}
