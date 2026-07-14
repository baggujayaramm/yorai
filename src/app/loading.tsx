export default function Loading() {
  return <main aria-busy="true" aria-live="polite" className="mx-auto max-w-6xl px-4 py-10 sm:px-6"><span className="sr-only">Loading Yorai content</span><div className="grid gap-4"><div className="h-8 w-56 animate-pulse rounded-full bg-mist" /><div className="liquid-glass-panel h-40 animate-pulse rounded-3xl" /><div className="liquid-glass-panel h-28 animate-pulse rounded-3xl" /></div></main>;
}
