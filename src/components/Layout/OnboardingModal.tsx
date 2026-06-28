'use client';

import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { detectFileType, parsePharmacopoeiaExcel, parseSpecimensExcel } from '../../lib/excelParser';
import { Upload, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function OnboardingModal() {
  const initializeData = useAppStore((state) => state.initializeData);
  const [pharmaFile, setPharmaFile] = useState<{ name: string; buffer: ArrayBuffer } | null>(null);
  const [specimenFile, setSpecimenFile] = useState<{ name: string; buffer: ArrayBuffer } | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, expectedType: 'pharma' | 'specimen') => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file, expectedType);
  };

  const processFile = (file: File, expectedType: 'pharma' | 'specimen') => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      
      // Auto-detect type to check if user uploaded the correct file
      try {
        // Read first few rows just to check headers
        const workbook = XLSX.read(buffer, { type: 'array', sheetRows: 5 });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
        
        const detected = detectFileType(rows[0] || []);
        
        if (detected === 'unknown') {
          setError('올바른 형식의 엑셀 파일이 아닙니다. 컬럼 구성을 확인해 주세요.');
          return;
        }

        if (expectedType === 'pharma' && detected !== 'pharmacopoeia') {
          setError('공정서 시험법 파일 대신 표본 통합 파일이 감지되었습니다. 올바른 위치에 업로드해 주세요.');
          return;
        }

        if (expectedType === 'specimen' && detected !== 'specimen') {
          setError('표본 통합 파일 대신 공정서 시험법 파일이 감지되었습니다. 올바른 위치에 업로드해 주세요.');
          return;
        }

        if (expectedType === 'pharma') {
          setPharmaFile({ name: file.name, buffer });
        } else {
          setSpecimenFile({ name: file.name, buffer });
        }
      } catch (err) {
        console.error(err);
        setError('엑셀 파일 판별 도중 오류가 발생했습니다.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent, expectedType: 'pharma' | 'specimen') => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file, expectedType);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleLoadData = async () => {
    if (!pharmaFile || !specimenFile) {
      setError('두 개의 엑셀 파일이 모두 업로드되어야 합니다.');
      return;
    }

    setLoading(true);
    setError(null);

    // Give the UI a frame to show the loader before heavy blocking thread processing
    setTimeout(async () => {
      try {
        setStatusMessage('공정서_시험법 엑셀 파싱 중...');
        const pharmacItems = parsePharmacopoeiaExcel(pharmaFile.buffer);

        setStatusMessage('제주센터표본통합 엑셀 파싱 중... (약 2만 행)');
        const specimens = parseSpecimensExcel(specimenFile.buffer);

        if (pharmacItems.length === 0 || specimens.length === 0) {
          throw new Error('파싱된 데이터 행이 없습니다. 템플릿 구조를 확인해 주세요.');
        }

        setStatusMessage(`데이터 저장 중... (표본 ${specimens.length}건, 공정서 ${pharmacItems.length}건)`);
        await initializeData(specimens, pharmacItems);
      } catch (err) {
        console.error(err);
        const errMsg = err instanceof Error ? err.message : String(err);
        setError(errMsg || '데이터를 파싱 및 저장하는 중 오류가 발생했습니다. 브라우저 저장공간 한도를 확인하세요.');
        setLoading(false);
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 text-white overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8 flex flex-col items-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            대한민국 생약자원 표본관(KHR)
          </h1>
          <p className="text-slate-400 mt-2 text-sm font-semibold">
            (Herbarium of Korea Herbal Medicine Resources)
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-start gap-3 animate-shake">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">오류 발생</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* File 1: Pharmacopoeia */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              1. 공정서 시험법 (.xlsx)
            </label>
            <div
              onDrop={(e) => handleDrop(e, 'pharma')}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef1.current?.click()}
              className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 min-h-[180px]
                ${
                  pharmaFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-900/50 hover:bg-slate-950/20'
                }`}
            >
              <input
                type="file"
                ref={fileInputRef1}
                onChange={(e) => handleFileChange(e, 'pharma')}
                accept=".xlsx"
                className="hidden"
              />
              {pharmaFile ? (
                <div className="animate-in fade-in duration-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <p className="font-medium text-emerald-400">업로드 완료</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px] truncate mx-auto">
                    {pharmaFile.name}
                  </p>
                </div>
              ) : (
                <div>
                  <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <p className="font-medium text-slate-300">클릭 또는 파일을 여기에 드래그</p>
                  <p className="text-xs text-slate-500 mt-1">공정서_시험법.xlsx</p>
                </div>
              )}
            </div>
          </div>

          {/* File 2: Specimen */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              2. 제주 센터 표본 통합 (.xlsx)
            </label>
            <div
              onDrop={(e) => handleDrop(e, 'specimen')}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef2.current?.click()}
              className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 min-h-[180px]
                ${
                  specimenFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-900/50 hover:bg-slate-950/20'
                }`}
            >
              <input
                type="file"
                ref={fileInputRef2}
                onChange={(e) => handleFileChange(e, 'specimen')}
                accept=".xlsx"
                className="hidden"
              />
              {specimenFile ? (
                <div className="animate-in fade-in duration-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <p className="font-medium text-emerald-400">업로드 완료</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px] truncate mx-auto">
                    {specimenFile.name}
                  </p>
                </div>
              ) : (
                <div>
                  <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <p className="font-medium text-slate-300">클릭 또는 파일을 여기에 드래그</p>
                  <p className="text-xs text-slate-500 mt-1">제주센터표본통합.xlsx</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 border-t border-slate-800 pt-6">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-sm text-emerald-400 font-medium animate-pulse">{statusMessage}</p>
            </div>
          ) : (
            <button
              onClick={handleLoadData}
              disabled={!pharmaFile || !specimenFile}
              className={`w-full md:w-auto px-10 py-3.5 rounded-xl font-semibold shadow-lg shadow-emerald-950/20 transition-all duration-200
                ${
                  pharmaFile && specimenFile
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 scale-100 hover:scale-[1.02] active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
            >
              데이터 불러오기
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
