import React from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function PendingApprovalPage() {
    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-center">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                        <ShieldAlert className="w-8 h-8" />
                    </div>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-3">Pending Approval</h1>
                <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                    Your email has been successfully verified! However, a system administrator must manually approve your account before you can access the Local Shop Finder map.
                    <br /><br />
                    Please check back later or contact support.
                </p>

                <Link
                    href="/login"
                    className="w-full inline-flex bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all active:scale-[0.98] items-center justify-center"
                >
                    Return to Login
                </Link>
            </div>
        </div>
    );
}
