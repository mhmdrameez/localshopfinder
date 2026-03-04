'use client';

import React, { useState } from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
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
    const [mapProvider, setMapProvider] = useState<'osm' | 'google' | 'ola'>('ola'); // Defaulting to Ola Maps

    return (
        <div className="w-full h-full relative">
            <div className="absolute top-4 right-4 z-[1000] flex gap-2">
                <div className="bg-white/90 backdrop-blur-sm p-1 rounded-xl shadow-lg border border-slate-200 flex items-center">
                    <button
                        onClick={() => setMapProvider('google')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${mapProvider === 'google' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Google
                    </button>
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

            {mapProvider === 'google' && (
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

                        {/* Current Location Marker */}
                        {displayCenter && (
                            <AdvancedMarker
                                position={displayCenter}
                                zIndex={1000} // Ensure it's above shop pins
                            >
                                <div className="relative flex items-center justify-center">
                                    <div className="absolute w-8 h-8 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                                    <div className="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
                                </div>
                            </AdvancedMarker>
                        )}
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
