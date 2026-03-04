import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        // Check for hardcoded Admin Login
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'rameez@localshopfinder.com';
        const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Rameez@20';

        if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
            // Issue Admin token
            const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_change_me');
            const alg = 'HS256';
            const jwt = await new jose.SignJWT({ role: 'admin', email: ADMIN_EMAIL })
                .setProtectedHeader({ alg })
                .setIssuedAt()
                .setExpirationTime('1d')
                .sign(secret);

            const cookieStore = await cookies();
            cookieStore.set('auth_token', jwt, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' });

            return NextResponse.json({ success: true, role: 'admin' }, { status: 200 });
        }

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const { data: user, error } = await supabaseAdmin
            .from('app_users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Temporarily bypassing OTP verification
        // if (!user.is_verified) {
        //     return NextResponse.json({ error: 'Email not verified. Please verify your OTP.', status: 'unverified' }, { status: 403 });
        // }

        if (!user.is_approved) {
            return NextResponse.json({ error: 'Account pending admin approval.', status: 'unapproved' }, { status: 403 });
        }

        // Issue standard User token
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_change_me');
        const alg = 'HS256';
        const jwt = await new jose.SignJWT({ role: 'user', id: user.id, email: user.email })
            .setProtectedHeader({ alg })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(secret);

        const cookieStore = await cookies();
        cookieStore.set('auth_token', jwt, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' });

        return NextResponse.json({ success: true, role: 'user' }, { status: 200 });

    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
