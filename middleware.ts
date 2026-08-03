import { NextRequest, NextResponse } from 'next/server';

// Keep the public API stable while routing persistence-sensitive workflows to
// PostgreSQL-backed handlers. This also prevents a stale serverless instance
// from ever using the legacy process-local stores.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const url = request.nextUrl.clone();
  // `app/api/_persistent` is a private Next.js folder and cannot receive a
  // rewrite. Public persistence routes use this non-private path instead.
  url.pathname = `/api/persistence${pathname.slice('/api'.length)}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    '/api/leads/:path*',
    '/api/outreach/:path*',
    '/api/agents/:path*/trigger',
  ],
};
