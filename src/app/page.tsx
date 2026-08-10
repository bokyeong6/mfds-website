'use client';

import React from 'react';
import Link from 'next/link';
import { Map, BarChart3, Layers, BookOpen, Database, Award, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function Home() {
  const cachedStats = useAppStore((state) => state.cachedStats);

  // Compute stats for counters from cachedStats
  const totalCount = cachedStats?.totalSpecimensCount || 0;
  const registeredCount = cachedStats?.familyMetrics?.joinedCount || 0;
  const familyCount = cachedStats?.familyMetrics?.familyCount || 0;

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between relative overflow-y-auto">
      {/* Background Graphic Accents */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-gradient-to-bl from-emerald-100/40 via-teal-50/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-gradient-to-tr from-blue-50/30 via-slate-50/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Content Container */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 flex flex-col justify-center">
        {/* Header Hero Section */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-full text-xs font-semibold mb-4 shadow-sm">
            <Award className="w-3.5 h-3.5" />
            <span>Herbarium of Korea Herbal Medicine Resources</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 via-teal-700 to-indigo-800 bg-clip-text text-transparent mb-3">
            대한민국 생약자원 표본관
          </h1>
        </div>

        {/* Dashboard Live Mini Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
          {/* Card 1: Total Specimens */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">보유 표본 총수</p>
              <h3 className="text-2xl font-black text-slate-800 font-mono mt-0.5">
                {totalCount.toLocaleString()} <span className="text-sm font-normal text-slate-500">건</span>
              </h3>
            </div>
          </div>

          {/* Card 2: Registered Specimens */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">공정서 등재 표본</p>
              <h3 className="text-2xl font-black text-slate-800 font-mono mt-0.5">
                {registeredCount.toLocaleString()} <span className="text-sm font-normal text-slate-500">건</span>
              </h3>
            </div>
          </div>

          {/* Card 3: Total Families */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">표본 과(Family) 수</p>
              <h3 className="text-2xl font-black text-slate-800 font-mono mt-0.5">
                {familyCount.toLocaleString()} <span className="text-sm font-normal text-slate-500">종</span>
              </h3>
            </div>
          </div>
        </div>

        {/* 4 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-600 delay-150">
          {/* Card 1: Specimen Map */}
          <Link href="/map" className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                <Map className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">표본 지도 서비스</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                국립생약자원관 수장고에 보관된 생약 표본의 채취 분포를 대한민국 지도에서 시각적으로 탐색하고, 공정서 등재 여부를 마커 클러스터 색상으로 손쉽게 확인합니다.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 mt-6 group-hover:gap-3 transition-all">
              <span>지도 서비스 바로가기</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 2: Stats & Analytics */}
          <Link href="/stats" className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">통계 및 분석</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                수집된 표본 데이터, 공정서 등재 표본 비율, 수장고별 보관 분포 및 검사항목별 데이터 기재율 통계 차트를 조회합니다.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 mt-6 group-hover:gap-3 transition-all">
              <span>통계 서비스 바로가기</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 3: Specimen List */}
          <Link href="/crud/specimens" className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">표본 목록 관리</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                시스템에 보관된 전체 표본 데이터를 통합 검색 및 필터링하고, 표본별 상세 속성값을 관리합니다.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 mt-6 group-hover:gap-3 transition-all">
              <span>표본 관리 바로가기</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 4: Pharmacopoeia Methods */}
          <Link href="/crud/pharmacopoeia" className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-teal-200 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-4 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">공정서 시험법</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                KP(대한약전) 및 KHP(대한약전외한약(생약)규격집)에 등재된 규격 품목 목록과 적용 가능한 이화학적 확인시험법 규격 정보를 상세 관리합니다.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-600 mt-6 group-hover:gap-3 transition-all">
              <span>시험법 관리 바로가기</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>

      {/* Footer copyright */}
      <footer className="w-full text-center py-6 text-xs text-slate-400 border-t border-slate-200 bg-white">
        © {new Date().getFullYear()} 대한민국 생약자원 표본관 (KHR) · All Rights Reserved.
      </footer>
    </div>
  );
}
