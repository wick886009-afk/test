import { NextRequest, NextResponse } from 'next/server';
import { GLEVA_SESSION_COOKIE, verifySessionToken } from '@/lib/auth/edge-token';

/**
 * ============================================================================
 * NEXT.JS 14 EDGE AUTHENTICATION & AUTHORIZATION MIDDLEWARE
 * - Protects the entire dashboard (`/`) and all sensitive API routes
 *   (`/api/refunds`, `/api/screenshots`, `/api/auth/change-password`).
 * - Redirects unauthenticated visitors to `/login`.
 * - Adds security headers (CSP frame-ancestors, X-Content-Type-Options, Referrer-Policy).
 * ============================================================================
 */

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public auth endpoints & static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/logout'
  ) {
    return NextResponse.next();
  }

  const sessionToken = req.cookies.get(GLEVA_SESSION_COOKIE)?.value;
  const session = await verifySessionToken(sessionToken);

  // Protect API endpoints with 401 JSON response
  if (pathname.startsWith('/api/')) {
    if (!session) {
      return NextResponse.json(
        {
          error: 'Unauthorized: Valid Super Administrator session required.',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }
    // Block data APIs if temporary password has not been changed yet
    if (
      session.mustChangePassword &&
      pathname !== '/api/auth/change-password' &&
      pathname !== '/api/auth/me' &&
      pathname !== '/api/auth/logout'
    ) {
      return NextResponse.json(
        {
          error: 'Password Change Required: Please update your temporary password before accessing confidential refund data.',
          code: 'PASSWORD_CHANGE_REQUIRED'
        },
        { status: 403 }
      );
    }

    const res = NextResponse.next();
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('Cache-Control', 'no-store, max-age=0');
    return res;
  }

  // Handle /login route
  if (pathname === '/login') {
    if (session && !session.mustChangePassword) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    const res = NextResponse.next();
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('X-Frame-Options', 'DENY');
    return res;
  }

  // Protect all dashboard pages (including /)
  if (!session) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated with temporary password, force /login?step=change-password
  if (session.mustChangePassword) {
    const changeUrl = new URL('/login?step=change-password', req.url);
    return NextResponse.redirect(changeUrl);
  }

  const res = NextResponse.next();
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
