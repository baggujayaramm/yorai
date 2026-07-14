'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Yorai route error', { digest: error.digest }); }, [error]);
  return <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6"><section className="liquid-glass-panel rounded-[2rem] p-7" role="alert"><p className="text-sm font-semibold text-sun">Something did not load</p><h1 className="mt-2 text-3xl font-semibold text-ink">Yorai could not open this view</h1><p className="mt-3 text-sm text-ink/65">Your data was not changed. Try the view again, or return home if the problem continues.</p>{error.digest && <p className="mt-3 text-xs text-ink/50">Error reference: {error.digest}</p>}<div className="mt-6 flex gap-3"><button className="button-primary px-5 py-3" onClick={reset} type="button">Try again</button><Link className="button-secondary px-5 py-3" href="/">Return home</Link></div></section></main>;
}
