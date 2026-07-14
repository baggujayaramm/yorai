export type QualityResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  text: string;
};

export type QualityOptions = {
  label: string;
  minLength?: number;
  maxLength?: number;
  allowLinks?: number;
};

const privatePatterns = [
  { pattern: /\b\d{10}\b/, message: 'Remove phone numbers before posting.' },
  { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, message: 'Remove email addresses before posting.' },
  { pattern: /\b(roll|registration|reg\.|hall ticket)\s*(number|no\.?|id)?\s*[:#-]?\s*[A-Z0-9-]{4,}\b/i, message: 'Remove roll numbers or registration numbers before posting.' },
  { pattern: /\b\d{1,4}\s+[A-Za-z][A-Za-z\s]{3,}\s+(road|street|nagar|colony|layout|lane|avenue)\b/i, message: 'Avoid posting addresses or private locations.' },
];

export function validateContent(value: string | undefined, options: QualityOptions): QualityResult {
  const text = normalizeText(value);
  const errors: string[] = [];
  const warnings: string[] = [];
  const minLength = options.minLength ?? 20;
  const maxLength = options.maxLength ?? 4000;

  if (!text) errors.push(`${options.label} is required.`);
  else if (text.length < minLength) errors.push(`${options.label} needs a little more context.`);
  if (text.length > maxLength) errors.push(`${options.label} is too long. Keep it under ${maxLength} characters.`);
  if (/[<>]/.test(text)) errors.push('Remove HTML or markup before posting.');
  if (/(.)\1{8,}/.test(text)) errors.push('Avoid excessive repeated characters.');

  const links = text.match(/https?:\/\//gi)?.length ?? 0;
  if (links > (options.allowLinks ?? 2)) errors.push('Too many links for one contribution.');

  for (const item of privatePatterns) {
    if (item.pattern.test(text)) warnings.push(item.message);
  }

  return { ok: errors.length === 0 && warnings.length === 0, errors, warnings, text };
}

export function normalizeTags(input: unknown, maxTags = 8) {
  const raw = Array.isArray(input) ? input : typeof input === 'string' ? input.split(',') : [];
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const item of raw) {
    const tag = normalizeText(String(item)).toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 32);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= maxTags) break;
  }

  return tags;
}

export function ensureNotDuplicate(input: { userId: string; title?: string; body: string }, recent: Array<{ userId: string; title?: string | null; body: string }>) {
  const title = normalizeText(input.title).toLowerCase();
  const body = normalizeText(input.body).toLowerCase();
  return !recent.some((item) => item.userId === input.userId && normalizeText(item.title).toLowerCase() === title && normalizeText(item.body).toLowerCase() === body);
}

export function normalizeText(value?: string | null) {
  return (value ?? '').trim().replace(/\s+/g, ' ');
}
