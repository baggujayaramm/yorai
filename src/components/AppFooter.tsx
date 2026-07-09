import Link from 'next/link';

type FooterLink = [string, string];

const exploreLinks: FooterLink[] = [
  ['Colleges', '/search'],
  ['Live Threads', '/search'],
];

const exploreText = ['Student Experiences', 'What Actually Works'];

const trustLinks: FooterLink[] = [
  ['Community Guidelines', '/community-guidelines'],
  ['Privacy', '/privacy'],
  ['Terms', '/terms'],
  ['Report a Concern', '/grievance'],
];

const contactLinks: FooterLink[] = [
  ['Contact Us', 'mailto:support@yorai.com'],
  ['Feedback', 'mailto:support@yorai.com?subject=Yorai%20feedback'],
];

export function AppFooter() {
  return (
    <footer className="px-4 pb-6 pt-10 sm:px-6">
      <div className="footer-glass mx-auto max-w-6xl rounded-[2rem] px-5 py-6 text-sm text-ink/68 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1.35fr_0.8fr_0.95fr_0.75fr]">
          <section>
            <Link className="inline-flex items-center gap-3 rounded-full focus:outline-none focus:ring-4 focus:ring-iris/20" href="/">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-sun/30 bg-gradient-to-br from-ink via-iris to-blush text-sm font-bold text-white shadow-glow">
                Y
              </span>
              <span>
                <span className="block text-lg font-semibold text-ink">Yorai</span>
                <span className="block text-xs text-ink/56">Student experience network</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm font-semibold leading-6 text-ink/82">
              Know through students. Connect beyond colleges. Build together.
            </p>
            <p className="mt-2 max-w-sm leading-6">
              Student experiences, live conversations, and practical context for making better college decisions.
            </p>
          </section>

          <FooterNav title="Explore" links={exploreLinks} mutedItems={exploreText} />
          <FooterNav title="Trust & Safety" links={trustLinks} />
          <FooterNav title="Contact" links={contactLinks} />
        </div>

        <div className="mt-7 flex flex-col gap-3 border-t border-white/35 pt-4 text-xs text-ink/52 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Yorai. All rights reserved. · Yorai™</p>
          <div className="flex gap-3">
            <Link className="footer-link" href="/privacy">Privacy</Link>
            <Link className="footer-link" href="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterNav({ title, links, mutedItems = [] }: { title: string; links: FooterLink[]; mutedItems?: string[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/50">{title}</h2>
      <ul className="mt-3 grid gap-2">
        {links.map(([label, href]) => (
          <li key={`${title}-${label}`}>
            {href.startsWith('mailto:') ? (
              <a className="footer-link" href={href}>
                {label}
              </a>
            ) : (
              <Link className="footer-link" href={href}>
                {label}
              </Link>
            )}
          </li>
        ))}
        {mutedItems.map((label) => (
          <li className="text-ink/44" key={`${title}-${label}`}>
            {label}
          </li>
        ))}
      </ul>
    </nav>
  );
}
