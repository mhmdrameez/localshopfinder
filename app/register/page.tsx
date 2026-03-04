'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.get('username'),
                    email,
                    password: formData.get('password'),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Registration successful! Bypass OTP, go straight to pending approval
            // router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
            router.push('/pending-approval');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create Account</h1>
                    <p className="text-slate-500 mt-2">Join Local Shop Finder today.</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Username</label>
                        <input name="username" type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-900" placeholder="johndoe" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Email Address</label>
                        <input name="email" type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-900" placeholder="you@example.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Password</label>
                        <input name="password" type="password" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-900" placeholder="••••••••" minLength={6} />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                        {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</> : 'Register'}
                    </button>
                </form>

                <p className="text-center mt-6 text-slate-600 font-medium text-sm">
                    Already have an account? <Link href="/login" className="text-indigo-600 hover:text-indigo-800 font-bold transition-colors">Log in</Link>
                </p>
            </div>
        </div>
    );
}
