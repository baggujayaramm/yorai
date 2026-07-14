import Link from 'next/link';

export default function NotFound() {
  return <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6"><section className="liquid-glass-panel liquid-glass-strong rounded-[2rem] p-7"><p className="text-sm font-semibold text-iris">Page not found</p><h1 className="mt-2 text-3xl font-semibold text-ink">This student space is unavailable</h1><p className="mt-3 text-sm leading-6 text-ink/65">It may have moved, been moderated, or never existed. Public student context remains available through search.</p><div className="mt-6 flex flex-wrap gap-3"><Link className="button-primary px-5 py-3" href="/search">Search colleges</Link><Link className="button-secondary px-5 py-3" href="/">Return home</Link></div></section></main>;
}
