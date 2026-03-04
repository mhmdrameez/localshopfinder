'use client';

import React, { useState } from 'react';

import dynamic from 'next/dynamic';
import { Layers } from 'lucide-react';

const OpenStreetMap = dynamic(() => import('./OpenStreetMap'), {
    ssr: false,
    loading: () => <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500 font-medium animate-pulse"><div className="w-8 h-8 rounded-full border-2 border-slate-400 border-t-transparent animate-spin mb-3"></div>Loading OpenStreetMap...</div>
});

const OlaMap = dynamic(() => import('./OlaMap'), {
    ssr: false,
    loading: () => <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500 font-medium animate-pulse"><div className="w-8 h-8 rounded-full border-2 border-slate-400 border-t-transparent animate-spin mb-3"></div>Loading Ola Maps...</div>
});

export interface Shop {
    id: string;
    name: string;
    category: string;
    rating: number;
    reviews: number;
    distance: string;
    hasPhone: boolean;
    hasWebsite: boolean;
    isClaimed: boolean;
    issues: string[];
    lat: number;
    lng: number;
}

interface MapProps {
    shops: Shop[];
    selectedShopId: string | null;
    onSelectShop: (id: string) => void;
    center?: { lat: number, lng: number } | null;
}

export default function Map({ shops, selectedShopId, onSelectShop, center: propCenter }: MapProps) {
    // Default to Hyderabad fallback if no prop provided
    const displayCenter = propCenter || { lat: 17.3850, lng: 78.4867 };
    const [mapProvider, setMapProvider] = useState<'osm' | 'ola'>('ola'); // Defaulting to Ola Maps

    return (
        <div className="w-full h-full relative">
            <div className="absolute top-4 right-4 z-[1000] flex gap-2">
                <div className="bg-white/90 backdrop-blur-sm p-1 rounded-xl shadow-lg border border-slate-200 flex items-center">

                    <button
                        onClick={() => setMapProvider('ola')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${mapProvider === 'ola' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Ola Maps
                    </button>
                    <button
                        onClick={() => setMapProvider('osm')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${mapProvider === 'osm' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        OSM
                    </button>
                </div>
            </div>

            {mapProvider === 'ola' && (
                <OlaMap
                    shops={shops}
                    selectedShopId={selectedShopId}
                    onSelectShop={onSelectShop}
                    center={displayCenter}
                />
            )}

            {mapProvider === 'osm' && (
                <OpenStreetMap
                    shops={shops}
                    selectedShopId={selectedShopId}
                    onSelectShop={onSelectShop}
                    center={displayCenter}
                />
            )}


        </div>
    );
}
