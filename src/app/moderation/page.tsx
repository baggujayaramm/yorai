import { AttachmentModeratorQueue } from '@/components/AttachmentModeratorQueue';
import { ModeratorQueue } from '@/components/ModeratorQueue';
import { ModeratorOperations } from '@/components/ModeratorOperations';
import { getCurrentUser } from '@/lib/auth';
import { canModerate } from '@/lib/permissions';

export default async function ModerationPage() {
  const user = await getCurrentUser();

  if (!canModerate(user?.role)) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="rounded border border-line bg-surface/72 p-6 text-sm font-semibold text-ink/70 shadow-soft backdrop-blur-xl">
          This area is only for Yorai moderators.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold text-iris">Moderator operations</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">Safety queue</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">
        Yorai protects useful student context, not attacks. Remove private information, personal attacks, spam, and unsafe uploads while preserving respectful lived experience where possible.
      </p>
      <nav className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
        <a className="rounded bg-mist px-3 py-2 text-ink/65 hover:text-iris" href="#reports">Reports</a>
        <a className="rounded bg-mist px-3 py-2 text-ink/65 hover:text-iris" href="#attachments">Context Attachments</a>
        <a className="rounded bg-mist px-3 py-2 text-ink/65 hover:text-iris" href="#flagged">Flagged Content</a>
        <a className="rounded bg-mist px-3 py-2 text-ink/65 hover:text-iris" href="#privacy">Privacy Review</a>
      </nav>
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-ink" id="attachments">Context Attachments</h2>
        <AttachmentModeratorQueue />
      </section>
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-ink" id="reports">Reports</h2>
        <ModeratorQueue />
      </section>
      <section className="mt-8"><ModeratorOperations admin={user?.role === 'ADMIN'} /></section>
      <section className="mt-8 rounded border border-line bg-surface/72 p-5 shadow-soft backdrop-blur-xl" id="privacy">
        <h2 className="text-xl font-semibold text-ink">Privacy Review</h2>
        <p className="mt-3 text-sm leading-6 text-ink/65">
          Manually check for roll numbers, phone numbers, email addresses, QR codes, barcodes, signatures, ID cards, marksheets, private chat screenshots, faces without consent, and personal attacks naming individuals.
        </p>
        <div className="mt-4 rounded bg-sun/10 p-4 text-sm font-semibold text-sun">
          If private information may be visible, mark the context as needs redaction or reject it before public display.
        </div>
      </section>
    </main>
  );
}
