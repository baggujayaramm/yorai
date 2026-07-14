import type { CollegeDataOrigin, CollegeRecordStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type { College } from './types';
import { boundedInteger, boundedSearchTerm } from './query-limits';

type CollegeRecord = {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  city: string;
  state: string;
  country: string;
  officialWebsite: string;
  affiliation: string;
  courses: string[];
  feeRange: string | null;
  admissionModes: string[];
  district?: string | null;
  collegeType?: string | null;
  institutionType?: string | null;
  ownershipType?: string | null;
  establishedYear?: number | null;
  accreditation?: string | null;
  sourceName?: string | null;
  dataOrigin?: string | null;
  recordStatus?: string | null;
};

export function toPublicCollege(college: CollegeRecord): College {
  return {
    id: college.id,
    name: college.name,
    shortName: college.shortName ?? undefined,
    slug: college.slug,
    city: college.city,
    state: college.state,
    country: college.country,
    officialWebsite: college.officialWebsite,
    affiliation: college.affiliation,
    courses: college.courses,
    feeRange: college.feeRange ?? 'Context varies by program',
    admissionModes: college.admissionModes,
    district: college.district ?? undefined,
    collegeType: college.collegeType ?? undefined,
    institutionType: college.institutionType ?? college.collegeType ?? undefined,
    ownershipType: college.ownershipType ?? undefined,
    establishedYear: college.establishedYear ?? undefined,
    accreditation: college.accreditation ?? undefined,
    sourceName: college.sourceName ?? undefined,
    dataOrigin: college.dataOrigin as CollegeDataOrigin | undefined,
    recordStatus: college.recordStatus as CollegeRecordStatus | undefined,
  };
}

export async function searchColleges(query = '', limit = 50): Promise<College[]> {
  const term = boundedSearchTerm(query);
  const arrayTerms = collegeSearchTerms(term);
  const where: Prisma.CollegeWhereInput = term
    ? {
        recordStatus: 'PUBLISHED',
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { normalizedName: { contains: normalizeCollegeSearchName(term), mode: 'insensitive' } },
          { shortName: { contains: term, mode: 'insensitive' } },
          { slug: { contains: term.toLowerCase(), mode: 'insensitive' } },
          { city: { contains: term, mode: 'insensitive' } },
          { district: { contains: term, mode: 'insensitive' } },
          { state: { contains: term, mode: 'insensitive' } },
          { affiliation: { contains: term, mode: 'insensitive' } },
          { collegeType: { contains: term, mode: 'insensitive' } },
          { institutionType: { contains: term, mode: 'insensitive' } },
          { courses: { hasSome: arrayTerms } },
          { aliases: { hasSome: arrayTerms } },
          { searchKeywords: { hasSome: arrayTerms } },
        ],
      }
    : { recordStatus: 'PUBLISHED' };

  const colleges = await prisma.college.findMany({
    where,
    orderBy: [{ name: 'asc' }, { city: 'asc' }],
    take: boundedInteger(limit, 50, 1, 80),
  });

  return colleges
    .map(toPublicCollege)
    .sort((a, b) => searchRank(a, term) - searchRank(b, term) || a.name.localeCompare(b.name));
}

export async function searchContributionSnippets(query = '', limit = 12) {
  const term = boundedSearchTerm(query);
  if (term.length < 2) return [];
  const take = boundedInteger(limit, 12, 1, 20);
  const [threads, experiences, insights] = await Promise.all([
    prisma.question.findMany({
      where: { OR: [{ title: { contains: term, mode: 'insensitive' } }, { branch: { contains: term, mode: 'insensitive' } }, { topicTags: { has: term.toLowerCase() } }], college: { recordStatus: 'PUBLISHED' }, status: { not: 'ARCHIVED' }, visibility: 'VISIBLE' },
      include: { college: { select: { name: true, slug: true } } },
      orderBy: { lastActiveAt: 'desc' },
      take,
    }),
    prisma.experiencePost.findMany({
      where: { OR: [{ title: { contains: term, mode: 'insensitive' } }, { branch: { contains: term, mode: 'insensitive' } }, { tags: { has: term.toLowerCase() } }], college: { recordStatus: 'PUBLISHED' }, moderationStatus: { not: 'HIDDEN' }, visibility: 'VISIBLE' },
      include: { college: { select: { name: true, slug: true } } },
      orderBy: { updatedAt: 'desc' },
      take,
    }),
    prisma.whatWorksPost.findMany({
      where: { OR: [{ title: { contains: term, mode: 'insensitive' } }, { branch: { contains: term, mode: 'insensitive' } }, { tags: { has: term.toLowerCase() } }], college: { recordStatus: 'PUBLISHED' }, moderationStatus: { not: 'HIDDEN' }, visibility: 'VISIBLE' },
      include: { college: { select: { name: true, slug: true } } },
      orderBy: { updatedAt: 'desc' },
      take,
    }),
  ]);

  return [
    ...threads.map((item) => ({ id: item.id, type: 'Live thread', title: item.title, href: `/colleges/${item.college.slug}/threads/${item.id}`, college: item.college.name })),
    ...experiences.map((item) => ({ id: item.id, type: 'Student experience', title: item.title, href: `/experiences/${item.id}`, college: item.college.name })),
    ...insights.map((item) => ({ id: item.id, type: 'What works', title: item.title, href: `/what-works/${item.id}`, college: item.college.name })),
  ].slice(0, take);
}

export function normalizeCollegeSearchName(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ');
}

const acronymExpansions: Record<string, string[]> = {
  cse: ['Computer Science', 'Computer Science and Engineering', 'CSE'],
  ece: ['Electronics and Communication Engineering', 'ECE'],
  eee: ['Electrical and Electronics Engineering', 'EEE'],
  it: ['Information Technology', 'IT'],
  mech: ['Mechanical Engineering', 'Mechanical'],
  civil: ['Civil Engineering', 'Civil'],
};

export function collegeSearchTerms(value: string) {
  const term = boundedSearchTerm(value);
  const normalized = normalizeCollegeSearchName(term);
  return Array.from(new Set([term, term.toLowerCase(), term.toUpperCase(), ...(acronymExpansions[normalized] ?? [])].filter(Boolean)));
}

function searchRank(college: College, term: string) {
  if (!term) return 10;
  const normalized = normalizeCollegeSearchName(term);
  const name = normalizeCollegeSearchName(college.name);
  const shortName = normalizeCollegeSearchName(college.shortName ?? '');
  const city = normalizeCollegeSearchName(college.city);
  const state = normalizeCollegeSearchName(college.state);
  if (name === normalized || shortName === normalized) return 0;
  if (name.startsWith(normalized) || shortName.startsWith(normalized)) return 1;
  if (city === normalized || state === normalized) return 2;
  if (name.includes(normalized)) return 3;
  return 5;
}
