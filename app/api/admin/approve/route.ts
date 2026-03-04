import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as jose from 'jose';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_change_me');
        const { payload } = await jose.jwtVerify(token, secret);

        if (payload.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { userId, approve } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        const { error: updateError } = await supabaseAdmin
            .from('app_users')
            .update({ is_approved: approve === true })
            .eq('id', userId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, message: `User ${approve ? 'approved' : 'unapproved'}` }, { status: 200 });

    } catch (error: any) {
        console.error('Admin approval error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
