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
import { Layers, HelpCircle, FileSpreadsheet, ChevronLeft, ChevronRight, Search, Download, X } from 'lucide-react';
import { Specimen } from '../../types';

interface FamilyTableRow {
  family: string;
  count: number;
  importanceCounts: {
    A1: number;
    A2: number;
    B1: number;
    B2: number;
  };
  isJoined: boolean;
  topHerbs: string[];
}

export default function FamilyStats() {
  const specimens = useAppStore((state) => state.specimens);
  const specimenToPharmacMap = useAppStore((state) => state.specimenToPharmacMap);

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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Summary Metrics
  const metrics = useMemo(() => {
    console.time('FamilyStats:metrics');
    if (specimens.length === 0) {
      return { total: 0, familyCount: 0, topFamily: '-', topFamilyCount: 0, joinedCount: 0 };
    }

    const familyMap = new Map<string, number>();
    let joinedCount = 0;

    specimens.forEach((s) => {
      if (s.family) {
        const cleaned = s.family.trim();
        familyMap.set(cleaned, (familyMap.get(cleaned) || 0) + 1);
      }
      if (specimenToPharmacMap.has(s.managementId)) {
        joinedCount++;
      }
    });

    const families = Array.from(familyMap.entries()).sort((a, b) => b[1] - a[1]);
    const topFamily = families[0] ? families[0][0] : '-';
    const topFamilyCount = families[0] ? families[0][1] : 0;

    const result = {
      total: specimens.length,
      familyCount: familyMap.size,
      topFamily,
      topFamilyCount,
      joinedCount,
    };
    console.timeEnd('FamilyStats:metrics');
    return result;
  }, [specimens, specimenToPharmacMap]);

  // Chart 1: Bar chart of Specimen Count by Family (top 20 + "Others")
  const familyCountChartData = useMemo(() => {
    console.time('FamilyStats:familyCountChartData');
    const familyMap = new Map<string, number>();
    specimens.forEach((s) => {
      const familyName = s.family ? s.family.trim() : '미확인';
      familyMap.set(familyName, (familyMap.get(familyName) || 0) + 1);
    });

    const sortedFamilies = Array.from(familyMap.entries()).sort((a, b) => b[1] - a[1]);
    
    const top20 = sortedFamilies.slice(0, 20);
    const othersCount = sortedFamilies.slice(20).reduce((sum, item) => sum + item[1], 0);

    const data = top20.map(([family, count]) => ({
      family,
      count,
    }));

    if (othersCount > 0) {
      data.push({ family: '기타', count: othersCount });
    }

    console.timeEnd('FamilyStats:familyCountChartData');
    return data;
  }, [specimens]);

  // Chart 2: Stacked Bar Chart of top 10 Family importance distribution
  const stackedImportanceChartData = useMemo(() => {
    console.time('FamilyStats:stackedImportanceChartData');
    const familyMap = new Map<string, number>();
    specimens.forEach((s) => {
      const familyName = s.family ? s.family.trim() : '미확인';
      familyMap.set(familyName, (familyMap.get(familyName) || 0) + 1);
    });

    const top10Families = Array.from(familyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);

    // Initialize map for details
    const dataMap = new Map<string, Record<string, number>>();
    top10Families.forEach((fam) => {
      dataMap.set(fam, {
        A1: 0,
        A2: 0,
        B1: 0,
        'B2-1': 0,
        'B2-2': 0,
        'B2-3': 0,
        'B2-4': 0,
      });
    });

    specimens.forEach((s) => {
      const familyName = s.family ? s.family.trim() : '미확인';
      if (dataMap.has(familyName) && s.importance) {
        const records = dataMap.get(familyName)!;
        const imp = s.importance.trim();
        if (records[imp] !== undefined) {
          records[imp]++;
        }
      }
    });

    const result = top10Families.map((family) => {
      const details = dataMap.get(family)!;
      return {
        family,
        ...details,
      };
    });
    console.timeEnd('FamilyStats:stackedImportanceChartData');
    return result;
  }, [specimens]);

  const handleBarClick = (data: unknown) => {
    if (data && typeof data === 'object' && 'activeLabel' in data) {
      const activeLabel = (data as { activeLabel: unknown }).activeLabel;
      if (typeof activeLabel === 'string') {
        setSelectedFamily(activeLabel);
        setCurrentPage(1);
      }
    }
  };

  // Filtered specimens for the selected family
  const selectedFamilySpecimens = useMemo(() => {
    if (!selectedFamily) return [];
    return specimens.filter((s) => {
      const fam = s.family ? s.family.trim() : '미확인';
      // Support '기타' others classification
      if (selectedFamily === '기타') {
        const chartFamilyNames = familyCountChartData.slice(0, 20).map((d) => d.family);
        return !chartFamilyNames.includes(fam);
      }
      return fam === selectedFamily;
    });
  }, [specimens, selectedFamily, familyCountChartData]);

  // Paginated elements
  const totalPages = Math.ceil(selectedFamilySpecimens.length / itemsPerPage);
  const paginatedSpecimens = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return selectedFamilySpecimens.slice(start, start + itemsPerPage);
  }, [selectedFamilySpecimens, currentPage]);

  // Compute stats details for the Family Explorer Table
  const familyTableData = useMemo(() => {
    console.time('FamilyStats:familyTableData');
    const familyMap = new Map<string, {
      count: number;
      specimens: Specimen[];
    }>();

    specimens.forEach((s) => {
      const fam = s.family ? s.family.trim() : '미확인';
      if (!familyMap.has(fam)) {
        familyMap.set(fam, { count: 0, specimens: [] });
      }
      const entry = familyMap.get(fam)!;
      entry.count++;
      entry.specimens.push(s);
    });

    const rows: FamilyTableRow[] = [];

    familyMap.forEach((entry, family) => {
      let isJoined = false;
      const importanceCounts = { A1: 0, A2: 0, B1: 0, B2: 0 };
      const herbCounts = new Map<string, number>();

      entry.specimens.forEach((s) => {
        // 1. Check joined status
        if (specimenToPharmacMap.has(s.managementId)) {
          isJoined = true;
        }

        // 2. Count importance
        if (s.importance) {
          const imp = s.importance.trim();
          if (imp === 'A1') importanceCounts.A1++;
          else if (imp === 'A2') importanceCounts.A2++;
          else if (imp === 'B1') importanceCounts.B1++;
          else if (imp.startsWith('B2')) importanceCounts.B2++;
        }

        // 3. Count herbs
        const herbName = (s.herbName || s.korName || '미기재').trim();
        herbCounts.set(herbName, (herbCounts.get(herbName) || 0) + 1);
      });

      // Sort herbs by count descending
      const topHerbs = Array.from(herbCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => `${name} (${count})`);

      rows.push({
        family,
        count: entry.count,
        importanceCounts,
        isJoined,
        topHerbs,
      });
    });

    console.timeEnd('FamilyStats:familyTableData');
    return rows;
  }, [specimens, specimenToPharmacMap]);

  // Sort and filter familyTableData
  const sortedData = useMemo(() => {
    const filtered = familyTableData.filter((row) =>
      row.family.toLowerCase().includes(tableSearch.toLowerCase())
    );
    
    return [...filtered].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      if (sortField === 'importanceCounts') {
        valA = a.importanceCounts.A1 + a.importanceCounts.A2 + a.importanceCounts.B1 + a.importanceCounts.B2;
        valB = b.importanceCounts.A1 + b.importanceCounts.A2 + b.importanceCounts.B1 + b.importanceCounts.B2;
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

  // States & helper for the detail family modal
  const modalSpecimens = useMemo(() => {
    if (!detailFamily) return [];
    return specimens.filter((s) => {
      const fam = s.family ? s.family.trim() : '미확인';
      return fam === detailFamily;
    });
  }, [specimens, detailFamily]);

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
    if (sortField !== field) return <span className="text-slate-655 ml-1">⇅</span>;
    return sortOrder === 'asc' ? <span className="text-emerald-400 ml-1">▲</span> : <span className="text-emerald-400 ml-1">▼</span>;
  };

  const handleRowClick = (family: string) => {
    setDetailFamily(family);
    setModalSearch('');
    setModalPage(1);
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

  const importanceColors = {
    A1: '#34d399',    // emerald-400
    A2: '#059669',    // emerald-600
    B1: '#60a5fa',    // blue-400
    'B2-1': '#2563eb', // blue-600
    'B2-2': '#a78bfa', // violet-400
    'B2-3': '#7c3aed', // violet-600
    'B2-4': '#f472b6', // pink-400
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Specimens */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-10 text-emerald-400 group-hover:scale-110 transition-transform">
            <Layers className="w-12 h-12" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">총 표본 수</p>
          <p className="text-2xl font-bold text-slate-100 mt-2">{metrics.total.toLocaleString()}</p>
          <div className="w-full bg-slate-800 h-1 mt-3 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-full"></div>
          </div>
        </div>

        {/* Total Families */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-10 text-emerald-400 group-hover:scale-110 transition-transform">
            <HelpCircle className="w-12 h-12" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">과명 종류</p>
          <p className="text-2xl font-bold text-slate-100 mt-2">{metrics.familyCount} 개</p>
          <div className="w-full bg-slate-800 h-1 mt-3 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-[80%]"></div>
          </div>
        </div>

        {/* Most Frequent Family */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-10 text-emerald-400 group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="w-12 h-12" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">가장 많은 과명</p>
          <p className="text-2xl font-bold text-slate-100 mt-2 truncate max-w-[200px]" title={metrics.topFamily}>
            {metrics.topFamily}
          </p>
          <p className="text-xs text-slate-400 mt-1">{metrics.topFamilyCount.toLocaleString()}개 표본 보유</p>
        </div>

        {/* Joined Specimens */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-10 text-emerald-400 group-hover:scale-110 transition-transform">
            <Layers className="w-12 h-12" />
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">공정서 등재 표본 수</p>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{metrics.joinedCount.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">
            전체 대비 {((metrics.joinedCount / (metrics.total || 1)) * 100).toFixed(1)}% 매칭 완료
          </p>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Chart 1: Family bar chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="family"
                  stroke="#64748b"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                  cursor={{ fill: '#1e293b', opacity: 0.4 }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} className="cursor-pointer" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-500 text-right mt-1">* 막대를 클릭하면 하단에 상세 목록이 필터링됩니다.</p>
        </div>

        {/* Chart 2: Stacked importance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
            과명별 중요도 분포 누적 막대 (상위 10개 과명)
          </h3>
          <div className="h-[380px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stackedImportanceChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="family"
                  stroke="#64748b"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ color: '#94a3b8' }}
                  iconType="circle"
                />
                <Bar dataKey="A1" stackId="a" fill={importanceColors.A1} isAnimationActive={false} />
                <Bar dataKey="A2" stackId="a" fill={importanceColors.A2} isAnimationActive={false} />
                <Bar dataKey="B1" stackId="a" fill={importanceColors.B1} isAnimationActive={false} />
                <Bar dataKey="B2-1" stackId="a" fill={importanceColors['B2-1']} isAnimationActive={false} />
                <Bar dataKey="B2-2" stackId="a" fill={importanceColors['B2-2']} isAnimationActive={false} />
                <Bar dataKey="B2-3" stackId="a" fill={importanceColors['B2-3']} isAnimationActive={false} />
                <Bar dataKey="B2-4" stackId="a" fill={importanceColors['B2-4']} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 전체 과명 탐색 테이블 섹션 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
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
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 pl-8 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-xs border-b border-slate-800">
              <tr>
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:text-slate-200 transition-colors"
                  onClick={() => handleSort('family')}
                >
                  과명 {renderSortArrow('family')}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:text-slate-200 transition-colors"
                  onClick={() => handleSort('count')}
                >
                  표본 수 {renderSortArrow('count')}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:text-slate-200 transition-colors"
                  onClick={() => handleSort('importanceCounts')}
                >
                  중요도별 분포 {renderSortArrow('importanceCounts')}
                </th>
                <th
                  className="px-4 py-3 cursor-pointer select-none hover:text-slate-200 transition-colors"
                  onClick={() => handleSort('isJoined')}
                >
                  공정서 등재 여부 {renderSortArrow('isJoined')}
                </th>
                <th className="px-4 py-3 text-slate-400">
                  상위 생약명 3개 (표본 수 순)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {paginatedTableData.map((row) => (
                <tr
                  key={row.family}
                  onClick={() => handleRowClick(row.family)}
                  className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-semibold text-slate-200">{row.family}</td>
                  <td className="px-4 py-3 text-emerald-400 font-bold">{row.count.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {row.importanceCounts.A1 > 0 && (
                        <span className="bg-red-950/40 text-red-400 border border-red-900/30 text-[10px] px-1.5 py-0.5 rounded font-mono">
                          A1: {row.importanceCounts.A1}
                        </span>
                      )}
                      {row.importanceCounts.A2 > 0 && (
                        <span className="bg-orange-950/40 text-orange-400 border border-orange-900/30 text-[10px] px-1.5 py-0.5 rounded font-mono">
                          A2: {row.importanceCounts.A2}
                        </span>
                      )}
                      {row.importanceCounts.B1 > 0 && (
                        <span className="bg-yellow-950/40 text-yellow-450 border border-yellow-900/30 text-[10px] px-1.5 py-0.5 rounded font-mono">
                          B1: {row.importanceCounts.B1}
                        </span>
                      )}
                      {row.importanceCounts.B2 > 0 && (
                        <span className="bg-blue-950/40 text-blue-400 border border-blue-900/30 text-[10px] px-1.5 py-0.5 rounded font-mono">
                          B2계열: {row.importanceCounts.B2}
                        </span>
                      )}
                      {row.importanceCounts.A1 +
                        row.importanceCounts.A2 +
                        row.importanceCounts.B1 +
                        row.importanceCounts.B2 ===
                        0 && <span className="text-slate-650 text-[11px]">-</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.isJoined ? (
                      <span className="text-emerald-500 font-bold text-base" title="공정서 등재 표본 존재">
                        ✓
                      </span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td
                    className="px-4 py-3 text-xs text-slate-400 max-w-[280px] truncate"
                    title={row.topHerbs.join(', ')}
                  >
                    {row.topHerbs.length > 0 ? row.topHerbs.join(', ') : '-'}
                  </td>
                </tr>
              ))}
              {paginatedTableData.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    일치하는 과명이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {tableTotalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <span className="text-xs text-slate-500">
              과명 페이지 {tablePage} / {tableTotalPages} (총 {sortedData.length}개 결과)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setTablePage((p) => Math.max(p - 1, 1))}
                disabled={tablePage === 1}
                className="p-1.5 rounded bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTablePage((p) => Math.min(p + 1, tableTotalPages))}
                disabled={tablePage === tableTotalPages}
                className="p-1.5 rounded bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Family Modal */}
      {detailFamily && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/40">
              <div className="flex items-baseline gap-2">
                <h3 className="text-lg font-bold text-slate-100">[{detailFamily}] 과명 표본 목록</h3>
                <span className="text-xs text-slate-400">총 {modalSpecimens.length.toLocaleString()}건</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadFamilyExcel(detailFamily, modalSpecimens)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  엑셀 다운로드
                </button>
                <button
                  onClick={() => setDetailFamily(null)}
                  className="p-1 text-slate-400 hover:text-slate-200 transition-colors hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Search Bar */}
            <div className="p-4 border-b border-slate-850 bg-slate-900/60 flex items-center justify-end">
              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => {
                    setModalSearch(e.target.value);
                    setModalPage(1);
                  }}
                  placeholder="표본명, 학명, 관리번호 등 검색..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 pl-8 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Modal Content Table */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase text-xs border-b border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3">관리번호</th>
                      <th className="px-4 py-3">생약명</th>
                      <th className="px-4 py-3">국명</th>
                      <th className="px-4 py-3">학명</th>
                      <th className="px-4 py-3">수집장소</th>
                      <th className="px-4 py-3">중요도</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {paginatedModalSpecimens.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-300">{item.managementId}</td>
                        <td className="px-4 py-3 text-slate-250">{item.herbName || '-'}</td>
                        <td className="px-4 py-3 text-emerald-400 font-medium">{item.korName || '-'}</td>
                        <td className="px-4 py-3 font-mono text-xs italic text-slate-400">{item.sciName || '-'}</td>
                        <td
                          className="px-4 py-3 text-slate-300 truncate max-w-[220px]"
                          title={item.collectPlace || ''}
                        >
                          {item.collectPlace || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {item.importance ? (
                            <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                              {item.importance}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {paginatedModalSpecimens.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-500">
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
              <div className="flex items-center justify-between border-t border-slate-800 p-5 bg-slate-950/40">
                <span className="text-xs text-slate-500">
                  페이지 {modalPage} / {modalTotalPages} (총 {filteredModalSpecimens.length}개 결과)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setModalPage((p) => Math.max(p - 1, 1))}
                    disabled={modalPage === 1}
                    className="p-1.5 rounded bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setModalPage((p) => Math.min(p + 1, modalTotalPages))}
                    disabled={modalPage === modalTotalPages}
                    className="p-1.5 rounded bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div className="flex items-baseline gap-2">
              <h4 className="text-md font-bold text-emerald-400">[{selectedFamily}] 표본 목록</h4>
              <span className="text-xs text-slate-400">
                총 {selectedFamilySpecimens.length.toLocaleString()}건
              </span>
            </div>
            <button
              onClick={() => setSelectedFamily(null)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              닫기
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-xs border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">관리번호</th>
                  <th className="px-4 py-3">표본번호</th>
                  <th className="px-4 py-3">생약명</th>
                  <th className="px-4 py-3">국명</th>
                  <th className="px-4 py-3">수집날짜</th>
                  <th className="px-4 py-3">수집장소</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {paginatedSpecimens.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{item.managementId}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.specimenNo || '-'}</td>
                    <td className="px-4 py-3">{item.herbName || '-'}</td>
                    <td className="px-4 py-3 text-emerald-400 font-medium">{item.korName || '-'}</td>
                    <td className="px-4 py-3">{item.collectDate || '-'}</td>
                    <td className="px-4 py-3 truncate max-w-[200px]" title={item.collectPlace}>
                      {item.collectPlace || '-'}
                    </td>
                  </tr>
                ))}
                {paginatedSpecimens.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-500">
                      데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-4">
              <span className="text-xs text-slate-500">
                페이지 {currentPage} / {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
