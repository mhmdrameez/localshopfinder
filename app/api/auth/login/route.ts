import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

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

        if (!user.is_admin && !user.is_approved) {
            return NextResponse.json({ error: 'Account pending admin approval.', status: 'unapproved' }, { status: 403 });
        }

        const role = user.is_admin ? 'admin' : 'user';
        const expiresIn = user.is_admin ? '1d' : '7d';

        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_change_me');
        const alg = 'HS256';
        const jwt = await new jose.SignJWT({ role, id: user.id, email: user.email })
            .setProtectedHeader({ alg })
            .setIssuedAt()
            .setExpirationTime(expiresIn)
            .sign(secret);

        const cookieStore = await cookies();
        cookieStore.set('auth_token', jwt, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' });

        return NextResponse.json({ success: true, role }, { status: 200 });

    } catch (error: any) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
