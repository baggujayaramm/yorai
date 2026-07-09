import { colleges } from '@/lib/seed-data';

export function FilterSidebar() {
  const states = Array.from(new Set(colleges.map((college) => college.state)));
  const branches = Array.from(new Set(colleges.flatMap((college) => college.courses))).slice(0, 8);

  return (
    <aside className="glass-panel rounded-2xl p-5">
      <h2 className="text-base font-semibold text-ink">Find context</h2>
      <div className="mt-5 space-y-5">
        <div>
          <p className="text-sm font-semibold text-ink/70">Place</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {states.map((state) => (
              <span className="soft-badge px-3" key={state}>
                {state}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink/70">Branch or student path</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {branches.map((branch) => (
              <span className="soft-badge px-3" key={branch}>
                {branch}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
