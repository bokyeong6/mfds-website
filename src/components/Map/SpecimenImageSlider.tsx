'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, ImageOff, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface SpecimenImageSliderProps {
  managementId: string;
  imageUrls?: string[];
  onImageClick?: (url: string, index: number, allImages: string[]) => void;
}

export default function SpecimenImageSlider({ managementId, imageUrls, onImageClick }: SpecimenImageSliderProps) {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
  const [isZoomed, setIsZoomed] = useState(false);

  // Swipe/Touch states
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    } else if (isRightSwipe) {
      setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    }
  };

  // Keyboard Navigation Effect
  useEffect(() => {
    if (!isZoomed || images.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      } else if (e.key === 'Escape') {
        setIsZoomed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isZoomed, images.length]);

  useEffect(() => {
    setImageErrors({});
    setCurrentIndex(0);
    setLoading(true);

    if (imageUrls && imageUrls.length > 0) {
      setImages(imageUrls);
      setLoading(false);
    } else {
      setImages(['/images/default.jpg']);
      setLoading(false);
    }
  }, [managementId, imageUrls]);



  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleImageError = (url: string) => {
    setImageErrors((prev) => ({ ...prev, [url]: true }));
  };

  if (loading) {
    return (
      <div className="w-full h-48 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mr-2" />
        <span className="text-xs font-medium">이미지 불러오는 중...</span>
      </div>
    );
  }

  const currentUrl = images[currentIndex];
  const isDefaultOrError = currentUrl === '/images/default.jpg' || imageErrors[currentUrl];

  if (isDefaultOrError) {
    return (
      <div className="w-full h-48 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-2">
        <ImageOff className="w-8 h-8 text-slate-350" />
        <div className="text-center">
          <p className="text-xs font-bold text-slate-500">등록된 사진 없음</p>
          <p className="text-[10px] text-slate-400 mt-0.5">({managementId})</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-56 bg-slate-100 border border-slate-200 rounded-xl overflow-hidden group shadow-sm">
      {/* Current Image */}
      <img
        src={currentUrl}
        alt={`Specimen ${managementId} image`}
        className="w-full h-full object-cover select-none transition-all duration-300 cursor-zoom-in hover:brightness-95"
        onClick={() => {
          if (onImageClick) {
            onImageClick(currentUrl, currentIndex, images);
          } else {
            setIsZoomed(true);
          }
        }}
        onError={() => handleImageError(currentUrl)}
      />

      {/* Numerical Badge */}
      {images.length > 1 && (
        <span className="absolute top-3 right-3 bg-black/45 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px] font-mono font-bold z-10">
          {currentIndex + 1} / {images.length}
        </span>
      )}

      {/* Carousel Controls */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/75 hover:bg-white text-slate-800 p-1.5 rounded-full shadow-md z-10 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/75 hover:bg-white text-slate-800 p-1.5 rounded-full shadow-md z-10 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Dots Indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === currentIndex ? 'bg-emerald-500 w-3' : 'bg-white/60 hover:bg-white'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Lightbox / Zoom Modal */}
      {isZoomed && (
        <div
          onClick={() => setIsZoomed(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
        >
          {/* Close button */}
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full transition-colors duration-150 z-20 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* Image Content Container */}
          <div className="relative max-w-5xl max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={currentUrl}
              alt={`Enlarged Specimen ${managementId} image`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl select-none animate-in zoom-in-95 duration-200"
            />
            {/* Carousel Navigation in Lightbox (Overlay on image borders) */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-3.5 rounded-full transition-all duration-150 cursor-pointer z-30 shadow-md border border-white/10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-3.5 rounded-full transition-all duration-150 cursor-pointer z-30 shadow-md border border-white/10"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Bottom Pagination Overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/55 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-mono font-bold z-30 border border-white/10">
                  {currentIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
