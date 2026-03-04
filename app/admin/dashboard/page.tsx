'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, UserCheck, UserX, Loader2, MapPin, MessageCircleMore } from 'lucide-react';
import AdminChatPanel from '@/components/AdminChatPanel';

interface User {
    id: string;
    username: string;
    email: string;
    is_verified: boolean;
    is_approved: boolean;
    created_at: string;
    l3_hits: number;
}

interface AdminUserHit {
    id: string;
    username: string;
    email: string;
    l3_hits: number;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [adminUsers, setAdminUsers] = useState<AdminUserHit[]>([]);
    const [totalL3Hits, setTotalL3Hits] = useState(0);
    const [activeTab, setActiveTab] = useState<'users' | 'chat'>('users');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed to fetch users');
            }
            const data = await res.json();
            setUsers(data.users || []);
            setAdminUsers(data.adminUsers || []);
            setTotalL3Hits(Number(data.totalL3Hits || 0));
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [router]);

    const toggleApproval = async (userId: string, currentStatus: boolean) => {
        try {
            const res = await fetch('/api/admin/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, approve: !currentStatus })
            });

            if (!res.ok) throw new Error('Failed to update status');

            // Update local state instantly matching the DB
            setUsers(users.map(u => u.id === userId ? { ...u, is_approved: !currentStatus } : u));
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to update status');
        }
    };

    return (
        <div className="min-h-[100dvh] bg-slate-50 font-sans">
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">Admin Control</h1>
                        <p className="text-xs text-slate-500 font-medium mt-1">Local Shop Finder</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <MapPin className="w-4 h-4" />
                        Main Map
                    </Link>
                    <button
                        onClick={async () => {
                            try {
                                await fetch('/api/auth/logout', { method: 'POST' });
                            } catch (e) {
                                console.error('Logout failed:', e);
                            } finally {
                                window.location.href = '/login';
                            }
                        }}
                        className="text-sm font-bold text-slate-600 hover:text-red-600 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto p-6 mt-6">
                <div className="mb-4 inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                            activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                    >
                        Users
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors inline-flex items-center gap-2 ${
                            activeTab === 'chat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                    >
                        <MessageCircleMore className="w-4 h-4" />
                        Chat
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                        {error}
                    </div>
                )}

                {activeTab === 'users' && <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-800">Registered Users</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                Total Users: {users.length}
                            </span>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                Total L3 Hits (All): {totalL3Hits}
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 flex justify-center text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 font-medium">
                            No users registered yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="text-xs uppercase bg-slate-50 text-slate-400 font-bold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">User Details</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">L3 Cache Hits</th>
                                        <th className="px-6 py-4 text-right">Approval Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-900">{user.username}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                                                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-2 items-start">
                                                    {user.is_verified ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                                            <UserCheck className="w-3 h-3" /> Email Verified
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                                                            <Loader2 className="w-3 h-3 animate-spin" /> OTP Pending
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                                                    {Number(user.l3_hits || 0)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => toggleApproval(user.id, user.is_approved)}
                                                    disabled={!user.is_verified}
                                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all border
                                                ${!user.is_verified
                                                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed hidden md:inline-flex'
                                                            : user.is_approved
                                                                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                                                : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700 hover:scale-105 active:scale-95'
                                                        }`}
                                                >
                                                    {user.is_approved ? (
                                                        <><UserX className="w-4 h-4" /> Revoke Access</>
                                                    ) : (
                                                        <><ShieldCheck className="w-4 h-4" /> Approve User</>
                                                    )}
                                                </button>
                                                {!user.is_verified && <p className="text-[10px] text-slate-400 mt-1.5 md:hidden">Must verify email first</p>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>}

                {activeTab === 'users' && <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden mt-6">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-lg font-bold text-slate-800">Admin Users L3 Cache Hits</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="text-xs uppercase bg-slate-50 text-slate-400 font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Admin Email</th>
                                    <th className="px-6 py-4">L3 Cache Hits</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {adminUsers.map((adminUser) => (
                                    <tr key={adminUser.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-900">{adminUser.username}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{adminUser.email}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                                                {Number(adminUser.l3_hits || 0)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>}

                {activeTab === 'chat' && <AdminChatPanel />}
            </main>
        </div>
    );
}
