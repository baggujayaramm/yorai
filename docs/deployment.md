# Yorai Deployment Readiness

## Required Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Always | PostgreSQL connection used by Prisma. Never expose it to the browser. |
| `NEXT_PUBLIC_APP_URL` | Production | Canonical HTTPS application origin. |
| `YORAI_DEMO_AUTH_ENABLED` | Always | Use `true` only for controlled local/preview testing; production must explicitly use `false`. |
| `YORAI_SESSION_DAYS` | Always | Session lifetime from 1 to 365 days; defaults to 30 outside strict readiness checks. |
| `YORAI_MAINTENANCE_MODE` | Optional | `off`, `write`, or `full`; defaults safely to `off`. |
| `YORAI_LAUNCH_MODE` | Optional | `CLOSED_BETA`, `INVITE_ONLY`, `LIMITED_PUBLIC`, or `PUBLIC`; defaults safely to closed beta behavior. |
| `YORAI_BETA_ALLOWED_DOMAINS` | Optional | Comma-separated domains permitted to register without an invite. |
| `YORAI_BETA_APPROVED_EMAILS` | Optional | Comma-separated manually approved beta emails. Keep private. |
| `NEXT_PUBLIC_APP_VERSION` | Optional | Safe version label shown in internal release controls. |
| `YORAI_BUILD_ID` | Optional | Non-secret build identifier; truncated before display. |
| `NODE_ENV` | Platform | Selects development, test, or production behavior. |
| `VERCEL_ENV` | Vercel | Distinguishes preview from production when supplied by Vercel. |

Do not commit `.env`, credentials, session tokens, or production URLs containing secrets.

Feature flags may be overridden server-side with `YORAI_FLAG_<UPPERCASE_KEY>=true|false`. Environment overrides take precedence over database controls. Open public registration requires compatible launch mode and server-side flags; it is not enabled automatically. See `closed-beta-release.md` and `public-launch-checklist.md` for release checklists.

## Release Procedure

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Check `GET /api/health` for liveness and `GET /api/health/ready` for database/configuration readiness. Neither endpoint returns environment values, credentials, or user data.

## Security And Caching

The application sets CSP, frame, referrer, MIME, permissions, and production transport headers. CSP permits inline scripts/styles because Next.js hydration, the pre-hydration theme script, and Tailwind-generated styles currently require them; external wildcard script origins are not allowed.

Private, personalized, moderation, notification, session, and analytics responses use dynamic/no-store behavior. Public database queries are bounded. No application-level cache is currently used, avoiding stale college review state during public testing; CDN caching can be introduced later with explicit invalidation after admin publication.

Context attachment files are local-development placeholders. Production upload returns a safe unavailable response until private object storage, metadata stripping, and reviewed delivery URLs are implemented.

## Backups And Rollback

- Take a Neon/PostgreSQL restore point before applying migrations. See `backup-and-recovery.md`.
- Migrations are additive and should be rolled forward when possible.
- Application rollback may use the prior deployment while retaining additive columns/tables.
- Do not drop new columns or tables during an incident response.
- Verify restore procedures in a non-production database before public testing.

## Post-Deployment Smoke Test

1. Confirm both health endpoints.
2. Browse home, search, a college, a thread, policy pages, login, and signup while signed out.
3. Sign in and verify contribution, reply, save, follow, watch, notification, and profile flows.
4. Verify moderator and admin route restrictions with normal accounts.
5. Verify moderation, `/admin/system`, and `/admin/analytics` with authorized accounts.
6. Verify `/admin/launch`, `/admin/college-claims`, representative request submission, and correction-request review with authorized accounts.
7. Check light/dark modes, mobile width, keyboard focus, and dialog Escape behavior.
8. Confirm hidden content is absent from search and public detail routes.

## Dependency Audit

Run `npm audit` before each release. Do not apply a suggested major downgrade automatically. Record unresolved advisories and reassess when a compatible patched Next.js release is available.
