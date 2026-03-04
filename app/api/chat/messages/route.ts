import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAuthToken } from '@/lib/chatAuth';

function cleanMessage(value: string) {
    return value.trim().slice(0, 2000);
}

export async function GET(request: Request) {
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

        const { searchParams } = new URL(request.url);
        const targetUserId = searchParams.get('userId');
        const since = searchParams.get('since');
        const conversationUserId = me.role === 'admin' ? targetUserId : me.id;

        if (!conversationUserId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        let query = supabaseAdmin
            .from('chat_messages')
            .select('id, conversation_user_id, sender_role, sender_user_id, sender_email, message, is_read, created_at')
            .eq('conversation_user_id', conversationUserId);

        if (since) {
            query = query.gt('created_at', since);
        }

        const { data, error } = await query
            .order('created_at', { ascending: true })
            .limit(since ? 200 : 500);

        if (error) throw error;

        return NextResponse.json({ success: true, messages: data || [] }, { status: 200 });
    } catch (error) {
        console.error('Chat messages error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

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
        const message = cleanMessage(String(body?.message || ''));
        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const requestedUserId = body?.userId ? String(body.userId) : null;
        const conversationUserId = me.role === 'admin' ? requestedUserId : me.id;
        if (!conversationUserId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('chat_messages')
            .insert({
                conversation_user_id: conversationUserId,
                sender_role: me.role,
                sender_user_id: me.role === 'user' ? me.id : null,
                sender_email: me.email,
                message,
                is_read: false,
            })
            .select('id, conversation_user_id, sender_role, sender_user_id, sender_email, message, is_read, created_at')
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, message: data }, { status: 200 });
    } catch (error) {
        console.error('Send chat message error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
