'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';

type CollegeOption = { id: string; name: string; city: string; state: string };
type Claim = { id: string; collegeName: string; status: string; adminNote?: string | null; createdAt: string };

export function CollegeClaimForm({ colleges, signedIn }: { colleges: CollegeOption[]; signedIn: boolean }) {
  const [message, setMessage] = useState('');
  const [claims, setClaims] = useState<Claim[]>([]);

  const load = async () => {
    if (!signedIn) return;
    const response = await fetch('/api/college-claims', { cache: 'no-store' }).catch(() => null);
    const result = response ? await response.json() as { claims?: Claim[]; error?: string } : null;
    if (response?.ok && result?.claims) setClaims(result.claims);
  };

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    void fetch('/api/college-claims', { cache: 'no-store' })
      .then((response) => response.json().then((result) => ({ response, result: result as { claims?: Claim[] } })))
      .then(({ response, result }) => { if (active && response.ok && result.claims) setClaims(result.claims); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [signedIn]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const college = colleges.find((item) => item.id === data.collegeId);
    const response = await fetch('/api/college-claims', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, collegeName: college?.name || data.collegeName }) }).catch(() => null);
    const result = response ? await response.json() as { error?: string } : {};
    if (!response?.ok) return setMessage(result.error ?? 'Could not submit this request yet.');
    setMessage('Representative request submitted for admin review.');
    form.reset();
    await load();
  };

  if (!signedIn) {
    return (
      <section className="liquid-glass-panel liquid-glass-strong rounded-3xl p-6">
        <h2 className="text-xl font-semibold text-ink">Sign in to request representative access</h2>
        <p className="mt-3 text-sm leading-6 text-ink/65">Yorai reviews each request manually. Institutional email alone never grants authority.</p>
        <Link className="button-primary mt-5 inline-flex px-5 py-3" href="/login">Sign in</Link>
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      <form className="content-solid grid gap-4 rounded-3xl border border-line p-5" onSubmit={submit}>
        <label className={labelClass}>College
          <select className={fieldClass} name="collegeId" required>
            <option value="">Choose a college</option>
            {colleges.map((college) => <option key={college.id} value={college.id}>{college.name} · {college.city}, {college.state}</option>)}
          </select>
        </label>
        <label className={labelClass}>Institutional email
          <input className={fieldClass} name="institutionalEmail" placeholder="name@college.example" required type="email" />
        </label>
        <label className={labelClass}>Role or department
          <input className={fieldClass} name="roleOrDepartment" placeholder="Admissions office, registrar, department coordinator" required />
        </label>
        <label className={labelClass}>Official website optional
          <input className={fieldClass} name="officialWebsite" placeholder="https://..." type="url" />
        </label>
        <label className={labelClass}>Reason for request
          <textarea className={fieldClass} name="reason" placeholder="What factual college information do you need to help keep current?" required rows={4} />
        </label>
        <label className={labelClass}>Supporting source information optional
          <textarea className={fieldClass} name="sourceInfo" placeholder="Official page links or source notes. Do not upload identity documents." rows={3} />
        </label>
        <p className="text-xs leading-5 text-ink/58">Representatives can request factual metadata corrections only. They cannot edit student experiences, discussions, reports, or moderation notes.</p>
        <button className="button-primary w-fit px-5 py-3">Submit request</button>
        {message && <p className="text-sm font-semibold text-iris" aria-live="polite">{message}</p>}
      </form>
      <section className="content-solid rounded-3xl border border-line p-5">
        <h2 className="font-semibold text-ink">Your requests</h2>
        <div className="mt-3 grid gap-2">
          {claims.length === 0 ? <p className="text-sm text-ink/60">No representative requests yet.</p> : claims.map((claim) => (
            <div className="rounded-2xl bg-mist/60 p-3 text-sm" key={claim.id}>
              <p className="font-semibold text-ink">{claim.collegeName} · {claim.status.replaceAll('_', ' ')}</p>
              {claim.adminNote && <p className="mt-1 text-ink/60">{claim.adminNote}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const labelClass = 'grid gap-2 text-sm font-semibold text-ink';
const fieldClass = 'rounded-2xl border border-line bg-surface/75 px-3 py-3 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20';
