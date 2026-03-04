import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { signSocketToken, verifyAuthToken } from '@/lib/chatAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { getSocketUrl } from '@/lib/socketServer';

export async function GET() {
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

        const socketToken = await signSocketToken(me);

        let unreadCount = 0;
        if (me.role === 'user' && me.id) {
            const { count } = await supabaseAdmin
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_user_id', me.id)
                .eq('sender_role', 'admin')
                .eq('is_read', false);

            unreadCount = Number(count || 0);
        } else if (me.role === 'admin') {
            const { count } = await supabaseAdmin
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('sender_role', 'user')
                .eq('is_read', false);

            unreadCount = Number(count || 0);
        }

        return NextResponse.json({
            success: true,
            token: socketToken,
            socketUrl: getSocketUrl(),
            me,
            unreadCount,
        }, { status: 200 });
    } catch (error) {
        console.error('Chat token error:', error);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}

