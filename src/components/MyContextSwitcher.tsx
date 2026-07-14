'use client';

import { useEffect, useState } from 'react';
import {
  defaultUserContext,
  formatUserContext,
  getCurrentUserContext,
  saveCurrentUserContext,
  USER_CONTEXT_EVENT,
  type UserContext,
  type UserRoleLabel,
} from '@/lib/user-context-storage';
import { ContextBadge } from './ContextBadge';

const roles: UserRoleLabel[] = ['Aspirant', 'Current student', 'Alumni', 'Moderator'];

const demoUsers = [
  { id: 'u1', label: 'Aspirant', context: { role: 'Aspirant', interestedBranch: 'CSE' } },
  { id: 'u2', label: 'Current Student · CSE · 2nd year · Hostel', context: { role: 'Current student', branch: 'CSE', year: '2nd year', hostelStatus: 'Hostel' } },
  { id: 'u7', label: 'Current Student · ECE · 3rd year · Day scholar', context: { role: 'Current student', branch: 'ECE', year: '3rd year', hostelStatus: 'Day scholar' } },
  { id: 'u3', label: 'Alumni · CSE · 2024 batch', context: { role: 'Alumni', branch: 'CSE', batch: '2024' } },
  { id: 'u6', label: 'Moderator', context: { role: 'Moderator' } },
] satisfies Array<{ id: string; label: string; context: Partial<UserContext> & { role: UserRoleLabel } }>;

type DemoSession = {
  ok: boolean;
  enabled: boolean;
  user: null | {
    id: string;
    context: string;
    trustLabel: string;
    source?: 'real' | 'demo';
  };
};

export function MyContextSwitcher() {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<UserContext>(defaultUserContext);
  const [selectedDemoUserId, setSelectedDemoUserId] = useState('');
  const [sessionMessage, setSessionMessage] = useState('Checking demo context...');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadDemoSession() {
    try {
      const response = await fetch('/api/demo-user', { cache: 'no-store' });
      const data = (await response.json()) as DemoSession;
      if (!data.enabled) {
        setSessionMessage('Demo identity is disabled for this environment.');
        setSelectedDemoUserId('');
        return;
      }
      if (!data.user) {
        setSessionMessage('No demo user selected. Choose one before posting.');
        setSelectedDemoUserId('');
        return;
      }

      setSessionMessage(`Posting as ${data.user.context}.`);
      if (data.user.source === 'real') {
        setSelectedDemoUserId('');
        return;
      }

      setSelectedDemoUserId(data.user.id);
      const demoUser = demoUsers.find((item) => item.id === data.user?.id);
      if (demoUser) {
        const next = { ...defaultUserContext, ...demoUser.context };
        setContext(next);
        saveCurrentUserContext(next);
      }
    } catch {
      setSessionMessage('Could not confirm demo context. Try choosing a demo user again.');
    }
  }

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDemoSession();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const update = (key: keyof UserContext, value: string) => {
    setContext((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    const match = selectedDemoUserId
      ? demoUsers.find((user) => user.id === selectedDemoUserId)
      : demoUsers.find((user) => user.context.role === context.role && (!user.context.branch || user.context.branch === context.branch));

    if (!match) {
      setError('Choose a valid demo user before posting.');
      setSessionMessage('No demo user selected. Choose one before posting.');
      return;
    }

    setSaving(true);
    setError('');
    const saved = await saveDemoUser(match.id);
    setSaving(false);
    if (!saved.ok) {
      setError(saved.error);
      setSessionMessage(saved.error);
      return;
    }

    setSelectedDemoUserId(match.id);
    saveCurrentUserContext(context);
    setSessionMessage(`Posting as ${formatUserContext(context)}.`);
    setOpen(false);
  };

  const chooseDemoUser = async (userId: string) => {
    const demoUser = demoUsers.find((user) => user.id === userId);
    if (!demoUser) return;

    setSaving(true);
    setError('');
    const saved = await saveDemoUser(userId);
    setSaving(false);
    if (!saved.ok) {
      setError(saved.error);
      setSessionMessage(saved.error);
      return;
    }

    const next = { ...defaultUserContext, ...demoUser.context };
    setSelectedDemoUserId(userId);
    setContext(next);
    saveCurrentUserContext(next);
    setSessionMessage(`Posting as ${formatUserContext(next)}.`);
  };

  return (
    <div className="relative">
      <button
        className="rounded border border-line bg-surface/70 px-3 py-2 text-left text-xs font-semibold text-ink hover:border-iris hover:text-iris"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        My Context
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(92vw,360px)] rounded border border-line bg-surface/95 p-4 text-sm shadow-soft backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-ink">My Context</h2>
            <ContextBadge label={formatUserContext(context)} tone={context.role === 'Current student' ? 'student' : 'trust'} />
          </div>
          <p className="mt-2 text-xs leading-5 text-ink/55">
            Yorai shows context, not private identity. Demo switching is for local/private preview. Verification coming later.
          </p>
          <p className="mt-2 rounded-2xl bg-mist/72 px-3 py-2 text-xs font-semibold text-ink/65">
            {sessionMessage}
          </p>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-2 text-xs font-semibold text-ink">
              Demo user
              <select className={fieldClass} value={selectedDemoUserId} onChange={(event) => chooseDemoUser(event.target.value)}>
                <option value="" disabled>Choose demo user</option>
                {demoUsers.map((user) => <option key={user.id} value={user.id}>{user.label}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-xs font-semibold text-ink">
              Role
              <select className={fieldClass} value={context.role} onChange={(event) => update('role', event.target.value)}>
                {roles.map((role) => <option key={role}>{role}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="College" value={context.college ?? ''} onChange={(value) => update('college', value)} />
              <Input label={context.role === 'Aspirant' ? 'Interested branch' : 'Branch'} value={context.role === 'Aspirant' ? context.interestedBranch ?? '' : context.branch ?? ''} onChange={(value) => update(context.role === 'Aspirant' ? 'interestedBranch' : 'branch', value)} />
              <Input label="Year" value={context.year ?? ''} onChange={(value) => update('year', value)} />
              <Input label="Batch" value={context.batch ?? ''} onChange={(value) => update('batch', value)} />
              <Input label="Hostel/day scholar" value={context.hostelStatus ?? ''} onChange={(value) => update('hostelStatus', value)} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="rounded bg-iris px-4 py-2 text-xs font-semibold text-white hover:bg-iris/90 disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} onClick={save} type="button">
              {saving ? 'Saving...' : 'Save context'}
            </button>
            <button className="rounded border border-line px-4 py-2 text-xs font-semibold text-ink hover:border-iris hover:text-iris" onClick={() => setOpen(false)} type="button">
              Close
            </button>
          </div>
          {error && <p className="mt-3 text-xs font-semibold text-sun">{error}</p>}
        </div>
      )}
    </div>
  );
}

const fieldClass = 'rounded border border-line bg-surface/80 px-3 py-2 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20';

async function saveDemoUser(userId: string) {
  try {
    const response = await fetch('/api/demo-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      return { ok: false, error: data.error ?? 'Could not select this demo user.' };
    }
    return { ok: true, error: '' };
  } catch {
    return { ok: false, error: 'Could not select this demo user. Try again.' };
  }
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-xs font-semibold text-ink">
      {label}
      <input className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
