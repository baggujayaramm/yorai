import type { College, CollegeRecordStatus, PrismaClient } from '@prisma/client';
import { normalizeCollegeSearchName } from './college-search';

export const COLLEGE_IMPORT_VERSION = 'v1.4.0';
export const maxCollegeImportBytes = 2 * 1024 * 1024;
export const maxCollegeImportRows = 5000;
export const collegeRecordStatuses = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED'] as const;

export type DuplicateClassification = 'exact match' | 'likely duplicate' | 'possible duplicate' | 'new record';

export type CollegeImportInput = {
  name?: string;
  normalizedName?: string;
  slug?: string;
  shortName?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  officialWebsite?: string;
  officialLogoUrl?: string;
  publicImageUrl?: string;
  affiliation?: string;
  courses?: string;
  collegeType?: string;
  institutionType?: string;
  ownershipType?: string;
  latitude?: string;
  longitude?: string;
  establishedYear?: string;
  accreditation?: string;
  aliases?: string;
  searchKeywords?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceRecordId?: string;
  sourceUpdatedAt?: string;
  lastVerifiedAt?: string;
  recordStatus?: string;
  imageUrl?: string;
  imageSource?: string;
  imageAttribution?: string;
  imageLicense?: string;
  dataNotes?: string;
};

export type CollegeImportRow = {
  rowNumber: number;
  input: CollegeImportInput;
};

export type ValidCollegeImport = {
  rowNumber: number;
  data: CollegeImportData;
  classification: DuplicateClassification;
  matchedCollegeId?: string;
  duplicateCandidates: DuplicateCandidate[];
  warnings: string[];
};

export type CollegeImportData = {
  name: string;
  normalizedName: string;
  slug: string;
  shortName?: string;
  city: string;
  district?: string;
  state: string;
  country: string;
  officialWebsite: string;
  officialLogoUrl?: string;
  publicImageUrl?: string;
  affiliation: string;
  courses: string[];
  admissionModes: string[];
  collegeType?: string;
  institutionType?: string;
  ownershipType?: string;
  latitude?: number;
  longitude?: number;
  establishedYear?: number;
  accreditation?: string;
  aliases: string[];
  searchKeywords: string[];
  sourceName?: string;
  sourceUrl?: string;
  sourceRecordId?: string;
  sourceUpdatedAt?: Date;
  lastVerifiedAt?: Date;
  imageUrl?: string;
  imageSource?: string;
  imageAttribution?: string;
  imageLicense?: string;
  dataNotes?: string;
  recordStatus: CollegeRecordStatus;
};

export type DuplicateCandidate = {
  collegeId?: string;
  slug?: string;
  name?: string;
  classification: DuplicateClassification;
  reason: string;
};

export type InvalidCollegeImport = {
  rowNumber: number;
  errors: string[];
  input: CollegeImportInput;
};

export type CollegeImportValidationResult = {
  valid: ValidCollegeImport[];
  invalid: InvalidCollegeImport[];
  duplicateCandidates: DuplicateCandidate[];
  warnings: string[];
  errors: string[];
};

export type CollegeImportResult = CollegeImportValidationResult & {
  processedRows: number;
  inserted: number;
  updated: number;
  skipped: number;
  dryRun: boolean;
  batchId?: string;
};

export type ImportCollegeOptions = {
  dryRun: boolean;
  fileName?: string;
  sourceName?: string;
  importActorId?: string;
  allowReviewedOverwrite?: boolean;
};

const requiredFields: Array<keyof CollegeImportInput> = ['name', 'city', 'state', 'officialWebsite', 'affiliation', 'courses', 'sourceName', 'sourceUrl'];

export function parseCollegeCsv(content: string): CollegeImportRow[] {
  if (Buffer.byteLength(content, 'utf8') > maxCollegeImportBytes) {
    throw new Error('College import file is too large. Keep CSV files under 2 MB.');
  }

  const rows = parseCsv(content).filter((row) => row.some((cell) => cell.trim()));
  if (rows.length === 0) return [];
  if (rows.length - 1 > maxCollegeImportRows) {
    throw new Error(`College import supports at most ${maxCollegeImportRows} rows at a time.`);
  }

  const headers = rows[0].map((header) => normalizeHeader(header));
  return rows.slice(1).map((row, index) => {
    const input: CollegeImportInput = {};
    headers.forEach((header, cellIndex) => {
      if (!header) return;
      input[header] = row[cellIndex] ?? '';
    });
    return { rowNumber: index + 2, input };
  });
}

export async function normalizeCollegeImportRows(prismaOrRows: PrismaClient | CollegeImportRow[], maybeRows?: CollegeImportRow[]): Promise<CollegeImportValidationResult>;
export async function normalizeCollegeImportRows(rows: CollegeImportRow[]): Promise<CollegeImportValidationResult>;
export async function normalizeCollegeImportRows(prismaOrRows: PrismaClient | CollegeImportRow[], maybeRows?: CollegeImportRow[]): Promise<CollegeImportValidationResult> {
  const prisma = Array.isArray(prismaOrRows) ? undefined : prismaOrRows;
  const rows = Array.isArray(prismaOrRows) ? prismaOrRows : maybeRows ?? [];
  const valid: ValidCollegeImport[] = [];
  const invalid: InvalidCollegeImport[] = [];
  const duplicateCandidates: DuplicateCandidate[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const seenSlugs = new Map<string, number>();
  const seenSourceRecords = new Map<string, number>();
  const seenNaturalKeys = new Map<string, number>();

  for (const row of rows) {
    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];
    const input = trimInput(row.input);

    for (const field of requiredFields) {
      if (!input[field]) rowErrors.push(`${field} is required`);
    }

    const normalizedName = normalizeCollegeName(input.normalizedName || input.name || '');
    const slug = input.slug ? slugify(input.slug) : slugify(input.name ?? '');
    if (!normalizedName) rowErrors.push('name is required');
    if (!slug) rowErrors.push('slug could not be derived');
    if (seenSlugs.has(slug)) rowErrors.push(`duplicate slug in import file: ${slug} also appears on row ${seenSlugs.get(slug)}`);
    seenSlugs.set(slug, row.rowNumber);

    const sourceRecordKey = input.sourceName && input.sourceRecordId ? `${input.sourceName.toLowerCase()}::${input.sourceRecordId.toLowerCase()}` : '';
    if (sourceRecordKey) {
      if (seenSourceRecords.has(sourceRecordKey)) rowErrors.push(`duplicate source record in import file: ${input.sourceRecordId} also appears on row ${seenSourceRecords.get(sourceRecordKey)}`);
      seenSourceRecords.set(sourceRecordKey, row.rowNumber);
    }

    const naturalKey = `${normalizedName}::${normalizeLocation(input.city)}::${normalizeLocation(input.state)}`;
    if (seenNaturalKeys.has(naturalKey)) rowWarnings.push(`possible duplicate in import file with row ${seenNaturalKeys.get(naturalKey)}`);
    seenNaturalKeys.set(naturalKey, row.rowNumber);

    const officialWebsite = normalizeUrl(input.officialWebsite);
    if (input.officialWebsite && !officialWebsite) rowErrors.push('officialWebsite must be a valid http(s) URL');
    const sourceUrl = normalizeUrl(input.sourceUrl);
    if (input.sourceUrl && !sourceUrl) rowErrors.push('sourceUrl must be a valid http(s) URL');
    const imageUrl = normalizeUrl(input.imageUrl);
    if (input.imageUrl && !imageUrl) rowErrors.push('imageUrl must be a valid http(s) URL');
    const officialLogoUrl = normalizeUrl(input.officialLogoUrl);
    if (input.officialLogoUrl && !officialLogoUrl) rowErrors.push('officialLogoUrl must be a valid http(s) URL');
    const publicImageUrl = normalizeUrl(input.publicImageUrl);
    if (input.publicImageUrl && !publicImageUrl) rowErrors.push('publicImageUrl must be a valid http(s) URL');

    const sourceUpdatedAt = parseOptionalDate(input.sourceUpdatedAt);
    if (input.sourceUpdatedAt && !sourceUpdatedAt) rowErrors.push('sourceUpdatedAt must be a valid ISO date');
    const lastVerifiedAt = parseOptionalDate(input.lastVerifiedAt);
    if (input.lastVerifiedAt && !lastVerifiedAt) rowErrors.push('lastVerifiedAt must be a valid ISO date');
    const latitude = parseCoordinate(input.latitude, -90, 90);
    if (input.latitude && latitude === undefined) rowErrors.push('latitude must be between -90 and 90');
    const longitude = parseCoordinate(input.longitude, -180, 180);
    if (input.longitude && longitude === undefined) rowErrors.push('longitude must be between -180 and 180');
    const establishedYear = parseEstablishedYear(input.establishedYear);
    if (input.establishedYear && establishedYear === undefined) rowErrors.push('establishedYear must be between 1500 and next year');
    const recordStatus = parseRecordStatus(input.recordStatus);
    if (input.recordStatus && !recordStatus) rowErrors.push('recordStatus must be DRAFT, PENDING_REVIEW, PUBLISHED, or ARCHIVED');
    if (recordStatus === 'PUBLISHED') rowWarnings.push('import row requests PUBLISHED; importer keeps new imported records pending unless an admin reviews them');

    const courses = splitList(input.courses);
    if (input.courses && courses.length === 0) rowErrors.push('courses must include at least one course');

    if (rowErrors.length > 0) {
      invalid.push({ rowNumber: row.rowNumber, errors: rowErrors, input: row.input });
      errors.push(...rowErrors.map((error) => `Row ${row.rowNumber}: ${error}`));
      continue;
    }

    const duplicateInfo = prisma ? await classifyDuplicate(prisma, {
      slug,
      normalizedName,
      city: normalizeLocation(input.city),
      state: normalizeLocation(input.state),
      officialWebsite: officialWebsite ?? '',
      sourceName: input.sourceName,
      sourceRecordId: input.sourceRecordId,
    }) : { classification: 'new record' as const, candidates: [] };

    duplicateCandidates.push(...duplicateInfo.candidates);
    rowWarnings.push(...duplicateInfo.candidates.map((candidate) => `${candidate.classification}: ${candidate.reason}`));

    valid.push({
      rowNumber: row.rowNumber,
      classification: duplicateInfo.classification,
      matchedCollegeId: duplicateInfo.matchedCollegeId,
      duplicateCandidates: duplicateInfo.candidates,
      warnings: rowWarnings,
      data: {
        name: stripHtml(input.name ?? ''),
        normalizedName,
        slug,
        shortName: stripHtml(input.shortName),
        city: normalizeLocation(input.city),
        district: normalizeLocation(input.district),
        state: normalizeLocation(input.state),
        country: normalizeLocation(input.country) || 'India',
        officialWebsite: officialWebsite ?? '',
        officialLogoUrl,
        publicImageUrl,
        affiliation: stripHtml(input.affiliation ?? ''),
        courses,
        admissionModes: [],
        collegeType: stripHtml(input.collegeType),
        institutionType: stripHtml(input.institutionType || input.collegeType),
        ownershipType: stripHtml(input.ownershipType),
        latitude,
        longitude,
        establishedYear,
        accreditation: stripHtml(input.accreditation),
        aliases: splitList(input.aliases),
        searchKeywords: splitList(input.searchKeywords),
        sourceName: stripHtml(input.sourceName),
        sourceUrl: sourceUrl ?? undefined,
        sourceRecordId: stripHtml(input.sourceRecordId),
        sourceUpdatedAt,
        lastVerifiedAt,
        imageUrl,
        imageSource: stripHtml(input.imageSource),
        imageAttribution: stripHtml(input.imageAttribution),
        imageLicense: stripHtml(input.imageLicense),
        dataNotes: stripHtml(input.dataNotes),
        recordStatus: recordStatus === 'DRAFT' || recordStatus === 'ARCHIVED' ? recordStatus : 'PENDING_REVIEW',
      },
    });
    warnings.push(...rowWarnings.map((warning) => `Row ${row.rowNumber}: ${warning}`));
  }

  return { valid, invalid, duplicateCandidates, warnings, errors };
}

export async function importColleges(prisma: PrismaClient, rows: CollegeImportRow[], dryRunOrOptions: boolean | ImportCollegeOptions): Promise<CollegeImportResult> {
  const options: ImportCollegeOptions = typeof dryRunOrOptions === 'boolean' ? { dryRun: dryRunOrOptions } : dryRunOrOptions;
  const validation = await normalizeCollegeImportRows(prisma, rows);

  if (options.dryRun) {
    return {
      ...validation,
      processedRows: rows.length,
      inserted: 0,
      updated: 0,
      skipped: validation.invalid.length,
      dryRun: true,
    };
  }

  let inserted = 0;
  let updated = 0;
  let skipped = validation.invalid.length;
  const batch = await prisma.collegeImportBatch.create({
    data: {
      fileName: options.fileName ?? 'college-import.csv',
      sourceName: options.sourceName ?? validation.valid[0]?.data.sourceName,
      status: validation.invalid.length > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
      totalRows: rows.length,
      successfulRows: 0,
      failedRows: validation.invalid.length,
      warningCount: validation.warnings.length,
      importActorId: options.importActorId,
      importerVersion: COLLEGE_IMPORT_VERSION,
      startedAt: new Date(),
    },
  });

  await prisma.$transaction(async (tx) => {
    for (const row of validation.valid) {
      const exact = row.matchedCollegeId
        ? await tx.college.findUnique({ where: { id: row.matchedCollegeId } })
        : await tx.college.findUnique({ where: { slug: row.data.slug } });

      if (exact && isReviewedCollege(exact) && !options.allowReviewedOverwrite) {
        skipped += 1;
        await tx.collegeChangeRecord.create({
          data: {
            collegeId: exact.id,
            actionType: 'UPDATED',
            note: `Import skipped by ${COLLEGE_IMPORT_VERSION}; reviewed record was protected.`,
            changedFields: { rowNumber: row.rowNumber, protected: true },
          },
        });
        continue;
      }

      if (row.classification === 'likely duplicate' || row.classification === 'possible duplicate') {
        skipped += 1;
        const candidateId = row.duplicateCandidates[0]?.collegeId;
        if (candidateId) {
          await tx.collegeChangeRecord.create({
            data: {
              collegeId: candidateId,
              actionType: 'DUPLICATE_FLAGGED',
              note: `Import row ${row.rowNumber} needs admin duplicate review.`,
              changedFields: row.duplicateCandidates as never,
            },
          });
        }
        continue;
      }

      const writeData = {
        ...row.data,
        dataOrigin: 'IMPORTED' as const,
        importedAt: new Date(),
        importBatchId: batch.id,
      };

      const saved = exact
        ? await tx.college.update({ where: { id: exact.id }, data: writeData })
        : await tx.college.create({ data: writeData });

      if (exact) updated += 1;
      else inserted += 1;

      await tx.collegeChangeRecord.create({
        data: {
          collegeId: saved.id,
          actionType: exact ? 'UPDATED' : 'IMPORTED',
          changedFields: { rowNumber: row.rowNumber, importerVersion: COLLEGE_IMPORT_VERSION, classification: row.classification },
          note: exact ? 'Updated from CSV import.' : 'Created from CSV import pending admin review.',
        },
      });
    }

    await tx.collegeImportBatch.update({
      where: { id: batch.id },
      data: {
        successfulRows: inserted + updated,
        failedRows: skipped,
        status: validation.invalid.length > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
        completedAt: new Date(),
      },
    });
  });

  return {
    ...validation,
    processedRows: rows.length,
    inserted,
    updated,
    skipped,
    dryRun: false,
    batchId: batch.id,
  };
}

export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

export function normalizeCollegeName(value: string) {
  return normalizeCollegeSearchName(stripHtml(value));
}

export function normalizeLocation(value?: string) {
  return stripHtml(value)
    .replace(/\s+/g, ' ')
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase('en-IN'));
}

export function normalizeUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    url.hash = '';
    return url.toString();
  } catch {
    return undefined;
  }
}

export function parseCoordinate(value: string | undefined, min: number, max: number) {
  if (!value) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return undefined;
  return number;
}

export function parseEstablishedYear(value?: string, now = new Date()) {
  if (!value) return undefined;
  if (!/^\d{4}$/.test(value.trim())) return undefined;
  const year = Number(value);
  const nextYear = now.getUTCFullYear() + 1;
  if (year < 1500 || year > nextYear) return undefined;
  return year;
}

export function canTransitionCollegeStatus(from: CollegeRecordStatus, to: CollegeRecordStatus) {
  if (from === to) return true;
  if (from === 'DRAFT') return to === 'PENDING_REVIEW' || to === 'ARCHIVED';
  if (from === 'PENDING_REVIEW') return to === 'PUBLISHED' || to === 'ARCHIVED' || to === 'DRAFT';
  if (from === 'PUBLISHED') return to === 'ARCHIVED';
  if (from === 'ARCHIVED') return to === 'PENDING_REVIEW';
  return false;
}

function parseRecordStatus(value?: string): CollegeRecordStatus | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return collegeRecordStatuses.includes(normalized as CollegeRecordStatus) ? normalized as CollegeRecordStatus : undefined;
}

function trimInput(input: CollegeImportInput): CollegeImportInput {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, value?.trim() ?? ''])) as CollegeImportInput;
}

function splitList(value?: string) {
  return Array.from(new Set((value ?? '').split(/[|,]/).map((item) => stripHtml(item)).filter(Boolean)));
}

function parseOptionalDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function stripHtml(value?: string) {
  return (value ?? '').trim().replace(/[<>]/g, '').slice(0, 500);
}

function isReviewedCollege(college: Pick<College, 'recordStatus' | 'lastReviewedAt'>) {
  return college.recordStatus === 'PUBLISHED' || Boolean(college.lastReviewedAt);
}

async function classifyDuplicate(
  prisma: PrismaClient,
  data: { slug: string; normalizedName: string; city: string; state: string; officialWebsite: string; sourceName?: string; sourceRecordId?: string },
) {
  const candidates: DuplicateCandidate[] = [];

  if (data.sourceName && data.sourceRecordId) {
    const sourceMatch = await prisma.college.findFirst({ where: { sourceName: data.sourceName, sourceRecordId: data.sourceRecordId } });
    if (sourceMatch) {
      return {
        classification: 'exact match' as const,
        matchedCollegeId: sourceMatch.id,
        candidates: [{ collegeId: sourceMatch.id, slug: sourceMatch.slug, name: sourceMatch.name, classification: 'exact match' as const, reason: 'same source record ID' }],
      };
    }
  }

  const slugMatch = await prisma.college.findUnique({ where: { slug: data.slug } });
  if (slugMatch) {
    return {
      classification: 'exact match' as const,
      matchedCollegeId: slugMatch.id,
      candidates: [{ collegeId: slugMatch.id, slug: slugMatch.slug, name: slugMatch.name, classification: 'exact match' as const, reason: 'same slug' }],
    };
  }

  const websiteMatch = data.officialWebsite
    ? await prisma.college.findFirst({ where: { officialWebsite: data.officialWebsite } })
    : null;
  if (websiteMatch) {
    candidates.push({ collegeId: websiteMatch.id, slug: websiteMatch.slug, name: websiteMatch.name, classification: 'likely duplicate', reason: 'same official website' });
  }

  const nameLocationMatch = await prisma.college.findFirst({
    where: { normalizedName: data.normalizedName, city: data.city, state: data.state },
  });
  if (nameLocationMatch) {
    candidates.push({ collegeId: nameLocationMatch.id, slug: nameLocationMatch.slug, name: nameLocationMatch.name, classification: 'likely duplicate', reason: 'same normalized name, city, and state' });
  }

  if (candidates.length > 0) {
    return { classification: 'likely duplicate' as const, candidates };
  }

  const possible = await prisma.college.findMany({
    where: { normalizedName: { contains: data.normalizedName.split(' ').slice(0, 3).join(' '), mode: 'insensitive' }, state: data.state },
    take: 3,
  });
  candidates.push(...possible.map((college) => ({ collegeId: college.id, slug: college.slug, name: college.name, classification: 'possible duplicate' as const, reason: 'similar name in the same state' })));
  return { classification: candidates.length ? 'possible duplicate' as const : 'new record' as const, candidates };
}

function normalizeHeader(header: string): keyof CollegeImportInput | '' {
  const key = header.trim().replace(/[-_\s]+(.)?/g, (_, next: string | undefined) => next ? next.toUpperCase() : '');
  const normalized = key.charAt(0).toLowerCase() + key.slice(1);
  const allowed = new Set([
    'name',
    'normalizedName',
    'slug',
    'shortName',
    'city',
    'district',
    'state',
    'country',
    'officialWebsite',
    'officialLogoUrl',
    'publicImageUrl',
    'affiliation',
    'courses',
    'collegeType',
    'institutionType',
    'ownershipType',
    'latitude',
    'longitude',
    'establishedYear',
    'accreditation',
    'aliases',
    'searchKeywords',
    'sourceName',
    'sourceUrl',
    'sourceRecordId',
    'sourceUpdatedAt',
    'lastVerifiedAt',
    'recordStatus',
    'imageUrl',
    'imageSource',
    'imageAttribution',
    'imageLicense',
    'dataNotes',
  ]);
  return allowed.has(normalized) ? normalized as keyof CollegeImportInput : '';
}

function parseCsv(content: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}
