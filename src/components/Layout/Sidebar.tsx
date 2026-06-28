'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, BarChart3, Layers, BookOpen, Settings } from 'lucide-react';

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}

function SidebarItem({ href, icon, label, active }: SidebarItemProps) {
  return (
    <Link href={href} className="group relative flex items-center justify-center py-3 w-full">
      <div
        className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center
          ${
            active
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 scale-110'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
      >
        {icon}
      </div>
      
      {/* Tooltip */}
      <span className="absolute left-16 scale-0 transition-all duration-150 origin-left group-hover:scale-100 bg-slate-900 border border-slate-800 text-slate-250 text-xs font-semibold px-2 py-1 rounded shadow-xl whitespace-nowrap z-[9999]">
        {label}
      </span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 flex flex-col items-center bg-slate-950 border-r border-slate-900 h-screen py-4 shrink-0 z-[1005]">
      {/* Logo Icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black text-lg shadow-md mb-6 animate-pulse">
        N
      </div>

      <hr className="w-8 border-slate-900 mb-6" />

      {/* Nav items */}
      <nav className="flex-1 w-full space-y-3 flex flex-col items-center">
        <SidebarItem
          href="/"
          icon={<Map className="w-5 h-5" />}
          label="지도 홈"
          active={pathname === '/'}
        />
        <SidebarItem
          href="/stats"
          icon={<BarChart3 className="w-5 h-5" />}
          label="통계 및 분석"
          active={pathname === '/stats'}
        />
        <SidebarItem
          href="/crud/specimens"
          icon={<Layers className="w-5 h-5" />}
          label="표본 목록"
          active={pathname === '/crud/specimens'}
        />
        <SidebarItem
          href="/crud/pharmacopoeia"
          icon={<BookOpen className="w-5 h-5" />}
          label="공정서 시험법"
          active={pathname === '/crud/pharmacopoeia'}
        />
      </nav>

      {/* Settings at the bottom */}
      <div className="w-full flex flex-col items-center border-t border-slate-900 pt-4">
        <SidebarItem
          href="/settings"
          icon={<Settings className="w-5 h-5" />}
          label="데이터 설정"
          active={pathname === '/settings'}
        />
      </div>
    </aside>
  );
}
