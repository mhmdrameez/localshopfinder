'use client';

import React, { useEffect, useState } from 'react';
import { LogOut, User as UserIcon, Settings, ChevronRight, Loader2, ShieldCheck } from 'lucide-react';
import UserChatWidget from '@/components/UserChatWidget';

interface UserProfile {
    email: string;
    role: string;
}

export default function ProfileView() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data.user);
                }
            } catch (error) {
                console.error("Failed to fetch profile", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleSignOut = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            window.location.href = '/login';
        }
    };

    return (
        <div className="w-full h-full bg-slate-50 flex flex-col pt-6 md:pt-10 px-6 pb-24 overflow-y-auto">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-8">Profile</h1>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4 mb-6 relative">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                    <UserIcon className="w-8 h-8" />
                </div>
                <div className="flex-1 min-w-0">
                    {loading ? (
                        <div className="flex items-center gap-2 text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-slate-800 truncate">
                                {profile?.email?.split('@')[0] || 'My Account'}
                            </h2>
                            <p className="text-sm font-medium text-slate-500 truncate">{profile?.email}</p>
                            {profile?.role === 'admin' && (
                                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                                    <ShieldCheck className="w-3 h-3" /> ADMIN
                                </span>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
                <button className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 border-b border-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                            <Settings className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-700">Account Settings</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
                <UserChatWidget />
            </div>

            <button
                onClick={handleSignOut}
                className="w-full mt-auto flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 py-4 rounded-2xl font-bold transition-all border border-red-100"
            >
                <LogOut className="w-5 h-5" />
                Sign Out
            </button>
        </div>
    );
}
