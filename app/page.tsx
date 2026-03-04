'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Map, { Shop } from '@/components/Map';
import ClaimModal from '@/components/ClaimModal';

export default function Home() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [center, setCenter] = useState<{ lat: number, lng: number } | null>(null);
  const [radius, setRadius] = useState(1000); // Default 1km

  // Claim Modal State
  const [claimShop, setClaimShop] = useState<Shop | null>(null);

  // 1. Ask for location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location", error);
          // Fallback to Hyderabad
          setCenter({ lat: 17.3850, lng: 78.4867 });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setCenter({ lat: 17.3850, lng: 78.4867 });
    }
  }, []);

  // 2. Fetch shops when center or radius changes
  useEffect(() => {
    if (!center) return; // Wait until location is acquired

    async function fetchShops(currentCenter: { lat: number, lng: number }) {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/places/nearby?lat=${currentCenter.lat}&lng=${currentCenter.lng}&radius=${radius}`);
        const data = await response.json();
        if (data.shops) {
          setShops(data.shops);
        }
      } catch (error) {
        console.error('Failed to fetch shops', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchShops(center);
  }, [center, radius]);

  return (
    <main className="flex h-screen w-full bg-slate-50 overflow-hidden flex-col md:flex-row font-sans">
      {/* Sidebar - Side on desktop, Bottom/Scrollable on Mobile */}
      <div className="w-full md:w-[450px] lg:w-[500px] h-[55vh] md:h-full flex-shrink-0 relative z-20 shadow-xl">
        <Sidebar
          shops={shops}
          isLoading={isLoading}
          selectedShopId={selectedShopId}
          onSelectShop={setSelectedShopId}
          onClaimShop={setClaimShop}
          radius={radius}
          onRadiusChange={setRadius}
        />
      </div>

      {/* Map - Main view */}
      <div className="flex-1 h-[45vh] md:h-full relative z-10 w-full bg-slate-100">
        <Map
          shops={shops}
          selectedShopId={selectedShopId}
          onSelectShop={setSelectedShopId}
          center={center}
        />
      </div>

      <ClaimModal
        isOpen={!!claimShop}
        shop={claimShop}
        onClose={() => setClaimShop(null)}
      />
    </main>
  );
}
