'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type AuthSession = {
  user: null | {
    displayName: string;
    context: string;
    source: 'real' | 'demo';
  };
};

export function AuthStatus() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession>({ user: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/auth/session', { cache: 'no-store' }).catch(() => null);
      if (!response) {
        setSession({ user: null });
        setLoading(false);
        return;
      }
      const data = (await response.json()) as AuthSession;
      setSession({ user: data.user ?? null });
      setLoading(false);
    };
    load();
    window.addEventListener('yorai-auth-change', load);
    window.addEventListener('yorai-user-context-change', load);
    return () => {
      window.removeEventListener('yorai-auth-change', load);
      window.removeEventListener('yorai-user-context-change', load);
    };
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.dispatchEvent(new Event('yorai-auth-change'));
    setSession({ user: null });
    router.refresh();
  };

  if (loading) return <span className="hidden rounded-full px-3 py-2 text-xs text-ink/45 sm:inline">Checking account</span>;

  if (!session.user) {
    return (
      <span className="flex items-center gap-1">
        <Link className="rounded-full px-3 py-2 transition hover:bg-surface/70 hover:text-iris hover:ring-1 hover:ring-sun/25" href="/login">
          Sign in
        </Link>
        <Link className="rounded-full bg-iris px-3 py-2 text-white transition hover:bg-iris/90" href="/signup">
          Join
        </Link>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="hidden max-w-44 truncate rounded-full bg-mist px-3 py-2 text-xs font-semibold text-ink/65 sm:inline">
        {session.user.source === 'demo' ? 'Demo: ' : ''}{session.user.context || session.user.displayName}
      </span>
      {session.user.source === 'real' && (
        <button className="rounded-full px-3 py-2 text-xs font-semibold text-ink/60 transition hover:bg-surface/70 hover:text-iris" onClick={logout} type="button">
          Sign out
        </button>
      )}
    </span>
  );
}
