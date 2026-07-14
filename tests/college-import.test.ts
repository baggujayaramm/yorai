import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canTransitionCollegeStatus,
  importColleges,
  normalizeCollegeImportRows,
  normalizeCollegeName,
  normalizeUrl,
  parseCollegeCsv,
  parseCoordinate,
  parseEstablishedYear,
  slugify,
} from '../src/lib/college-import';
import { searchColleges } from '../src/lib/college-search';
import { canAdminCollegeData } from '../src/lib/permissions';
import { isValidProfileCollegeId } from '../src/lib/profile';
import { prisma } from '../src/lib/prisma';

test('slugify normalizes college names deterministically', () => {
  assert.equal(slugify(' Aster & Valley Institute!! '), 'aster-and-valley-institute');
});

test('college import validates required fields and normalizes lists', async () => {
  const rows = parseCollegeCsv([
    'name,city,state,officialWebsite,affiliation,courses,aliases,sourceName,sourceUrl',
    '"Example College","Example City","Example State","https://example.edu","Example University","CSE|ECE","EC|Example","Official website","https://example.edu/about"',
  ].join('\n'));
  const result = await normalizeCollegeImportRows(rows);

  assert.equal(result.invalid.length, 0);
  assert.equal(result.valid.length, 1);
  assert.deepEqual(result.valid[0].data.courses, ['CSE', 'ECE']);
  assert.deepEqual(result.valid[0].data.aliases, ['EC', 'Example']);
  assert.equal(result.valid[0].data.officialWebsite, 'https://example.edu/');
  assert.equal(result.valid[0].data.recordStatus, 'PENDING_REVIEW');
});

test('college import reports invalid row-level errors', async () => {
  const rows = parseCollegeCsv([
    'name,city,state,officialWebsite,affiliation,courses,sourceName,sourceUrl',
    '"Broken College","","Example State","not-a-url","Example University","CSE","Official","https://example.edu/source"',
  ].join('\n'));
  const result = await normalizeCollegeImportRows(rows);

  assert.equal(result.valid.length, 0);
  assert.equal(result.invalid.length, 1);
  assert.equal(result.invalid[0].rowNumber, 2);
  assert.match(result.invalid[0].errors.join(' '), /city is required/);
  assert.match(result.invalid[0].errors.join(' '), /officialWebsite/);
});

test('college import validates URL, coordinates, years, and duplicate rows', async () => {
  assert.equal(normalizeUrl('https://example.edu/path#private'), 'https://example.edu/path');
  assert.equal(normalizeUrl('ftp://example.edu'), undefined);
  assert.equal(parseCoordinate('12.5', -90, 90), 12.5);
  assert.equal(parseCoordinate('100', -90, 90), undefined);
  assert.equal(parseEstablishedYear('1999', new Date('2026-07-01T00:00:00.000Z')), 1999);
  assert.equal(parseEstablishedYear('3026', new Date('2026-07-01T00:00:00.000Z')), undefined);
  assert.equal(normalizeCollegeName('  Example <Institute>  '), 'example institute');

  const rows = parseCollegeCsv([
    'name,slug,city,state,officialWebsite,affiliation,courses,sourceName,sourceUrl,latitude,longitude,establishedYear',
    '"Example College","same-slug","Example City","Example State","https://one.example.edu","Example University","CSE","Official","https://one.example.edu/source","91","77","1499"',
    '"Example College Two","same-slug","Example City","Example State","https://two.example.edu","Example University","CSE","Official","https://two.example.edu/source","12","181","2025"',
  ].join('\n'));
  const result = await normalizeCollegeImportRows(rows);
  assert.equal(result.invalid.length, 2);
  assert.match(result.invalid.flatMap((item) => item.errors).join(' '), /duplicate slug/);
  assert.match(result.invalid.flatMap((item) => item.errors).join(' '), /latitude/);
  assert.match(result.invalid.flatMap((item) => item.errors).join(' '), /longitude/);
  assert.match(result.invalid.flatMap((item) => item.errors).join(' '), /establishedYear/);
});

test('dry-run import summarizes without writing records', async () => {
  const slug = `dry-run-college-${Date.now()}`;
  const rows = parseCollegeCsv([
    'name,slug,city,state,officialWebsite,affiliation,courses,sourceName,sourceUrl,sourceRecordId',
    `"Dry Run College","${slug}","Preview City","Preview State","https://${slug}.example.edu","Preview University","CSE","Official","https://${slug}.example.edu/source","${slug}"`,
  ].join('\n'));
  const result = await importColleges(prisma, rows, { dryRun: true, fileName: 'dry.csv' });
  assert.equal(result.dryRun, true);
  assert.equal(result.inserted, 0);
  assert.equal(await prisma.college.findUnique({ where: { slug } }), null);
});

test('import creates pending records and exact matches are safely skipped when reviewed', async () => {
  const slug = `import-college-${Date.now()}`;
  const csv = [
    'name,slug,city,state,officialWebsite,affiliation,courses,sourceName,sourceUrl,sourceRecordId',
    `"Import College","${slug}","Import City","Import State","https://${slug}.example.edu","Import University","CSE","Official","https://${slug}.example.edu/source","${slug}"`,
  ].join('\n');
  const rows = parseCollegeCsv(csv);

  try {
    const created = await importColleges(prisma, rows, { dryRun: false, fileName: 'import.csv' });
    assert.equal(created.inserted, 1);
    const college = await prisma.college.findUniqueOrThrow({ where: { slug } });
    assert.equal(college.recordStatus, 'PENDING_REVIEW');
    assert.equal(college.dataOrigin, 'IMPORTED');

    await prisma.college.update({ where: { id: college.id }, data: { recordStatus: 'PUBLISHED', lastReviewedAt: new Date() } });
    const skipped = await importColleges(prisma, rows, { dryRun: false, fileName: 'import.csv' });
    assert.equal(skipped.skipped, 1);
  } finally {
    const college = await prisma.college.findUnique({ where: { slug } });
    if (college) {
      await prisma.collegeChangeRecord.deleteMany({ where: { collegeId: college.id } });
      await prisma.college.delete({ where: { id: college.id } });
    }
  }
});

test('admin permissions and college status transitions are explicit', () => {
  assert.equal(canAdminCollegeData('ADMIN'), true);
  assert.equal(canAdminCollegeData('MODERATOR'), false);
  assert.equal(canTransitionCollegeStatus('PENDING_REVIEW', 'PUBLISHED'), true);
  assert.equal(canTransitionCollegeStatus('PUBLISHED', 'DRAFT'), false);
});

test('public search and profile selection require published colleges', async () => {
  const pendingSlug = `pending-college-${Date.now()}`;
  const publishedSlug = `published-college-${Date.now()}`;
  const pending = await prisma.college.create({
    data: {
      name: 'Pending Search College',
      normalizedName: 'pending search college',
      slug: pendingSlug,
      city: 'Hidden City',
      state: 'Hidden State',
      officialWebsite: `https://${pendingSlug}.example.edu`,
      affiliation: 'Hidden University',
      courses: ['CSE'],
      admissionModes: [],
      recordStatus: 'PENDING_REVIEW',
      dataOrigin: 'IMPORTED',
    },
  });
  const published = await prisma.college.create({
    data: {
      name: 'Published Search College',
      normalizedName: 'published search college',
      slug: publishedSlug,
      city: 'Visible City',
      state: 'Visible State',
      officialWebsite: `https://${publishedSlug}.example.edu`,
      affiliation: 'Visible University',
      courses: ['CSE'],
      admissionModes: [],
      recordStatus: 'PUBLISHED',
      dataOrigin: 'IMPORTED',
    },
  });

  try {
    const results = await searchColleges('Search College');
    assert.equal(results.some((college) => college.id === pending.id), false);
    assert.equal(results.some((college) => college.id === published.id), true);
    assert.equal(await isValidProfileCollegeId(prisma, pending.id), false);
    assert.equal(await isValidProfileCollegeId(prisma, published.id), true);
  } finally {
    await prisma.college.deleteMany({ where: { id: { in: [pending.id, published.id] } } });
  }
});
