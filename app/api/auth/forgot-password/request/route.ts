import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendPasswordResetOTP } from '@/lib/mailer';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();
        const normalizedEmail = String(email || '').trim().toLowerCase();

        if (!normalizedEmail) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const { data: user, error } = await supabaseAdmin
            .from('app_users')
            .select('id, email')
            .eq('email', normalizedEmail)
            .single();

        if (error || !user) {
            return NextResponse.json({ error: 'Email not found' }, { status: 404 });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const { error: updateError } = await supabaseAdmin
            .from('app_users')
            .update({
                otp_code: otpCode,
                otp_expires_at: expiresAt.toISOString(),
            })
            .eq('id', user.id);

        if (updateError) throw updateError;

        await sendPasswordResetOTP(normalizedEmail, otpCode);

        return NextResponse.json({ success: true, message: 'OTP sent to email' }, { status: 200 });
    } catch (error) {
        console.error('Forgot password request error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

