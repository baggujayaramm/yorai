# Production Readiness Notes

## Verified Boundaries

- Real sessions use random opaque tokens, store only SHA-256 token hashes, expire server-side, and use secure HTTP-only cookies in production.
- Demo identity is environment-gated and readiness rejects it in production.
- Moderator/admin decisions and college publishing use server-side role checks.
- Public contribution queries require `VISIBLE` content and published colleges.
- API errors return safe messages and correlated error IDs; unexpected database details are logged by type rather than returned.
- Attachments require contribution ownership. Moderator-only captions are redacted from public responses.

## Query And Performance Policy

- Search terms and result sizes are bounded.
- Notifications, personal records, context actions, replies, attachments, reports, audit records, and admin metrics use fixed limits or pagination.
- Moderation report counts are grouped per page rather than queried once per report.
- Compound indexes cover public feeds, ownership/rate checks, moderation visibility, target watchers/savers, and operational events.
- Private or permission-dependent responses are not cached. No application cache is enabled during public testing, avoiding stale admin publication state.

## Known Operational Limits

- Login and rapid-action limits are process-local. Multi-instance production needs a shared rate-limit store.
- PostgreSQL search remains bounded `ILIKE`/array matching; larger datasets will need measured trigram or full-text indexes.
- Production context-file upload is disabled until private object storage and metadata stripping are implemented.
- Operational events are intentionally concise and do not replace managed uptime/error monitoring.
- Internal analytics are aggregate and first-party, but retention/deletion policy still needs a formal decision.
- `npm audit` currently reports two moderate advisories through Next.js's bundled PostCSS. The suggested automatic remediation is a breaking downgrade and was deferred.
