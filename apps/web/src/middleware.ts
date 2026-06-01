import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getJwtRole(token: string): string | null {
  const parts = token.split('.');

  if (parts.length < 2) {
    return null;
  }

  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(paddedBase64));

    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  // Auth is determined by the secure HttpOnly session cookies set by the backend.
  const isAuthenticated = !!request.cookies.get('auth_token') || !!request.cookies.get('refresh_token');
  const isHomeRoute = request.nextUrl.pathname === '/';
  const authToken = request.cookies.get('auth_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const role = authToken ? getJwtRole(authToken) : refreshToken ? getJwtRole(refreshToken) : null;

  if (isHomeRoute && role === 'ADMIN') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Check if the route is protected
  const isAccountRoute = request.nextUrl.pathname.startsWith('/account');
  const isCheckoutRoute = request.nextUrl.pathname.startsWith('/checkout');
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isOrdersRoute = request.nextUrl.pathname.startsWith('/orders');
  const isWishlistRoute = request.nextUrl.pathname === '/wishlist';
  
  // If accessing protected route without being logged in, redirect to login
  // ✅ Cart is NOT protected - accessible to both guests and authenticated users
  if (!isAuthenticated && (isAccountRoute || isCheckoutRoute || isAdminRoute || isOrdersRoute || isWishlistRoute)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// 🔒 SECURITY: Protect all sensitive routes
// ✅ Cart is NOT in matcher - accessible to everyone (guests can view cart)
export const config = {
  matcher: [
    '/',
    '/account/:path*',
    '/checkout/:path*',
    '/admin/:path*',
    '/orders/:path*',
    '/wishlist',
  ],
};
