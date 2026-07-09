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

export function MyContextSwitcher() {
  const [open, setOpen] = useState(false);
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

  const update = (key: keyof UserContext, value: string) => {
    setContext((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    saveCurrentUserContext(context);
    const match = demoUsers.find((user) => user.context.role === context.role && (!user.context.branch || user.context.branch === context.branch));
    if (match) {
      await fetch('/api/demo-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: match.id }),
      }).catch(() => undefined);
    }
    setOpen(false);
  };

  const chooseDemoUser = async (userId: string) => {
    const demoUser = demoUsers.find((user) => user.id === userId);
    if (!demoUser) return;
    const next = { ...defaultUserContext, ...demoUser.context };
    setContext(next);
    saveCurrentUserContext(next);
    await fetch('/api/demo-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    }).catch(() => undefined);
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
            Development/demo mode. Yorai shows context, not private identity. Verification coming later. For now, Yorai uses context and community signals.
          </p>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-2 text-xs font-semibold text-ink">
              Demo user
              <select className={fieldClass} defaultValue="" onChange={(event) => chooseDemoUser(event.target.value)}>
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
            <button className="rounded bg-iris px-4 py-2 text-xs font-semibold text-white hover:bg-iris/90" onClick={save} type="button">
              Save context
            </button>
            <button className="rounded border border-line px-4 py-2 text-xs font-semibold text-ink hover:border-iris hover:text-iris" onClick={() => setOpen(false)} type="button">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const fieldClass = 'rounded border border-line bg-surface/80 px-3 py-2 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20';

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-xs font-semibold text-ink">
      {label}
      <input className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
