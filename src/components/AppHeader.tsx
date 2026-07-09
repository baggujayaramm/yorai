import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { MyContextSwitcher } from './MyContextSwitcher';

export function AppHeader() {
  return (
    <header className="liquid-nav sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-sun/30 bg-gradient-to-br from-ink via-iris to-blush text-sm font-bold text-white shadow-glow">
            Y
          </span>
          <span>
            <span className="block text-lg font-semibold text-ink">Yorai</span>
            <span className="block text-xs text-ink/60">Student experience network</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-medium text-ink/70">
          <Link className="rounded-full px-3 py-2 transition hover:bg-surface/70 hover:text-iris hover:ring-1 hover:ring-sun/25" href="/search">
            Colleges
          </Link>
          <Link className="rounded-full px-3 py-2 transition hover:bg-surface/70 hover:text-iris hover:ring-1 hover:ring-sun/25" href="/me">
            My Yorai
          </Link>
          <span className="hidden rounded px-3 py-2 text-ink/40 sm:inline">Cross-college spaces soon</span>
          <MyContextSwitcher />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
