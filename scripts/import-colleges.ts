import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { importColleges, parseCollegeCsv } from '../src/lib/college-import';
import { featureEnabled } from '../src/lib/release-controls';

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  const args = new Map<string, string | boolean>();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args.set(key, true);
    } else {
      args.set(key, next);
      index += 1;
    }
  }
  return args;
}

async function main() {
  if (!await featureEnabled('college_imports')) throw new Error('College imports are disabled by release configuration.');
  const args = parseArgs(process.argv.slice(2));
  const file = args.get('file');
  const dryRun = args.get('dry-run') === true;

  if (!file || typeof file !== 'string') {
    throw new Error('Usage: npm run import:colleges -- --file ./data/colleges.csv [--dry-run]');
  }

  const filePath = path.resolve(process.cwd(), file);
  const content = await readFile(filePath, 'utf8');
  const rows = parseCollegeCsv(content);
  const result = await importColleges(prisma, rows, {
    dryRun,
    fileName: path.basename(filePath),
    sourceName: typeof args.get('source') === 'string' ? String(args.get('source')) : undefined,
    allowReviewedOverwrite: args.get('allow-reviewed-overwrite') === true,
  });

  console.log(JSON.stringify({
    dryRun: result.dryRun,
    batchId: result.batchId,
    rowsProcessed: result.processedRows,
    valid: result.valid.length,
    invalid: result.invalid.length,
    inserted: result.inserted,
    updated: result.updated,
    skipped: result.skipped,
    duplicateCandidates: result.duplicateCandidates.length,
    warnings: result.warnings,
    errors: result.invalid.map((item) => ({
      rowNumber: item.rowNumber,
      errors: item.errors,
    })),
  }, null, 2));

  if (result.invalid.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('College import failed. Check the input file and database readiness.');
    await prisma.operationalEvent.create({ data: { level: 'error', category: 'college-import', code: 'import_failed', details: { errorType: error instanceof Error ? error.constructor.name : 'unknown' } } }).catch(() => undefined);
    await prisma.$disconnect();
    process.exit(1);
  });
