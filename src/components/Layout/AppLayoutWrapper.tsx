'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import Sidebar from './Sidebar';
import OnboardingModal from './OnboardingModal';
import { Loader2 } from 'lucide-react';

interface AppLayoutWrapperProps {
  children: React.ReactNode;
}

export default function AppLayoutWrapper({ children }: AppLayoutWrapperProps) {
  const loadData = useAppStore((state) => state.loadData);
  const isInitialized = useAppStore((state) => state.isInitialized);
  const isLoading = useAppStore((state) => state.isLoading);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reportError = (errorInfo: unknown) => {
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorInfo),
      }).catch(() => {});
    };

    const handleError = (event: ErrorEvent) => {
      reportError({
        type: 'error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? {
          message: event.error.message,
          stack: event.error.stack,
        } : null,
        url: window.location.href,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportError({
        type: 'unhandledrejection',
        reason: event.reason ? String(event.reason.message || event.reason) : 'unknown',
        stack: event.reason?.stack || null,
        url: window.location.href,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Only block the screen if the database is not initialized at all
  if (!isInitialized) {
    if (isLoading) {
      return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 text-slate-750">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
          <p className="text-sm font-semibold tracking-wide animate-pulse">데이터베이스 로드 중...</p>
        </div>
      );
    }
    return <OnboardingModal />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Fixed Left Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto bg-slate-50 relative">
        {children}
      </main>
    </div>
  );
}
