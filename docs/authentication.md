# Authentication

Yorai v1.2.0 uses email/password authentication with database-backed sessions.

## Local Setup

Set these environment variables:

```env
DATABASE_URL="postgresql://yorai:yorai_password@localhost:5432/yorai_db"
YORAI_SESSION_DAYS="30"
YORAI_DEMO_AUTH_ENABLED="true"
```

`YORAI_DEMO_AUTH_ENABLED` is only for local/private-preview demo users. Do not enable it in normal production unless you intentionally want the demo switcher.

## Flow

- Users sign up at `/signup`.
- New signups continue to `/settings/profile?welcome=1` to add optional student context.
- Users sign in at `/login`.
- Passwords are hashed with Node `crypto.scrypt`.
- Sessions are stored in PostgreSQL as hashed tokens.
- The browser receives only an HTTP-only `yorai_session` cookie.
- Logout revokes the database session and clears the cookie.

## Profile Context

Authenticated users can manage public context at `/settings/profile` and visibility at `/settings/privacy`.

Profile context is self-declared unless a future verification flow marks it otherwise. Public profile pages use `/u/[username]` and filter private fields server-side. Email, password hashes, sessions, moderation history, and private verification metadata are never returned for public profiles.

Visibility states:

- `PUBLIC`: visible to anyone.
- `COMMUNITY_ONLY`: visible only to authenticated Yorai users.
- `PRIVATE`: profile page is hidden from others, and contributions show minimum safe identity context.

## Server Boundary

Protected writes use the shared server-side current-user boundary in `src/lib/auth.ts`.

The boundary:

- checks a real session first
- rejects missing, revoked, invalid, or expired sessions
- falls back to demo auth only when no real session exists and demo auth is enabled
- never trusts a client-provided user ID

## Production Notes

- Configure `DATABASE_URL` in the deployment platform.
- Keep `YORAI_DEMO_AUTH_ENABLED` unset or `false` for normal production.
- Set `YORAI_SESSION_DAYS` if the default 30-day session length should change.
- Run `npx prisma migrate deploy` during deployment.
- Do not log passwords, password hashes, session tokens, or cookies.
