'use client';

import React from 'react';
import { Star, MapPin, PhoneOff, AlertTriangle, ChevronRight, Globe, MessageSquareX, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { Shop } from './Map';

interface ShopCardProps {
    shop: Shop;
    onClick?: () => void;
    userLocation?: { lat: number, lng: number } | null;
}

export default function ShopCard({ shop, onClick, userLocation }: ShopCardProps) {
    const isOptimized = shop.rating >= 4.0 && shop.hasPhone && shop.hasWebsite;

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
                    {!shop.hasWebsite && (
                        <div className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full border border-violet-200/50">
                            <Globe className="w-3 h-3" /> NO WEBSITE
                        </div>
                    )}
                    {shop.rating > 0 && shop.rating < 4.0 && (
                        <div className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200/50">
                            <AlertTriangle className="w-3 h-3" /> LOW RATING
                        </div>
                    )}
                    {shop.reviews === 0 && (
                        <div className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/50">
                            <MessageSquareX className="w-3 h-3" /> NO REVIEWS
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
