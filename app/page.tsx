'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Map, { Shop } from '@/components/Map';
import ClaimModal from '@/components/ClaimModal';
import MobileNavigation, { TabType } from '@/components/MobileNavigation';
import ProfileView from '@/components/ProfileView';
import { RefreshCw, Timer, Home as HomeIcon, List, User, ShieldCheck } from 'lucide-react';

const COOLDOWN_MS = 1 * 60 * 1000; // 1 minutes

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
  const [myBilledCount, setMyBilledCount] = useState<number | null>(null);

  // Claim Modal State
  const [claimShop, setClaimShop] = useState<Shop | null>(null);

  // Mobile Tab State
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [isAdmin, setIsAdmin] = useState(false);

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

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) return;
        const data = await res.json();
        setIsAdmin(data?.user?.role === 'admin');
      } catch {
        setIsAdmin(false);
      }
    };

    fetchMe();
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
        if (typeof data.billedCount === 'number') {
          setMyBilledCount(data.billedCount);
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
    <main className="h-[100dvh] w-full bg-slate-50 overflow-hidden font-sans flex flex-col">
      <div className="hidden md:flex items-center justify-center gap-2 py-3 border-b border-slate-200 bg-white shrink-0">
        <button
          onClick={() => setActiveTab('map')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'map' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <HomeIcon className="w-4 h-4" />
          Map
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'list' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <List className="w-4 h-4" />
          List
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          <User className="w-4 h-4" />
          Profile
        </button>
        {isAdmin && (
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors bg-amber-100 text-amber-800 hover:bg-amber-200"
          >
            <ShieldCheck className="w-4 h-4" />
            Admin Control
          </Link>
        )}
      </div>

      <div className="flex-1 min-h-0 relative pb-[70px] md:pb-0">
        {activeTab === 'list' && (
          <div className="w-full h-full md:max-w-[900px] md:mx-auto">
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
        )}

        {activeTab === 'map' && (
          <div className="w-full h-full relative z-10 bg-slate-100">
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 z-[1000] flex flex-col md:flex-row items-center gap-2 md:gap-3 w-max">
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

              {dataSource && (
                <div className="px-2.5 md:px-3 py-1 md:py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 text-[10px] md:text-xs font-bold flex items-center gap-1.5 md:gap-2">
                  <div className={`w-2 h-2 rounded-full ${dataSource === 'live_google' ? 'bg-amber-500 animate-pulse' :
                    dataSource === 'redis_cache' ? 'bg-red-500' :
                      dataSource === 'memory_cache' ? 'bg-green-500' :
                        'bg-emerald-500'
                    }`} />
                  <span className="text-slate-600 uppercase tracking-wider">
                    {dataSource === 'live_google' ? 'Live API (Billed)' :
                      dataSource === 'redis_cache' ? 'Redis Cloud Hit (Free)' :
                        dataSource === 'memory_cache' ? 'RAM Cache Hit (Free)' :
                          'Supabase Hit (Free)'}
                  </span>
                </div>
              )}
              {myBilledCount !== null && (
                <div className="px-2.5 md:px-3 py-1 md:py-1.5 rounded-full bg-rose-50 shadow-lg border border-rose-200 text-[10px] md:text-xs font-bold flex items-center gap-1.5 md:gap-2 text-rose-700">
                  My Billed Hits: {myBilledCount}
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
        )}

        {activeTab === 'profile' && (
          <div className="w-full h-full md:max-w-[720px] md:mx-auto bg-white">
            <ProfileView />
          </div>
        )}
      </div>

      <MobileNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      {isAdmin && (
        <Link
          href="/admin/dashboard"
          className="md:hidden fixed top-3 right-3 z-[2500] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-sm"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Admin
        </Link>
      )}

      <ClaimModal
        isOpen={!!claimShop}
        shop={claimShop}
        onClose={() => setClaimShop(null)}
      />
    </main>
  );
}
