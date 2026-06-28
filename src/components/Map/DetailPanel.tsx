'use client';

import React, { useState } from 'react';
import { Specimen, PharmacItem } from '../../types';
import { X, FileText, Compass, ClipboardCheck, Layers, AlertTriangle } from 'lucide-react';

interface DetailPanelProps {
  specimen: Specimen | null;
  pharmacItem: PharmacItem | null;
  onClose: () => void;
}

export default function DetailPanel({ specimen, pharmacItem, onClose }: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'specimen' | 'pharmacopoeia'>('specimen');

  if (!specimen) return null;

  const hasPharma = !!pharmacItem;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[420px] bg-slate-900/95 border-l border-slate-800 shadow-2xl z-[1000] flex flex-col animate-in slide-in-from-right duration-300 backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div>
          <h2 className="text-lg font-bold text-slate-100 truncate max-w-[280px]">
            {specimen.korName || specimen.herbName || '미확인 표본'}
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{specimen.managementId}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/50">
        <button
          onClick={() => setActiveTab('specimen')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all
            ${
              activeTab === 'specimen'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
        >
          <Layers className="w-4 h-4" />
          표본 정보
        </button>
        <button
          onClick={() => {
            if (hasPharma) setActiveTab('pharmacopoeia');
          }}
          disabled={!hasPharma}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all
            ${!hasPharma ? 'opacity-40 cursor-not-allowed text-slate-500 border-transparent' : ''}
            ${
              hasPharma && activeTab === 'pharmacopoeia'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : hasPharma
                ? 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                : ''
            }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          공정서 시험법
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {activeTab === 'specimen' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-slate-300 font-semibold text-sm">
              <FileText className="w-4 h-4 text-emerald-400" />
              기본 및 분류 정보
            </div>
            
            <div className="grid grid-cols-3 gap-y-3.5 text-sm">
              <span className="text-slate-500">관리번호</span>
              <span className="col-span-2 text-slate-200 font-mono select-all bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800 w-fit">{specimen.managementId}</span>

              <span className="text-slate-500">표본번호</span>
              <span className="col-span-2 text-slate-200">{specimen.specimenNo || '-'}</span>

              <span className="text-slate-500">생약명</span>
              <span className="col-span-2 text-slate-200 font-semibold">{specimen.herbName || '-'}</span>

              <span className="text-slate-500">국명</span>
              <span className="col-span-2 text-emerald-400 font-medium">{specimen.korName || '-'}</span>

              <span className="text-slate-500">학명</span>
              <span className="col-span-2 text-slate-200 italic">{specimen.sciName || '-'}</span>

              <span className="text-slate-500">과명</span>
              <span className="col-span-2 text-slate-200">{specimen.family || '-'}</span>

              <span className="text-slate-500">속명</span>
              <span className="col-span-2 text-slate-200">{specimen.genus || '-'}</span>

              <span className="text-slate-500">중요도</span>
              <span className="col-span-2 text-slate-200">
                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md font-semibold text-xs border border-slate-700">
                  {specimen.importance || '-'}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 pt-4 pb-2 border-b border-slate-800 text-slate-300 font-semibold text-sm">
              <Compass className="w-4 h-4 text-emerald-400" />
              수집 및 보관 정보
            </div>

            <div className="grid grid-cols-3 gap-y-3.5 text-sm">
              <span className="text-slate-500">수집날짜</span>
              <span className="col-span-2 text-slate-200">{specimen.collectDate || '-'}</span>

              <span className="text-slate-500">수집장소</span>
              <span className="col-span-2 text-slate-200 leading-snug">{specimen.collectPlace || '-'}</span>

              <span className="text-slate-500">수장고</span>
              <span className="col-span-2 text-slate-200">{specimen.storage || '-'}</span>

              <span className="text-slate-500">수장위치</span>
              <span className="col-span-2 text-slate-200 leading-snug">{specimen.storageLocation || '-'}</span>

              <span className="text-slate-500">공정서</span>
              <span className="col-span-2 text-slate-200">
                {specimen.pharmacopoeia ? (
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs font-semibold border border-emerald-500/20">
                    {specimen.pharmacopoeia}
                  </span>
                ) : (
                  '-'
                )}
              </span>

              <span className="text-slate-500">과제명</span>
              <span className="col-span-2 text-slate-300 leading-snug text-xs">{specimen.projectName || '-'}</span>

              <span className="text-slate-500">GPS</span>
              <span className="col-span-2 text-slate-400 font-mono text-xs">{specimen.gps || '-'}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {pharmacItem ? (
              <>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-slate-300 font-semibold text-sm">
                  <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                  시험기준 및 방법 ({pharmacItem.pharmacopoeia})
                </div>

                <div className="grid grid-cols-3 gap-y-3.5 text-sm">
                  <span className="text-slate-500">품목</span>
                  <span className="col-span-2 text-emerald-400 font-semibold">{pharmacItem.item}</span>

                  <span className="text-slate-500">공정서</span>
                  <span className="col-span-2 text-slate-200">
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs font-mono">
                      {pharmacItem.pharmacopoeia}
                    </span>
                  </span>

                  <span className="text-slate-500">형태</span>
                  <span className="col-span-2 text-slate-200">{pharmacItem.type || '-'}</span>

                  <span className="text-slate-500">확인시험</span>
                  <span className="col-span-2 text-slate-200 leading-snug">{pharmacItem.confirmTest || '-'}</span>

                  <span className="text-slate-500">순도시험</span>
                  <span className="col-span-2 text-slate-200">{pharmacItem.purityTest || '-'}</span>

                  <span className="text-slate-500">순도(항목)</span>
                  <span className="col-span-2 text-slate-200 leading-snug">{pharmacItem.purityItems || '-'}</span>

                  <span className="text-slate-500">정량법</span>
                  <span className="col-span-2 text-slate-200 leading-snug">{pharmacItem.quantMethod || '-'}</span>

                  <span className="text-slate-500">건조감량</span>
                  <span className="col-span-2 text-slate-200 font-mono text-emerald-400">{pharmacItem.dryLoss || '-'}</span>

                  <span className="text-slate-500">회분</span>
                  <span className="col-span-2 text-slate-200 font-mono">{pharmacItem.ash || '-'}</span>

                  <span className="text-slate-500">산불용성회분</span>
                  <span className="col-span-2 text-slate-200 font-mono">{pharmacItem.acidAsh || '-'}</span>

                  <span className="text-slate-500">엑스함량</span>
                  <span className="col-span-2 text-slate-200 leading-snug">{pharmacItem.extractContent || '-'}</span>

                  <span className="text-slate-500">정유함량</span>
                  <span className="col-span-2 text-slate-200 font-mono">{pharmacItem.essentialOil || '-'}</span>

                  <span className="text-slate-500">관련 표본수</span>
                  <span className="col-span-2 text-slate-200 font-semibold font-mono text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 w-fit">
                    {pharmacItem.specimenIds?.length || 0} 개
                  </span>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40 text-amber-500" />
                <p className="font-semibold">공정서 등재 품목 아님</p>
                <p className="text-xs mt-1">이 표본은 공정서(KP/KHP) 시험법 데이터와 매핑되지 않았습니다.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
