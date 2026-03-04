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
  const [dataSource, setDataSource] = useState<string | null>(null);

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
        if (data.source) {
          setDataSource(data.source);
        }
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
    <main className="flex h-[100dvh] w-full bg-slate-50 overflow-hidden flex-col md:flex-row font-sans">
      {/* Sidebar - Side on desktop, Bottom/Scrollable Drawer on Mobile */}
      <div className="w-full md:w-[420px] lg:w-[480px] h-[40dvh] md:h-full flex-shrink-0 relative z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] md:shadow-xl bg-white overflow-hidden order-last md:order-first rounded-t-2xl md:rounded-none">
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

      {/* Map - Main view (Takes Top Priority on Mobile) */}
      <div className="flex-1 h-[60dvh] md:h-full relative z-10 w-full bg-slate-100 order-first md:order-last">

        {/* Bottom map controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 z-[1000] flex flex-col md:flex-row items-center gap-2 md:gap-3 w-max">
          {/* Fetch Latest Button */}
          <button
            onClick={handleForceRefresh}
            disabled={timeRemaining > 0 || isRefreshing}
            className={`flex items-center gap-1.5 md:gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full font-bold shadow-md transition-all border text-xs md:text-sm
                    ${timeRemaining > 0
                ? 'bg-white/90 text-slate-400 border-slate-200 cursor-not-allowed backdrop-blur-sm'
                : 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700 hover:scale-105 active:scale-95'
              }`}
          >
            {isRefreshing ? (
              <><RefreshCw className="w-3 h-3 md:w-4 md:h-4 animate-spin" /> Fetching...</>
            ) : timeRemaining > 0 ? (
              <><Timer className="w-3 h-3 md:w-4 md:h-4" /> Wait {formatTime(timeRemaining)}</>
            ) : (
              <><RefreshCw className="w-3 h-3 md:w-4 md:h-4" /> Fetch Latest Data</>
            )}
          </button>

          {/* Data Source Badge Indicator */}
          {dataSource && (
            <div className="px-2.5 md:px-3 py-1 md:py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 text-[10px] md:text-xs font-bold flex items-center gap-1.5 md:gap-2">
              <div className={`w-2 h-2 rounded-full ${dataSource === 'live_google' ? 'bg-amber-500 animate-pulse' :
                dataSource === 'redis_cache' ? 'bg-red-500' :
                  dataSource === 'memory_cache' ? 'bg-green-500' :
                    'bg-emerald-500' // Supabase
                }`} />
              <span className="text-slate-600 uppercase tracking-wider">
                {dataSource === 'live_google' ? 'Live API (Billed)' :
                  dataSource === 'redis_cache' ? 'Redis Cloud Hit (Free)' :
                    dataSource === 'memory_cache' ? 'RAM Cache Hit (Free)' :
                      'Supabase Hit (Free)'}
              </span>
            </div>
          )}
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
