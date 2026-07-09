type Insight = {
  label: string;
  value: string;
  tone?: 'leaf' | 'sun' | 'iris';
};

const toneClass = {
  leaf: 'text-leaf bg-leaf/10',
  sun: 'text-sun bg-sun/10',
  iris: 'text-iris bg-iris/10',
};

export function InsightCards({ insights }: { insights: Insight[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {insights.map((insight) => (
        <div className="liquid-glass-card rounded-3xl p-5" key={insight.label}>
          <p className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${toneClass[insight.tone ?? 'leaf']}`}>
            {insight.label}
          </p>
          <p className="mt-4 text-2xl font-semibold text-ink">{insight.value}</p>
        </div>
      ))}
    </div>
  );
}
