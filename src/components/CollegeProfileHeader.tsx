import type { College } from '@/lib/types';
import { PersonalActionButton } from './PersonalActionButton';

export function CollegeProfileHeader({ college }: { college: College }) {
  return (
    <section className="border-b border-white/45 bg-surface/50 backdrop-blur-2xl dark:border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="aurora-surface liquid-glass-strong showcase-glass rounded-[2.5rem] p-6 sm:p-8">
          <div className="pointer-events-none absolute right-6 top-0 h-40 w-40 rounded-full bg-iris/16 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-16 h-32 w-32 rounded-full bg-cyan/12 blur-3xl" />
        <p className="relative text-sm font-semibold text-iris">{college.city}, {college.state}</p>
        <div className="relative mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="max-w-4xl text-3xl font-semibold text-ink sm:text-5xl">{college.name}</h1>
            <p className="mt-3 max-w-2xl text-base text-ink/65">
              A student space for lived insight, practical guidance, and branch-specific context from people connected to {college.city}.
            </p>
            <a className="mt-2 inline-block text-sm font-semibold text-iris" href={college.officialWebsite}>
              College source link
            </a>
          </div>
          <div className="flex flex-wrap gap-3">
            <PersonalActionButton targetType="college" targetId={college.id} label="Follow" activeLabel="Following" />
            <button className="button-primary">Ask Students</button>
            <button className="button-primary">Share Student Path</button>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
