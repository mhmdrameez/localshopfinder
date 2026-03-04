'use client';

import React, { useState } from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import dynamic from 'next/dynamic';
import { Layers } from 'lucide-react';

const OpenStreetMap = dynamic(() => import('./OpenStreetMap'), {
    ssr: false,
    loading: () => <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500 font-medium animate-pulse"><div className="w-8 h-8 rounded-full border-2 border-slate-400 border-t-transparent animate-spin mb-3"></div>Loading OpenStreetMap...</div>
});

export interface Shop {
    id: string;
    name: string;
    category: string;
    rating: number;
    reviews: number;
    distance: string;
    hasPhone: boolean;
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
    const [mapProvider, setMapProvider] = useState<'osm' | 'google'>('osm'); // Defaulting to OSM for immediate visual feedback

    return (
        <div className="w-full h-full relative">
            <div className="absolute top-4 right-4 z-[1000]">
                <button
                    onClick={() => setMapProvider(p => p === 'google' ? 'osm' : 'google')}
                    className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-slate-200 text-sm font-semibold text-slate-700 flex items-center gap-2 hover:bg-white transition-all hover:scale-105 active:scale-95"
                >
                    <Layers className="w-4 h-4 text-blue-500" />
                    {mapProvider === 'google' ? 'Use OpenStreetMap' : 'Use Google Maps'}
                </button>
            </div>

            {mapProvider === 'osm' ? (
                <OpenStreetMap
                    shops={shops}
                    selectedShopId={selectedShopId}
                    onSelectShop={onSelectShop}
                    center={displayCenter}
                />
            ) : (
                <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'MOCK_KEY_FOR_DEV'}>
                    <GoogleMap
                        mapId="local-shop-finder-map"
                        center={displayCenter}
                        defaultZoom={16}
                        gestureHandling={'greedy'}
                        disableDefaultUI={true}
                        className="w-full h-full"
                    >
                        {shops.map(shop => {
                            const isSelected = selectedShopId === shop.id;
                            const isOptimized = shop.rating >= 4.0 && shop.hasPhone && shop.isClaimed;

                            // Highlight under-optimized shops with a distinct color (e.g. Amber/Red) to draw attention
                            const pinBackground = isOptimized ? '#3b82f6' : '#f59e0b'; // blue vs amber
                            const pinBorder = isOptimized ? '#2563eb' : '#d97706';

                            return (
                                <AdvancedMarker
                                    key={shop.id}
                                    position={{ lat: shop.lat, lng: shop.lng }}
                                    onClick={() => onSelectShop(shop.id)}
                                >
                                    <div className={`transition-transform duration-300 ${isSelected ? 'scale-125' : 'scale-100 hover:scale-110'}`}>
                                        <Pin
                                            background={pinBackground}
                                            borderColor={pinBorder}
                                            glyphColor="#fff"
                                            scale={isSelected ? 1.2 : 1}
                                        />
                                    </div>
                                </AdvancedMarker>
                            );
                        })}
                    </GoogleMap>
                </APIProvider>
            )}

            {mapProvider === 'google' && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-100 text-yellow-800 text-xs px-3 py-1.5 rounded-full font-medium shadow-md border border-yellow-200 z-[900] pointer-events-none">
                    Running with Map placeholder (No API Key)
                </div>
            )}
        </div>
    );
}
