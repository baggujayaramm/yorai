# Yorai v1.1.0 Implementation Map

This internal map records the private-preview foundation so future work does not duplicate systems.

## Existing Foundation

- **Stack:** Next.js App Router, TypeScript, Tailwind CSS, Prisma, PostgreSQL.
- **Database:** Users, colleges, live threads (`Question`), replies (`Answer`), student experiences, what-works insights, reports, context attachments, follows, watched threads, saved experiences, saved insights, and community context actions.
- **Identity:** Real email/password authentication with database-backed sessions is primary. Demo/private-preview identity via `yorai_demo_user_id` cookie remains available only when explicitly enabled.
- **Profiles:** Authenticated users can manage `/settings/profile`, `/settings/privacy`, and public `/u/[username]` pages. Profile visibility is enforced server-side with public, community-only, and private behavior.
- **Roles:** Aspirant, current student, alumni, moderator, college rep, and admin.
- **Public routes:** home, search, college profiles, thread detail, experience detail, what-works detail, policies, and public browsing surfaces.
- **Protected write actions:** thread creation, replies, reports, context actions, follows, watches, saves, and context attachment metadata.
- **Moderation routes:** `/moderation` plus report and attachment moderation APIs. Access requires Moderator or Admin role.

## Product Behavior

- **Search:** server-side college search uses name, slug, city, district, state, affiliation, college type, courses, aliases, and search keywords with a safe result limit.
- **Freshness:** canonical utility covers Fresh, Recent, Needs current context, Past experience, and Reconfirmed boundary behavior.
- **Reports:** reports use an OPEN -> UNDER_REVIEW -> RESOLVED/DISMISSED lifecycle while retaining legacy statuses for existing data.
- **Moderation history:** moderator actions are stored privately with action type, moderator, affected target, timestamp, and optional note.
- **Save/follow/watch:** persisted with existing personal action models.
- **Attachments:** context attachments remain privacy-first and moderation-gated; no public raw-file workflow was added in this pass.
- **Seed data:** fictional only; seed scripts are idempotent and intended for development/private preview.

## Technical Debt and Known Limits

- OAuth and document verification are not implemented.
- Imported real colleges need verified source metadata and student-created context before they feel complete.
- Search is intentionally simple and bounded; large-scale discovery will need pagination and richer filters.
- Context attachment storage is placeholder-oriented unless a safe production storage layer is added later.
- Some UI flows still rely on existing client components and local optimistic state before server refresh.
