export type RuntimeEnvironment = 'development' | 'test' | 'preview' | 'production';

export type EnvironmentValidation = {
  ok: boolean;
  environment: RuntimeEnvironment;
  errors: string[];
  warnings: string[];
};

type EnvironmentInput = Record<string, string | undefined>;

export function runtimeEnvironment(env: EnvironmentInput = process.env): RuntimeEnvironment {
  if (env.NODE_ENV === 'test') return 'test';
  if (env.VERCEL_ENV === 'preview') return 'preview';
  if (env.NODE_ENV === 'production') return 'production';
  return 'development';
}

export function validateEnvironment(env: EnvironmentInput = process.env): EnvironmentValidation {
  const environment = runtimeEnvironment(env);
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!env.DATABASE_URL?.trim()) errors.push('DATABASE_URL is required.');

  const sessionDays = Number(env.YORAI_SESSION_DAYS ?? '30');
  if (!Number.isInteger(sessionDays) || sessionDays < 1 || sessionDays > 365) errors.push('YORAI_SESSION_DAYS must be an integer between 1 and 365.');
  if (env.YORAI_DEMO_AUTH_ENABLED && !['true', 'false'].includes(env.YORAI_DEMO_AUTH_ENABLED)) errors.push('YORAI_DEMO_AUTH_ENABLED must be true or false.');
  if (env.YORAI_MAINTENANCE_MODE && !['off', 'write', 'full'].includes(env.YORAI_MAINTENANCE_MODE.toLowerCase())) errors.push('YORAI_MAINTENANCE_MODE must be off, write, or full.');
  if (env.YORAI_LAUNCH_MODE && !['CLOSED_BETA', 'INVITE_ONLY', 'LIMITED_PUBLIC', 'PUBLIC'].includes(env.YORAI_LAUNCH_MODE.toUpperCase())) errors.push('YORAI_LAUNCH_MODE must be CLOSED_BETA, INVITE_ONLY, LIMITED_PUBLIC, or PUBLIC.');

  if (environment === 'production') {
    if (!env.NEXT_PUBLIC_APP_URL?.startsWith('https://')) errors.push('NEXT_PUBLIC_APP_URL must use HTTPS in production.');
    if (env.YORAI_DEMO_AUTH_ENABLED !== 'false') errors.push('YORAI_DEMO_AUTH_ENABLED must be explicitly false in production.');
    warnings.push('Context attachment upload remains disabled until durable private object storage is implemented.');
  } else if (!env.NEXT_PUBLIC_APP_URL) {
    warnings.push('NEXT_PUBLIC_APP_URL is optional outside production and defaults to localhost.');
  }

  return { ok: errors.length === 0, environment, errors, warnings };
}

export function assertEnvironmentReady(env: EnvironmentInput = process.env) {
  const result = validateEnvironment(env);
  if (!result.ok) throw new Error(`Runtime configuration is incomplete (${result.errors.length} issue${result.errors.length === 1 ? '' : 's'}).`);
  return result;
}

export function appBaseUrl(env: EnvironmentInput = process.env) {
  return env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
}
