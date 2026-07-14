import type { CollegeRecordStatus, Prisma, PrismaClient, User } from '@prisma/client';
import { canTransitionCollegeStatus, collegeRecordStatuses, normalizeCollegeName, normalizeLocation, normalizeUrl, parseEstablishedYear } from './college-import';

export function parseAdminCollegeStatus(value?: string | null): CollegeRecordStatus | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return collegeRecordStatuses.includes(normalized as CollegeRecordStatus) ? normalized as CollegeRecordStatus : undefined;
}

export async function updateCollegeFromAdmin(
  prisma: PrismaClient,
  collegeId: string,
  actor: Pick<User, 'id'>,
  input: {
    name?: string;
    shortName?: string;
    city?: string;
    state?: string;
    officialWebsite?: string;
    affiliation?: string;
    institutionType?: string;
    ownershipType?: string;
    establishedYear?: string;
    accreditation?: string;
    sourceName?: string;
    sourceUrl?: string;
    internalReviewNote?: string;
    recordStatus?: string;
  },
) {
  const current = await prisma.college.findUniqueOrThrow({ where: { id: collegeId } });
  const requestedStatus = parseAdminCollegeStatus(input.recordStatus);
  if (requestedStatus && !canTransitionCollegeStatus(current.recordStatus, requestedStatus)) {
    throw new Error(`Cannot move college from ${current.recordStatus} to ${requestedStatus}.`);
  }

  const officialWebsite = input.officialWebsite === undefined ? undefined : normalizeUrl(input.officialWebsite);
  if (input.officialWebsite && !officialWebsite) throw new Error('Official website must be a valid http(s) URL.');
  const sourceUrl = input.sourceUrl === undefined ? undefined : normalizeUrl(input.sourceUrl);
  if (input.sourceUrl && !sourceUrl) throw new Error('Source URL must be a valid http(s) URL.');
  const establishedYear = input.establishedYear === undefined ? undefined : parseEstablishedYear(input.establishedYear) ?? null;
  if (input.establishedYear && establishedYear === null) throw new Error('Established year must be a realistic four-digit year.');
  const nextName = input.name?.trim();
  if (input.name !== undefined && !nextName) throw new Error('College name is required.');

  const changedFields: Record<string, unknown> = {};
  const data: Prisma.CollegeUncheckedUpdateInput = {
    name: nextName,
    normalizedName: nextName ? normalizeCollegeName(nextName) : undefined,
    shortName: clean(input.shortName),
    city: input.city === undefined ? undefined : normalizeLocation(input.city),
    state: input.state === undefined ? undefined : normalizeLocation(input.state),
    officialWebsite,
    affiliation: cleanRequired(input.affiliation),
    institutionType: clean(input.institutionType),
    ownershipType: clean(input.ownershipType),
    establishedYear,
    accreditation: clean(input.accreditation),
    sourceName: clean(input.sourceName),
    sourceUrl,
    internalReviewNote: clean(input.internalReviewNote),
    recordStatus: requestedStatus,
    lastReviewedAt: requestedStatus ? new Date() : undefined,
    reviewedByUserId: requestedStatus ? actor.id : undefined,
  };

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) changedFields[key] = value;
  }

  const updated = await prisma.college.update({ where: { id: collegeId }, data });
  await prisma.collegeChangeRecord.create({
    data: {
      collegeId,
      changedById: actor.id,
      actionType: requestedStatus === 'PUBLISHED' ? 'PUBLISHED' : requestedStatus === 'ARCHIVED' ? 'ARCHIVED' : requestedStatus ? 'REVIEWED' : 'UPDATED',
      changedFields: changedFields as Prisma.InputJsonValue,
      note: clean(input.internalReviewNote),
    },
  });
  return updated;
}

function clean(value?: string) {
  if (value === undefined) return undefined;
  return value.trim().replace(/[<>]/g, '').slice(0, 500) || null;
}

function cleanRequired(value?: string) {
  if (value === undefined) return undefined;
  return value.trim().replace(/[<>]/g, '').slice(0, 500) || undefined;
}
