import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

// Define public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/verify-otp', '/pending-approval', '/forgot-password'];

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Protected paths:
    // '/' is for regular users only
    // '/admin/*' is for admins only
    const isRootPath = pathname === '/';
    const isAdminPath = pathname.startsWith('/admin') && !pathname.includes('/api/');
    const isProtectedPath = isRootPath || isAdminPath;
    const isAuthRoute = publicRoutes.some(route => pathname.startsWith(route));

    // Exclude API routes and public static assets from redirect logic
    if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
        return NextResponse.next();
    }

    const token = request.cookies.get('auth_token')?.value;

    try {
        if (token) {
            const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_change_me');
            const { payload } = await jose.jwtVerify(token, secret);

            if (isAdminPath && payload.role !== 'admin') {
                return NextResponse.redirect(new URL('/', request.url));
            }

            if (isAuthRoute) {
                return NextResponse.redirect(new URL(payload.role === 'admin' ? '/admin/dashboard' : '/', request.url));
            }
        } else if (isProtectedPath) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    } catch {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('auth_token');
        if (isProtectedPath) {
            return response;
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

