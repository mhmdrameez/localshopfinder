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

export async function signSocketToken(identity: AuthIdentity): Promise<string> {
    const jwt = await new jose.SignJWT({
        role: identity.role,
        id: identity.id,
        email: identity.email,
        type: 'chat_socket',
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('12h')
        .sign(getJwtSecret());

    return jwt;
}

export async function verifySocketToken(token: string): Promise<AuthIdentity> {
    const { payload } = await jose.jwtVerify(token, getJwtSecret());
    if (payload.type !== 'chat_socket') {
        throw new Error('Invalid socket token');
    }

    const role = payload.role === 'admin' ? 'admin' : 'user';
    const id = payload.id ? String(payload.id) : null;
    const email = payload.email ? String(payload.email) : null;

    return { role, id, email };
}

