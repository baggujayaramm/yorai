type PolicyPageProps = {
  title: string;
  intro: string;
  sections?: Array<{ title: string; body: string }>;
};

const values = [
  'Protect student privacy and avoid sharing private data.',
  'No doxxing, personal attacks, foul language, harassment, or hate.',
  'No fake/spam content or admission-agent manipulation.',
  'No private chats, IDs, phone numbers, addresses, signatures, or roll numbers without redaction.',
  'No unsupported serious allegations; add calm context and ask for current student updates.',
  'Respectful disagreement, branch-specific concerns, and practical advice are welcome.',
];

export function PolicyPage({ title, intro, sections = [] }: PolicyPageProps) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold text-iris">Yorai policy foundation</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">{title}</h1>
      <p className="mt-4 text-sm leading-6 text-ink/65">{intro}</p>
      <p className="mt-3 rounded-2xl bg-sun/10 p-3 text-xs leading-5 text-ink/62">This page is written for product clarity and launch preparation. Professional legal review is still required before broad public launch.</p>
      {sections.length > 0 && (
        <section className="mt-8 grid gap-3">
          {sections.map((section) => (
            <article className="rounded-2xl border border-line bg-surface/72 p-5 shadow-soft backdrop-blur-xl" key={section.title}>
              <h2 className="font-semibold text-ink">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink/65">{section.body}</p>
            </article>
          ))}
        </section>
      )}
      <section className="mt-8 rounded border border-line bg-surface/72 p-6 shadow-soft backdrop-blur-xl">
        <h2 className="font-semibold text-ink">Current principles</h2>
        <ul className="mt-4 grid gap-3 text-sm leading-6 text-ink/65">
          {values.map((value) => (
            <li key={value}>• {value}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
