# Public Launch Checklist

Yorai v2.0 is designed for controlled public launch readiness. Do not deploy automatically from this checklist.

## Before Deployment

- Confirm production PostgreSQL backup and recovery path.
- Review `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `YORAI_DEMO_AUTH_ENABLED=false`, `YORAI_LAUNCH_MODE`, and all `YORAI_FLAG_*` values.
- Run `npx prisma migrate status` and review pending migration SQL.
- Confirm launch mode: `CLOSED_BETA`, `INVITE_ONLY`, `LIMITED_PUBLIC`, or `PUBLIC`.
- Confirm registration settings: public registration, invite-only registration, approved-domain registration, and registration pause.
- Review demo data and fictional records before making records public.
- Confirm moderation staffing, report queue ownership, and high-risk escalation.
- Verify health checks, analytics privacy, error logging, and notification behavior.

## Deployment

```bash
npx prisma migrate deploy
npx prisma generate
npm run build
```

## After Deployment

- Check `/api/health` and `/api/health/ready`.
- Verify signup, invite signup, login, logout, and session persistence.
- Verify search, college pages, thread creation, replies, reports, moderation, notifications, and feedback.
- Verify `/admin/launch`, `/admin/data-quality`, `/admin/college-claims`, and `/admin/system`.
- Review error logs, API error rate, database connectivity, failed writes, unresolved reports, and import failures.

## Rollback

- Prefer forward fixes for safe code issues.
- For database failures, restore the pre-release backup to a non-production branch first.
- Switch traffic only after critical flows are verified.
- Do not reseed production as a rollback strategy.
