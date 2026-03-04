import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAuthToken } from '@/lib/chatAuth';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const me = await verifyAuthToken(token);
        if (me.role === 'user' && !me.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const requestedUserId = body?.userId ? String(body.userId) : null;
        const conversationUserId = me.role === 'admin' ? requestedUserId : me.id;

        if (!conversationUserId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const markSenderRole = me.role === 'admin' ? 'user' : 'admin';
        const { error } = await supabaseAdmin
            .from('chat_messages')
            .update({ is_read: true })
            .eq('conversation_user_id', conversationUserId)
            .eq('sender_role', markSenderRole)
            .eq('is_read', false);

        if (error) throw error;

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Mark chat read error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

