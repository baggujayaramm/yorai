'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type AuthFormProps = {
  mode: 'login' | 'signup';
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const errorRef = useRef<HTMLParagraphElement | null>(null);
  const isSignup = mode === 'signup';
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
        displayName: String(form.get('displayName') ?? ''),
        username: String(form.get('username') ?? ''),
        inviteCode: String(form.get('inviteCode') ?? ''),
        acceptPolicies: form.get('acceptPolicies') === 'on',
      }),
    }).catch(() => null);
    setSubmitting(false);

    if (!response) {
      setError('Could not reach Yorai. Try again.');
      return;
    }

    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setError(data.error ?? (isSignup ? 'Could not create your account yet.' : 'Invalid email or password.'));
      return;
    }

    window.dispatchEvent(new Event('yorai-auth-change'));
    router.push(isSignup ? '/settings/profile?welcome=1' : '/me');
    router.refresh();
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <section className="liquid-glass-panel liquid-glass-strong rounded-[2rem] p-6">
        <p className="text-sm font-semibold text-iris">{isSignup ? 'Create your Yorai account' : 'Welcome back'}</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">
          {isSignup ? 'Join with student context' : 'Sign in to continue'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink/65">
          {isSignup
            ? 'Use an email and password. Yorai shows public context, not private identity.'
            : 'Sign in to start threads, reply, save useful context, and help keep information fresh.'}
        </p>

        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          {isSignup && (
            <>
              <label className="grid gap-2 text-sm font-semibold text-ink" htmlFor={`${mode}-display-name`}>
                Display name <span className="text-sun" aria-hidden="true">*</span>
                <input aria-describedby={`${mode}-form-help`} className={fieldClass} id={`${mode}-display-name`} name="displayName" placeholder="Your public display name" required />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink" htmlFor={`${mode}-username`}>
                Username optional
                <input className={fieldClass} id={`${mode}-username`} name="username" placeholder="calm_student_27" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ink" htmlFor={`${mode}-invite`}>
                Beta invite code
                <input autoComplete="one-time-code" className={fieldClass} id={`${mode}-invite`} name="inviteCode" placeholder="YORAI-..." />
              </label>
            </>
          )}
          <label className="grid gap-2 text-sm font-semibold text-ink" htmlFor={`${mode}-email`}>
            Email <span className="text-sun" aria-hidden="true">*</span>
            <input aria-describedby={`${mode}-form-help`} autoComplete="email" className={fieldClass} id={`${mode}-email`} name="email" placeholder="you@example.com" required type="email" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink" htmlFor={`${mode}-password`}>
            Password <span className="text-sun" aria-hidden="true">*</span>
            <input aria-describedby={`${mode}-form-help`} autoComplete={isSignup ? 'new-password' : 'current-password'} className={fieldClass} id={`${mode}-password`} minLength={8} name="password" placeholder="At least 8 characters" required type="password" />
          </label>
          <p className="text-xs text-ink/55" id={`${mode}-form-help`}>Required fields are marked with an asterisk. Passwords need at least 8 characters.</p>
          {isSignup && (
            <label className="flex gap-3 rounded-2xl bg-surface/55 p-3 text-sm leading-6 text-ink/70">
              <input className="mt-1 h-4 w-4 accent-iris" name="acceptPolicies" required type="checkbox" />
              <span>I agree to Yorai policies: Terms, Privacy Policy, Community Guidelines, and Content Policy.</span>
            </label>
          )}
          <button className="button-primary px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting} type="submit">
            {submitting ? 'Please wait...' : isSignup ? 'Create account' : 'Sign in'}
          </button>
          {error && <p aria-live="assertive" className="rounded-2xl bg-sun/10 p-3 text-sm font-semibold text-sun outline-none" ref={errorRef} role="alert" tabIndex={-1}>{error}</p>}
        </form>

        <p className="mt-5 text-sm text-ink/60">
          {isSignup ? 'Already have an account?' : 'New to Yorai?'}{' '}
          <Link className="font-semibold text-iris hover:text-iris/80" href={isSignup ? '/login' : '/signup'}>
            {isSignup ? 'Sign in' : 'Create one'}
          </Link>
        </p>
      </section>
    </main>
  );
}

const fieldClass = 'rounded-xl border border-line bg-surface/82 px-3 py-3 font-normal text-ink outline-none focus:border-iris focus:ring-4 focus:ring-iris/20';
