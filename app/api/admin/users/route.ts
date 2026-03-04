import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as jose from 'jose';
import { cookies } from 'next/headers';
import { signPayToken } from '@/lib/payToken';

const APP_BASE_URL =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

function buildPayUrl(mode: 'gpay' | 'upi', params: Record<string, string>) {
    if (!APP_BASE_URL) return '';
    const url = new URL('/api/pay/upi', APP_BASE_URL);
    url.searchParams.set('mode', mode);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
}

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
            .select('subject_type, subject_key, subject_email, app_user_id, l3_hit_count, billed_hit_count, updated_at');

        // If analytics table is not created yet, keep dashboard functional with zero values.
        const safeL3Rows = l3Error ? [] : (l3Rows || []);

        const userHitsById = new Map<string, number>();
        const userBilledById = new Map<string, number>();
        const upiId = process.env.BILLING_UPI_ID || 'localshopfinder@oksbi';
        const upiName = process.env.BILLING_UPI_NAME || 'Local Shop Finder';
        const chargePerHitRs = Number(process.env.BILLED_HIT_CHARGE_RS || 2);
        const usageRows: Array<{
            id: string;
            subject_type: string;
            email: string;
            l3_hits: number;
            billed_hits: number;
            total_due_rs: number;
            gpay_link: string;
            upi_link: string;
            pay_url: string;
            updated_at: string | null;
        }> = [];

        for (const row of safeL3Rows) {
            const hits = Number(row.l3_hit_count || 0);
            const billedHits = Number(row.billed_hit_count || 0);
            const due = Number((billedHits * chargePerHitRs).toFixed(2));
            const note = `${row.subject_type || 'user'} usage ${row.subject_key || ''}`.trim();
            const payParams = {
                pa: upiId,
                pn: upiName,
                am: due.toFixed(2),
                cu: 'INR',
                tn: note,
            };
            const upiQuery = new URLSearchParams(payParams).toString();
            const actorEmail = String(row.subject_email || '');
            const payToken = await signPayToken({
                pa: payParams.pa,
                pn: payParams.pn,
                am: payParams.am,
                cu: payParams.cu,
                tn: payParams.tn,
                mode: 'upi',
                email: actorEmail || undefined,
            });
            const payPage = buildPayUrl('gpay', { token: payToken });

            usageRows.push({
                id: String(row.subject_key || row.app_user_id || actorEmail || Math.random().toString()),
                subject_type: String(row.subject_type || 'user'),
                email: actorEmail || 'unknown',
                l3_hits: hits,
                billed_hits: billedHits,
                total_due_rs: due,
                gpay_link: `intent://upi/pay?${upiQuery}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`,
                upi_link: `upi://pay?${upiQuery}`,
                pay_url: payPage || `upi://pay?${upiQuery}`,
                updated_at: row.updated_at ? String(row.updated_at) : null,
            });

            if (row.subject_type === 'user' && row.app_user_id) {
                userHitsById.set(String(row.app_user_id), hits);
                userBilledById.set(String(row.app_user_id), billedHits);
            }
        }

        const usersWithHits = (users || []).map((user) => ({
            ...user,
            l3_hits: userHitsById.get(user.id) || 0,
            billed_hits: userBilledById.get(user.id) || 0,
        }));

        const totalL3Hits = safeL3Rows.reduce((sum, row) => sum + Number(row.l3_hit_count || 0), 0);
        const totalBilledHits = safeL3Rows.reduce((sum, row) => sum + Number(row.billed_hit_count || 0), 0);
        const totalDueRs = Number((totalBilledHits * chargePerHitRs).toFixed(2));

        return NextResponse.json({ success: true, users: usersWithHits, usageRows, totalL3Hits, totalBilledHits, totalDueRs, chargePerHitRs }, { status: 200 });

    } catch (error: unknown) {
        console.error('Admin users error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
