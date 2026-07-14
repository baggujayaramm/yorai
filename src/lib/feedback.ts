import type { FeedbackStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { normalizeText } from './content-quality';

export const feedbackCategories = ['BUG', 'USABILITY', 'FEATURE_SUGGESTION', 'CONTENT_ISSUE', 'COLLEGE_DATA_ISSUE', 'MODERATION_CONCERN', 'OTHER'] as const;
export const feedbackStatuses = ['NEW', 'TRIAGED', 'PLANNED', 'IN_PROGRESS', 'RESOLVED', 'DECLINED'] as const;
const transitions: Record<FeedbackStatus, FeedbackStatus[]> = { NEW: ['TRIAGED', 'DECLINED'], TRIAGED: ['PLANNED', 'IN_PROGRESS', 'RESOLVED', 'DECLINED'], PLANNED: ['IN_PROGRESS', 'RESOLVED', 'DECLINED'], IN_PROGRESS: ['RESOLVED', 'DECLINED', 'PLANNED'], RESOLVED: ['IN_PROGRESS'], DECLINED: ['TRIAGED'] };
export function canTransitionFeedback(from: FeedbackStatus, to: FeedbackStatus) { return transitions[from].includes(to); }
export function feedbackKey(userId: string, title: string, description: string) { return createHash('sha256').update(`${userId}:${normalizeText(title).toLowerCase()}:${normalizeText(description).toLowerCase()}`).digest('hex'); }
export function safeCurrentPage(value?: string) { const page = normalizeText(value).slice(0, 180); return page.startsWith('/') && !page.includes('?') ? page : undefined; }
