'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type AdminCollegeActionsProps = {
  college: {
    id: string;
    name: string;
    shortName?: string | null;
    city: string;
    state: string;
    officialWebsite: string;
    affiliation: string;
    institutionType?: string | null;
    ownershipType?: string | null;
    establishedYear?: number | null;
    accreditation?: string | null;
    sourceName?: string | null;
    sourceUrl?: string | null;
    internalReviewNote?: string | null;
    recordStatus: string;
  };
};

export function AdminCollegeActions({ college }: AdminCollegeActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (payload: Record<string, string>) => {
    setSubmitting(true);
    setMessage('');
    const response = await fetch(`/api/admin/colleges/${college.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null);
    setSubmitting(false);

    if (!response) {
      setMessage('Could not reach Yorai. Try again.');
      return;
    }
    const data = await response.json() as { ok?: boolean; error?: string };
    setMessage(response.ok && data.ok ? 'College record updated.' : data.error ?? 'Could not update college.');
    router.refresh();
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await submit({
      name: String(form.get('name') ?? ''),
      shortName: String(form.get('shortName') ?? ''),
      city: String(form.get('city') ?? ''),
      state: String(form.get('state') ?? ''),
      officialWebsite: String(form.get('officialWebsite') ?? ''),
      affiliation: String(form.get('affiliation') ?? ''),
      institutionType: String(form.get('institutionType') ?? ''),
      ownershipType: String(form.get('ownershipType') ?? ''),
      establishedYear: String(form.get('establishedYear') ?? ''),
      accreditation: String(form.get('accreditation') ?? ''),
      sourceName: String(form.get('sourceName') ?? ''),
      sourceUrl: String(form.get('sourceUrl') ?? ''),
      internalReviewNote: String(form.get('internalReviewNote') ?? ''),
    });
  };

  return (
    <div className="grid gap-4">
      <form className="grid gap-3" onSubmit={submitForm}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Official name" name="name" defaultValue={college.name} />
          <Field label="Short name / acronym" name="shortName" defaultValue={college.shortName ?? ''} />
          <Field label="City" name="city" defaultValue={college.city} />
          <Field label="State" name="state" defaultValue={college.state} />
          <Field label="Official website" name="officialWebsite" defaultValue={college.officialWebsite} />
          <Field label="Affiliation" name="affiliation" defaultValue={college.affiliation} />
          <Field label="Institution type" name="institutionType" defaultValue={college.institutionType ?? ''} />
          <Field label="Ownership type" name="ownershipType" defaultValue={college.ownershipType ?? ''} />
          <Field label="Established year" name="establishedYear" defaultValue={college.establishedYear?.toString() ?? ''} />
          <Field label="Accreditation" name="accreditation" defaultValue={college.accreditation ?? ''} />
          <Field label="Source name" name="sourceName" defaultValue={college.sourceName ?? ''} />
          <Field label="Source URL" name="sourceUrl" defaultValue={college.sourceUrl ?? ''} />
        </div>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Internal review note
          <textarea className={fieldClass} defaultValue={college.internalReviewNote ?? ''} name="internalReviewNote" />
        </label>
        <button className="button-primary w-fit px-4 py-2.5 disabled:opacity-60" disabled={submitting} type="submit">
          Save factual metadata
        </button>
      </form>

      <div className="flex flex-wrap gap-3">
        <button className="button-primary px-4 py-2.5" disabled={submitting || college.recordStatus === 'PUBLISHED'} onClick={() => submit({ recordStatus: 'PUBLISHED', internalReviewNote: 'Approved for public discovery.' })} type="button">
          Publish
        </button>
        <button className="button-secondary px-4 py-2.5" disabled={submitting || college.recordStatus === 'ARCHIVED'} onClick={() => submit({ recordStatus: 'ARCHIVED', internalReviewNote: 'Archived from public discovery.' })} type="button">
          Archive
        </button>
        <button className="button-secondary px-4 py-2.5" disabled={submitting || college.recordStatus === 'PENDING_REVIEW'} onClick={() => submit({ recordStatus: 'PENDING_REVIEW', internalReviewNote: 'Returned to pending review.' })} type="button">
          Send to review
        </button>
      </div>
      {message && <p className="text-sm font-semibold text-iris">{message}</p>}
    </div>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <input className={fieldClass} defaultValue={defaultValue} name={name} />
    </label>
  );
}

const fieldClass = 'rounded-xl border border-line bg-surface/82 px-3 py-2.5 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20';
