'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Loader2, SendHorizontal, MessageCircle, Circle } from 'lucide-react';

type ChatUser = {
    id: string;
    username: string;
    email: string;
    unread_count: number;
    last_message: string | null;
    last_message_at: string | null;
};

type ChatMessage = {
    id: string;
    conversation_user_id: string;
    sender_role: 'admin' | 'user';
    sender_email: string | null;
    message: string;
    created_at: string;
    is_read: boolean;
};

export default function AdminChatPanel() {
    const socketRef = useRef<Socket | null>(null);

    const [users, setUsers] = useState<ChatUser[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [connected, setConnected] = useState(false);

    const selectedUser = useMemo(
        () => users.find((u) => u.id === selectedUserId) || null,
        [users, selectedUserId]
    );

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/chat/users');
            if (!res.ok) return;
            const data = await res.json();
            const nextUsers = (data.users || []) as ChatUser[];
            setUsers(nextUsers);

            if (!selectedUserId && nextUsers.length > 0) {
                setSelectedUserId(nextUsers[0].id);
            }
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchMessages = async (userId: string) => {
        setLoadingMessages(true);
        try {
            const res = await fetch(`/api/chat/messages?userId=${userId}`);
            if (!res.ok) return;
            const data = await res.json();
            setMessages((data.messages || []) as ChatMessage[]);
        } finally {
            setLoadingMessages(false);
        }
    };

    const markRead = async (userId: string) => {
        await fetch('/api/chat/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });

        socketRef.current?.emit('chat:markRead', { userId });
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, unread_count: 0 } : u)));
    };

    const initSocket = async () => {
        await fetch('/api/socket/init');
        const tokenRes = await fetch('/api/chat/token');
        if (!tokenRes.ok) return;

        const tokenData = await tokenRes.json();
        const socket = io(tokenData.socketUrl, {
            transports: ['websocket'],
            auth: { token: tokenData.token },
        });
        socketRef.current = socket;

        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));

        socket.on('chat:new', (incoming: ChatMessage) => {
            const active = selectedUserIdRef.current;
            if (incoming.conversation_user_id === active) {
                setMessages((prev) => [...prev, incoming]);
            } else {
                setUsers((prev) =>
                    prev.map((u) =>
                        u.id === incoming.conversation_user_id
                            ? { ...u, unread_count: u.unread_count + (incoming.sender_role === 'user' ? 1 : 0) }
                            : u
                    )
                );
            }
            fetchUsers();
        });

        socket.on('chat:inbox:update', () => {
            fetchUsers();
        });
    };

    const selectedUserIdRef = useRef<string | null>(null);
    useEffect(() => {
        selectedUserIdRef.current = selectedUserId;
    }, [selectedUserId]);

    useEffect(() => {
        fetchUsers();
        initSocket();

        return () => {
            socketRef.current?.disconnect();
            socketRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!selectedUserId) return;
        fetchMessages(selectedUserId);
        socketRef.current?.emit('chat:join', { userId: selectedUserId });
        markRead(selectedUserId);
    }, [selectedUserId]);

    const sendMessage = () => {
        if (!selectedUserId) return;
        const text = draft.trim();
        if (!text) return;
        socketRef.current?.emit('chat:send', { userId: selectedUserId, message: text });
        setDraft('');
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden h-[70dvh] min-h-[500px] flex">
            <aside className="w-[320px] border-r border-slate-100 flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-800">User Chats</h3>
                    <p className="text-xs text-slate-500 mt-1">{connected ? 'Socket Connected' : 'Connecting...'}</p>
                </div>
                <div className="overflow-y-auto flex-1">
                    {loadingUsers ? (
                        <div className="p-6 text-slate-400 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading users...
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-6 text-slate-500 text-sm">No users available.</div>
                    ) : (
                        users.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => setSelectedUserId(user.id)}
                                className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                                    selectedUserId === user.id ? 'bg-indigo-50/50' : ''
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <p className="font-bold text-slate-800 truncate">{user.username}</p>
                                    {user.unread_count > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full">
                                            <Circle className="w-2 h-2 fill-current" /> {user.unread_count}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
                                <p className="text-[11px] text-slate-400 truncate mt-1">
                                    {user.last_message || 'No messages yet'}
                                </p>
                            </button>
                        ))
                    )}
                </div>
            </aside>

            <section className="flex-1 flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100 bg-white">
                    {selectedUser ? (
                        <>
                            <h3 className="font-bold text-slate-900">{selectedUser.username}</h3>
                            <p className="text-xs text-slate-500">{selectedUser.email}</p>
                        </>
                    ) : (
                        <p className="text-sm text-slate-500">Select a user to start chat</p>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                    {loadingMessages ? (
                        <div className="text-slate-400 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading messages...
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                            <div className="flex items-center gap-2">
                                <MessageCircle className="w-4 h-4" />
                                No messages yet
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                                        message.sender_role === 'admin'
                                            ? 'ml-auto bg-indigo-600 text-white'
                                            : 'mr-auto bg-white text-slate-700 border border-slate-200'
                                    }`}
                                >
                                    <p>{message.message}</p>
                                    <p
                                        className={`text-[10px] mt-1 ${
                                            message.sender_role === 'admin' ? 'text-indigo-100' : 'text-slate-400'
                                        }`}
                                    >
                                        {new Date(message.created_at).toLocaleTimeString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-100 p-3 bg-white">
                    <div className="flex items-center gap-2">
                        <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') sendMessage();
                            }}
                            placeholder={selectedUserId ? 'Type a message...' : 'Select a user first'}
                            disabled={!selectedUserId}
                            className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!selectedUserId || !draft.trim()}
                            className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:bg-slate-200 disabled:text-slate-400 inline-flex items-center gap-2"
                        >
                            <SendHorizontal className="w-4 h-4" />
                            Send
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

