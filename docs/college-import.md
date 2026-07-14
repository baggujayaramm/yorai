# College Import Workflow

Yorai v1.4.0 supports real college CSV ingestion without scraping, auto-publishing, or silently replacing existing student context.

Use the template at `data/colleges.template.csv` as the starting format.

## Required Fields

- `name`
- `city`
- `state`
- `officialWebsite`
- `affiliation`
- `courses`
- `sourceName`
- `sourceUrl`

`slug` is optional. If omitted, it is derived from `name`.

Use `|` or `,` for list fields such as `courses`, `aliases`, and `searchKeywords`.

Optional fields include `slug`, `shortName`, `district`, `country`, `officialLogoUrl`, `publicImageUrl`, `collegeType`, `institutionType`, `ownershipType`, `latitude`, `longitude`, `establishedYear`, `accreditation`, `aliases`, `searchKeywords`, `sourceRecordId`, `sourceUpdatedAt`, `lastVerifiedAt`, `recordStatus`, `imageUrl`, `imageSource`, `imageAttribution`, `imageLicense`, and `dataNotes`.

Supported `recordStatus` values are `DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, and `ARCHIVED`. Imported records default to `PENDING_REVIEW`; publishing happens through admin review.

## Source Metadata

Include source fields when available:

- `sourceName`
- `sourceUrl`
- `sourceRecordId`
- `sourceUpdatedAt`
- `lastVerifiedAt`
- `imageSource`
- `imageAttribution`
- `imageLicense`
- `dataNotes`

Yorai does not download remote images during import. Image URLs are validated as URLs only.

## Dry Run

```bash
npm run import:colleges -- --file ./data/colleges.template.csv --dry-run
```

Dry run validates rows and reports processed, valid, invalid, inserted, updated, skipped, duplicate candidates, warnings, and row-level errors without writing to the database.

## Import

```bash
npm run import:colleges -- --file ./data/colleges.csv
```

Imports are idempotent and use deterministic matching by source record, slug, official website, and normalized name/location. Exact matches can be updated. Likely and possible duplicates are skipped and flagged for admin review.

Imported colleges do not become public until an admin publishes them from `/admin/colleges/review`. Public search and profile selection return only `PUBLISHED` colleges.

Reviewed/published records are protected from import overwrites by default. Use `--allow-reviewed-overwrite` only after comparing sources and deciding the update is safe.

## Production Procedure

1. Prepare CSV from verified official/public sources.
2. Run dry-run locally or in a controlled environment.
3. Fix all row-level errors and investigate duplicate warnings.
4. Import with `npm run import:colleges -- --file ./data/colleges.csv`.
5. Review pending records in `/admin/colleges/review`.
6. Publish only records with clear source metadata.
7. Archive incorrect records instead of deleting them, preserving change history.

Rollback is operational: archive incorrectly imported records from admin review, or restore from a database backup if a batch needs to be reverted at scale.

## Safety Notes

- Do not import scraped or unverified college data.
- Do not include private student data.
- Do not commit production credentials.
- Keep real-data provenance clear through source metadata.
- Do not publish imported data before admin review.
