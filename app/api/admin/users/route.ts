import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as jose from 'jose';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_change_me');
        const { payload } = await jose.jwtVerify(token, secret);

        if (payload.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch users securely
        const { data: users, error } = await supabaseAdmin
            .from('app_users')
            .select('id, username, email, is_verified, is_approved, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, users }, { status: 200 });

    } catch (error: any) {
        console.error('Admin users error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
