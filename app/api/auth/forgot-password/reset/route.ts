import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const { email, otp, newPassword, confirmPassword } = await req.json();
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const normalizedOtp = String(otp || '').trim();
        const password = String(newPassword || '');
        const confirm = String(confirmPassword || '');

        if (!normalizedEmail || !normalizedOtp || !password || !confirm) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        if (password !== confirm) {
            return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        const { data: user, error } = await supabaseAdmin
            .from('app_users')
            .select('id, otp_code, otp_expires_at')
            .eq('email', normalizedEmail)
            .single();

        if (error || !user) {
            return NextResponse.json({ error: 'Email not found' }, { status: 404 });
        }

        if (!user.otp_code || !user.otp_expires_at) {
            return NextResponse.json({ error: 'Please request OTP first' }, { status: 400 });
        }

        if (String(user.otp_code) !== normalizedOtp) {
            return NextResponse.json({ error: 'OTP incorrect' }, { status: 400 });
        }

        const now = new Date();
        const expiresAt = new Date(user.otp_expires_at);
        if (now > expiresAt) {
            return NextResponse.json({ error: 'OTP expired. Please request a new OTP' }, { status: 400 });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const { error: updateError } = await supabaseAdmin
            .from('app_users')
            .update({
                password_hash: passwordHash,
                otp_code: null,
                otp_expires_at: null,
            })
            .eq('id', user.id);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, message: 'Password reset successful' }, { status: 200 });
    } catch (error) {
        console.error('Forgot password reset error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

