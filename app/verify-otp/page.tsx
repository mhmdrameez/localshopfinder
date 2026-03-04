'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, MailCheck } from 'lucide-react';

function VerifyOtpContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email');

    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // 5 Minute Timer = 300 seconds
    const [timeRemaining, setTimeRemaining] = useState(300);

    useEffect(() => {
        if (!email) {
            router.push('/register');
        }
    }, [email, router]);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            // Success -> Redirect to Pending Approval
            router.push('/pending-approval');
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (timeRemaining > 0) return;
        setResendLoading(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/auth/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to resend');

            setSuccess('A new 6-digit OTP has been sent to your email.');
            setTimeRemaining(300); // Reset timer to 5 minutes
            setOtp('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setResendLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (!email) return null;

    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-center">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <MailCheck className="w-8 h-8" />
                    </div>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Check Your Email</h1>
                <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                    We sent a 6-digit verification code to <span className="font-bold text-slate-800">{email}</span>. Please enter it below.
                </p>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 text-left">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-100 text-left">
                        {success}
                    </div>
                )}

                <form onSubmit={handleVerify} className="space-y-6">
                    <div>
                        <input
                            type="text"
                            required
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Numbers only
                            className="w-full text-center tracking-[0.5em] text-3xl px-4 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-black text-slate-900"
                            placeholder="••••••"
                        />
                    </div>
                    <button type="submit" disabled={loading || otp.length !== 6} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</> : 'Verify Email'}
                    </button>
                </form>

                <div className="mt-8 border-t border-slate-100 pt-6">
                    <p className="text-sm text-slate-500 mb-3">Didn&apos;t receive the email?</p>
                    <button
                        onClick={handleResend}
                        disabled={timeRemaining > 0 || resendLoading}
                        className="text-sm font-bold text-indigo-600 disabled:text-slate-400 transition-colors flex items-center justify-center gap-2 w-full mx-auto"
                    >
                        {resendLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {timeRemaining > 0 ? `Resend code available in ${formatTime(timeRemaining)}` : 'Click to Resend OTP'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function VerifyOtpPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        }>
            <VerifyOtpContent />
        </Suspense>
    );
}
