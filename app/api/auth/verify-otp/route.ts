import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
        }

        const { data: user, error } = await supabaseAdmin
            .from('app_users')
            .select('id, otp_code, otp_expires_at, is_verified')
            .eq('email', email)
            .single();

        if (error || !user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (user.is_verified) {
            return NextResponse.json({ error: 'User is already verified' }, { status: 400 });
        }

        // Validate OTP and expiration
        const now = new Date();
        const expiresAt = new Date(user.otp_expires_at);

        if (user.otp_code !== otp) {
            return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 });
        }

        if (now > expiresAt) {
            return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
        }

        // Mark as verified, clear OTP
        const { error: updateError } = await supabaseAdmin
            .from('app_users')
            .update({
                is_verified: true,
                otp_code: null,
                otp_expires_at: null
            })
            .eq('id', user.id);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, message: 'Email verified successfully. Waiting for admin approval.' }, { status: 200 });

    } catch (error: any) {
        console.error('Verify OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
