import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendOTP } from '@/lib/mailer';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const { data: user, error } = await supabaseAdmin
            .from('app_users')
            .select('id, is_verified')
            .eq('email', email)
            .single();

        if (error || !user) {
            // For security, do not reveal if the user exists or not explicitly.
            return NextResponse.json({ success: true, message: 'If the email exists, an OTP will be sent shortly.' }, { status: 200 });
        }

        if (user.is_verified) {
            return NextResponse.json({ error: 'User is already verified' }, { status: 400 });
        }

        // Generate fresh 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        const { error: updateError } = await supabaseAdmin
            .from('app_users')
            .update({
                otp_code: otpCode,
                otp_expires_at: expiresAt.toISOString()
            })
            .eq('id', user.id);

        if (updateError) throw updateError;

        // Dispatch email
        await sendOTP(email, otpCode);

        return NextResponse.json({ success: true, message: 'New OTP sent to email' }, { status: 200 });

    } catch (error: any) {
        console.error('Resend OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
