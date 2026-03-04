'use client';

import React from 'react';
import { Star, MapPin, PhoneOff, AlertTriangle, CheckCircle2, ChevronRight, Fingerprint, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Shop } from './Map';

interface ShopCardProps {
    shop: Shop;
    onClick?: () => void;
    onClaim?: (shop: Shop) => void;
    userLocation?: { lat: number, lng: number } | null;
}

export default function ShopCard({ shop, onClick, onClaim, userLocation }: ShopCardProps) {
    const isOptimized = shop.rating >= 4.0 && shop.hasPhone && shop.isClaimed;

    return (
        <div
            onClick={onClick}
            className={`group relative bg-white p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md
        ${isOptimized ? 'border-slate-100' : 'border-amber-200/60 hover:border-amber-400'}`}
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-semibold text-slate-800 tracking-tight leading-tight group-hover:text-blue-600 transition-colors pr-2">
                        {shop.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600">{shop.category}</span>
                        <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-blue-500" /> {shop.distance}
                        </span>
                    </p>
                </div>

                {/* Rating Badge */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold shrink-0 ${shop.rating >= 4.0 ? 'bg-green-100 text-green-700' :
                    shop.rating > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                    <span>{shop.rating > 0 ? shop.rating.toFixed(1) : 'New'}</span>
                    <Star className="w-3 h-3 fill-current" />
                </div>
            </div>

            {/* Under-optimized warnings */}
            {!isOptimized && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {!shop.hasPhone && (
                        <div className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/50">
                            <PhoneOff className="w-3 h-3" /> NO PHONE
                        </div>
                    )}
                    {!shop.isClaimed && (
                        <div className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/50">
                            <Fingerprint className="w-3 h-3" /> UNCLAIMED
                        </div>
                    )}
                    {shop.issues.map((issue, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200/50">
                            <AlertTriangle className="w-3 h-3" /> {issue.toUpperCase()}
                        </div>
                    ))}
                </div>
            )}

            {/* Action footer */}
            <div className="mt-4 pt-3 border-t border-slate-50 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    {!shop.isClaimed ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClaim?.(shop);
                            }}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Claim & Optimize
                        </button>
                    ) : (
                        <div className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified Profile
                        </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors group-hover:translate-x-1" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <a
                        href={userLocation
                            ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${shop.lat},${shop.lng}`
                            : `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-colors"
                    >
                        Get Directions
                    </a>
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
                    >
                        <ExternalLink className="w-3.5 h-3.5" /> Open Maps
                    </a>
                </div>
            </div>
        </div>
    );
}
