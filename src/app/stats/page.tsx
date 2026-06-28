'use client';

import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import FamilyStats from '../../components/Stats/FamilyStats';
import PharmaStats from '../../components/Stats/PharmaStats';
import { BarChart3, ClipboardList } from 'lucide-react';

export default function StatsPage() {
  const [statsTab, setStatsTab] = useState<'family' | 'pharmacopoeia'>('family');
  const isInitialized = useAppStore((state) => state.isInitialized);
  const isLoading = useAppStore((state) => state.isLoading);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-slate-400">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium animate-pulse">통계 데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <p className="text-lg font-medium">데이터가 초기화되지 않았습니다.</p>
        <p className="text-sm text-slate-500 mt-1">사이드바 설정 또는 메인 화면에서 엑셀 데이터를 먼저 로드해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">통계 및 분석</h1>
          <p className="text-sm text-slate-400 mt-1">
            제주센터의 수집된 표본 분포와 공정서 등재 생약 현황을 비교·분석합니다.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
          <button
            onClick={() => setStatsTab('family')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all
              ${
                statsTab === 'family'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <BarChart3 className="w-4 h-4" />
            과명별 분포
          </button>
          <button
            onClick={() => setStatsTab('pharmacopoeia')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all
              ${
                statsTab === 'pharmacopoeia'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <ClipboardList className="w-4 h-4" />
            공정서별 현황
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-[500px]">
        {statsTab === 'family' ? <FamilyStats /> : <PharmaStats />}
      </div>
    </div>
  );
}
