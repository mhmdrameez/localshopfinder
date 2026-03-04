'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, SendHorizontal, MessageCircle, Circle } from 'lucide-react';

type ChatUser = {
    id: string;
    username: string;
    email: string;
    unread_count: number;
    last_message: string | null;
};

type ChatMessage = {
    id: string;
    conversation_user_id: string;
    sender_role: 'admin' | 'user';
    message: string;
    created_at: string;
};

const USERS_POLL_MS = 5000;
const MSG_POLL_MS = 2500;

export default function AdminChatPanel() {
    const [users, setUsers] = useState<ChatUser[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const lastTsRef = useRef<string | null>(null);

    const selectedUser = useMemo(
        () => users.find((u) => u.id === selectedUserId) || null,
        [users, selectedUserId]
    );

    const fetchUsers = useCallback(async (silent = false) => {
        if (!silent) setLoadingUsers(true);
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
            if (!silent) setLoadingUsers(false);
        }
    }, [selectedUserId]);

    const markRead = useCallback(async (userId: string) => {
        await fetch('/api/chat/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, unread_count: 0 } : u)));
    }, []);

    const fetchMessages = useCallback(async (userId: string, incremental: boolean) => {
        if (!incremental) setLoadingMessages(true);
        else setRefreshing(true);

        try {
            const sincePart = incremental && lastTsRef.current
                ? `&since=${encodeURIComponent(lastTsRef.current)}`
                : '';
            const res = await fetch(`/api/chat/messages?userId=${userId}${sincePart}`);
            if (!res.ok) return;
            const data = await res.json();
            const incoming = (data.messages || []) as ChatMessage[];

            if (!incremental) {
                setMessages(incoming);
                if (incoming.length > 0) {
                    lastTsRef.current = incoming[incoming.length - 1].created_at;
                } else {
                    lastTsRef.current = null;
                }
            } else if (incoming.length > 0) {
                setMessages((prev) => {
                    const ids = new Set(prev.map((m) => m.id));
                    const merged = [...prev];
                    for (const msg of incoming) {
                        if (!ids.has(msg.id)) merged.push(msg);
                    }
                    return merged;
                });
                lastTsRef.current = incoming[incoming.length - 1].created_at;
                if (incoming.some((m) => m.sender_role === 'user')) {
                    await markRead(userId);
                }
            }
        } finally {
            if (!incremental) setLoadingMessages(false);
            else setRefreshing(false);
        }
    }, [markRead]);

    useEffect(() => {
        void fetchUsers(false);
    }, [fetchUsers]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                void fetchUsers(true);
            }
        }, USERS_POLL_MS);
        return () => clearInterval(interval);
    }, [fetchUsers]);

    useEffect(() => {
        if (!selectedUserId) return;
        lastTsRef.current = null;
        void fetchMessages(selectedUserId, false);
        void markRead(selectedUserId);
    }, [selectedUserId, fetchMessages, markRead]);

    useEffect(() => {
        if (!selectedUserId) return;
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                void fetchMessages(selectedUserId, true);
            }
        }, MSG_POLL_MS);
        return () => clearInterval(interval);
    }, [selectedUserId, fetchMessages]);

    const sendMessage = useCallback(async () => {
        if (!selectedUserId) return;
        const text = draft.trim();
        if (!text) return;

        setDraft('');
        const res = await fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: selectedUserId, message: text }),
        });
        if (!res.ok) return;

        const data = await res.json();
        const created = data.message as ChatMessage | undefined;
        if (!created) return;

        setMessages((prev) => [...prev, created]);
        lastTsRef.current = created.created_at;
        void fetchUsers(true);
    }, [draft, selectedUserId, fetchUsers]);

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden h-[70dvh] min-h-[500px] flex">
            <aside className="w-[320px] border-r border-slate-100 flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-800">User Chats</h3>
                    <p className="text-xs text-slate-500 mt-1">Auto refresh {USERS_POLL_MS / 1000}s</p>
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
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-slate-400">
                            {refreshing ? 'Checking new messages...' : 'Up to date'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    void sendMessage();
                                }
                            }}
                            placeholder={selectedUserId ? 'Type a message...' : 'Select a user first'}
                            disabled={!selectedUserId}
                            className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                        <button
                            onClick={() => void sendMessage()}
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
