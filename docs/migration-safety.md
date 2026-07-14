# Migration Safety Checklist

Use this checklist before production migration deploys.

## Review

- Confirm migration order and that all prior migrations are applied.
- Prefer additive, nullable transitions before required fields.
- Check indexes and unique constraints for existing-data compatibility.
- Confirm defaults for new non-null columns.
- Review raw SQL for destructive operations.
- Confirm production backup before migration.

## Execute

```bash
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
```

Do not reset, reseed, or drop production data. If a migration fails, stop new writes, preserve logs, and follow `backup-and-recovery.md` and `incident-response.md`.

## Verify

- Run health checks.
- Verify signup/login, search, college pages, contribution creation, moderation, reports, notifications, and admin launch dashboard.
- Confirm reviewed/published college records are still visible and hidden/removed records stay hidden.
