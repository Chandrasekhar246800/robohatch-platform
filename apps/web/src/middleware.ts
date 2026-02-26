import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if user is authenticated via cookie flag
  const isLoggedIn = request.cookies.get('isLoggedIn')?.value === 'true';
  const authToken = request.cookies.get('auth_token'); // Check actual auth cookie

  // Consider user authenticated if either cookie exists
  const isAuthenticated = isLoggedIn || !!authToken;

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
    '/account/:path*',
    '/checkout/:path*',
    '/admin/:path*',
    '/orders/:path*',
    '/wishlist',
  ],
};
