'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

type PayData = {
    mode: 'gpay' | 'upi';
    payee: string;
    amount: string;
    upiId: string;
    note: string;
    upiLink: string;
    anyUpiAndroidIntent: string;
    gpayAndroidIntent: string;
    phonepeAndroidIntent: string;
    paytmAndroidIntent: string;
    gpayIosLink: string;
};

function getPrimaryLink(data: PayData) {
    return data.upiLink;
}

function PayNowContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<PayData | null>(null);
    const [showFallbackApps, setShowFallbackApps] = useState(false);

    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');
    const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent || '');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`/api/pay/resolve?token=${encodeURIComponent(token)}`);
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || 'Invalid payment link');
                const parsed = json as PayData;
                setData(parsed);

                const primary = getPrimaryLink(parsed);
                setTimeout(() => {
                    window.location.href = primary;
                }, 300);
                setTimeout(() => {
                    setShowFallbackApps(true);
                }, 1800);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Invalid payment link');
            } finally {
                setLoading(false);
            }
        };

        if (!token) {
            setError('Missing payment token');
            setLoading(false);
            return;
        }
        void load();
    }, [token]);

    const handlePayNow = () => {
        if (!data) return;
        window.location.href = getPrimaryLink(data);
        setTimeout(() => setShowFallbackApps(true), 1200);
    };

    const openLink = (link: string) => {
        if (!link) return;
        window.location.href = link;
    };

    return (
        <div className="min-h-[100dvh] bg-slate-50 p-4 flex items-center justify-center">
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h1 className="text-2xl font-black text-slate-900">Pay Now</h1>
                <p className="text-sm text-slate-500 mt-1">Opening any available UPI app automatically.</p>

                {loading && (
                    <div className="mt-6 text-slate-500 inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Preparing payment...
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 rounded-xl border border-red-100 bg-red-50 text-red-700 text-sm">{error}</div>
                )}

                {data && (
                    <>
                        <div className="mt-5 space-y-1 text-sm">
                            <p><span className="font-bold">Payee:</span> {data.payee}</p>
                            <p><span className="font-bold">Amount:</span> Rs {data.amount}</p>
                            <p><span className="font-bold">UPI:</span> {data.upiId}</p>
                        </div>

                        <button
                            type="button"
                            onClick={handlePayNow}
                            className="mt-6 w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors"
                        >
                            Pay Now
                        </button>

                        {showFallbackApps && (
                            <div className="mt-4 p-3 rounded-xl border border-slate-200 bg-slate-50">
                                <p className="text-xs font-bold text-slate-700 mb-2">If it did not open, choose an app:</p>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => openLink(data.upiLink)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white">Default UPI App</button>
                                    {isAndroid && <button type="button" onClick={() => openLink(data.gpayAndroidIntent)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white">GPay</button>}
                                    {isAndroid && <button type="button" onClick={() => openLink(data.phonepeAndroidIntent)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white">PhonePe</button>}
                                    {isAndroid && <button type="button" onClick={() => openLink(data.paytmAndroidIntent)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 text-white">Paytm</button>}
                                    {isAndroid && <button type="button" onClick={() => openLink(data.anyUpiAndroidIntent)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white">Any UPI App</button>}
                                    {isIOS && <button type="button" onClick={() => openLink(data.gpayIosLink)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white">GPay iOS</button>}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default function PayNowPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[100dvh] bg-slate-50 p-4 flex items-center justify-center">
                <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="text-slate-500 inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Preparing payment...
                    </div>
                </div>
            </div>
        }>
            <PayNowContent />
        </Suspense>
    );
}
