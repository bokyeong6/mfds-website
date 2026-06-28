'use client';

import React from 'react';
import MapContainer from '../components/Map/MapContainer';

export default function Home() {
  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950">
      <MapContainer />
    </div>
  );
}
