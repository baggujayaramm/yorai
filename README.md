# Yorai

**Student experience, not brochure noise.**

Yorai is a discussion-first college discovery platform for understanding college life through fresh student context. It helps aspirants explore colleges through live student threads, current-student and alumni experiences, practical guidance, and "what actually works" insights.

Yorai is not a ratings-first review site, ranking engine, or generic college directory. The product is built around useful conversations, context, freshness, and respectful student-to-student guidance.

## Core Principles

- **Discussion-first:** students ask, reply, and add context instead of dropping one-way verdicts.
- **Privacy-aware:** reports, moderation, and context attachment warnings protect students and private information.
- **Freshness-focused:** current context is prioritized, and older experiences are clearly marked.
- **No rating drama:** no stars, rankings, or review-score framing.
- **Community context over anonymous dumping:** students can confirm, update, challenge, or add branch-specific context.

## Current Features

- College search
- College profile pages
- Live student context threads
- Student experience pages
- What-actually-works insights
- Freshness labels and community-context indicators
- My Yorai profile/dashboard page
- Moderation page
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
npm run build
```

## Seed Data

The included seed data is fictional and exists only to support local development and private preview testing. It should not be treated as real college, student, or institutional data.

## Project Status

Private preview foundation.

## License

License: Not decided yet.
