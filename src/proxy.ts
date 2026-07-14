import { NextRequest, NextResponse } from 'next/server';

const maintenanceAllowedPrefixes = [
  '/maintenance',
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/demo-user',
  '/api/health',
  '/admin',
  '/api/admin',
  '/_next',
];

export function proxy(request: NextRequest) {
  if (process.env.YORAI_MAINTENANCE_MODE?.toLowerCase() !== 'full') return NextResponse.next();
  if (maintenanceAllowedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) return NextResponse.next();

  const destination = request.nextUrl.clone();
  destination.pathname = '/maintenance';
  destination.search = '';
  return NextResponse.redirect(destination);
}

export const config = {
  matcher: ['/((?!favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)'],
};
