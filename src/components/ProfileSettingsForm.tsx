'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProductProfileVisibility, ProfileRelationship } from '@/lib/profile';

type CollegeOption = {
  id: string;
  name: string;
  city: string;
  state: string;
};

type ProfileFormUser = {
  displayName: string;
  username: string;
  relationship: ProfileRelationship;
  collegeId: string;
  branch: string;
  year: string;
  bio: string;
  visibility: ProductProfileVisibility;
};

export function ProfileSettingsForm({ user, colleges, welcome = false }: { user: ProfileFormUser; colleges: CollegeOption[]; welcome?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSaved('');
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: String(form.get('displayName') ?? ''),
        username: String(form.get('username') ?? ''),
        relationship: String(form.get('relationship') ?? ''),
        collegeId: String(form.get('collegeId') ?? ''),
        branch: String(form.get('branch') ?? ''),
        year: String(form.get('year') ?? ''),
        bio: String(form.get('bio') ?? ''),
        visibility: String(form.get('visibility') ?? ''),
      }),
    }).catch(() => null);
    setSubmitting(false);

    if (!response) {
      setError('Could not reach Yorai. Try again.');
      return;
    }
    const data = (await response.json()) as { ok?: boolean; error?: string; username?: string };
    if (!response.ok || !data.ok) {
      setError(data.error ?? 'Could not update profile yet.');
      return;
    }

    setSaved('Profile saved.');
    window.dispatchEvent(new Event('yorai-auth-change'));
    router.refresh();
  };

  return (
    <form className="liquid-glass-panel liquid-glass-strong rounded-3xl p-5" onSubmit={onSubmit}>
      {welcome && (
        <div className="mb-4 rounded-2xl bg-leaf/10 p-3">
          <p className="text-xs font-semibold uppercase text-leaf">Profile setup · one short step</p>
          <p className="mt-1 text-sm font-semibold text-leaf">Add only the context you are comfortable sharing. Optional fields can be skipped.</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name" name="displayName" defaultValue={user.displayName} required />
        <Field label="Username" name="username" defaultValue={user.username} placeholder="letters_numbers_only" required />
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Relationship to college
          <select className={fieldClass} defaultValue={user.relationship} name="relationship">
            <option value="current_student">Current student</option>
            <option value="alumni">Alumnus/alumna</option>
            <option value="applicant">Applicant/prospective student</option>
            <option value="prefer_not">Prefer not to say</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          College optional
          <select className={fieldClass} defaultValue={user.collegeId} name="collegeId">
            <option value="">No college selected</option>
            {colleges.map((college) => (
              <option key={college.id} value={college.id}>{college.name} · {college.city}</option>
            ))}
          </select>
        </label>
        <Field label="Branch or department optional" name="branch" defaultValue={user.branch} placeholder="CSE, Mechanical..." />
        <Field label="Study year or graduation year optional" name="year" defaultValue={user.year} placeholder="3rd year, 2024..." />
      </div>
      <label className="mt-4 grid gap-2 text-sm font-semibold text-ink">
        Short bio optional
        <textarea className={`${fieldClass} min-h-24 rounded-2xl`} defaultValue={user.bio} maxLength={240} name="bio" placeholder="What kind of student context can you help with?" />
      </label>
      <label className="mt-4 grid gap-2 text-sm font-semibold text-ink">
        Profile visibility
        <select className={fieldClass} defaultValue={user.visibility} name="visibility">
          <option value="PUBLIC">Public</option>
          <option value="COMMUNITY_ONLY">Community only</option>
          <option value="PRIVATE">Private</option>
        </select>
      </label>
      <p className="mt-4 rounded-2xl bg-mist/72 p-3 text-xs leading-5 text-ink/62">
        Profile context is self-declared unless Yorai later marks it verified. Do not publish roll numbers, phone numbers, addresses, IDs, private documents, or private chat identities.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button className="button-primary px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting} type="submit">
          {submitting ? 'Saving...' : 'Save profile'}
        </button>
        <button className="button-secondary px-5 py-3" formNoValidate onClick={() => router.push('/me')} type="button">
          Skip for now
        </button>
      </div>
      {saved && <p className="mt-3 text-sm font-semibold text-leaf">{saved}</p>}
      {error && <p aria-live="assertive" className="mt-3 text-sm font-semibold text-sun" role="alert">{error}</p>}
    </form>
  );
}

export function PrivacySettingsForm({ visibility }: { visibility: ProductProfileVisibility }) {
  const router = useRouter();
  const [message, setMessage] = useState('');

  const update = async (nextVisibility: ProductProfileVisibility) => {
    setMessage('');
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility: nextVisibility }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    setMessage(response.ok && data.ok ? 'Privacy setting saved.' : data.error ?? 'Could not update privacy yet.');
    router.refresh();
  };

  return (
    <section className="liquid-glass-panel liquid-glass-strong rounded-3xl p-5">
      <div className="grid gap-3">
        {(['PUBLIC', 'COMMUNITY_ONLY', 'PRIVATE'] as ProductProfileVisibility[]).map((item) => (
          <button
            className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${visibility === item ? 'border-iris bg-iris/10 text-iris' : 'border-white/38 bg-surface/62 text-ink/70 hover:border-iris/55 hover:text-iris dark:border-white/10'}`}
            key={item}
            onClick={() => update(item)}
            type="button"
          >
            {item === 'PUBLIC' ? 'Public' : item === 'COMMUNITY_ONLY' ? 'Community only' : 'Private'}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm leading-6 text-ink/65">
        Public profiles can be viewed by anyone. Community-only profiles require sign-in. Private profiles are hidden and contributions use minimal identity context.
      </p>
      {message && <p className="mt-3 text-sm font-semibold text-leaf">{message}</p>}
    </section>
  );
}

export function AccountLogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.dispatchEvent(new Event('yorai-auth-change'));
    router.push('/');
    router.refresh();
  };

  return (
    <button className="button-secondary mt-4 px-5 py-3" onClick={logout} type="button">
      Sign out
    </button>
  );
}

function Field({ label, name, defaultValue, placeholder, required = false }: { label: string; name: string; defaultValue: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <input className={fieldClass} defaultValue={defaultValue} maxLength={80} name={name} placeholder={placeholder} required={required} />
    </label>
  );
}

const fieldClass = 'rounded-xl border border-line bg-surface/82 px-3 py-3 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20';
