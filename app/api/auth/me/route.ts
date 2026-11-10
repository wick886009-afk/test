import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getAuthenticatedSession(req);
  if (!session) {
    return NextResponse.json(
      { authenticated: false, error: 'No active administrator session.' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      username: session.username,
      role: session.role,
      email: session.email,
      displayName: session.displayName,
      mustChangePassword: session.mustChangePassword,
      rememberMe: session.rememberMe,
      expiresAt: session.exp * 1000
    },
    csrfToken: session.csrfToken
  });
}
