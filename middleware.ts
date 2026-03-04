import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

// Define public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/verify-otp', '/pending-approval'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Protected paths:
    // '/' is for regular users only
    // '/admin/*' is for admins only
    const isRootPath = pathname === '/';
    const isAdminPath = pathname.startsWith('/admin') && !pathname.includes('/api/');
    const isProtectedPath = isRootPath || isAdminPath;
    const isAuthRoute = publicRoutes.some(route => pathname.startsWith(route));

    // Exclude API routes and public static assets from middleware redirect logic
    if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
        return NextResponse.next();
    }

    const token = request.cookies.get('auth_token')?.value;

    try {
        if (token) {
            const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_change_me');
            const { payload } = await jose.jwtVerify(token, secret);

            // If trying to access admin route without admin role
            if (isAdminPath && payload.role !== 'admin') {
                return NextResponse.redirect(new URL('/', request.url));
            }

            // If an admin tries to access root path '/' without explicit intention (could be refined, but lets keep them separate if requested)
            // The prompt says: "when i login as admin show dashbaord there also show the main page '/' tab" -> so admins ARE allowed on '/'

            // If trying to access login/register while authenticated
            if (isAuthRoute) {
                return NextResponse.redirect(new URL(payload.role === 'admin' ? '/admin/dashboard' : '/', request.url));
            }

        } else {
            // No token scenario
            if (isProtectedPath) {
                return NextResponse.redirect(new URL('/login', request.url));
            }
        }

    } catch (error) {
        // Invalid/expired token
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('auth_token'); // Clear bad token
        if (isProtectedPath) {
            return response;
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
