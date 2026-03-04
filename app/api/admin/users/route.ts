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
            .eq('is_admin', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const { data: l3Rows, error: l3Error } = await supabaseAdmin
            .from('cache_l3_hits')
            .select('subject_type, subject_key, subject_email, app_user_id, l3_hit_count, billed_hit_count');

        // If analytics table is not created yet, keep dashboard functional with zero values.
        const safeL3Rows = l3Error ? [] : (l3Rows || []);

        const userHitsById = new Map<string, number>();
        const userBilledById = new Map<string, number>();
        const adminUsers: Array<{ id: string; username: string; email: string; l3_hits: number; billed_hits: number }> = [];

        for (const row of safeL3Rows) {
            const hits = Number(row.l3_hit_count || 0);
            const billedHits = Number(row.billed_hit_count || 0);
            if (row.subject_type === 'user' && row.app_user_id) {
                userHitsById.set(String(row.app_user_id), hits);
                userBilledById.set(String(row.app_user_id), billedHits);
            } else if (row.subject_type === 'admin') {
                adminUsers.push({
                    id: String(row.subject_key),
                    username: 'Admin User',
                    email: String(row.subject_email || 'admin@localshopfinder.vercel.app'),
                    l3_hits: hits,
                    billed_hits: billedHits,
                });
            }
        }

        const usersWithHits = (users || []).map((user) => ({
            ...user,
            l3_hits: userHitsById.get(user.id) || 0,
            billed_hits: userBilledById.get(user.id) || 0,
        }));

        const totalL3Hits = safeL3Rows.reduce((sum, row) => sum + Number(row.l3_hit_count || 0), 0);
        const totalBilledHits = safeL3Rows.reduce((sum, row) => sum + Number(row.billed_hit_count || 0), 0);

        return NextResponse.json({ success: true, users: usersWithHits, adminUsers, totalL3Hits, totalBilledHits }, { status: 200 });

    } catch (error: any) {
        console.error('Admin users error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
