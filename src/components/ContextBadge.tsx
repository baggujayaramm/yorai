export function ContextBadge({ label, tone = 'neutral' }: { label?: string; tone?: 'neutral' | 'trust' | 'student' }) {
  if (!label) return null;

  const toneClass =
    tone === 'student'
      ? 'border-leaf/20 bg-leaf/12 text-leaf ring-1 ring-leaf/25'
      : tone === 'trust'
        ? 'border-sun/25 bg-iris/10 text-iris ring-1 ring-sun/20'
        : 'border-white/40 bg-surface/58 text-ink/65 dark:border-white/10';

  return <span className={`rounded-full border px-2 py-1 text-xs font-semibold backdrop-blur ${toneClass}`}>{label}</span>;
}
