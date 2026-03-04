import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAuthToken } from '@/lib/chatAuth';

type ChatUserRow = {
    id: string;
    username: string;
    email: string;
    is_approved: boolean;
    is_verified: boolean;
};

type ChatMessageLite = {
    conversation_user_id: string;
    message: string;
    created_at: string;
    sender_role: 'admin' | 'user';
    is_read: boolean;
};

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const me = await verifyAuthToken(token);
        if (me.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data: users, error: usersError } = await supabaseAdmin
            .from('app_users')
            .select('id, username, email, is_approved, is_verified')
            .order('created_at', { ascending: false });

        if (usersError) throw usersError;

        const { data: messages, error: messageError } = await supabaseAdmin
            .from('chat_messages')
            .select('conversation_user_id, message, created_at, sender_role, is_read')
            .order('created_at', { ascending: false })
            .limit(1000);

        if (messageError) throw messageError;

        const unreadByUser = new Map<string, number>();
        const lastByUser = new Map<string, ChatMessageLite>();

        for (const raw of (messages || [])) {
            const msg = raw as ChatMessageLite;
            const uid = msg.conversation_user_id;
            if (!uid) continue;

            if (!lastByUser.has(uid)) {
                lastByUser.set(uid, msg);
            }
            if (msg.sender_role === 'user' && !msg.is_read) {
                unreadByUser.set(uid, (unreadByUser.get(uid) || 0) + 1);
            }
        }

        const chatUsers = (users || []).map((row) => {
            const user = row as ChatUserRow;
            const last = lastByUser.get(user.id);
            return {
                id: user.id,
                username: user.username,
                email: user.email,
                is_approved: user.is_approved,
                is_verified: user.is_verified,
                unread_count: unreadByUser.get(user.id) || 0,
                last_message: last?.message || null,
                last_message_at: last?.created_at || null,
                last_sender_role: last?.sender_role || null,
            };
        });

        return NextResponse.json({ success: true, users: chatUsers }, { status: 200 });
    } catch (error) {
        console.error('Chat users error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

