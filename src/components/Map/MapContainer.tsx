'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const DynamicMap = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium animate-pulse">지도를 불러오는 중...</p>
      </div>
    </div>
  ),
});

export default function MapContainer() {
  return <DynamicMap />;
}
