'use client';

import React, { useState } from 'react';
import { X, Building2, User, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { Shop } from './Map';

interface ClaimModalProps {
    shop: Shop | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function ClaimModal({ shop, isOpen, onClose }: ClaimModalProps) {
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    if (!isOpen || !shop) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitting');
        try {
            // Mock API call
            const res = await fetch('/api/claim', {
                method: 'POST',
                body: JSON.stringify({ shopId: shop.id }),
            });
            if (res.ok) {
                setStatus('success');
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {status === 'success' ? (
                    <div className="p-8 text-center bg-blue-50/50">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 flex items-center justify-center rounded-full mx-auto mb-4 scale-110">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Claim Requested!</h2>
                        <p className="text-slate-600 mb-6">
                            Thank you. Our team will verify your details and help you optimize <span className="font-semibold text-slate-800">{shop.name}</span>.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <div className="p-6 sm:p-8">
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Claim This Shop</h2>
                            </div>
                            <p className="text-sm text-slate-600 font-medium">Verify you own <span className="text-slate-900">{shop.name}</span></p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input required type="text" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" placeholder="Store Owner Name" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input required type="tel" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" placeholder="+91 98765 43210" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 ml-1">Email Address (Optional)</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input type="email" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" placeholder="owner@store.com" />
                                </div>
                            </div>

                            {status === 'error' && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                                    <span className="font-semibold">Error:</span> Something went wrong. Please try again.
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'submitting'}
                                className="w-full mt-2 py-3 bg-slate-900 hover:bg-black text-white font-medium rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {status === 'submitting' ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                ) : 'Submit Claim Request'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
