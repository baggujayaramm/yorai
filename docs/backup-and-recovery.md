# Backup and Recovery

Yorai stores production data in PostgreSQL. For the current Vercel/Neon direction, use Neon-managed backups, point-in-time recovery where available, and pre-release export snapshots for controlled launch changes.

## Backup Expectations

- Confirm Neon backup/PITR availability for the production branch before launch.
- Take a pre-release backup before running `npx prisma migrate deploy`.
- Do not reseed production after launch.
- Keep local demo data separate from reviewed production records.

## Recovery Verification

- Restore to a non-production branch first.
- Run `npx prisma migrate status` against the restored branch.
- Verify login, college search, college profile, contribution creation, reports, moderation, and admin launch dashboard.
- Compare reviewed college counts and unresolved moderation counts before switching traffic.

## Migration Rollback Strategy

- Prefer forward fixes for non-destructive schema problems.
- If rollback is required, restore the pre-release database backup to a separate branch and point preview traffic there first.
- Do not run destructive SQL against production without a backup and written approval.

## Pre-Release Checklist

- Backup confirmed.
- Migration SQL reviewed for destructive changes.
- Demo auth disabled in production.
- Launch mode and feature flags reviewed.
- Moderation staffing confirmed.
- Health checks pass after migration.
