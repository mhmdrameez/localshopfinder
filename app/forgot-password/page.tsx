'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otpRequested, setOtpRequested] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const requestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/auth/forgot-password/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

            setOtpRequested(true);
            setSuccess('OTP sent to your email. Enter OTP and set new password.');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/auth/forgot-password/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    otp,
                    newPassword,
                    confirmPassword,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to reset password');

            setSuccess('Password reset successful. Redirecting to login...');
            setTimeout(() => router.push('/login'), 1200);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                        <KeyRound className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Forgot Password</h1>
                    <p className="text-slate-500 mt-2 text-sm">Request OTP and reset your password.</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-100">
                        {success}
                    </div>
                )}

                {!otpRequested ? (
                    <form onSubmit={requestOtp} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-900"
                                placeholder="you@example.com"
                            />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending OTP...</> : 'Send OTP'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={resetPassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">OTP</label>
                            <input
                                type="text"
                                required
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\\D/g, ''))}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-900"
                                placeholder="6-digit OTP"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">New Password</label>
                            <input
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Confirm Password</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-900"
                            />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Resetting...</> : 'Verify OTP and Reset Password'}
                        </button>
                    </form>
                )}

                <p className="text-center mt-6 text-slate-600 font-medium text-sm">
                    Back to <Link href="/login" className="text-indigo-600 hover:text-indigo-800 font-bold transition-colors">Login</Link>
                </p>
            </div>
        </div>
    );
}

