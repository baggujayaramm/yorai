type SearchBarProps = {
  defaultValue?: string;
  compact?: boolean;
};

export function SearchBar({ defaultValue = '', compact = false }: SearchBarProps) {
  return (
    <form action="/search" className="flex w-full flex-col gap-3 sm:flex-row">
      <input
        name="q"
        defaultValue={defaultValue}
        className="min-h-12 flex-1 rounded-full border border-white/50 bg-white/66 px-5 text-base text-ink outline-none backdrop-blur-2xl transition placeholder:text-ink/38 focus:border-iris/60 focus:ring-4 focus:ring-iris/20 dark:border-white/10 dark:bg-surface/62"
        placeholder="Find student experiences by college, city, branch, or community"
      />
      <button
        className="min-h-12 rounded bg-iris px-6 font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-iris/90 focus:outline-none focus:ring-4 focus:ring-iris/25"
        type="submit"
      >
        {compact ? 'Search' : 'Explore Experiences'}
      </button>
    </form>
  );
}
