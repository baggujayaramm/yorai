'use client';

import { useEffect, useState } from 'react';
import {
  defaultUserContext,
  formatUserContext,
  getCurrentUserContext,
  USER_CONTEXT_EVENT,
  type UserContext,
} from '@/lib/user-context-storage';
import { ContextBadge } from './ContextBadge';

type DemoSession = {
  enabled: boolean;
  user: null | {
    context: string;
    trustLabel: string;
  };
};

export function CurrentContextNote() {
  const [context, setContext] = useState<UserContext>(defaultUserContext);
  const [serverContext, setServerContext] = useState<DemoSession | null>(null);

  async function loadServerContext() {
    try {
      const response = await fetch('/api/demo-user', { cache: 'no-store' });
      const data = (await response.json()) as DemoSession;
      setServerContext(data);
    } catch {
      setServerContext({ enabled: true, user: null });
    }
  }

  useEffect(() => {
    const load = () => {
      setContext(getCurrentUserContext());
      void loadServerContext();
    };
    load();
    window.addEventListener(USER_CONTEXT_EVENT, load);
    window.addEventListener('storage', load);
    return () => {
      window.removeEventListener(USER_CONTEXT_EVENT, load);
      window.removeEventListener('storage', load);
    };
  }, []);

  const label = serverContext?.user?.context ?? formatUserContext(context);
  const trustLabel = serverContext?.user?.trustLabel ?? 'Context added';
  const helper = !serverContext
    ? 'Checking posting context...'
    : !serverContext.enabled
      ? 'Demo identity is disabled for this environment.'
      : serverContext.user
        ? 'Posting with public context:'
        : 'Choose My Context before posting:';

  return (
    <div className="flex flex-wrap items-center gap-2 rounded bg-mist px-3 py-2 text-xs text-ink/60">
      <span>{helper}</span>
      <ContextBadge label={label} tone={trustLabel === 'Current student' ? 'student' : 'trust'} />
      <ContextBadge label={serverContext?.user ? 'Context added' : 'Demo user needed'} tone="trust" />
    </div>
  );
}
