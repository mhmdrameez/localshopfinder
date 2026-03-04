'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Map, { Shop } from '@/components/Map';
import ClaimModal from '@/components/ClaimModal';
import { RefreshCw, Timer } from 'lucide-react';

const COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes

export default function Home() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [center, setCenter] = useState<{ lat: number, lng: number } | null>(null);
  const [radius, setRadius] = useState(1000); // Default 1km

  // Cooldown State
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
          console.warn("Error getting location:", error.message || "Unknown error");
          // Fallback to Hyderabad
          setCenter({ lat: 17.3850, lng: 78.4867 });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setCenter({ lat: 17.3850, lng: 78.4867 });
    }
  }, []);

  // 2. Cooldown timer effect
  useEffect(() => {
    const storedTimestamp = localStorage.getItem('last_google_api_fetch');
    if (storedTimestamp) {
      const diff = Date.now() - parseInt(storedTimestamp, 10);
      if (diff < COOLDOWN_MS) {
        setTimeRemaining(Math.floor((COOLDOWN_MS - diff) / 1000));
      }
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRefreshing]);

  // 3. Fetch shops from Supabase/API
  const fetchShops = async (currentCenter: { lat: number, lng: number }, force = false) => {
    setIsLoading(true);
    if (force) {
      setIsRefreshing(true);
      localStorage.setItem('last_google_api_fetch', Date.now().toString());
      setTimeRemaining(COOLDOWN_MS / 1000); // Trigger visual cooldown
    }

    try {
      const response = await fetch(`/api/places/nearby?lat=${currentCenter.lat}&lng=${currentCenter.lng}&radius=${radius}${force ? '&forceFetch=true' : ''}`);
      const data = await response.json();

      if (data.shops) {
        setShops(data.shops);
      }
    } catch (error) {
      console.error('Failed to fetch shops', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!center) return;
    fetchShops(center);
  }, [center, radius]);

  const handleForceRefresh = () => {
    if (timeRemaining > 0 || !center) return;
    fetchShops(center, true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <main className="flex h-screen w-full bg-slate-50 overflow-hidden flex-col md:flex-row font-sans">
      {/* Sidebar - Side on desktop, Bottom/Scrollable on Mobile */}
      <div className="w-full md:w-[450px] lg:w-[500px] h-[55vh] md:h-full flex-shrink-0 relative z-20 shadow-xl">
        <Sidebar
          shops={shops}
          isLoading={isLoading}
          selectedShopId={selectedShopId}
          onSelectShop={setSelectedShopId}
          radius={radius}
          onRadiusChange={setRadius}
          userLocation={center}
        />
      </div>

      {/* Map - Main view */}
      <div className="flex-1 h-[45vh] md:h-full relative z-10 w-full bg-slate-100">

        {/* Fetch Overlay Button */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000]">
          <button
            onClick={handleForceRefresh}
            disabled={timeRemaining > 0 || isRefreshing}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold shadow-xl transition-all border
                    ${timeRemaining > 0
                ? 'bg-white/90 text-slate-400 border-slate-200 cursor-not-allowed backdrop-blur-sm'
                : 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700 hover:scale-105 active:scale-95'
              }`}
          >
            {isRefreshing ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Fetching Live Data...</>
            ) : timeRemaining > 0 ? (
              <><Timer className="w-4 h-4" /> Wait {formatTime(timeRemaining)}</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> Fetch Latest Map Data</>
            )}
          </button>
        </div>

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
