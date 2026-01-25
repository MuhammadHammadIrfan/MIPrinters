import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/', '/about', '/contact', '/login'];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login'];

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Get auth token from cookie
    const authToken = request.cookies.get('auth-token')?.value;
    const isAuthenticated = !!authToken;

    // Check if current path is public
    const isPublicRoute = publicRoutes.some(
        route => pathname === route || pathname.startsWith(route + '/')
    );

    // Check if current path is an auth route (login)
    const isAuthRoute = authRoutes.includes(pathname);

    // If not authenticated and trying to access protected route
    if (!isAuthenticated && !isPublicRoute) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // If authenticated and trying to access login page, redirect to dashboard
    if (isAuthenticated && isAuthRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api routes
         * - _next (Next.js internals)
         * - static files (icons, images, etc.)
         */
        '/((?!api|_next|icons|images|favicon.ico|manifest.json|sw.js|workbox-*).*)',
    ],
};
