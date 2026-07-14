# Admin College Data Management

Yorai keeps real college metadata separate from student discussion features. Imported college records are private until an admin reviews and publishes them.

## Routes

- `/admin/colleges`: all college records with status/search filters.
- `/admin/colleges/review`: draft and pending records waiting for review.
- `/admin/colleges/imports`: import batch history.
- `/admin/colleges/[id]`: factual metadata, source metadata, status actions, and private change history.

Only `ADMIN` users can access these routes or update college records. Moderators keep access to moderation queues but do not automatically receive college data publishing rights.

## Lifecycle

```text
CSV Import -> Validation -> DRAFT or PENDING_REVIEW -> Admin Review -> PUBLISHED or ARCHIVED
```

Publishing makes a college visible in public search, profile college selection, thread creation, and public college pages. Archiving removes it from those public surfaces without deleting student-generated content.

## Duplicate Handling

The importer classifies records as:

- `exact match`: same source record ID or same slug.
- `likely duplicate`: same website or same normalized name/city/state.
- `possible duplicate`: similar name in the same state.
- `new record`: no deterministic candidate found.

Likely and possible duplicates are skipped during import and must be reviewed by an admin. Yorai does not merge uncertain records automatically.

## Private Audit

Significant college changes create private `CollegeChangeRecord` entries. These notes are for administrators only and must not be exposed publicly.
