import Link from 'next/link';
import { CollegeCard } from '@/components/CollegeCard';
import { SearchBar } from '@/components/SearchBar';
import { colleges } from '@/lib/seed-data';

const chips = ['Computer Science', 'Pune', 'AI and ML', 'Hostel', 'BCA', 'Autonomous'];

const explanationCards = [
  {
    title: 'Student-to-student guidance',
    body: 'Ask current students and alumni what college life feels like in practice.',
  },
  {
    title: 'Lived experiences with context',
    body: 'Read branch, batch, and student journey details instead of one-line judgments.',
  },
  {
    title: 'What actually works',
    body: 'Find practical advice about labs, clubs, faculty support, and project habits.',
  },
  {
    title: 'Beyond college boundaries',
    body: 'A foundation for future collaboration, projects, events, and cross-college communities.',
  },
];

const signalCards = ['Current students responding', 'Fresh context', 'Live student threads', 'What actually works'];

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="aurora-surface liquid-glass-strong showcase-glass rounded-[2.5rem] p-6 sm:p-10">
          <div className="hero-focal" />
          <div className="pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-full bg-iris/18 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-12 h-36 w-36 rounded-full bg-cyan/14 blur-3xl" />
          <div className="relative max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-iris">Yorai</p>
          <h1 className="mt-4 text-4xl font-semibold text-ink sm:text-6xl">
            Know through students. Connect beyond colleges. Build together.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/68">
            Yorai helps students ask, share, and connect through lived experiences, practical context, and student-led conversations.
          </p>
          </div>
        <div className="liquid-glass-panel liquid-glass-strong showcase-glass mt-8 max-w-3xl rounded-[2rem] p-4 sm:p-5">
          <SearchBar />
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <Link
                className="rounded border border-white/55 bg-surface/65 px-3 py-2 text-sm font-medium text-ink/70 backdrop-blur transition hover:border-iris/55 hover:text-iris dark:border-white/10"
                href={`/search?q=${encodeURIComponent(chip)}`}
                key={chip}
              >
                {chip}
              </Link>
            ))}
          </div>
        </div>
        <div className="relative mt-8 flex flex-wrap gap-3">
          <Link className="button-primary px-5" href="/search">
            Explore Student Spaces
          </Link>
          <Link className="button-secondary px-5" href="/search">
            Ask Students
          </Link>
        </div>
        <div className="relative mt-8 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {signalCards.map((signal) => (
            <div className="aurora-surface--compact rounded-3xl border border-sun/15 px-4 py-3 text-sm font-semibold text-ink/76 shadow-soft" key={signal}>
              {signal}
            </div>
          ))}
        </div>
        </div>
      </section>

      <section className="border-y border-white/45 bg-surface/44 py-12 backdrop-blur-xl dark:border-white/10">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {explanationCards.map((card) => (
            <article className="liquid-glass-card rounded-3xl p-5" key={card.title}>
              <h2 className="text-lg font-semibold text-ink">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-ink/65">{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-iris">Fictional student spaces</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Start with people who lived it</h2>
          </div>
          <Link className="text-sm font-semibold text-iris" href="/search">
            Explore spaces
          </Link>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {colleges.map((college) => (
            <CollegeCard college={college} key={college.id} />
          ))}
        </div>
      </section>
    </main>
  );
}
