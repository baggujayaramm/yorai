import type { ContentRiskLevel, ContentVisibility, Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export type ModerationTarget = { type: 'THREAD' | 'REPLY' | 'EXPERIENCE' | 'INSIGHT'; id: string; userId: string; collegeId: string; preview: string; riskLevel: ContentRiskLevel; visibility: ContentVisibility };

export function normalizeTargetType(value: string): ModerationTarget['type'] | null {
  const type = value.trim().toUpperCase();
  if (type.includes('THREAD') || type === 'QUESTION') return 'THREAD';
  if (type.includes('REPLY') || type === 'ANSWER') return 'REPLY';
  if (type.includes('EXPERIENCE')) return 'EXPERIENCE';
  if (type.includes('INSIGHT') || type.includes('WHAT')) return 'INSIGHT';
  return null;
}

export async function getModerationTarget(db: Db, targetType: string, targetId: string): Promise<ModerationTarget | null> {
  const type = normalizeTargetType(targetType);
  if (type === 'THREAD') {
    const item = await db.question.findUnique({ where: { id: targetId }, select: { id: true, userId: true, collegeId: true, title: true, body: true, riskLevel: true, visibility: true } });
    return item ? { type, id: item.id, userId: item.userId, collegeId: item.collegeId, preview: `${item.title}: ${item.body}`.slice(0, 320), riskLevel: item.riskLevel, visibility: item.visibility } : null;
  }
  if (type === 'REPLY') {
    const item = await db.answer.findUnique({ where: { id: targetId }, select: { id: true, userId: true, collegeId: true, body: true, riskLevel: true, visibility: true } });
    return item ? { type, id: item.id, userId: item.userId, collegeId: item.collegeId, preview: item.body.slice(0, 320), riskLevel: item.riskLevel, visibility: item.visibility } : null;
  }
  if (type === 'EXPERIENCE') {
    const item = await db.experiencePost.findUnique({ where: { id: targetId }, select: { id: true, userId: true, collegeId: true, title: true, body: true, riskLevel: true, visibility: true } });
    return item ? { type, id: item.id, userId: item.userId, collegeId: item.collegeId, preview: `${item.title}: ${item.body}`.slice(0, 320), riskLevel: item.riskLevel, visibility: item.visibility } : null;
  }
  if (type === 'INSIGHT') {
    const item = await db.whatWorksPost.findUnique({ where: { id: targetId }, select: { id: true, userId: true, collegeId: true, title: true, body: true, riskLevel: true, visibility: true } });
    return item ? { type, id: item.id, userId: item.userId, collegeId: item.collegeId, preview: `${item.title}: ${item.body}`.slice(0, 320), riskLevel: item.riskLevel, visibility: item.visibility } : null;
  }
  return null;
}

export async function updateTargetVisibility(db: Db, targetType: string, targetId: string, visibility: ContentVisibility) {
  const type = normalizeTargetType(targetType);
  if (type === 'THREAD') return db.question.update({ where: { id: targetId }, data: { visibility } });
  if (type === 'REPLY') return db.answer.update({ where: { id: targetId }, data: { visibility } });
  if (type === 'EXPERIENCE') return db.experiencePost.update({ where: { id: targetId }, data: { visibility } });
  if (type === 'INSIGHT') return db.whatWorksPost.update({ where: { id: targetId }, data: { visibility } });
  throw new Error('Unsupported moderation target.');
}
