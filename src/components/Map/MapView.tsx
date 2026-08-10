'use client';

console.log('🚩 [MapView.tsx] 파일 로드 완료 (모듈 평가 시작)');

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import { useAppStore } from '../../store/useAppStore';
import { Specimen, PharmacItem } from '../../types';
import DetailPanel from './DetailPanel';
import { Search, RotateCcw } from 'lucide-react';
import { collection, query, where, getDocs, limit, or } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Subcomponent to recenter map dynamically (supports single coordinate centering and fitting multiple bounds)
interface MapRecenterProps {
  center: [number, number] | null;
  bounds: [number, number][] | null;
}

function MapRecenter({ center, bounds }: MapRecenterProps) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      if (bounds.length === 1) {
        map.setView(bounds[0], 13);
      } else {
        // Fit all matching specimens in view, with a limit on maxZoom to avoid over-zooming on close points
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    } else if (center) {
      map.setView(center, 13);
    }
  }, [center, bounds, map]);
  return null;
}

// Subcomponent that manages marker clusters directly with Leaflet L.markerClusterGroup
function MarkerClusterGroup({
  specimens,
  onMarkerClick,
}: {
  specimens: Specimen[];
  onMarkerClick: (specimen: Specimen) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (typeof L.markerClusterGroup !== 'function') {
      console.warn('L.markerClusterGroup is not a function');
      return;
    }

    // Create marker cluster group
    const mcg = L.markerClusterGroup({
      maxClusterRadius: 50,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const childMarkers = cluster.getAllChildMarkers();
        let greenCount = 0;
        let blueCount = 0;
        
        childMarkers.forEach((m) => {
          const marker = m as L.Marker & { options: { isPharmaJoined?: boolean } };
          if (marker.options.isPharmaJoined) {
            greenCount++;
          } else {
            blueCount++;
          }
        });

        let bgClass = 'bg-[#FFFDD0] text-amber-950 border border-amber-300/60'; // Mixed markers (Ivory)
        let ringClass = 'ring-amber-200/40';
        
        if (greenCount > 0 && blueCount === 0) {
          // 100% Registered (Green)
          bgClass = 'bg-emerald-600/95 text-emerald-50 border-none';
          ringClass = 'ring-emerald-500/30';
        } else if (blueCount > 0 && greenCount === 0) {
          // 100% Unregistered (Blue)
          bgClass = 'bg-blue-500/95 text-blue-50 border-none';
          ringClass = 'ring-blue-500/30';
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
    specimens.forEach((s) => {
      if (!s.lat || !s.lng) return;

      const hasPharma = s.pharmacopoeia !== null && s.pharmacopoeia !== undefined;
      
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
        isPharmaJoined: hasPharma 
      } as L.MarkerOptions);

      marker.on('click', () => {
        onMarkerClick(s);
      });

      addedMarkers.push(marker);
    });

    mcg.addLayers(addedMarkers);
    map.addLayer(mcg);

    return () => {
      try {
        if (map && typeof map.hasLayer === 'function' && map.hasLayer(mcg)) {
          map.removeLayer(mcg);
        }
      } catch (e) {
        console.warn('Leaflet MarkerCluster cleanup warning:', e);
      }
    };
  }, [map, specimens, onMarkerClick]);

  return null;
}

export default function MapView() {
  const cachedStats = useAppStore((state) => state.cachedStats);

  // GPS Specimens state
  const [allGpsSpecimens, setAllGpsSpecimens] = useState<Specimen[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');
  const [selectedImportance, setSelectedImportance] = useState('');
  const [selectedPharma, setSelectedPharma] = useState('');
  const [selectedStorage, setSelectedStorage] = useState('');
  const [photoOnly, setPhotoOnly] = useState(false);
  
  // Selected Specimen Detail Panel State
  const [selectedSpecimen, setSelectedSpecimen] = useState<Specimen | null>(null);
  const [selectedPharmacItem, setSelectedPharmacItem] = useState<PharmacItem | null>(null);
  const [recenterCenter, setRecenterCenter] = useState<[number, number] | null>(null);
  const [recenterBounds, setRecenterBounds] = useState<[number, number][] | null>(null);

  // 1. Fetch all specimens with coordinates on mount
  useEffect(() => {
    const loadGpsSpecimens = async () => {
      setLoading(true);
      try {
        const specimensRef = collection(db, 'specimens');
        // Query only specimens that have coordinates (lat != 0)
        const q = query(specimensRef, where('lat', '>', 0));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Specimen));
        setAllGpsSpecimens(list);
      } catch (err) {
        console.error('Failed to load specimens:', err);
      } finally {
        setLoading(false);
      }
    };
    loadGpsSpecimens();
  }, []);

  // 2. Local Filtering
  const filteredSpecimens = useMemo(() => {
    return allGpsSpecimens.filter((s) => {
      if (searchTerm) {
        const term = searchTerm.trim().toLowerCase();
        const managementId = (s.managementId || '').toLowerCase();
        const herbName = (s.herbName || '').toLowerCase();
        const korName = (s.korName || '').toLowerCase();
        if (
          !managementId.includes(term) &&
          !herbName.includes(term) &&
          !korName.includes(term)
        ) {
          return false;
        }
      }
      if (selectedFamily && s.family !== selectedFamily) return false;
      if (selectedImportance && s.importance !== selectedImportance) return false;
      if (selectedStorage && s.storage !== selectedStorage) return false;
      if (photoOnly && (!s.imageUrls || s.imageUrls.length === 0)) return false;
      
      if (selectedPharma) {
        const hasPharma = s.pharmacopoeia !== null && s.pharmacopoeia !== undefined;
        if (selectedPharma === 'KP' && s.pharmacopoeia !== 'KP') return false;
        if (selectedPharma === 'KHP' && s.pharmacopoeia !== 'KHP') return false;
        if (selectedPharma === 'REGISTERED' && !hasPharma) return false;
        if (selectedPharma === 'NONE' && hasPharma) return false;
      }
      return true;
    });
  }, [allGpsSpecimens, searchTerm, selectedFamily, selectedImportance, selectedPharma, selectedStorage, photoOnly]);

  // 3. Recenter/fit bounds when search is applied or updated
  useEffect(() => {
    if (searchTerm && filteredSpecimens.length > 0) {
      const validCoords = filteredSpecimens.filter((s) => s.lat && s.lng);
      if (validCoords.length > 0) {
        const coords = validCoords.map((s) => [s.lat, s.lng] as [number, number]);
        setRecenterCenter(null);
        setRecenterBounds(coords);
        setSelectedSpecimen(validCoords[0]);
      }
    }
  }, [searchTerm, filteredSpecimens]);

  // Fetch pharmacopoeia details asynchronously when a specimen is clicked
  useEffect(() => {
    if (!selectedSpecimen) {
      setSelectedPharmacItem(null);
      return;
    }
    const fetchPharmacDetails = async () => {
      try {
        const q = query(
          collection(db, 'pharmacopoeia'),
          where('specimenIds', 'array-contains', selectedSpecimen.managementId)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setSelectedPharmacItem({ ...snap.docs[0].data(), id: snap.docs[0].id } as PharmacItem);
        } else {
          setSelectedPharmacItem(null);
        }
      } catch (err) {
        console.error('Failed to load pharmacopoeia details:', err);
        setSelectedPharmacItem(null);
      }
    };
    fetchPharmacDetails();
  }, [selectedSpecimen]);

  // Listen to search query parameter from URL to dynamically filter specimens on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryVal = params.get('search');
      const pharmaQuery = params.get('pharma');
      if (queryVal) {
        setSearchTerm(queryVal);
        if (pharmaQuery) {
          setSelectedPharma(pharmaQuery);
        } else {
          setSelectedPharma('REGISTERED');
        }
      }
    }
  }, []);

  // Filter dropdown configuration values from cached stats
  const families = useMemo(() => {
    return (cachedStats?.familiesTableData || []).map((f: any) => f.family as string).sort();
  }, [cachedStats]);

  const storageRooms = useMemo(() => {
    return (cachedStats?.storageStatsList || []).map((s: any) => s.storageName as string).sort();
  }, [cachedStats]);

  const importances = ['A1', 'A2', 'B1', 'B2-1', 'B2-2', 'B2-3', 'B2-4'];

  const familyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (cachedStats?.familiesTableData || []).forEach((f: any) => {
      counts[f.family] = f.count;
    });
    return counts;
  }, [cachedStats]);

  const importanceCounts = useMemo(() => {
    return cachedStats?.globalImportanceCounts || {};
  }, [cachedStats]);

  const pharmaCounts = useMemo(() => {
    const donut = cachedStats?.donutData || [];
    const kp = (donut.find((d: any) => d.name === 'KP 등재')?.value || 0) + 
               (donut.find((d: any) => d.name === 'KP & KHP 공동 등재')?.value || 0);
    const khp = (donut.find((d: any) => d.name === 'KHP 등재')?.value || 0) + 
                (donut.find((d: any) => d.name === 'KP & KHP 공동 등재')?.value || 0);
    const none = donut.find((d: any) => d.name === '미등재 표본')?.value || 0;
    const total = cachedStats?.totalSpecimensCount || 0;
    return { kp, khp, none, total };
  }, [cachedStats]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedFamily('');
    setSelectedImportance('');
    setSelectedPharma('');
    setSelectedStorage('');
    setPhotoOnly(false);
  };

  const handleMarkerClick = useCallback((specimen: Specimen) => {
    setSelectedSpecimen(specimen);
    setRecenterBounds(null); // Clear bounds
    setRecenterCenter([specimen.lat, specimen.lng]);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-50">
      {/* Top Filter Bar */}
      <div className="z-[1010] p-4 bg-white/90 border-b border-slate-200 backdrop-blur-md flex flex-col gap-3">
        {/* Row 1: Search Form & Dropdown Selectors */}
        <div className="flex flex-wrap items-center gap-3 w-full">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="생약명, 국명 또는 관리번호 검색"
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {/* Family Filter */}
            <select
              value={selectedFamily}
              onChange={(e) => setSelectedFamily(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg text-slate-700 py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 max-w-[210px] truncate"
            >
              <option value="">과명 전체 ({families.length}종)</option>
              {families.map((f: string) => (
                <option key={f} value={f}>
                  {f} ({(familyCounts[f] || 0).toLocaleString()}건)
                </option>
              ))}
            </select>

            {/* Pharmacopoeia Filter */}
            <select
              value={selectedPharma}
              onChange={(e) => setSelectedPharma(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg text-slate-700 py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 max-w-[210px] truncate"
            >
              <option value="">표본전체</option>
              <option value="REGISTERED">공정서 등재 품목 (KP + KHP) ({(pharmaCounts.kp + pharmaCounts.khp).toLocaleString()}건)</option>
              <option value="KP">KP 등재 품목 ({pharmaCounts.kp.toLocaleString()}건)</option>
              <option value="KHP">KHP 등재 품목 ({pharmaCounts.khp.toLocaleString()}건)</option>
              <option value="NONE">미등재 품목 ({pharmaCounts.none.toLocaleString()}건)</option>
            </select>

            {/* Importance Filter */}
            <select
              value={selectedImportance}
              onChange={(e) => setSelectedImportance(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg text-slate-700 py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 max-w-[180px] truncate"
            >
              <option value="">중요도 전체</option>
              {importances.map((imp) => (
                <option key={imp} value={imp}>
                  {imp} ({(importanceCounts[imp] || 0).toLocaleString()}건)
                </option>
              ))}
            </select>

            {/* Reset Filters */}
            <button
              onClick={handleResetFilters}
              title="필터 초기화"
              className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              초기화
            </button>
          </div>
        </div>

        {/* Row 2: Storage Room pills & Photo Toggle & Result Info */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-t border-slate-100 pt-3 w-full">
          <div className="flex flex-wrap items-center gap-3">
            {/* Storage Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
              <span className="text-xs font-bold text-slate-500 shrink-0 mr-1 flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
                수장고 필터:
              </span>
              <button
                onClick={() => setSelectedStorage('')}
                className={`px-3 py-1.5 border rounded-lg text-xs font-semibold shadow-sm transition-all shrink-0 ${
                  selectedStorage === ''
                    ? 'bg-emerald-500 text-white border-emerald-500 font-bold'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                전체 ({pharmaCounts.total.toLocaleString()})
              </button>
              {storageRooms.map((room: string) => {
                const count = (cachedStats?.storageStatsList || []).find((s: any) => s.storageName === room)?.total || 0;
                return (
                  <button
                    key={room}
                    onClick={() => setSelectedStorage(room)}
                    className={`px-3 py-1.5 border rounded-lg text-xs font-semibold shadow-sm transition-all shrink-0 ${
                      selectedStorage === room
                        ? 'bg-emerald-500 text-white border-emerald-500 font-bold'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {room} ({count.toLocaleString()})
                  </button>
                );
              })}
            </div>

            <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>

            {/* Photo Toggle Button */}
            <button
              onClick={() => setPhotoOnly(!photoOnly)}
              className={`px-3 py-1.5 border rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 shrink-0 ${
                photoOnly
                  ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-md shadow-emerald-500/10'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <span>📷</span>
              사진 보유 표본만 보기
            </button>
          </div>

          {/* Info label */}
          <div className="text-xs text-slate-500 flex items-center gap-2 sm:ml-auto shrink-0">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              공정서 등재 ({filteredSpecimens.filter((s) => s.pharmacopoeia !== null).length}건)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              미등재 ({filteredSpecimens.filter((s) => s.pharmacopoeia === null).length}건)
            </span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              현재 지도 마커: {filteredSpecimens.length.toLocaleString()}건
            </span>
          </div>
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

          <MapRecenter center={recenterCenter} bounds={recenterBounds} />

          <MarkerClusterGroup
            specimens={filteredSpecimens}
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
