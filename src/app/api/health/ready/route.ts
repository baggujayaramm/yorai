import { NextResponse } from 'next/server';
import { validateEnvironment } from '@/lib/environment';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const config = validateEnvironment();
  let database = false;
  try { await prisma.$queryRaw`SELECT 1`; database = true; } catch { database = false; }
  const ready = config.ok && database;
  return NextResponse.json({ status: ready ? 'ready' : 'not_ready', checks: { configuration: config.ok, database }, environment: config.environment }, { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
