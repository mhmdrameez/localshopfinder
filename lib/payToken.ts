import * as jose from 'jose';

type PayTokenPayload = {
    pa: string;
    pn: string;
    am: string;
    cu: string;
    tn: string;
    mode: 'gpay' | 'upi';
    email?: string;
};

function getSecret() {
    return new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_change_me');
}

export async function signPayToken(payload: PayTokenPayload) {
    return new jose.SignJWT({ ...payload, type: 'pay_link' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('12h')
        .sign(getSecret());
}

export async function verifyPayToken(token: string): Promise<PayTokenPayload> {
    const { payload } = await jose.jwtVerify(token, getSecret());
    if (payload.type !== 'pay_link') throw new Error('Invalid token');

    const mode = payload.mode === 'upi' ? 'upi' : 'gpay';

    return {
        pa: String(payload.pa || ''),
        pn: String(payload.pn || ''),
        am: String(payload.am || ''),
        cu: String(payload.cu || 'INR'),
        tn: String(payload.tn || ''),
        mode,
        email: payload.email ? String(payload.email) : undefined,
    };
}

