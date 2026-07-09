'use client';

import { useEffect, useState } from 'react';
import {
  fetchPersonalRecords,
  PERSONAL_STATE_EVENT,
  togglePersistentPersonalTarget,
  type PersonalTargetType,
} from '@/lib/personal-state-storage';

type PersonalActionButtonProps = {
  targetType: PersonalTargetType;
  targetId: string;
  label: string;
  activeLabel: string;
  compact?: boolean;
};

export function PersonalActionButton({ targetType, targetId, label, activeLabel, compact = false }: PersonalActionButtonProps) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const records = await fetchPersonalRecords(targetType).catch(() => []);
      setActive(records.some((record) => record.targetId === targetId));
    };
    load();
    window.addEventListener(PERSONAL_STATE_EVENT, load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener(PERSONAL_STATE_EVENT, load);
      window.removeEventListener('storage', load);
    };
  }, [targetId, targetType]);

  return (
    <span className="inline-flex flex-col items-end gap-1">
    <button
      className={`rounded-full border text-sm font-semibold transition ${
        active
          ? 'border-iris bg-iris/10 text-iris'
          : 'border-white/38 bg-surface/62 text-ink backdrop-blur-xl hover:border-iris/55 hover:text-iris dark:border-white/10'
      } ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-3'}`}
      onClick={async () => {
        setError('');
        try {
          setActive(await togglePersistentPersonalTarget(targetType, targetId));
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : 'Could not save this yet. Try again.');
        }
      }}
      type="button"
    >
      {active ? activeLabel : label}
    </button>
    {error ? <span className="max-w-44 text-right text-xs font-semibold text-sun">{error}</span> : null}
    </span>
  );
}
