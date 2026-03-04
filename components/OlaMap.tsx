'use client';

import React, { useMemo } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Shop } from './Map';
import { Pin } from '@vis.gl/react-google-maps';

interface OlaMapProps {
    shops: Shop[];
    selectedShopId: string | null;
    onSelectShop: (id: string) => void;
    center: { lat: number, lng: number };
}

export default function OlaMap({ shops, selectedShopId, onSelectShop, center }: OlaMapProps) {
    const apiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY || '';

    const mapStyle = useMemo(() => {
        return `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json?api_key=${apiKey}`;
    }, [apiKey]);

    if (!apiKey) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-100 p-6 text-center">
                <div className="bg-white rounded-xl shadow-md p-6 max-w-md border border-red-100">
                    <h3 className="text-red-600 font-bold mb-2">Missing API Key</h3>
                    <p className="text-slate-600 text-sm">Please add <code>NEXT_PUBLIC_OLA_MAPS_API_KEY</code> to your .env.local file to use Ola Maps.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full">
            <Map
                initialViewState={{
                    longitude: center.lng,
                    latitude: center.lat,
                    zoom: 14
                }}
                mapStyle={mapStyle}
                style={{ width: '100%', height: '100%' }}
                transformRequest={(url, resourceType) => {
                    // Prevent appending api_key if it's already there
                    if (url.includes('?api_key=') || url.includes('&api_key=')) {
                        return { url };
                    }

                    const separator = url.includes('?') ? '&' : '?';
                    return {
                        url: `${url}${separator}api_key=${apiKey}`
                    };
                }}
                onError={(e) => {
                    // Suppress specific Ola Maps style warnings that don't break the map
                    if (e.error?.message?.includes('Source layer "3d_model" does not exist')) {
                        return;
                    }
                    console.warn('MapLibre Error:', e.error);
                }}
            >
                {shops.map((shop) => {
                    const isSelected = selectedShopId === shop.id;
                    const isOptimized = shop.rating >= 4.0 && shop.hasPhone && shop.hasWebsite;

                    const pinBackground = isOptimized ? '#3b82f6' : '#f59e0b';
                    const pinBorder = isOptimized ? '#2563eb' : '#d97706';

                    return (
                        <Marker
                            key={shop.id}
                            longitude={shop.lng}
                            latitude={shop.lat}
                            anchor="bottom"
                            onClick={(e) => {
                                e.originalEvent.stopPropagation();
                                onSelectShop(shop.id);
                            }}
                        >
                            <div className={`transition-transform duration-300 cursor-pointer ${isSelected ? 'scale-125' : 'scale-100 hover:scale-110'}`}>
                                <svg
                                    width={isSelected ? "32" : "24"}
                                    height={isSelected ? "42" : "32"}
                                    viewBox="0 0 24 32"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37258 18.6274 0 12 0Z"
                                        fill={pinBackground}
                                        stroke={pinBorder}
                                        strokeWidth="1.5"
                                    />
                                    <circle cx="12" cy="12" r="5" fill="#ffffff" />
                                </svg>
                            </div>
                        </Marker>
                    );
                })}

                {/* Current Location Marker */}
                <Marker
                    longitude={center.lng}
                    latitude={center.lat}
                    anchor="center"
                    style={{ zIndex: 1000 }}
                >
                    <div className="relative flex items-center justify-center">
                        <div className="absolute w-8 h-8 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                        <div className="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
                    </div>
                </Marker>
            </Map>
        </div>
    );
}
