import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_change_me');
        const { payload } = await jose.jwtVerify(token, secret);

        return NextResponse.json({
            user: {
                role: payload.role,
                email: payload.email,
                id: payload.id
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Auth me error:', error);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
