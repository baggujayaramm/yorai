'use client';

import { FormEvent, useState } from 'react';

type CollegeOption = { id: string; name: string; city: string; state: string };

const fields = ['official name', 'official website', 'address', 'institution type', 'accreditation', 'contact information', 'established year'];

export function OfficialCorrectionForm({ colleges }: { colleges: CollegeOption[] }) {
  const [message, setMessage] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    const form = event.currentTarget;
    const response = await fetch('/api/college-corrections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) }).catch(() => null);
    const result = response ? await response.json() as { error?: string } : {};
    if (!response?.ok) return setMessage(result.error ?? 'Could not submit this correction request.');
    setMessage('Correction request submitted for admin review.');
    form.reset();
  };

  return (
    <form className="content-solid grid gap-4 rounded-3xl border border-line p-5" onSubmit={submit}>
      <label className={labelClass}>College
        <select className={fieldClass} name="collegeId" required>
          <option value="">Choose a college</option>
          {colleges.map((college) => <option key={college.id} value={college.id}>{college.name} · {college.city}, {college.state}</option>)}
        </select>
      </label>
      <label className={labelClass}>Factual field
        <select className={fieldClass} name="fieldName" required>{fields.map((field) => <option key={field}>{field}</option>)}</select>
      </label>
      <label className={labelClass}>Proposed value
        <textarea className={fieldClass} name="proposedValue" required rows={3} />
      </label>
      <label className={labelClass}>Source URL optional
        <input className={fieldClass} name="sourceUrl" placeholder="https://official-source.example/page" type="url" />
      </label>
      <label className={labelClass}>Source notes optional
        <textarea className={fieldClass} name="sourceInfo" placeholder="Official page, circular, or public source notes. Do not include identity documents." rows={3} />
      </label>
      <p className="text-xs leading-5 text-ink/58">Requests are reviewed before any data changes. This does not affect student-generated discussions or experiences.</p>
      <button className="button-primary w-fit px-5 py-3">Submit correction request</button>
      {message && <p className="text-sm font-semibold text-iris" aria-live="polite">{message}</p>}
    </form>
  );
}

const labelClass = 'grid gap-2 text-sm font-semibold text-ink';
const fieldClass = 'rounded-2xl border border-line bg-surface/75 px-3 py-3 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20';
