'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body><main style={{ maxWidth: 640, margin: '4rem auto', padding: '1rem', fontFamily: 'sans-serif' }}><h1>Yorai could not load</h1><p>Please try again. No technical or private details are shown here.</p><button onClick={reset} type="button">Try again</button></main></body></html>;
}
