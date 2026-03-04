'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Compass } from 'lucide-react';
import ShopCard from './ShopCard';
import type { Shop } from './Map';

const categories = ['All', 'Kirana', 'Medical', 'Bakery', 'Service'];
const radiiOptions = [
    { label: '200m', value: 200 },
    { label: '500m', value: 500 },
    { label: '1km', value: 1000 },
    { label: '5km', value: 5000 }
];

interface SidebarProps {
    shops: Shop[];
    isLoading: boolean;
    selectedShopId: string | null;
    onSelectShop: (id: string) => void;
    radius: number;
    onRadiusChange: (radius: number) => void;
    userLocation: { lat: number, lng: number } | null;
}

export default function Sidebar({ shops, isLoading, selectedShopId, onSelectShop, radius, onRadiusChange, userLocation }: SidebarProps) {
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const listRef = useRef<HTMLDivElement>(null);

    // Filter shops based on category AND search query
    const filteredShops = shops.filter(shop => {
        const matchesCategory = activeCategory === 'All' || shop.category === activeCategory;
        const matchesSearch = shop.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Scroll to selected shop when selected via map
    useEffect(() => {
        if (selectedShopId && listRef.current) {
            const element = document.getElementById(`shop-${selectedShopId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [selectedShopId]);

    return (
        <div className="w-full h-full bg-slate-50 flex flex-col border-r border-slate-200 shadow-2xl z-20 overflow-hidden">
            {/* Header / Search */}
            <div className="px-5 pt-5 pb-3 bg-white border-b border-slate-100 shrink-0 shadow-sm relative z-10 flex flex-col">
                <div className="mb-4">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Local Shop Finder</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Discover hidden gems in your neighborhood</p>
                </div>

                <div className="relative mb-3">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search nearby shops..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm placeholder:text-slate-400 font-medium text-slate-800"
                    />
                </div>

                {/* Radius Selector */}
                <div className="flex items-center gap-2 mb-3">
                    <Compass className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500">Search within:</span>
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                        {radiiOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => onRadiusChange(opt.value)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${radius === opt.value
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-2 px-2">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${activeCategory === cat
                                ? 'bg-slate-900 text-white shadow-md scale-105'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 relative">
                <div className="flex items-center justify-between mb-2 px-2 sticky top-0 bg-slate-50/90 backdrop-blur-sm p-2 z-10 rounded-lg">
                    <h2 className="text-sm font-bold text-slate-800">Nearby Results</h2>
                    <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded-full">{filteredShops.length} shops</span>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-10 text-slate-400 space-y-3">
                        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                        <p className="text-sm font-medium animate-pulse">Scanning area...</p>
                    </div>
                ) : filteredShops.length === 0 ? (
                    <div className="text-center p-8 text-slate-500">
                        No shops found matching your criteria.
                    </div>
                ) : (
                    filteredShops.map((shop) => (
                        <div
                            key={shop.id}
                            id={`shop-${shop.id}`}
                            className={`transition-all duration-300 rounded-2xl ${selectedShopId === shop.id ? 'ring-2 ring-blue-500 ring-offset-2 scale-[1.02] shadow-lg bg-blue-50/30' : ''}`}
                        >
                            <ShopCard
                                shop={shop}
                                onClick={() => onSelectShop(shop.id)}
                                userLocation={userLocation}
                            />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
