'use client';

import React from 'react';
import { Home, List, User } from 'lucide-react';

export type TabType = 'map' | 'list' | 'profile';

interface MobileNavigationProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

export default function MobileNavigation({ activeTab, onTabChange }: MobileNavigationProps) {
    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-2 px-6 flex justify-between items-center z-[2000] pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <button
                onClick={() => onTabChange('map')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'map' ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Home className={`w-5 h-5 ${activeTab === 'map' ? 'fill-indigo-100' : ''}`} />
                <span className="text-[10px] font-bold">Map</span>
            </button>
            <button
                onClick={() => onTabChange('list')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'list' ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <List className={`w-5 h-5 ${activeTab === 'list' ? 'fill-indigo-100' : ''}`} />
                <span className="text-[10px] font-bold">List</span>
            </button>
            <button
                onClick={() => onTabChange('profile')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'profile' ? 'text-indigo-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <User className={`w-5 h-5 ${activeTab === 'profile' ? 'fill-indigo-100' : ''}`} />
                <span className="text-[10px] font-bold">Profile</span>
            </button>
        </div>
    );
}
