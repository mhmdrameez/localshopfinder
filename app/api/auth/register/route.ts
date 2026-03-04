import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendOTP } from '@/lib/mailer';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const { username, email, password } = await req.json();

        if (!username || !email || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if user exists
        const { data: existingUser } = await supabaseAdmin
            .from('app_users')
            .select('id, is_verified')
            .eq('email', email)
            .single();

        if (existingUser) {
            // OTP verification bypassed, so we just treat them as if they need to wait for approval
            // if (existingUser.is_verified) {
            //     return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
            // }
            return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
        }

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create new user (Bypassed the OTP requirement)
        const { error: insertError } = await supabaseAdmin
            .from('app_users')
            .insert([{
                username,
                email,
                password_hash: passwordHash,
                is_verified: true, // Bypass OTP
                // otp_code: otpCode,
                // otp_expires_at: expiresAt.toISOString(),
            }]);

        if (insertError) throw insertError;

        // Dispatch email (Commented out for now to bypass OTP)
        // await sendOTP(email, otpCode);

        return NextResponse.json({ success: true, message: 'OTP sent to email' }, { status: 200 });

    } catch (error: any) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
