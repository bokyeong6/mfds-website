'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Layers, HelpCircle, FileSpreadsheet, ChevronLeft, ChevronRight, Search, Download, X, Database } from 'lucide-react';
import { Specimen } from '../../types';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface FamilyTableRow {
  family: string;
  count: number;
  importanceCounts: {
    A1: number;
    A2: number;
    B1: number;
    B2: number;
  };
  joinedCount: number;
  joinedRatio: string;
  topRegions: string[];
  topHerbs: string[];
}

export default function FamilyStats() {
  const cachedStats = useAppStore((state) => state.cachedStats);

  const [mounted, setMounted] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // States for all families explorer table
  const [tableSearch, setTableSearch] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const [sortField, setSortField] = useState<keyof FamilyTableRow>('count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // States for modal details
  const [detailFamily, setDetailFamily] = useState<string | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalPage, setModalPage] = useState(1);

  // Dynamic specimens list for selected family (from chart)
  const [selectedFamilySpecimens, setSelectedFamilySpecimens] = useState<Specimen[]>([]);

  // Dynamic specimens list for detail family modal
  const [modalSpecimens, setModalSpecimens] = useState<Specimen[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch chart-selected family specimens
  useEffect(() => {
    if (!selectedFamily) {
      setSelectedFamilySpecimens([]);
      return;
    }
    const fetchFamilySpecimens = async () => {
      try {
        const q = query(
          collection(db, 'specimens'),
          where('family', '==', selectedFamily),
          limit(150)
        );
        const snap = await getDocs(q);
        setSelectedFamilySpecimens(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Specimen)));
      } catch (err) {
        console.error('Failed to fetch selected family specimens:', err);
      }
    };
    fetchFamilySpecimens();
  }, [selectedFamily]);

  // Fetch modal-selected family specimens
  useEffect(() => {
    if (!detailFamily) {
      setModalSpecimens([]);
      return;
    }
    const fetchDetailSpecimens = async () => {
      try {
        const q = query(
          collection(db, 'specimens'),
          where('family', '==', detailFamily),
          limit(300)
        );
        const snap = await getDocs(q);
        setModalSpecimens(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Specimen)));
      } catch (err) {
        console.error('Failed to fetch detail specimens:', err);
      }
    };
    fetchDetailSpecimens();
  }, [detailFamily]);

  const metrics = useMemo(() => {
    return {
      total: cachedStats?.familyMetrics?.total || 0,
      familyCount: cachedStats?.familyMetrics?.familyCount || 0,
      topFamily: cachedStats?.familyMetrics?.topFamily || '-',
      topFamilyCount: cachedStats?.familyMetrics?.topFamilyCount || 0,
      joinedCount: cachedStats?.familyMetrics?.joinedCount || 0,
    };
  }, [cachedStats]);

  const familyCountChartData = useMemo(() => {
    return (cachedStats?.familyCountChartData || []).map((d: any) => ({
      family: d.name,
      count: d['표본 수'],
    }));
  }, [cachedStats]);

  const stackedImportanceChartData = useMemo(() => {
    return cachedStats?.stackedImportanceChartData || [];
  }, [cachedStats]);

  const storageStatsData = useMemo(() => {
    return cachedStats?.familyStorageStatsData || [];
  }, [cachedStats]);

  const familyTableData = useMemo(() => {
    return (cachedStats?.familiesTableData || []) as FamilyTableRow[];
  }, [cachedStats]);

  // Sort and filter familyTableData
  const sortedData = useMemo(() => {
    const filtered = familyTableData.filter((row: FamilyTableRow) =>
      row.family.toLowerCase().includes(tableSearch.toLowerCase())
    );

    return [...filtered].sort((a: FamilyTableRow, b: FamilyTableRow) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'family') {
        valA = a.family;
        valB = b.family;
      } else if (sortField === 'count') {
        valA = a.count;
        valB = b.count;
      } else if (sortField === 'importanceCounts') {
        valA = a.importanceCounts.A1 + a.importanceCounts.A2 + a.importanceCounts.B1 + a.importanceCounts.B2;
        valB = b.importanceCounts.A1 + b.importanceCounts.A2 + b.importanceCounts.B1 + b.importanceCounts.B2;
      } else if (sortField === 'joinedRatio') {
        valA = parseFloat(a.joinedRatio);
        valB = parseFloat(b.joinedRatio);
      } else if (sortField === 'joinedCount') {
        valA = a.joinedCount;
        valB = b.joinedCount;
      } else if (sortField === 'topRegions') {
        valA = a.topRegions.length;
        valB = b.topRegions.length;
      } else if (sortField === 'topHerbs') {
        valA = a.topHerbs.length;
        valB = b.topHerbs.length;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [familyTableData, tableSearch, sortField, sortOrder]);

  const paginatedTableData = useMemo(() => {
    const start = (tablePage - 1) * 20;
    return sortedData.slice(start, start + 20);
  }, [sortedData, tablePage]);

  const tableTotalPages = Math.ceil(sortedData.length / 20);

  const filteredModalSpecimens = useMemo(() => {
    const term = modalSearch.trim().toLowerCase();
    if (!term) return modalSpecimens;
    return modalSpecimens.filter((s) =>
      (s.managementId || '').toLowerCase().includes(term) ||
      (s.herbName || '').toLowerCase().includes(term) ||
      (s.korName || '').toLowerCase().includes(term) ||
      (s.sciName || '').toLowerCase().includes(term) ||
      (s.collectPlace || '').toLowerCase().includes(term) ||
      (s.importance || '').toLowerCase().includes(term)
    );
  }, [modalSpecimens, modalSearch]);

  const paginatedModalSpecimens = useMemo(() => {
    const start = (modalPage - 1) * 50;
    return filteredModalSpecimens.slice(start, start + 50);
  }, [filteredModalSpecimens, modalPage]);

  const modalTotalPages = Math.ceil(filteredModalSpecimens.length / 50);

  const handleSort = (field: keyof FamilyTableRow) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setTablePage(1);
  };

  const renderSortArrow = (field: keyof FamilyTableRow) => {
    if (sortField !== field) return <span className="text-slate-400 ml-1">⇅</span>;
    return sortOrder === 'asc' ? <span className="text-emerald-500 ml-1">▲</span> : <span className="text-emerald-500 ml-1">▼</span>;
  };

  const handleRowClick = (family: string) => {
    setDetailFamily(family);
    setModalSearch('');
    setModalPage(1);
  };

  const handleBarClick = (state: any) => {
    if (state && state.activeLabel) {
      handleRowClick(state.activeLabel);
    }
  };

  const handleDownloadFamilyExcel = (family: string, list: Specimen[]) => {
    import('xlsx').then((XLSX) => {
      const exportData = list.map((s) => ({
        '관리번호': s.managementId,
        '생약명': s.herbName || '',
        '국명': s.korName || '',
        '학명': s.sciName || '',
        '과명': s.family || '',
        '수집장소': s.collectPlace || '',
        '수집일자': s.collectDate || '',
        '중요도': s.importance || '',
        '위도': s.lat || '',
        '경도': s.lng || '',
        '공정서 구분': s.pharmacopoeia || '미등재'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '표본 목록');

      const maxLens = Object.keys(exportData[0] || {}).map((key) => {
        return Math.max(
          key.length * 2,
          ...exportData.map((row) => String(row[key as keyof typeof row] || '').length * 1.5)
        );
      });
      worksheet['!cols'] = maxLens.map((len) => ({ wch: Math.min(Math.max(len, 10), 50) }));

      XLSX.writeFile(workbook, `${family}_표본목록.xlsx`);
    });
  };

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const importanceColors: Record<string, string> = {
    A1: '#34d399',    // emerald-400
    A2: '#059669',    // emerald-600
    B1: '#60a5fa',    // blue-400
    'B2-1': '#2563eb', // blue-600
    'B2-2': '#a78bfa', // violet-400
    'B2-3': '#7c3aed', // violet-600
    'B2-4': '#f472b6', // pink-400
  };

  const totalPages = Math.ceil(selectedFamilySpecimens.length / itemsPerPage);
  const paginatedSpecimens = selectedFamilySpecimens.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Specimens */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-10 text-emerald-600 group-hover:scale-110 transition-transform">
            <Layers className="w-12 h-12" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">총 표본 수</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{metrics.total.toLocaleString()}</p>
          <div className="w-full bg-slate-100 h-1 mt-3 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-full"></div>
          </div>
        </div>

        {/* Total Families */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-10 text-emerald-600 group-hover:scale-110 transition-transform">
            <HelpCircle className="w-12 h-12" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">과명 종류</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{metrics.familyCount} 개</p>
          <div className="w-full bg-slate-100 h-1 mt-3 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-[80%]"></div>
          </div>
        </div>

        {/* Top Family */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-10 text-emerald-600 group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="w-12 h-12" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">최다 과명</p>
          <p className="text-2xl font-bold text-slate-900 mt-2 truncate pr-6">{metrics.topFamily}</p>
          <p className="text-xs text-slate-500 mt-1">{metrics.topFamilyCount.toLocaleString()}개 표본 보유</p>
        </div>

        {/* Joined Pharmacopoeia Specimens */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-10 text-emerald-600 group-hover:scale-110 transition-transform">
            <Database className="w-12 h-12" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">공정서 등재 표본 수</p>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{metrics.joinedCount.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">
            전체 대비 {((metrics.joinedCount / (metrics.total || 1)) * 100).toFixed(1)}% 매칭 완료
          </p>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Chart 1: Family bar chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
            과명별 표본 수 막대그래프 (상위 20개 + 기타)
          </h3>
          <div className="h-[380px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={familyCountChartData}
                onClick={handleBarClick}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="family"
                  stroke="#94a3b8"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fill: '#475569' }}
                />
                <YAxis stroke="#94a3b8" tick={{ fill: '#475569' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
                  cursor={{ fill: '#f1f5f9', opacity: 0.6 }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} className="cursor-pointer" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-400 text-right mt-1">* 막대를 클릭하면 하단에 상세 목록이 필터링됩니다.</p>
        </div>

        {/* Chart 2: Stacked Importance Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
            최다 표본 10대 과명의 중요도별 분포
          </h3>
          <div className="h-[380px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stackedImportanceChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="family"
                  stroke="#94a3b8"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fill: '#475569' }}
                />
                <YAxis stroke="#94a3b8" tick={{ fill: '#475569' }} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                {Object.keys(importanceColors).map((key) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="a"
                    fill={importanceColors[key]}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Storage and classification statistics */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
          수장고별 보관 분포 및 분류 통계
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          <div className="text-xs text-slate-500 space-y-3 pr-2">
            <p className="leading-relaxed text-[13px]">
              수장고별 표본 수와 해당 수장고에 보관된 고유한 식물 과명의 개수를 나타냅니다.
            </p>
            <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 text-slate-600 space-y-1">
              <p className="font-semibold text-slate-700">💡 수장고 상세설명</p>
              <p>• 생약표본 수장고, 한약재수장고 등 수장고 위치 기준 분류</p>
              <p>• 과명 수는 해당 공간 내 식물 다양성 지표로 활용</p>
            </div>
          </div>

          {/* Table Details column */}
          <div className="lg:col-span-2 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-655">
              <thead className="bg-slate-50 text-slate-550 uppercase text-xs border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">수장고 명칭</th>
                  <th className="px-4 py-2.5">보관 표본 수</th>
                  <th className="px-4 py-2.5">비율 (%)</th>
                  <th className="px-4 py-2.5">보관 과명 수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {storageStatsData.map((row: any) => (
                  <tr key={row.room} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.room}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{row.count.toLocaleString()} 건</td>
                    <td className="px-4 py-3 font-mono text-slate-555">{row.percentage}%</td>
                    <td className="px-4 py-3 font-semibold text-blue-600 font-mono">
                      {row.familyCount.toLocaleString()}개 과명
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 전체 과명 탐색 테이블 섹션 */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
            전체 과명 목록 (총 {familyTableData.length}개)
          </h3>
          <div className="relative max-w-xs w-full">
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setTablePage(1);
              }}
              placeholder="과명 검색..."
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 pl-8 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-655">
            <thead className="bg-slate-50 text-slate-555 uppercase text-xs border-b border-slate-200">
              <tr>
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:text-slate-800 transition-colors"
                  onClick={() => handleSort('family')}
                >
                  과명 {renderSortArrow('family')}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:text-slate-800 transition-colors"
                  onClick={() => handleSort('count')}
                >
                  표본 수 {renderSortArrow('count')}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:text-slate-800 transition-colors"
                  onClick={() => handleSort('importanceCounts')}
                >
                  중요도별 분포 {renderSortArrow('importanceCounts')}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:text-slate-800 transition-colors"
                  onClick={() => handleSort('joinedRatio')}
                >
                  공정서 등재 표본 (등재율) {renderSortArrow('joinedRatio')}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:text-slate-800 transition-colors"
                  onClick={() => handleSort('topRegions' as any)}
                >
                  주요 채취 지역 {renderSortArrow('topRegions' as any)}
                </th>
                <th className="px-4 py-3 text-slate-500">
                  상위 생약명 3개 (표본 수 순)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedTableData.map((row) => (
                <tr
                  key={row.family}
                  onClick={() => handleRowClick(row.family)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer text-xs"
                >
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.family}</td>
                  <td className="px-4 py-3 text-emerald-600 font-bold">{row.count.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {row.importanceCounts.A1 > 0 && (
                        <span className="bg-rose-50 text-rose-600 border border-rose-200/50 text-[10px] px-1.5 py-0.5 rounded font-mono font-medium">
                          A1: {row.importanceCounts.A1}
                        </span>
                      )}
                      {row.importanceCounts.A2 > 0 && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200/50 text-[10px] px-1.5 py-0.5 rounded font-mono font-medium">
                          A2: {row.importanceCounts.A2}
                        </span>
                      )}
                      {row.importanceCounts.B1 > 0 && (
                        <span className="bg-blue-50 text-blue-600 border border-blue-200/55 text-[10px] px-1.5 py-0.5 rounded font-mono font-medium">
                          B1: {row.importanceCounts.B1}
                        </span>
                      )}
                      {row.importanceCounts.B2 > 0 && (
                        <span className="bg-violet-50 text-violet-600 border border-violet-200/50 text-[10px] px-1.5 py-0.5 rounded font-mono font-medium">
                          B2계열: {row.importanceCounts.B2}
                        </span>
                      )}
                      {row.importanceCounts.A1 +
                        row.importanceCounts.A2 +
                        row.importanceCounts.B1 +
                        row.importanceCounts.B2 ===
                        0 && <span className="text-slate-400 text-[11px]">-</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.joinedCount > 0 ? (
                      <div className="flex flex-col gap-1 min-w-[110px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-emerald-600">
                            {row.joinedCount.toLocaleString()}건
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 font-semibold">
                            ({row.joinedRatio}%)
                          </span>
                        </div>
                        <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all" 
                            style={{ width: `${Math.min(100, parseFloat(row.joinedRatio))}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">미등재 (0%)</span>
                    )}
                  </td>
                  <td
                    className="px-4 py-3 text-xs text-slate-650 truncate max-w-[200px]"
                    title={row.topRegions.join(', ')}
                  >
                    {row.topRegions.length > 0 ? (
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[11px] border border-slate-200/70 font-medium">
                        {row.topRegions.join(', ')}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td
                    className="px-4 py-3 text-xs text-slate-500 max-w-[280px] truncate"
                    title={row.topHerbs.join(', ')}
                  >
                    {row.topHerbs.length > 0 ? row.topHerbs.join(', ') : '-'}
                  </td>
                </tr>
              ))}
              {paginatedTableData.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    일치하는 과명이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {tableTotalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <span className="text-xs text-slate-550">
              과명 페이지 {tablePage} / {tableTotalPages} (총 {sortedData.length}개 결과)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setTablePage((p) => Math.max(p - 1, 1))}
                disabled={tablePage === 1}
                className="p-1.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTablePage((p) => Math.min(p + 1, tableTotalPages))}
                disabled={tablePage === tableTotalPages}
                className="p-1.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Family Modal */}
      {detailFamily && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-baseline gap-2">
                <h3 className="text-lg font-bold text-slate-800">[{detailFamily}] 과명 표본 목록</h3>
                <span className="text-xs text-slate-500">총 {modalSpecimens.length.toLocaleString()}건</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadFamilyExcel(detailFamily, modalSpecimens)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition-colors shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  엑셀 다운로드
                </button>
                <button
                  onClick={() => setDetailFamily(null)}
                  className="p-1 text-slate-500 hover:text-slate-800 transition-colors hover:bg-slate-200 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Search Bar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-end">
              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => {
                    setModalSearch(e.target.value);
                    setModalPage(1);
                  }}
                  placeholder="표본명, 학명, 관리번호 등 검색..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 pl-8 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Modal Content Table */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-650">
                  <thead className="bg-slate-50 text-slate-550 uppercase text-xs border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3">관리번호</th>
                      <th className="px-4 py-3">생약명</th>
                      <th className="px-4 py-3">국명</th>
                      <th className="px-4 py-3">학명</th>
                      <th className="px-4 py-3">수집장소</th>
                      <th className="px-4 py-3">중요도</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedModalSpecimens.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-800">{item.managementId}</td>
                        <td className="px-4 py-3 text-slate-700">{item.herbName || '-'}</td>
                        <td className="px-4 py-3 text-emerald-600 font-medium">{item.korName || '-'}</td>
                        <td className="px-4 py-3 font-mono text-xs italic text-slate-500">{item.sciName || '-'}</td>
                        <td
                          className="px-4 py-3 text-slate-600 truncate max-w-[220px]"
                          title={item.collectPlace || ''}
                        >
                          {item.collectPlace || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {item.importance ? (
                            <span className="bg-emerald-50 text-emerald-600 border border-emerald-500/25 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                              {item.importance}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {paginatedModalSpecimens.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400">
                          검색 결과와 일치하는 표본이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer (Pagination) */}
            {modalTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 p-5 bg-slate-50 text-xs">
                <span className="text-slate-555 font-mono">
                  페이지 {modalPage} / {modalTotalPages} (총 {filteredModalSpecimens.length}개 결과)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setModalPage((p) => Math.max(p - 1, 1))}
                    disabled={modalPage === 1}
                    className="p-1.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setModalPage((p) => Math.min(p + 1, modalTotalPages))}
                    disabled={modalPage === modalTotalPages}
                    className="p-1.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-655 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Family Specimens Table */}
      {selectedFamily && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
            <div className="flex items-baseline gap-2">
              <h4 className="text-md font-bold text-emerald-600">[{selectedFamily}] 표본 목록</h4>
              <span className="text-xs text-slate-500">
                총 {selectedFamilySpecimens.length.toLocaleString()}건
              </span>
            </div>
            <button
              onClick={() => setSelectedFamily(null)}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
            >
              닫기
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-655">
              <thead className="bg-slate-50 text-slate-555 uppercase text-xs border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">관리번호</th>
                  <th className="px-4 py-3">표본번호</th>
                  <th className="px-4 py-3">생약명</th>
                  <th className="px-4 py-3">국명</th>
                  <th className="px-4 py-3">수집날짜</th>
                  <th className="px-4 py-3">수집장소</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedSpecimens.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors text-xs">
                    <td className="px-4 py-3 font-mono text-xs text-slate-850">{item.managementId}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-550">{item.specimenNo || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{item.herbName || '-'}</td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold">{item.korName || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{item.collectDate || '-'}</td>
                    <td className="px-4 py-3 truncate max-w-[200px] text-slate-600" title={item.collectPlace}>
                      {item.collectPlace || '-'}
                    </td>
                  </tr>
                ))}
                {paginatedSpecimens.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400">
                      데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-4 text-xs">
              <span className="text-slate-500">
                페이지 {currentPage} / {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-655 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
