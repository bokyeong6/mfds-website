'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import { useAppStore } from '../../store/useAppStore';
import { Specimen, PharmacItem } from '../../types';
import DetailPanel from './DetailPanel';
import { Search, RotateCcw } from 'lucide-react';

// Subcomponent to recenter map dynamically
function MapRecenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

// Subcomponent that manages marker clusters directly with Leaflet L.markerClusterGroup
function MarkerClusterGroup({
  specimens,
  specimenToPharmacMap,
  onMarkerClick,
}: {
  specimens: Specimen[];
  specimenToPharmacMap: Map<string, PharmacItem>;
  onMarkerClick: (specimen: Specimen) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Create marker cluster group
    const mcg = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let bgClass = 'bg-blue-600/90 text-blue-50';
        let ringClass = 'ring-blue-500/30';
        
        // Count how many specimens in cluster are joined (pharmacopoeia available)
        const childMarkers = cluster.getAllChildMarkers();
        let greenCount = 0;
        childMarkers.forEach((m) => {
          const markerWithPharma = m as L.Marker & { options: { isPharmaJoined?: boolean } };
          if (markerWithPharma.options.isPharmaJoined) {
            greenCount++;
          }
        });
        
        if (greenCount > count * 0.5) {
          // If more than half are green markers
          bgClass = 'bg-emerald-600/90 text-emerald-50';
          ringClass = 'ring-emerald-500/30';
        }
        
        return L.divIcon({
          className: 'custom-cluster-marker',
          html: `<div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xl ring-4 ${bgClass} ${ringClass}">
            ${count.toLocaleString()}
          </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
      },
    });

    const addedMarkers: L.Marker[] = [];

    // Add individual markers
    specimens.forEach((s) => {
      if (!s.lat || !s.lng) return;
      
      const hasPharma = specimenToPharmacMap.has(s.managementId);
      
      const icon = L.divIcon({
        className: 'custom-specimen-marker',
        html: `<div class="w-5 h-5 rounded-full border-2 border-slate-900 shadow-md flex items-center justify-center transition-all duration-150 hover:scale-125 hover:border-white
          ${hasPharma ? 'bg-emerald-500 ring-2 ring-emerald-500/40' : 'bg-blue-500 ring-2 ring-blue-500/40'}"
          title="${s.korName || s.herbName} (${s.managementId})">
        </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([s.lat, s.lng], {
        icon,
      } as L.MarkerOptions);
      
      const markerOptions = marker.options as L.MarkerOptions & { isPharmaJoined?: boolean };
      markerOptions.isPharmaJoined = hasPharma;
      
      marker.on('click', () => {
        onMarkerClick(s);
      });

      mcg.addLayer(marker);
      addedMarkers.push(marker);
    });

    map.addLayer(mcg);

    return () => {
      try {
        if (map && typeof map.hasLayer === 'function' && map.hasLayer(mcg)) {
          map.removeLayer(mcg);
        }
      } catch (e) {
        console.warn('Leaflet MarkerCluster cleanup warning ignored:', e);
      }
    };
  }, [map, specimens, specimenToPharmacMap, onMarkerClick]);

  return null;
}

export default function MapView() {
  const specimens = useAppStore((state) => state.specimens);
  const specimenToPharmacMap = useAppStore((state) => state.specimenToPharmacMap);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');
  const [selectedImportance, setSelectedImportance] = useState('');
  const [selectedPharma, setSelectedPharma] = useState('');
  
  // Selected Specimen Detail Panel State
  const [selectedSpecimen, setSelectedSpecimen] = useState<Specimen | null>(null);
  const [recenterCenter, setRecenterCenter] = useState<[number, number] | null>(null);

  // Extract unique families from specimens
  const families = useMemo(() => {
    const set = new Set<string>();
    specimens.forEach((s) => {
      if (s.family) set.add(s.family.trim());
    });
    return Array.from(set).sort();
  }, [specimens]);

  // Extract unique importances
  const importances = ['A1', 'A2', 'B1', 'B2-1', 'B2-2', 'B2-3', 'B2-4'];

  // Handle markers filtering
  const filteredSpecimens = useMemo(() => {
    return specimens.filter((s) => {
      // Exclude invalid coordinates
      if (!s.lat || !s.lng || s.lat < 10 || s.lat > 90) return false;

      // Text search: matches management ID, herbName, or korName
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const managementMatch = s.managementId?.toLowerCase().includes(query);
        const herbMatch = s.herbName?.toLowerCase().includes(query);
        const korMatch = s.korName?.toLowerCase().includes(query);
        if (!managementMatch && !herbMatch && !korMatch) return false;
      }

      // Family filter
      if (selectedFamily && s.family !== selectedFamily) {
        return false;
      }

      // Importance filter
      if (selectedImportance && s.importance !== selectedImportance) {
        return false;
      }

      // Pharmacopoeia filter
      if (selectedPharma) {
        const hasPharma = specimenToPharmacMap.has(s.managementId);
        const joined = specimenToPharmacMap.get(s.managementId);
        
        if (selectedPharma === 'KP') {
          if (!hasPharma || joined?.pharmacopoeia !== 'KP') return false;
        } else if (selectedPharma === 'KHP') {
          if (!hasPharma || joined?.pharmacopoeia !== 'KHP') return false;
        } else if (selectedPharma === 'NONE') {
          if (hasPharma) return false;
        }
      }

      return true;
    });
  }, [specimens, searchTerm, selectedFamily, selectedImportance, selectedPharma, specimenToPharmacMap]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedFamily('');
    setSelectedImportance('');
    setSelectedPharma('');
  };

  const handleMarkerClick = (specimen: Specimen) => {
    setSelectedSpecimen(specimen);
    setRecenterCenter([specimen.lat, specimen.lng]);
  };

  // Perform search highlighting (centers on the first matching item)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredSpecimens.length > 0) {
      const first = filteredSpecimens[0];
      setRecenterCenter([first.lat, first.lng]);
      setSelectedSpecimen(first);
    }
  };

  const selectedPharmacItem = selectedSpecimen
    ? specimenToPharmacMap.get(selectedSpecimen.managementId) || null
    : null;

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950">
      {/* Top Filter Bar */}
      <div className="z-[1010] p-4 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="생약명, 국명 또는 관리번호 검색"
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Family Filter */}
          <select
            value={selectedFamily}
            onChange={(e) => setSelectedFamily(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-slate-300 py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 max-w-[160px]"
          >
            <option value="">과명 전체 ({families.length}종)</option>
            {families.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          {/* Pharmacopoeia Filter */}
          <select
            value={selectedPharma}
            onChange={(e) => setSelectedPharma(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-slate-300 py-2 px-3 text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">공정서 전체</option>
            <option value="KP">KP 등재 품목</option>
            <option value="KHP">KHP 등재 품목</option>
            <option value="NONE">미등재 품목</option>
          </select>

          {/* Importance Filter */}
          <select
            value={selectedImportance}
            onChange={(e) => setSelectedImportance(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-slate-300 py-2 px-3 text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">중요도 전체</option>
            {importances.map((imp) => (
              <option key={imp} value={imp}>
                {imp}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          <button
            onClick={handleResetFilters}
            title="필터 초기화"
            className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            초기화
          </button>
        </div>

        {/* Info label */}
        <div className="text-xs text-slate-400 ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            공정서 등재 ({specimens.filter((s) => specimenToPharmacMap.has(s.managementId)).length}건)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            미등재 ({specimens.filter((s) => !specimenToPharmacMap.has(s.managementId)).length}건)
          </span>
          <span className="text-slate-500">|</span>
          <span className="font-semibold text-slate-300">
            필터 결과: {filteredSpecimens.length.toLocaleString()}건
          </span>
        </div>
      </div>

      {/* Map Element */}
      <div className="flex-1 w-full h-full relative z-[100]">
        <MapContainer
          center={[36.27, 127.72]}
          zoom={7}
          className="w-full h-full"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapRecenter center={recenterCenter} />

          <MarkerClusterGroup
            specimens={filteredSpecimens}
            specimenToPharmacMap={specimenToPharmacMap}
            onMarkerClick={handleMarkerClick}
          />
        </MapContainer>

        {/* Selected Specimen Detail Panel */}
        <DetailPanel
          specimen={selectedSpecimen}
          pharmacItem={selectedPharmacItem}
          onClose={() => setSelectedSpecimen(null)}
        />
      </div>
    </div>
  );
}
