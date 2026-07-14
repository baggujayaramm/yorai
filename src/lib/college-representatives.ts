import type { User } from '@prisma/client';
import { ApiError } from './api-response';
import { normalizeEmail } from './auth';
import { normalizeText, validateContent } from './content-quality';
import { isCollegeRepresentativeRole } from './permissions';
import { prisma } from './prisma';

export const factualCorrectionFields = [
  'official name',
  'official website',
  'address',
  'institution type',
  'accreditation',
  'contact information',
  'established year',
] as const;

export function normalizeClaimInput(body: {
  collegeId?: string;
  collegeName?: string;
  institutionalEmail?: string;
  roleOrDepartment?: string;
  officialWebsite?: string;
  reason?: string;
  sourceInfo?: string;
}) {
  const collegeName = normalizeText(body.collegeName).slice(0, 160);
  const institutionalEmail = normalizeEmail(body.institutionalEmail ?? '');
  const roleOrDepartment = normalizeText(body.roleOrDepartment).slice(0, 120);
  const officialWebsite = normalizeText(body.officialWebsite).slice(0, 240) || undefined;
  const reason = normalizeText(body.reason).slice(0, 1000);
  const sourceInfo = normalizeText(body.sourceInfo).slice(0, 1000) || undefined;
  if (!collegeName || !institutionalEmail.includes('@') || !roleOrDepartment || !reason) {
    throw new ApiError(400, 'Add college, institutional email, role, and request reason.', 'invalid_college_claim');
  }
  if (officialWebsite && !/^https?:\/\//i.test(officialWebsite)) throw new ApiError(400, 'Use a valid official website URL.', 'invalid_official_website');
  return {
    collegeId: normalizeText(body.collegeId) || undefined,
    collegeName,
    institutionalEmail,
    roleOrDepartment,
    officialWebsite,
    reason,
    sourceInfo,
  };
}

export async function isApprovedCollegeRepresentative(user: Pick<User, 'id' | 'role'>, collegeId?: string) {
  if (!isCollegeRepresentativeRole(user.role)) return false;
  const approved = await prisma.collegeClaimRequest.findFirst({
    where: {
      requesterId: user.id,
      status: 'APPROVED',
      ...(collegeId ? { collegeId } : {}),
    },
    select: { id: true },
  });
  return Boolean(approved);
}

export async function assertApprovedCollegeRepresentative(user: Pick<User, 'id' | 'role'>, collegeId: string) {
  if (!await isApprovedCollegeRepresentative(user, collegeId)) {
    throw new ApiError(403, 'Only approved college representatives can request official metadata corrections for this college.', 'representative_approval_required');
  }
}

export function normalizeCorrectionInput(body: {
  collegeId?: string;
  fieldName?: string;
  proposedValue?: string;
  currentValue?: string;
  sourceUrl?: string;
  sourceInfo?: string;
}) {
  const collegeId = normalizeText(body.collegeId);
  const fieldName = normalizeText(body.fieldName).toLowerCase();
  const proposedValue = normalizeText(body.proposedValue).slice(0, 1000);
  const currentValue = normalizeText(body.currentValue).slice(0, 1000) || undefined;
  const sourceUrl = normalizeText(body.sourceUrl).slice(0, 240) || undefined;
  const sourceInfo = normalizeText(body.sourceInfo).slice(0, 1200) || undefined;
  if (!collegeId || !fieldName || !proposedValue) throw new ApiError(400, 'Add a college, factual field, and proposed correction.', 'invalid_correction_request');
  if (!(factualCorrectionFields as readonly string[]).includes(fieldName)) throw new ApiError(400, 'Choose a factual college metadata field.', 'unsupported_correction_field');
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) throw new ApiError(400, 'Use a valid source URL.', 'invalid_source_url');
  const quality = validateContent(`${proposedValue} ${sourceInfo ?? ''}`, { label: 'Correction request', minLength: 4, maxLength: 1800, allowLinks: 3 });
  if (quality.errors.length) throw new ApiError(400, quality.errors[0], 'invalid_correction_text');
  return { collegeId, fieldName, proposedValue, currentValue, sourceUrl, sourceInfo };
}
