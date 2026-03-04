import * as jose from 'jose';

export type AuthIdentity = {
    role: 'admin' | 'user';
    id: string | null;
    email: string | null;
};

function getJwtSecret() {
    return new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret_key_change_me');
}

export async function verifyAuthToken(token: string): Promise<AuthIdentity> {
    const { payload } = await jose.jwtVerify(token, getJwtSecret());

    const role = payload.role === 'admin' ? 'admin' : 'user';
    const id = payload.id ? String(payload.id) : null;
    const email = payload.email ? String(payload.email) : null;

    return { role, id, email };
}
