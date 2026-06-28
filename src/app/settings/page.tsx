'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Trash2, Upload, Database, RefreshCw, AlertTriangle } from 'lucide-react';

export default function SettingsPage() {
  const specimens = useAppStore((state) => state.specimens);
  const pharmacopoeia = useAppStore((state) => state.pharmacopoeia);
  const clearData = useAppStore((state) => state.clearData);

  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);

  // Compute database usage size
  const storageStats = useMemo(() => {
    const specStr = JSON.stringify(specimens);
    const pharmaStr = JSON.stringify(pharmacopoeia);
    
    const specKb = (specStr.length * 2) / 1024; // UTF-16 characters are 2 bytes
    const pharmaKb = (pharmaStr.length * 2) / 1024;
    const totalKb = specKb + pharmaKb;

    return {
      specimensSize: specKb > 1024 ? `${(specKb / 1024).toFixed(2)} MB` : `${specKb.toFixed(1)} KB`,
      pharmaSize: pharmaKb > 1024 ? `${(pharmaKb / 1024).toFixed(2)} MB` : `${pharmaKb.toFixed(1)} KB`,
      totalSize: totalKb > 1024 ? `${(totalKb / 1024).toFixed(2)} MB` : `${totalKb.toFixed(1)} KB`,
    };
  }, [specimens, pharmacopoeia]);

  const handleClearData = async () => {
    await clearData();
    setConfirmClear(false);
  };

  const handleTriggerReupload = async () => {
    await clearData();
    setConfirmReload(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
      {/* Title */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-slate-100">시스템 설정</h1>
        <p className="text-sm text-slate-400 mt-1">
          데이터베이스 백엔드(localStorage) 관리와 초기 데이터 로드 상태를 변경합니다.
        </p>
      </div>

      {/* DB Summary Card */}
      <div className="bg-slate-900 border border-slate-850 rounded-xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
          <Database className="w-5 h-5 text-emerald-400" />
          로컬 데이터베이스 현황
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-950 p-4 border border-slate-850 rounded-lg space-y-1">
            <span className="text-slate-500 font-semibold block">제주센터 표본 테이블</span>
            <span className="text-lg font-bold text-slate-200 font-mono">{specimens.length.toLocaleString()} 행</span>
            <span className="text-xs text-slate-500 block">용량: {storageStats.specimensSize}</span>
          </div>

          <div className="bg-slate-950 p-4 border border-slate-850 rounded-lg space-y-1">
            <span className="text-slate-500 font-semibold block">공정서 시험법 테이블</span>
            <span className="text-lg font-bold text-slate-200 font-mono">{pharmacopoeia.length.toLocaleString()} 행</span>
            <span className="text-xs text-slate-500 block">용량: {storageStats.pharmaSize}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-2">
          <span>데이터 저장방식: 브라우저 IndexedDB (NIMS_Specimen_DB)</span>
          <span className="font-semibold text-slate-400">총 데이터 추정 사용량: {storageStats.totalSize}</span>
        </div>
      </div>

      {/* Settings Options */}
      <div className="space-y-4">
        {/* Option 1: Re-upload */}
        <div className="bg-slate-900 border border-slate-850 rounded-xl p-5 shadow-xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-200">엑셀 데이터 재업로드</h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md">
              기존 표본 정보와 공정서 규격 데이터를 보존한 채로 새로운 엑셀 파일들을 업로드하여 덮어씁니다.
            </p>
          </div>
          <button
            onClick={() => setConfirmReload(true)}
            className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 font-semibold rounded-lg text-xs transition-all flex items-center gap-1.5 shrink-0"
          >
            <Upload className="w-4 h-4" />
            재업로드 진행
          </button>
        </div>

        {/* Option 2: Clear Data */}
        <div className="bg-slate-900 border border-slate-850 rounded-xl p-5 shadow-xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-400">로컬 데이터베이스 초기화</h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md">
              저장된 모든 표본 데이터와 공정서 자료를 브라우저에서 영구히 삭제합니다. 초기화 후 온보딩 업로드 화면으로 돌아갑니다.
            </p>
          </div>
          <button
            onClick={() => setConfirmClear(true)}
            className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 font-semibold rounded-lg text-xs transition-all flex items-center gap-1.5 shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            데이터 삭제
          </button>
        </div>
      </div>

      {/* Confirmation Modal 1: Clear */}
      {confirmClear && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 text-white">
          <div className="w-full max-w-md bg-slate-900 border border-slate-850 rounded-xl shadow-2xl p-5 animate-in zoom-in-95 duration-150">
            <h3 className="text-md font-bold text-rose-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce" />
              데이터 전체 삭제 경고
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              정말로 전체 데이터베이스를 초기화하시겠습니까? 이 작업은 로컬 스토리지에 저장된 모든 내용을 삭제하며 절대 복구할 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmClear(false)}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 font-semibold rounded-lg text-sm transition-colors text-slate-350"
              >
                취소
              </button>
              <button
                onClick={handleClearData}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-slate-100 font-bold rounded-lg text-sm transition-colors"
              >
                초기화 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal 2: Re-upload */}
      {confirmReload && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 text-white">
          <div className="w-full max-w-md bg-slate-900 border border-slate-850 rounded-xl shadow-2xl p-5 animate-in zoom-in-95 duration-150">
            <h3 className="text-md font-bold text-emerald-400 mb-3 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-400" />
              엑셀 재업로드 진행
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              온보딩 업로드 화면으로 돌아가시겠습니까? 기존 데이터베이스는 새로운 파일을 파싱하여 업로드할 때 덮어씌워집니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmReload(false)}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 font-semibold rounded-lg text-sm transition-colors text-slate-355"
              >
                취소
              </button>
              <button
                onClick={handleTriggerReupload}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-95"
              >
                이동하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
