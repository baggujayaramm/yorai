# Yorai

**Student experience, not brochure noise.**

Yorai is a discussion-first college discovery platform for understanding college life through fresh student context. It helps aspirants explore colleges through live student threads, current-student and alumni experiences, practical guidance, and "what actually works" insights.

Most college discovery tools flatten student life into rankings, cutoffs, lists, and polished claims. Yorai starts somewhere more human: with students who have actually lived the campus, branch, hostel, club, lab, placement, and first-year reality.

Yorai is not a ratings-first review site, ranking engine, complaint board, or generic college directory. The product is built around useful conversations, context, freshness, and respectful student-to-student guidance.

## Core Principles

- **Discussion-first:** students ask, reply, and add context instead of dropping one-way verdicts.
- **Privacy-aware:** reports, moderation, and context attachment warnings protect students and private information.
- **Freshness-focused:** current context is prioritized, and older experiences are clearly marked.
- **No rating drama:** no stars, rankings, or review-score framing.
- **Community context over anonymous dumping:** students can confirm, update, challenge, or add branch-specific context.

## Why Yorai Exists

College decisions are personal, expensive, and often made with incomplete information. A brochure can tell students what a college wants to be known for. Yorai is designed to help students understand what life there actually feels like, what changes by branch or batch, and what practical choices help once they arrive.

The long-term vision is a student network that goes beyond choosing a college: a place where students across institutions can find context, collaborators, projects, events, hackathons, clubs, and opportunities.

## Current Features

- College search
- College profile pages
- Live student context threads
- Student experience pages
- What-actually-works insights
- DB-backed contribution creation for threads, replies, experiences, and practical insights
- Content quality checks, draft restore, edit/remove states, and closed-thread handling
- Freshness labels and community-context indicators
- Real email/password authentication with private-preview demo auth fallback
- My Yorai dashboard page
- Student profile, profile settings, privacy settings, and public `/u/[username]` pages
- Real college CSV import with provenance, duplicate checks, and admin review
- Moderation page
- Privacy-conscious aggregate analytics and admin platform-health pages
- Closed beta, invite, limited public, and public launch-mode controls
- College representative request and factual metadata correction foundations
- User data export and account deletion request foundations
- Safe liveness/readiness endpoints and structured operational error IDs
- Privacy, terms, safety, grievance, and content policy pages
- Fictional seed data for private preview testing

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL

## Local Development

Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd yorai
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Set `DATABASE_URL` in `.env` for your local PostgreSQL database. Do not commit `.env` or any real secrets.

For private preview/demo writes, enable the mock user switcher locally:

```env
YORAI_DEMO_AUTH_ENABLED="true"
YORAI_SESSION_DAYS="30"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Real email/password authentication is available through `/signup` and `/login`. Leave demo auth disabled in production unless you are intentionally running a controlled preview environment. Real signed-in sessions always take priority over demo identity.

New users are sent to `/settings/profile` after signup. Profile context is optional and self-declared unless Yorai later marks it verified. Users can choose public, community-only, or private visibility without exposing email addresses publicly.

Start PostgreSQL. If using the included Docker Compose setup:

```bash
docker compose up -d
```

Run Prisma setup:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Start the development server:

```bash
npm run dev
```

Useful checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Real Data Preparation

Yorai can prepare verified college records through a CSV import pipeline, but it does not scrape, auto-import, or silently add real colleges.

Start from the template:

```bash
npm run import:colleges -- --file ./data/colleges.template.csv --dry-run
```

When the dry run is clean, import with:

```bash
npm run import:colleges -- --file ./data/colleges.csv
```

Imports upsert by `slug`, validate required fields and URLs, preserve unrelated colleges, and report inserted, updated, skipped, and invalid rows. See `docs/college-import.md`.

Imported records are not public by default. Admins review and publish real college records through `/admin/colleges/review`; public search and student flows only show published colleges. See `docs/admin-college-data.md` for the review and source-tracking workflow.

## Demo Identity and Moderation

Private preview writes can use a selected demo user when `YORAI_DEMO_AUTH_ENABLED` is enabled. Real authenticated users can write without demo identity. Public visitors can browse colleges, threads, experiences, and insights without writing.

Moderation routes and actions require a Moderator or Admin role server-side. Internal notes and moderation action history are not public-facing.

See `docs/authentication.md` for the current session and demo-auth behavior.

## Profiles and Privacy

Yorai profiles are context-first, not popularity pages. Public profile pages may show a display name, username, student/alumni context, college, branch, year context, short bio, joined date, and contribution counts. They never show email, password, session, private verification, or moderation data.

Profile visibility controls:

- **Public:** visible to signed-out and signed-in visitors.
- **Community only:** visible only to authenticated Yorai users.
- **Private:** profile page is hidden; contributions use minimum safe identity context.

## Production Notes

Before deployment, configure real environment variables in the host platform and run production migrations with:

```bash
npx prisma migrate deploy
npx prisma generate
```

Do not run seed scripts against production unless you intentionally want fictional demo data there.

Production requires `DATABASE_URL`, an HTTPS `NEXT_PUBLIC_APP_URL`, `YORAI_DEMO_AUTH_ENABLED="false"`, and a valid `YORAI_SESSION_DAYS`. Readiness is available at `/api/health/ready`; liveness is available at `/api/health`. Public metadata is rendered from bounded database queries. Yorai deliberately does not cache sessions, personalized activity, notifications, moderation queues, or private profiles.

See `docs/deployment.md` for the deployment checklist, backup expectations, rollback guidance, health checks, security-header exceptions, and post-deployment smoke test.

Additional launch-readiness docs:

- `docs/public-launch-checklist.md`
- `docs/backup-and-recovery.md`
- `docs/incident-response.md`
- `docs/migration-safety.md`
- `docs/data-retention.md`
- `docs/moderator-handbook.md`

## Seed Data

The included seed data is fictional and exists only to support local development and private preview testing. It should not be treated as real college, student, or institutional data.

Yorai is intentionally seeded with fictional colleges so the product can be tested without implying association with real institutions or exposing real student identities.

## Project Status

Public-launch readiness foundation (v2.0.0). Yorai supports controlled launch modes, representative-request review, data export/deletion foundations, release controls, and launch operations while keeping open public registration off unless explicitly enabled server-side.

## Known Limitations

- Document verification, OAuth, and profile verification uploads are not implemented yet.
- Context attachments remain privacy-first metadata/placeholders unless storage is configured later.
- Real college data must be manually verified before import.
- Public launch requires professional legal review, backup verification, and operational staffing review.
- No private messaging, real-time chat, ratings, rankings, admission prediction, or recommendation engine exists.

## License

License: Not decided yet.
