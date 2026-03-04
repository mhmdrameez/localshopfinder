'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Loader2, SendHorizontal, Circle } from 'lucide-react';

type ChatMessage = {
    id: string;
    conversation_user_id: string;
    sender_role: 'admin' | 'user';
    message: string;
    created_at: string;
};

const UNREAD_POLL_MS = 6000;
const MSG_POLL_MS = 2500;

export default function UserChatWidget() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [draft, setDraft] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [isUser, setIsUser] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const lastTsRef = useRef<string | null>(null);

    const fetchUnreadCount = async () => {
        const res = await fetch('/api/chat/token');
        if (!res.ok) return;
        const data = await res.json();
        if (data?.me?.role !== 'user') {
            setIsUser(false);
            return;
        }
        setIsUser(true);
        setUnreadCount(Number(data.unreadCount || 0));
    };

    const fetchMessages = async (incremental: boolean) => {
        if (!incremental) setLoadingMessages(true);
        else setRefreshing(true);

        try {
            const sincePart = incremental && lastTsRef.current
                ? `?since=${encodeURIComponent(lastTsRef.current)}`
                : '';
            const res = await fetch(`/api/chat/messages${sincePart}`);
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
            }
        } finally {
            if (!incremental) setLoadingMessages(false);
            else setRefreshing(false);
        }
    };

    const markRead = async () => {
        await fetch('/api/chat/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        setUnreadCount(0);
    };

    useEffect(() => {
        void fetchUnreadCount();
    }, []);

    useEffect(() => {
        if (!isUser) return;
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible' && !open) {
                void fetchUnreadCount();
            }
        }, UNREAD_POLL_MS);
        return () => clearInterval(interval);
    }, [isUser, open]);

    useEffect(() => {
        if (!open || !isUser) return;
        lastTsRef.current = null;
        void fetchMessages(false);
        void markRead();
    }, [open, isUser]);

    useEffect(() => {
        if (!open || !isUser) return;
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                void fetchMessages(true);
                void markRead();
            }
        }, MSG_POLL_MS);
        return () => clearInterval(interval);
    }, [open, isUser]);

    const sendMessage = async () => {
        const text = draft.trim();
        if (!text) return;
        setDraft('');

        const res = await fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const created = data.message as ChatMessage | undefined;
        if (!created) return;

        setMessages((prev) => [...prev, created]);
        lastTsRef.current = created.created_at;
    };

    if (!isUser) return null;

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 border-b border-slate-100 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg relative">
                        <MessageCircle className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-slate-700">Chat With Admin</span>
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full">
                            <Circle className="w-2 h-2 fill-current" /> {unreadCount}
                        </span>
                    )}
                </div>
            </button>

            {open && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[1px] flex items-end md:items-center justify-center">
                    <div className="w-full md:w-[560px] h-[85dvh] md:h-[75dvh] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-900">Support Chat</h3>
                                <p className="text-xs text-slate-500">Auto refresh {MSG_POLL_MS / 1000}s</p>
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                            {loadingMessages ? (
                                <div className="text-slate-400 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading messages...
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                    Start chatting with admin
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                                                message.sender_role === 'user'
                                                    ? 'ml-auto bg-indigo-600 text-white'
                                                    : 'mr-auto bg-white text-slate-700 border border-slate-200'
                                            }`}
                                        >
                                            <p>{message.message}</p>
                                            <p
                                                className={`text-[10px] mt-1 ${
                                                    message.sender_role === 'user' ? 'text-indigo-100' : 'text-slate-400'
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
                                    placeholder="Type a message..."
                                    className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                                />
                                <button
                                    onClick={() => void sendMessage()}
                                    disabled={!draft.trim()}
                                    className="h-10 px-4 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:bg-slate-200 disabled:text-slate-400 inline-flex items-center gap-2"
                                >
                                    <SendHorizontal className="w-4 h-4" />
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

