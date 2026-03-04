'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shop } from './Map';

// Fix Leaflet's default icon path issues with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons
const optimizedIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const underOptimizedIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const selectedIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface OpenStreetMapProps {
    shops: Shop[];
    selectedShopId: string | null;
    onSelectShop: (id: string) => void;
    center: { lat: number; lng: number };
}

function MapUpdater({ center, selectedShopId, shops }: { center: { lat: number, lng: number }, selectedShopId: string | null, shops: Shop[] }) {
    const map = useMap();

    useEffect(() => {
        if (selectedShopId) {
            const shop = shops.find(s => s.id === selectedShopId);
            if (shop) {
                map.flyTo([shop.lat, shop.lng], 17, { animate: true });
            }
        } else {
            map.flyTo([center.lat, center.lng], 16, { animate: true });
        }
    }, [selectedShopId, map, shops, center]);

    return null;
}

export default function OpenStreetMap({ shops, selectedShopId, onSelectShop, center }: OpenStreetMapProps) {
    return (
        <div className="w-full h-full relative z-0">
            <MapContainer center={[center.lat, center.lng]} zoom={16} style={{ height: '100%', width: '100%', zIndex: 0 }} zoomControl={true}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {shops.map(shop => {
                    const isSelected = selectedShopId === shop.id;
                    const isOptimized = shop.rating >= 4.0 && shop.hasPhone && shop.isClaimed;

                    let icon = isOptimized ? optimizedIcon : underOptimizedIcon;
                    if (isSelected) {
                        icon = selectedIcon;
                    }

                    return (
                        <Marker
                            key={shop.id}
                            position={[shop.lat, shop.lng]}
                            icon={icon}
                            eventHandlers={{
                                click: () => onSelectShop(shop.id),
                            }}
                        />
                    );
                })}
                <MapUpdater center={center} selectedShopId={selectedShopId} shops={shops} />
            </MapContainer>
        </div>
    );
}
