import Link from 'next/link';

export default function MaintenancePage() {
  return (
    <main className="mx-auto flex min-h-[65vh] max-w-3xl items-center px-4 py-12 sm:px-6">
      <section className="liquid-glass-panel liquid-glass-strong w-full rounded-3xl p-6 sm:p-8">
        <p className="text-sm font-semibold text-iris">Scheduled care</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Yorai is briefly under maintenance</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ink/68">
          We are keeping student context and account data safe while this update is completed. Please check back shortly.
        </p>
        <Link className="button-secondary mt-5 inline-flex px-5 py-3" href="/login">Administrator sign in</Link>
      </section>
    </main>
  );
}
