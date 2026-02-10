import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // 1. Update session (refresh tokens) and get user
  // We need to destructure the return value from updateSession.
  // Note: The updateSession function I wrote earlier returns { supabase, user, response }.
  const { user, response } = await updateSession(request);

  const path = request.nextUrl.pathname;

  // 2. Define Public Routes
  // Exclude static assets is handled by config matcher, but we also exclude specific paths here
  const isPublicRoute =
    path === '/login' ||
    path === '/signup' ||
    path.startsWith('/api/auth') ||
    path.startsWith('/auth');

  // 3. Logic

  // Case A: Unauthenticated User trying to access Protected Route
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // When redirecting to login, we don't strictly need to preserve session cookies
    // because the user is presumably not logged in or session is invalid.
    return NextResponse.redirect(url);
  }

  // Case B: Authenticated User trying to access Login/Signup
  if (user && (path === '/login' || path === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    const redirectResponse = NextResponse.redirect(url);

    // Preserve any cookies set during session update (e.g. token refresh)
    // We copy cookies from the 'response' object returned by updateSession
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });

    return redirectResponse;
  }

  // Case C: Allowed access
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images with common extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
