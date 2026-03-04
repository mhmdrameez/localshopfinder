import { NextResponse } from 'next/server';
import { verifyPayToken } from '@/lib/payToken';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');
        if (!token) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        }

        const data = await verifyPayToken(token);
        const upiRegex = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9.-]{2,}$/;
        if (!upiRegex.test(data.pa)) {
            return NextResponse.json({ error: 'Invalid UPI ID in token' }, { status: 400 });
        }

        const query = new URLSearchParams({
            pa: data.pa,
            pn: data.pn,
            am: data.am,
            cu: data.cu,
            tn: data.tn,
        }).toString();

        const upiLink = `upi://pay?${query}`;
        const gpayAndroidIntent = `intent://upi/pay?${query}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
        const gpayIosLink = `tez://upi/pay?${query}`;

        return NextResponse.json({
            success: true,
            mode: data.mode,
            payee: data.pn,
            amount: data.am,
            upiId: data.pa,
            note: data.tn,
            upiLink,
            gpayAndroidIntent,
            gpayIosLink,
        }, { status: 200 });
    } catch (error) {
        console.error('Pay resolve error:', error);
        return NextResponse.json({ error: 'Invalid or expired payment link' }, { status: 400 });
    }
}

