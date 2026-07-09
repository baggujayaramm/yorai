'use client';

import { useEffect, useState } from 'react';
import {
  defaultUserContext,
  formatUserContext,
  getCurrentUserContext,
  trustLabelForRole,
  USER_CONTEXT_EVENT,
  type UserContext,
} from '@/lib/user-context-storage';
import { ContextBadge } from './ContextBadge';

export function CurrentContextNote() {
  const [context, setContext] = useState<UserContext>(defaultUserContext);

  useEffect(() => {
    const load = () => setContext(getCurrentUserContext());
    load();
    window.addEventListener(USER_CONTEXT_EVENT, load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener(USER_CONTEXT_EVENT, load);
      window.removeEventListener('storage', load);
    };
  }, []);

  const trustLabel = trustLabelForRole(context.role);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded bg-mist px-3 py-2 text-xs text-ink/60">
      <span>Posting with public context:</span>
      <ContextBadge label={formatUserContext(context)} tone={trustLabel === 'Current student' ? 'student' : 'trust'} />
      <ContextBadge label="Context added" tone="trust" />
    </div>
  );
}
