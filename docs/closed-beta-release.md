# Closed Beta Release Checklist

## Before Release

- Create and verify a PostgreSQL/Neon restore point.
- Confirm the target environment and `DATABASE_URL` without printing credentials.
- Set `YORAI_DEMO_AUTH_ENABLED=false` outside controlled demos.
- Review invite, waitlist, maintenance, and feature-flag settings in `/admin/releases`.
- Run `npx prisma migrate status`, `npx prisma generate`, lint, typecheck, tests, and the production build.
- Verify login, logout, invite signup, profile onboarding, search, contributions, notifications, moderation, feedback, analytics, and both health endpoints.
- Check keyboard navigation, mobile width, light mode, and dark mode.

## Closed Beta Smoke Test

1. Redeem a valid limited-use invite and reject invalid, expired, and exhausted codes.
2. Submit and deduplicate a waitlist entry; issue an invite from the admin queue.
3. Confirm active users can contribute and suspended/expired users can still browse but cannot write.
4. Submit feedback and confirm the user history omits internal notes and assignments.
5. Review data quality, moderation, beta metrics, release metadata, and announcements as an admin.
6. Confirm full maintenance preserves health/admin access and write maintenance preserves public reads.

## Rollback

- Prefer rolling the application back to the previous build while retaining additive schema changes.
- Disable affected features or switch to write maintenance before rollback when writes could be unsafe.
- Do not drop tables, reset the database, or rerun seed data during incident response.
- If data recovery is necessary, restore into a separate database first, validate it, then follow the provider runbook.
- Record the incident, affected release, migration state, and recovery decision in private operations notes.
