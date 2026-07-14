import type { ContentRiskLevel, ContentVisibility } from '@prisma/client';
import { normalizeText } from './content-quality';

export type RiskFinding = {
  code: string;
  level: ContentRiskLevel;
  message: string;
};

export type ContentRiskResult = {
  level: ContentRiskLevel;
  findings: RiskFinding[];
  visibility: ContentVisibility;
  userMessage?: string;
};

const rules: Array<{ code: string; level: ContentRiskLevel; pattern: RegExp; message: string }> = [
  { code: 'phone', level: 'HIGH', pattern: /(?:\+?91[\s-]?)?\b[6-9]\d{9}\b/, message: 'Private contact information may be present.' },
  { code: 'email', level: 'HIGH', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, message: 'An email address may be present.' },
  { code: 'student-id', level: 'HIGH', pattern: /\b(?:roll|registration|reg\.?|hall ticket|student id)\s*(?:number|no\.?|id)?\s*[:#-]?\s*[A-Z0-9-]{4,}\b/i, message: 'A student identifier may be present.' },
  { code: 'identity-document', level: 'HIGH', pattern: /\b(?:aadhaar|aadhar|passport|pan card|id card|marksheet|hall ticket)\b/i, message: 'An identity-document reference may need privacy review.' },
  { code: 'threat', level: 'HIGH', pattern: /\b(?:i will|we will|going to)\s+(?:hurt|attack|kill|beat|find)\b/i, message: 'Threatening language requires review.' },
  { code: 'named-accusation', level: 'HIGH', pattern: /\b(?:professor|teacher|faculty|student|dean|warden|principal)\s+[A-Z][a-z]+\s+(?:is|was)\s+(?:a\s+)?(?:fraud|criminal|thief|corrupt|harasser)\b/, message: 'A serious allegation about a named person requires review.' },
  { code: 'address', level: 'MEDIUM', pattern: /\b\d{1,4}\s+[A-Za-z][A-Za-z\s]{3,}\s+(?:road|street|nagar|colony|layout|lane|avenue)\b/i, message: 'A private address may be present.' },
  { code: 'personal-attack', level: 'MEDIUM', pattern: /\b(?:idiot|stupid|useless|liar|moron|scammer)\b/i, message: 'Personal or attacking language may be present.' },
  { code: 'accusation', level: 'MEDIUM', pattern: /\b(?:fraud|scam|bribe|corrupt|harassment|assault)\b/i, message: 'A serious claim may need more context.' },
  { code: 'spam', level: 'MEDIUM', pattern: /\b(?:guaranteed admission|earn money fast|limited offer|contact me now|dm me)\b/i, message: 'This may be promotional or spam-like.' },
];

export function classifyContentRisk(value: string): ContentRiskResult {
  const text = normalizeText(value);
  const findings = rules.filter((rule) => rule.pattern.test(text)).map(({ code, level, message }) => ({ code, level, message }));
  const linkCount = text.match(/https?:\/\//gi)?.length ?? 0;
  if (linkCount > 3) findings.push({ code: 'excessive-links', level: 'MEDIUM', message: 'Several links may need review.' });
  if (/(.)\1{8,}/i.test(text)) findings.push({ code: 'repeated-characters', level: 'MEDIUM', message: 'Repeated characters may indicate spam.' });

  const level: ContentRiskLevel = findings.some((item) => item.level === 'HIGH')
    ? 'HIGH'
    : findings.some((item) => item.level === 'MEDIUM') ? 'MEDIUM' : 'LOW';

  return {
    level,
    findings,
    visibility: level === 'HIGH' ? 'UNDER_REVIEW' : 'VISIBLE',
    userMessage: level === 'HIGH'
      ? 'This needs a privacy or safety review before it can be shown publicly.'
      : level === 'MEDIUM' ? 'This was shared, with a note for moderators to check the context.' : undefined,
  };
}

export function combineContentRisk(...values: Array<string | undefined | null>) {
  return classifyContentRisk(values.filter(Boolean).join(' '));
}
