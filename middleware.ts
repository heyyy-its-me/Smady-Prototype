import { NextRequest, NextResponse } from 'next/server';

// Keep the public API stable while routing persistence-sensitive workflows to
// PostgreSQL-backed handlers. This also prevents a stale serverless instance
// from ever using the legacy process-local stores.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const url = request.nextUrl.clone();
  url.pathname = `/api/_persistent${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    '/api/leads/:path*',
    '/api/outreach/:path*',
    '/api/agents/:path*/trigger',
  ],
};
