type PolicyPageProps = {
  title: string;
  intro: string;
};

const values = [
  'Protect student privacy and avoid sharing private data.',
  'No doxxing, personal attacks, foul language, harassment, or hate.',
  'No fake/spam content or admission-agent manipulation.',
  'No private chats, IDs, phone numbers, addresses, signatures, or roll numbers without redaction.',
  'No unsupported serious allegations; add calm context and ask for current student updates.',
  'Respectful disagreement, branch-specific concerns, and practical advice are welcome.',
];

export function PolicyPage({ title, intro }: PolicyPageProps) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold text-iris">Yorai policy placeholder</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">{title}</h1>
      <p className="mt-4 text-sm leading-6 text-ink/65">{intro}</p>
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
