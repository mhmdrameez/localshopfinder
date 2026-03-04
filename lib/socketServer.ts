import http from 'http';
import { Server as IOServer } from 'socket.io';
import { supabaseAdmin } from '@/lib/supabase';
import { verifySocketToken, type AuthIdentity } from '@/lib/chatAuth';

type ChatMessageRow = {
    id: string;
    conversation_user_id: string;
    sender_role: 'admin' | 'user';
    sender_user_id: string | null;
    sender_email: string | null;
    message: string;
    is_read: boolean;
    created_at: string;
};

const SOCKET_PORT = Number(process.env.SOCKET_IO_PORT || 3001);
const SOCKET_HOST = process.env.SOCKET_IO_HOST || '0.0.0.0';

type GlobalSocketState = {
    server: http.Server;
    io: IOServer;
    started: boolean;
};

declare global {
    var __localShopSocketState: GlobalSocketState | undefined;
}

function threadRoom(userId: string) {
    return `chat:thread:${userId}`;
}

async function insertMessage(identity: AuthIdentity, conversationUserId: string, message: string) {
    const payload = {
        conversation_user_id: conversationUserId,
        sender_role: identity.role,
        sender_user_id: identity.role === 'user' ? identity.id : null,
        sender_email: identity.email,
        message,
        is_read: false,
    };

    const { data, error } = await supabaseAdmin
        .from('chat_messages')
        .insert(payload)
        .select('id, conversation_user_id, sender_role, sender_user_id, sender_email, message, is_read, created_at')
        .single();

    if (error) throw error;
    return data as ChatMessageRow;
}

async function markConversationAsRead(conversationUserId: string, readerRole: 'admin' | 'user') {
    const senderRoleToMark = readerRole === 'admin' ? 'user' : 'admin';
    const { error } = await supabaseAdmin
        .from('chat_messages')
        .update({ is_read: true })
        .eq('conversation_user_id', conversationUserId)
        .eq('sender_role', senderRoleToMark)
        .eq('is_read', false);

    if (error) throw error;
}

function sanitizeMessage(input: string) {
    return input.trim().slice(0, 2000);
}

function setupSocketHandlers(io: IOServer) {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token as string | undefined;
            if (!token) {
                next(new Error('Unauthorized'));
                return;
            }

            const identity = await verifySocketToken(token);
            if (identity.role === 'user' && !identity.id) {
                next(new Error('Unauthorized'));
                return;
            }
            socket.data.identity = identity;
            next();
        } catch {
            next(new Error('Unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        const identity = socket.data.identity as AuthIdentity;

        if (identity.role === 'admin') {
            socket.join('chat:admins');
        } else if (identity.id) {
            socket.join(threadRoom(identity.id));
        }

        socket.on('chat:join', (payload: { userId?: string }) => {
            if (identity.role !== 'admin') return;
            if (!payload?.userId) return;
            socket.join(threadRoom(payload.userId));
        });

        socket.on('chat:send', async (payload: { userId?: string; message?: string }) => {
            try {
                const cleanMessage = sanitizeMessage(payload?.message || '');
                if (!cleanMessage) return;

                let conversationUserId = '';
                if (identity.role === 'admin') {
                    if (!payload?.userId) return;
                    conversationUserId = payload.userId;
                } else {
                    if (!identity.id) return;
                    conversationUserId = identity.id;
                }

                const savedMessage = await insertMessage(identity, conversationUserId, cleanMessage);
                io.to(threadRoom(conversationUserId)).emit('chat:new', savedMessage);
                io.to('chat:admins').emit('chat:inbox:update', { userId: conversationUserId });
            } catch (error) {
                socket.emit('chat:error', { message: 'Failed to send message' });
                console.error('[Socket chat:send]', error);
            }
        });

        socket.on('chat:markRead', async (payload: { userId?: string }) => {
            try {
                let conversationUserId = '';
                if (identity.role === 'admin') {
                    if (!payload?.userId) return;
                    conversationUserId = payload.userId;
                } else {
                    if (!identity.id) return;
                    conversationUserId = identity.id;
                }

                await markConversationAsRead(conversationUserId, identity.role);
                io.to(threadRoom(conversationUserId)).emit('chat:read', {
                    conversationUserId,
                    readerRole: identity.role,
                });
                io.to('chat:admins').emit('chat:inbox:update', { userId: conversationUserId });
            } catch (error) {
                console.error('[Socket chat:markRead]', error);
            }
        });
    });
}

export function getSocketUrl() {
    return process.env.NEXT_PUBLIC_SOCKET_IO_URL || `http://localhost:${SOCKET_PORT}`;
}

export function startSocketServer() {
    if (global.__localShopSocketState?.started) {
        return global.__localShopSocketState;
    }

    const server = http.createServer();
    const io = new IOServer(server, {
        cors: {
            origin: true,
            credentials: true,
        },
    });

    setupSocketHandlers(io);

    server.listen(SOCKET_PORT, SOCKET_HOST, () => {
        console.log(`[Socket.IO] listening on ${SOCKET_HOST}:${SOCKET_PORT}`);
    });

    global.__localShopSocketState = { server, io, started: true };
    return global.__localShopSocketState;
}
