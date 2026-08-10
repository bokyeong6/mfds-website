'use client';

import React, { useState, useEffect } from 'react';
import { Specimen, PharmacItem } from '../../types';
import { X, FileText, Compass, ClipboardCheck, Layers, AlertTriangle, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import SpecimenImageSlider from './SpecimenImageSlider';

interface DetailPanelProps {
  specimen: Specimen | null;
  pharmacItem: PharmacItem | null;
  onClose: () => void;
}

export default function DetailPanel({ specimen, pharmacItem, onClose }: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'specimen' | 'pharmacopoeia'>('specimen');
  const [sideImageState, setSideImageState] = useState<{
    isOpen: boolean;
    url: string;
    index: number;
    images: string[];
  } | null>(null);

  // Close side panel when specimen changes
  useEffect(() => {
    setSideImageState(null);
  }, [specimen]);

  const handleImageClick = (url: string, index: number, allImages: string[]) => {
    setSideImageState({
      isOpen: true,
      url,
      index,
      images: allImages,
    });
  };

  if (!specimen) return null;

  const hasPharma = !!pharmacItem;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white/95 border-l border-slate-200 shadow-2xl z-[1000] flex flex-col animate-in slide-in-from-right duration-300 backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/85">
        <div>
          <h2 className="text-lg font-bold text-slate-800 truncate max-w-[280px]">
            {specimen.korName || specimen.herbName || '미확인 표본'}
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{specimen.managementId}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/60">
        <button
          onClick={() => setActiveTab('specimen')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all
            ${
              activeTab === 'specimen'
                ? 'border-emerald-500 text-emerald-600 bg-emerald-50/30'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
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
            ${!hasPharma ? 'opacity-40 cursor-not-allowed text-slate-400 border-transparent' : ''}
            ${
              hasPharma && activeTab === 'pharmacopoeia'
                ? 'border-emerald-500 text-emerald-600 bg-emerald-50/30'
                : hasPharma
                ? 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
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
            {/* Specimen Image Slider */}
            <SpecimenImageSlider 
              managementId={specimen.managementId} 
              imageUrls={specimen.imageUrls}
              onImageClick={handleImageClick}
            />

            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-slate-800 font-semibold text-sm">
              <FileText className="w-4 h-4 text-emerald-600" />
              기본 및 분류 정보
            </div>
            
            <div className="grid grid-cols-3 gap-y-3.5 text-sm">
              <span className="text-slate-500">관리번호</span>
              <span className="col-span-2 text-slate-800 font-mono select-all bg-slate-100 px-2 py-0.5 rounded border border-slate-200 w-fit">{specimen.managementId}</span>

              <span className="text-slate-500">표본번호</span>
              <span className="col-span-2 text-slate-800">{specimen.specimenNo || '-'}</span>

              <span className="text-slate-500">생약명</span>
              <span className="col-span-2 text-slate-800 font-semibold">{specimen.herbName || '-'}</span>

              <span className="text-slate-500">국명</span>
              <span className="col-span-2 text-emerald-600 font-medium">{specimen.korName || '-'}</span>

              <span className="text-slate-500">학명</span>
              <span className="col-span-2 text-slate-800 italic">{specimen.sciName || '-'}</span>

              <span className="text-slate-500">과명</span>
              <span className="col-span-2 text-slate-800">{specimen.family || '-'}</span>

              <span className="text-slate-500">속명</span>
              <span className="col-span-2 text-slate-800">{specimen.genus || '-'}</span>

              <span className="text-slate-500">중요도</span>
              <span className="col-span-2 text-slate-850">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-semibold text-xs border border-slate-200">
                  {specimen.importance || '-'}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 pt-4 pb-2 border-b border-slate-200 text-slate-800 font-semibold text-sm">
              <Compass className="w-4 h-4 text-emerald-600" />
              수집 및 보관 정보
            </div>

            <div className="grid grid-cols-3 gap-y-3.5 text-sm">
              <span className="text-slate-500">수집날짜</span>
              <span className="col-span-2 text-slate-800">{specimen.collectDate || '-'}</span>

              <span className="text-slate-500">수집장소</span>
              <span className="col-span-2 text-slate-800 leading-snug">{specimen.collectPlace || '-'}</span>

              <span className="text-slate-500">수장고</span>
              <span className="col-span-2 text-slate-800">{specimen.storage || '-'}</span>

              <span className="text-slate-500">수장위치</span>
              <span className="col-span-2 text-slate-800 leading-snug">{specimen.storageLocation || '-'}</span>

              <span className="text-slate-500">공정서</span>
              <span className="col-span-2 text-slate-800">
                {specimen.pharmacopoeia ? (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs font-semibold border border-emerald-500/20">
                    {specimen.pharmacopoeia}
                  </span>
                ) : (
                  '-'
                )}
              </span>

              <span className="text-slate-500">과제명</span>
              <span className="col-span-2 text-slate-600 leading-snug text-xs">{specimen.projectName || '-'}</span>

              <span className="text-slate-500">GPS</span>
              <span className="col-span-2 text-slate-500 font-mono text-xs">{specimen.gps || '-'}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {pharmacItem ? (
              <>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-slate-800 font-semibold text-sm">
                  <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                  시험기준 및 방법 ({pharmacItem.pharmacopoeia})
                </div>

                <div className="grid grid-cols-3 gap-y-3.5 text-sm">
                  <span className="text-slate-500">품목</span>
                  <span className="col-span-2 text-emerald-600 font-semibold">{pharmacItem.item}</span>

                  <span className="text-slate-500">공정서</span>
                  <span className="col-span-2 text-slate-800">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-xs font-mono">
                      {pharmacItem.pharmacopoeia}
                    </span>
                  </span>

                  <span className="text-slate-500">형태</span>
                  <span className="col-span-2 text-slate-800">{pharmacItem.type || '-'}</span>

                  <span className="text-slate-500">확인시험</span>
                  <span className="col-span-2 text-slate-800 leading-snug">{pharmacItem.confirmTest || '-'}</span>

                  <span className="text-slate-500">순도시험</span>
                  <span className="col-span-2 text-slate-800">{pharmacItem.purityTest || '-'}</span>

                  <span className="text-slate-500">순도(항목)</span>
                  <span className="col-span-2 text-slate-800 leading-snug">{pharmacItem.purityItems || '-'}</span>

                  <span className="text-slate-500">정량법</span>
                  <span className="col-span-2 text-slate-800 leading-snug">{pharmacItem.quantMethod || '-'}</span>

                  <span className="text-slate-500">건조감량</span>
                  <span className="col-span-2 text-emerald-600 font-mono font-semibold">{pharmacItem.dryLoss || '-'}</span>

                  <span className="text-slate-500">회분</span>
                  <span className="col-span-2 text-slate-800 font-mono">{pharmacItem.ash || '-'}</span>

                  <span className="text-slate-500">산불용성회분</span>
                  <span className="col-span-2 text-slate-800 font-mono">{pharmacItem.acidAsh || '-'}</span>

                  <span className="text-slate-500">엑스함량</span>
                  <span className="col-span-2 text-slate-800 leading-snug">{pharmacItem.extractContent || '-'}</span>

                  <span className="text-slate-500">정유함량</span>
                  <span className="col-span-2 text-slate-800 font-mono">{pharmacItem.essentialOil || '-'}</span>

                  <span className="text-slate-500">관련 표본수</span>
                  <span className="col-span-2 text-emerald-650 font-semibold font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-500/20 w-fit">
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

      {/* Dynamic Image Side Panel (Slides out to the left on Desktop, overlays on Mobile) */}
      {sideImageState && sideImageState.isOpen && (
        <ImageSidePanel 
          url={sideImageState.url}
          index={sideImageState.index}
          images={sideImageState.images}
          onIndexChange={(newIdx) => setSideImageState(prev => prev ? { ...prev, index: newIdx, url: prev.images[newIdx] } : null)}
          onClose={() => setSideImageState(null)}
        />
      )}
    </div>
  );
}

// Side-by-side Image Viewer Panel with Pan & Zoom controls
interface ImageSidePanelProps {
  url: string;
  index: number;
  images: string[];
  onIndexChange: (idx: number) => void;
  onClose: () => void;
}

function ImageSidePanel({ url, index, images, onIndexChange, onClose }: ImageSidePanelProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset zoom on image change
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [url]);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale === 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale === 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomIntensity = 0.1;
    setScale((prev) => {
      const next = Math.min(Math.max(prev - e.deltaY * zoomIntensity * 0.01, 1), 4);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    onIndexChange(index === 0 ? images.length - 1 : index - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    onIndexChange(index === images.length - 1 ? 0 : index + 1);
  };

  return (
    <div 
      className="absolute right-0 md:right-full top-0 bottom-0 w-full md:w-[500px] lg:w-[600px] bg-slate-950 border-l md:border-l-0 md:border-r border-slate-800 shadow-2xl flex flex-col z-[1000] overflow-hidden animate-in slide-in-from-right duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header Bar */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 backdrop-blur-sm text-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 bg-slate-800 rounded-full text-[10px] font-mono text-slate-300 font-bold">
            {(scale * 100).toFixed(0)}% 배율
          </span>
        </div>
        <div className="flex items-center gap-3">
          {images.length > 1 && (
            <span className="text-xs font-mono text-slate-400">
              {index + 1} / {images.length}
            </span>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Area */}
      <div 
        className="flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center select-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        <img
          src={url}
          alt="Specimen Detail Zoom"
          className={`max-w-full max-h-[80vh] object-contain rounded transition-all duration-75 select-none
            ${scale > 1 ? 'cursor-grabbing' : 'cursor-zoom-in'}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out'
          }}
          draggable={false}
        />

        {/* Carousel buttons (if multi-image) */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2.5 rounded-full border border-white/5 transition-all cursor-pointer z-10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2.5 rounded-full border border-white/5 transition-all cursor-pointer z-10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Floating Toolbar overlay inside the panel */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-full border border-slate-700 shadow-2xl z-20">
        <button
          onClick={handleZoomIn}
          className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition-colors"
          title="확대"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition-colors"
          title="축소"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-4 w-[1px] bg-slate-700 mx-1"></div>
        <button
          onClick={handleReset}
          className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full transition-colors"
          title="원본 크기 복원"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <span className="text-[10px] text-slate-400 font-medium ml-1.5 hidden sm:inline select-none">
          휠 조작 및 드래그 이동 가능
        </span>
      </div>
    </div>
  );
}
