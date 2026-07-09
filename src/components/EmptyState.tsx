export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="liquid-glass-panel liquid-glass-strong rounded-3xl p-8 text-center">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-ink/60">{body}</p>
    </div>
  );
}
