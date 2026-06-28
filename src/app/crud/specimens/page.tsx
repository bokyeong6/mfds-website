'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Specimen } from '../../../types';
import * as XLSX from 'xlsx';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Download,
  ArrowUpDown,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

type SortConfig = { key: keyof Specimen; direction: 'asc' | 'desc' } | null;

export default function SpecimensCRUD() {
  const specimens = useAppStore((state) => state.specimens);
  const isInitialized = useAppStore((state) => state.isInitialized);
  const addSpecimen = useAppStore((state) => state.addSpecimen);
  const updateSpecimen = useAppStore((state) => state.updateSpecimen);
  const deleteSpecimen = useAppStore((state) => state.deleteSpecimen);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSpecimen, setEditingSpecimen] = useState<Specimen | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState<Omit<Specimen, 'id' | 'lat' | 'lng'>>({
    managementId: '',
    specimenNo: '',
    storage: '',
    storageLocation: '',
    herbName: '',
    korName: '',
    sciName: '',
    collectDate: '',
    collectPlace: '',
    importance: '',
    genus: '',
    family: '',
    gps: '',
    pharmacopoeia: '',
    projectName: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  const itemsPerPage = 50;

  // Sorting Handler
  const requestSort = (key: keyof Specimen) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // Filtered & Sorted Items
  const filteredAndSortedItems = useMemo(() => {
    // 1. Filter
    const result = specimens.filter((s) => {
      const q = searchTerm.toLowerCase();
      return (
        s.managementId?.toLowerCase().includes(q) ||
        s.herbName?.toLowerCase().includes(q) ||
        s.korName?.toLowerCase().includes(q) ||
        s.family?.toLowerCase().includes(q)
      );
    });

    // 2. Sort
    if (sortConfig) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        const aVal = a[key] || '';
        const bVal = b[key] || '';

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return direction === 'asc'
            ? aVal.localeCompare(bVal, 'ko')
            : bVal.localeCompare(aVal, 'ko');
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        return 0;
      });
    }

    return result;
  }, [specimens, searchTerm, sortConfig]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedItems.slice(start, start + itemsPerPage);
  }, [filteredAndSortedItems, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Open Form Modal
  const handleOpenCreate = () => {
    setEditingSpecimen(null);
    setFormData({
      managementId: '',
      specimenNo: '',
      storage: '',
      storageLocation: '',
      herbName: '',
      korName: '',
      sciName: '',
      collectDate: new Date().toISOString().split('T')[0],
      collectPlace: '',
      importance: 'B1',
      genus: '',
      family: '',
      gps: '',
      pharmacopoeia: '',
      projectName: '',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Specimen) => {
    setEditingSpecimen(item);
    setFormData({
      managementId: item.managementId || '',
      specimenNo: item.specimenNo || '',
      storage: item.storage || '',
      storageLocation: item.storageLocation || '',
      herbName: item.herbName || '',
      korName: item.korName || '',
      sciName: item.sciName || '',
      collectDate: item.collectDate || '',
      collectPlace: item.collectPlace || '',
      importance: item.importance || '',
      genus: item.genus || '',
      family: item.family || '',
      gps: item.gps || '',
      pharmacopoeia: item.pharmacopoeia || '',
      projectName: item.projectName || '',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  // Submit Form Action
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.managementId.trim()) {
      setFormError('관리번호는 필수 입력 항목입니다.');
      return;
    }

    // GPS Parsing
    let lat = 0;
    let lng = 0;
    if (formData.gps.trim()) {
      const parts = formData.gps.split(',').map((s) => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        lat = parts[0];
        lng = parts[1];
      } else {
        setFormError('GPS 포맷이 잘못되었습니다. "위도, 경도" 형식으로 입력해 주세요. (예: 37.123, 128.456)');
        return;
      }
    }

    try {
      const payload = {
        ...formData,
        lat,
        lng,
        pharmacopoeia: (formData.pharmacopoeia || '').trim() || null,
      };

      if (editingSpecimen) {
        await updateSpecimen(editingSpecimen.id, payload);
      } else {
        // Check duplicate managementId
        const exists = specimens.some((s) => s.managementId === payload.managementId);
        if (exists) {
          setFormError('동일한 관리번호의 표본이 이미 존재합니다.');
          return;
        }
        await addSpecimen(payload);
      }

      setIsFormOpen(false);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setFormError(errMsg || '저장 중 오류가 발생했습니다.');
    }
  };

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (deleteConfirmId) {
      await deleteSpecimen(deleteConfirmId);
      setDeleteConfirmId(null);
      // Recalculate page index if last item on page was deleted
      if (paginatedItems.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  // Excel Export Handler
  const handleExcelExport = () => {
    const exportData = filteredAndSortedItems.map((item) => ({
      '관리번호 (managementId)': item.managementId,
      '표본번호 (specimenNo)': item.specimenNo,
      '수장고 (storage)': item.storage,
      '수장위치 (storageLocation)': item.storageLocation,
      '생약명 (herbName)': item.herbName,
      '국명 (korName)': item.korName,
      '학명 (sciName)': item.sciName,
      '수집날짜 (collectDate)': item.collectDate,
      '수집장소 (collectPlace)': item.collectPlace,
      '중요도 (importance)': item.importance,
      '속명 (genus)': item.genus,
      '과명 (family)': item.family,
      'GPS (gps)': item.gps,
      '공정서 등재 (pharmacopoeia)': item.pharmacopoeia || '-',
      '과제명 (projectName)': item.projectName,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '표본 데이터');
    
    // Auto-fit columns
    const maxLen = exportData.reduce((acc, row) => {
      Object.keys(row).forEach((key) => {
        const val = String((row as Record<string, unknown>)[key]);
        acc[key] = Math.max(acc[key] || 0, val.length + 4);
      });
      return acc;
    }, {} as Record<string, number>);
    ws['!cols'] = Object.keys(maxLen).map((k) => ({ wch: maxLen[k] }));

    XLSX.writeFile(wb, `제주센터_표본목록_내보내기_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <p className="text-lg font-medium">데이터가 초기화되지 않았습니다.</p>
        <p className="text-sm text-slate-500 mt-1">엑셀 데이터를 먼저 업로드해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">표본 관리 (Specimens)</h1>
          <p className="text-sm text-slate-400 mt-1">
            수집된 표본들의 메타데이터 목록을 확인하고, 추가·수정·삭제를 수행합니다.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExcelExport}
            className="px-4 py-2 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            엑셀 다운로드
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10"
          >
            <Plus className="w-4 h-4" />
            표본 추가
          </button>
        </div>
      </div>

      {/* Filter and stats indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 border border-slate-850 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="관리번호, 생약명, 국명 또는 과명 검색"
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        </div>
        
        <div className="text-xs text-slate-400 font-medium">
          검색 결과: <span className="text-emerald-400 font-bold">{filteredAndSortedItems.length.toLocaleString()}</span> / {specimens.length.toLocaleString()} 건
        </div>
      </div>

      {/* Main Grid Table */}
      <div className="bg-slate-900 border border-slate-850 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-350">
            <thead className="bg-slate-950 text-slate-400 uppercase text-xs border-b border-slate-800">
              <tr>
                <th
                  onClick={() => requestSort('managementId')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-900 transition-colors select-none"
                >
                  <span className="flex items-center gap-1.5">
                    관리번호
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </span>
                </th>
                <th
                  onClick={() => requestSort('herbName')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-900 transition-colors select-none"
                >
                  <span className="flex items-center gap-1.5">
                    생약명
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </span>
                </th>
                <th
                  onClick={() => requestSort('korName')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-900 transition-colors select-none"
                >
                  <span className="flex items-center gap-1.5">
                    국명
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </span>
                </th>
                <th
                  onClick={() => requestSort('family')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-900 transition-colors select-none"
                >
                  <span className="flex items-center gap-1.5">
                    과명
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </span>
                </th>
                <th
                  onClick={() => requestSort('collectDate')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-900 transition-colors select-none"
                >
                  <span className="flex items-center gap-1.5">
                    수집날짜
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </span>
                </th>
                <th className="px-4 py-3.5">수집장소</th>
                <th className="px-4 py-3.5">공정서</th>
                <th className="px-4 py-3.5 text-right">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-200">{item.managementId}</td>
                  <td className="px-4 py-3 font-medium">{item.herbName || '-'}</td>
                  <td className="px-4 py-3 text-emerald-400 font-medium">{item.korName || '-'}</td>
                  <td className="px-4 py-3 text-xs">{item.family || '-'}</td>
                  <td className="px-4 py-3 text-xs font-mono">{item.collectDate || '-'}</td>
                  <td className="px-4 py-3 text-xs truncate max-w-[180px]" title={item.collectPlace}>
                    {item.collectPlace || '-'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {item.pharmacopoeia ? (
                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[10px] font-semibold font-mono">
                        {item.pharmacopoeia}
                      </span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 transition-colors"
                        title="편집"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500 font-medium">
                    일치하는 표본 데이터를 찾을 수 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-800 bg-slate-950/40 text-xs">
          <span className="text-slate-500">
            총 {totalPages} 페이지 중 {currentPage} 페이지 (결과 {filteredAndSortedItems.length.toLocaleString()}건)
          </span>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 bg-slate-900 border border-slate-800 text-slate-400 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-850"
            >
              처음
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 bg-slate-900 border border-slate-800 text-slate-400 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-850"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {/* Show adjacent pages */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
              // Sliding window of page numbers
              let pageNum = currentPage - 2 + idx;
              if (currentPage <= 2) pageNum = idx + 1;
              if (currentPage >= totalPages - 1) pageNum = totalPages - 4 + idx;
              
              if (pageNum < 1 || pageNum > totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-6 h-6 rounded font-semibold transition-colors
                    ${
                      currentPage === pageNum
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 bg-slate-900 border border-slate-800 text-slate-400 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-850"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 bg-slate-900 border border-slate-800 text-slate-400 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-850"
            >
              끝
            </button>
          </div>
        </div>
      </div>

      {/* CRUD Edit/Create Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 text-white overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col my-8 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <h3 className="text-md font-bold text-slate-200">
                {editingSpecimen ? '표본 수정' : '새 표본 추가'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              {formError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-sm flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* managementId */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    관리번호 (managementId) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.managementId}
                    onChange={(e) => setFormData({ ...formData, managementId: e.target.value })}
                    disabled={!!editingSpecimen}
                    placeholder="KHR19016745V"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                </div>

                {/* specimenNo */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    표본번호 (specimenNo)
                  </label>
                  <input
                    type="text"
                    value={formData.specimenNo}
                    onChange={(e) => setFormData({ ...formData, specimenNo: e.target.value })}
                    placeholder="MFDS-V-6926"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* herbName */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    생약명 (herbName)
                  </label>
                  <input
                    type="text"
                    value={formData.herbName}
                    onChange={(e) => setFormData({ ...formData, herbName: e.target.value })}
                    placeholder="추목피(楸木皮)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* korName */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    국명 (korName)
                  </label>
                  <input
                    type="text"
                    value={formData.korName}
                    onChange={(e) => setFormData({ ...formData, korName: e.target.value })}
                    placeholder="가래나무"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* sciName */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    학명 (sciName)
                  </label>
                  <input
                    type="text"
                    value={formData.sciName}
                    onChange={(e) => setFormData({ ...formData, sciName: e.target.value })}
                    placeholder="Juglans mandshurica Maxim."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* family */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    과명 (family)
                  </label>
                  <input
                    type="text"
                    value={formData.family}
                    onChange={(e) => setFormData({ ...formData, family: e.target.value })}
                    placeholder="가래나무과"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* genus */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    속명 (genus)
                  </label>
                  <input
                    type="text"
                    value={formData.genus}
                    onChange={(e) => setFormData({ ...formData, genus: e.target.value })}
                    placeholder="Juglans"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* importance */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    중요도 (importance)
                  </label>
                  <select
                    value={formData.importance}
                    onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2-1">B2-1</option>
                    <option value="B2-2">B2-2</option>
                    <option value="B2-3">B2-3</option>
                    <option value="B2-4">B2-4</option>
                  </select>
                </div>

                {/* storage */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    수장고 (storage)
                  </label>
                  <input
                    type="text"
                    value={formData.storage}
                    onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                    placeholder="1수장고"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* storageLocation */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    수장위치 (storageLocation)
                  </label>
                  <input
                    type="text"
                    value={formData.storageLocation}
                    onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                    placeholder="1수장고 6-7-7 ~ 6-8-2"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* collectDate */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    수집날짜 (collectDate)
                  </label>
                  <input
                    type="text"
                    value={formData.collectDate}
                    onChange={(e) => setFormData({ ...formData, collectDate: e.target.value })}
                    placeholder="2019-05-01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* gps */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    GPS (위도, 경도)
                  </label>
                  <input
                    type="text"
                    value={formData.gps}
                    onChange={(e) => setFormData({ ...formData, gps: e.target.value })}
                    placeholder="38.1616221, 128.2487148"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* pharmacopoeia */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    공정서 등재 (pharmacopoeia)
                  </label>
                  <select
                    value={formData.pharmacopoeia || ''}
                    onChange={(e) => setFormData({ ...formData, pharmacopoeia: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">미등재</option>
                    <option value="KP">KP</option>
                    <option value="KHP">KHP</option>
                  </select>
                </div>

                {/* projectName */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    과제명 (projectName)
                  </label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    placeholder="국가생약자원 수집조사 연구"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* collectPlace */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    수집장소 (collectPlace)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.collectPlace}
                    onChange={(e) => setFormData({ ...formData, collectPlace: e.target.value })}
                    placeholder="강원 인제군 원통리 명당산"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="border-t border-slate-800 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 font-semibold rounded-lg text-sm transition-colors text-slate-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-sm transition-colors shadow-lg shadow-emerald-550/15"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 text-white">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-5 animate-in zoom-in-95 duration-150">
            <h3 className="text-md font-bold text-slate-200 mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              표본 데이터 삭제
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              정말로 이 표본 정보를 영구히 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 로컬 스토리지 데이터베이스에서 완전히 삭제됩니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 font-semibold rounded-lg text-sm transition-colors text-slate-350"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-slate-100 font-bold rounded-lg text-sm transition-colors"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
