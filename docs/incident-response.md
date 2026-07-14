# Incident Response

This is an operational foundation, not a formal security certification. Keep public communication calm, factual, and privacy-safe.

## Severity Levels

- Sev 1: data exposure, account/session compromise, database outage, or unsafe content surge affecting many users.
- Sev 2: failed migration, high moderation backlog, notification failure, or college data corruption with visible impact.
- Sev 3: isolated API failures, import errors, or individual moderation mistakes.

## Common Incidents

Authentication or session exposure:
Revoke affected sessions, rotate secrets if needed, pause registration or contributions, preserve audit records, and notify affected users when required.

Data leak:
Enable read-only or maintenance mode, hide affected content, preserve reports and moderation actions, review attachment visibility, and document remediation.

Abusive content surge:
Pause new contributions if necessary, prioritize high-risk reports, assign moderators, hide unsafe content, and keep student discussion structure where possible.

Failed migration or database outage:
Stop new writes, check migration status, use backup/recovery guidance, restore to a non-production branch first, then verify critical flows.

College data corruption:
Unpublish affected records, review import history and source provenance, restore from backup if needed, and document manual corrections.

## Post-Incident Review

Record timeline, impact, containment, root cause, recovery steps, follow-up owners, and policy or tooling improvements. Do not include passwords, tokens, private content, or security-sensitive internals in broad reports.
