'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addPersistentCommunityContext,
  COMMUNITY_CONTEXT_EVENT,
  communityActions,
  fetchCommunityContextRecords,
  getCommunitySummary,
  getCounts,
  type CommunityContextRecord,
  type CommunityTargetType,
} from '@/lib/community-context-storage';

type CommunityContextProps = {
  targetType: CommunityTargetType;
  targetId: string;
  initialFreshness?: string;
  initialCounts?: Array<{ label: string; count: number }>;
};

export function CommunityContextButtons({ targetType, targetId, initialFreshness, initialCounts }: CommunityContextProps) {
  const [records, setRecords] = useState<CommunityContextRecord[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => setRecords(await fetchCommunityContextRecords(targetType, targetId).catch(() => []));
    load();
    window.addEventListener(COMMUNITY_CONTEXT_EVENT, load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener(COMMUNITY_CONTEXT_EVENT, load);
      window.removeEventListener('storage', load);
    };
  }, [targetId, targetType]);

  const counts = useMemo(() => getCounts(records, initialCounts), [records, initialCounts]);
  const summary = getCommunitySummary({ records, initialFreshness, initialCounts });

  return (
    <div className="glass-panel community-readable dark-readable-glass rounded-2xl p-5">
      <h3 className="font-semibold text-ink">Add community context</h3>
      <p className="mt-2 text-sm text-ink/65">
        College life changes by branch, batch, hostel, faculty, and year. Add context so future students understand where it applies.
      </p>
      <p className="community-summary mt-3 rounded-2xl bg-mist/72 px-3 py-2 text-sm font-semibold text-ink/70">{summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {communityActions.map((action) => {
          const count = counts.get(action.type) ?? 0;
          return (
            <button
              className="community-action-button rounded-full border border-white/38 bg-surface/62 px-3 py-2 text-sm font-semibold text-ink/70 transition hover:border-iris/55 hover:text-iris focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-iris/20 dark:border-white/10"
              key={action.type}
              onClick={async () => {
                setError('');
                try {
                  await addPersistentCommunityContext(targetType, targetId, action.type);
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : 'Could not save this yet. Try again.');
                }
              }}
              type="button"
            >
              {action.label}
              {count > 0 ? ` · ${count}` : ''}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-sun">{error}</p>}
      {records.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          {communityActions.map((action) => {
            const count = counts.get(action.type) ?? 0;
            if (count === 0) return null;
            return (
              <span className="soft-badge px-3 py-2" key={action.type}>
                {count} {action.summaryLabel}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CommunityContextSummary({ targetType, targetId, initialFreshness, initialCounts }: CommunityContextProps) {
  const [records, setRecords] = useState<CommunityContextRecord[]>([]);

  useEffect(() => {
    const load = async () => setRecords(await fetchCommunityContextRecords(targetType, targetId).catch(() => []));
    load();
    window.addEventListener(COMMUNITY_CONTEXT_EVENT, load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener(COMMUNITY_CONTEXT_EVENT, load);
      window.removeEventListener('storage', load);
    };
  }, [targetId, targetType]);

  const summary = getCommunitySummary({ records, initialFreshness, initialCounts, compact: true });

  return <span className="soft-badge">{summary}</span>;
}
