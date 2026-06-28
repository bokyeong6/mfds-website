'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { PharmacItem } from '../../../types';
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

type SortConfig = { key: keyof PharmacItem; direction: 'asc' | 'desc' } | null;

export default function PharmacopoeiaCRUD() {
  const pharmacopoeia = useAppStore((state) => state.pharmacopoeia);
  const isInitialized = useAppStore((state) => state.isInitialized);
  const addPharmacoItem = useAppStore((state) => state.addPharmacoItem);
  const updatePharmacoItem = useAppStore((state) => state.updatePharmacoItem);
  const deletePharmacoItem = useAppStore((state) => state.deletePharmacoItem);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PharmacItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState<Omit<PharmacItem, 'id' | 'specimenIds'> & { specimenIdsStr: string }>({
    idx: 1,
    pharmacopoeia: 'KP',
    item: '',
    type: '',
    confirmTest: '',
    purityTest: '',
    purityItems: '',
    quantMethod: '',
    dryLoss: '',
    ash: '',
    acidAsh: '',
    extractContent: '',
    essentialOil: '',
    specimenIdsStr: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  const itemsPerPage = 50;

  // Sorting
  const requestSort = (key: keyof PharmacItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // Filtered & Sorted
  const filteredAndSortedItems = useMemo(() => {
    const result = pharmacopoeia.filter((p) => {
      const q = searchTerm.toLowerCase();
      return (
        p.item?.toLowerCase().includes(q) ||
        p.confirmTest?.toLowerCase().includes(q) ||
        p.quantMethod?.toLowerCase().includes(q) ||
        p.pharmacopoeia?.toLowerCase().includes(q)
      );
    });

    if (sortConfig) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];

        if (aVal === null || aVal === undefined) return direction === 'asc' ? 1 : -1;
        if (bVal === null || bVal === undefined) return direction === 'asc' ? -1 : 1;

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
  }, [pharmacopoeia, searchTerm, sortConfig]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedItems.slice(start, start + itemsPerPage);
  }, [filteredAndSortedItems, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Open forms
  const handleOpenCreate = () => {
    setEditingItem(null);
    // Find next index
    const maxIdx = pharmacopoeia.reduce((max, item) => (item.idx > max ? item.idx : max), 0);
    setFormData({
      idx: maxIdx + 1,
      pharmacopoeia: 'KP',
      item: '',
      type: '식물성',
      confirmTest: '',
      purityTest: '',
      purityItems: '',
      quantMethod: '',
      dryLoss: '',
      ash: '',
      acidAsh: '',
      extractContent: '',
      essentialOil: '',
      specimenIdsStr: '',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: PharmacItem) => {
    setEditingItem(item);
    setFormData({
      idx: item.idx,
      pharmacopoeia: item.pharmacopoeia || 'KP',
      item: item.item || '',
      type: item.type || '',
      confirmTest: item.confirmTest || '',
      purityTest: item.purityTest || '',
      purityItems: item.purityItems || '',
      quantMethod: item.quantMethod || '',
      dryLoss: item.dryLoss || '',
      ash: item.ash || '',
      acidAsh: item.acidAsh || '',
      extractContent: item.extractContent || '',
      essentialOil: item.essentialOil || '',
      specimenIdsStr: item.specimenIds ? item.specimenIds.join(', ') : '',
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.item.trim()) {
      setFormError('품목(item)명은 필수입니다.');
      return;
    }

    // Split specimenIds string by comma
    const specimenIds = formData.specimenIdsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const payload = {
        idx: Number(formData.idx),
        pharmacopoeia: formData.pharmacopoeia,
        item: formData.item.trim(),
        type: formData.type.trim(),
        confirmTest: (formData.confirmTest || '').trim() || null,
        purityTest: (formData.purityTest || '').trim() || null,
        purityItems: (formData.purityItems || '').trim() || null,
        quantMethod: (formData.quantMethod || '').trim() || null,
        dryLoss: (formData.dryLoss || '').trim() || null,
        ash: (formData.ash || '').trim() || null,
        acidAsh: (formData.acidAsh || '').trim() || null,
        extractContent: (formData.extractContent || '').trim() || null,
        essentialOil: (formData.essentialOil || '').trim() || null,
        specimenIds,
      };

      if (editingItem) {
        await updatePharmacoItem(editingItem.id, payload);
      } else {
        await addPharmacoItem(payload);
      }

      setIsFormOpen(false);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setFormError(errMsg || '저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId) {
      await deletePharmacoItem(deleteConfirmId);
      setDeleteConfirmId(null);
      if (paginatedItems.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  const handleExcelExport = () => {
    const exportData = filteredAndSortedItems.map((item) => ({
      '번호 (idx)': item.idx,
      '공정서 (pharmacopoeia)': item.pharmacopoeia,
      '품목 (item)': item.item,
      '형태 (type)': item.type,
      '확인시험 (confirmTest)': item.confirmTest || '-',
      '순도시험 (purityTest)': item.purityTest || '-',
      '순도시험 항목 (purityItems)': item.purityItems || '-',
      '정량법 (quantMethod)': item.quantMethod || '-',
      '건조감량 (dryLoss)': item.dryLoss || '-',
      '회분 (ash)': item.ash || '-',
      '산불용성회분 (acidAsh)': item.acidAsh || '-',
      '엑스함량 (extractContent)': item.extractContent || '-',
      '정유함량 (essentialOil)': item.essentialOil || '-',
      '제주센터 표본 관리번호들': item.specimenIds ? item.specimenIds.join(', ') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '공정서 시험법');

    // Auto-fit columns
    const maxLen = exportData.reduce((acc, row) => {
      Object.keys(row).forEach((key) => {
        const val = String((row as Record<string, unknown>)[key]);
        acc[key] = Math.max(acc[key] || 0, val.length + 4);
      });
      return acc;
    }, {} as Record<string, number>);
    ws['!cols'] = Object.keys(maxLen).map((k) => ({ wch: maxLen[k] }));

    XLSX.writeFile(wb, `제주센터_공정서시험법_내보내기_${new Date().toISOString().split('T')[0]}.xlsx`);
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
          <h1 className="text-2xl font-bold text-slate-100">공정서 시험법 (Pharmacopoeia)</h1>
          <p className="text-sm text-slate-400 mt-1">
            대한민국약전(KP) 및 대한민국약전외한약(생약)규격집(KHP)의 시험 기준 규격을 확인하고 CRUD합니다.
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
            품목 추가
          </button>
        </div>
      </div>

      {/* Filter and counts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 border border-slate-850 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="품목명, 확인시험, 정량법 또는 공정서 검색"
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm transition-colors"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        </div>

        <div className="text-xs text-slate-400 font-medium">
          검색 결과: <span className="text-emerald-400 font-bold">{filteredAndSortedItems.length.toLocaleString()}</span> / {pharmacopoeia.length.toLocaleString()} 건
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-slate-900 border border-slate-850 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-350">
            <thead className="bg-slate-950 text-slate-400 uppercase text-xs border-b border-slate-800">
              <tr>
                <th
                  onClick={() => requestSort('idx')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-900 transition-colors select-none"
                >
                  <span className="flex items-center gap-1.5">
                    번호
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </span>
                </th>
                <th
                  onClick={() => requestSort('pharmacopoeia')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-900 transition-colors select-none"
                >
                  <span className="flex items-center gap-1.5">
                    공정서
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </span>
                </th>
                <th
                  onClick={() => requestSort('item')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-900 transition-colors select-none"
                >
                  <span className="flex items-center gap-1.5">
                    품목명
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </span>
                </th>
                <th className="px-4 py-3.5">형태</th>
                <th className="px-4 py-3.5">확인시험</th>
                <th className="px-4 py-3.5">정량법</th>
                <th className="px-4 py-3.5">관련 표본수</th>
                <th className="px-4 py-3.5 text-right">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-400">{item.idx}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded text-xs font-semibold font-mono">
                      {item.pharmacopoeia}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-emerald-400 font-bold">{item.item}</td>
                  <td className="px-4 py-3 text-slate-300 text-xs">{item.type || '-'}</td>
                  <td className="px-4 py-3 text-xs leading-snug truncate max-w-[200px]" title={item.confirmTest || ''}>
                    {item.confirmTest || '-'}
                  </td>
                  <td className="px-4 py-3 text-xs leading-snug truncate max-w-[150px]" title={item.quantMethod || ''}>
                    {item.quantMethod || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-xs font-semibold font-mono">
                      {item.specimenIds ? item.specimenIds.length : 0} 건
                    </span>
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
                    일치하는 공정서 품목이 없습니다.
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

      {/* Add/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 text-white overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col my-8 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <h3 className="text-md font-bold text-slate-200">
                {editingItem ? '공정서 품목 수정' : '새 공정서 품목 추가'}
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
                {/* idx */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    인덱스 번호 (idx) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.idx}
                    onChange={(e) => setFormData({ ...formData, idx: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* pharmacopoeia */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    공정서 (pharmacopoeia)
                  </label>
                  <select
                    value={formData.pharmacopoeia}
                    onChange={(e) => setFormData({ ...formData, pharmacopoeia: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="KP">KP</option>
                    <option value="KHP">KHP</option>
                  </select>
                </div>

                {/* item */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    품목명 (item) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.item}
                    onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                    placeholder="갈근"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* type */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    형태 (type)
                  </label>
                  <input
                    type="text"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    placeholder="식물성"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* confirmTest */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    확인시험 (confirmTest)
                  </label>
                  <input
                    type="text"
                    value={formData.confirmTest || ''}
                    onChange={(e) => setFormData({ ...formData, confirmTest: e.target.value })}
                    placeholder="TLC"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* quantMethod */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    정량법 (quantMethod)
                  </label>
                  <input
                    type="text"
                    value={formData.quantMethod || ''}
                    onChange={(e) => setFormData({ ...formData, quantMethod: e.target.value })}
                    placeholder="HPLC"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* purityTest */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    순도시험 (purityTest)
                  </label>
                  <input
                    type="text"
                    value={formData.purityTest || ''}
                    onChange={(e) => setFormData({ ...formData, purityTest: e.target.value })}
                    placeholder="O"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* purityItems */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    순도시험 항목 (purityItems)
                  </label>
                  <input
                    type="text"
                    value={formData.purityItems || ''}
                    onChange={(e) => setFormData({ ...formData, purityItems: e.target.value })}
                    placeholder="중금속, 잔류농약, 이산화황"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* dryLoss */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    건조감량 (dryLoss)
                  </label>
                  <input
                    type="text"
                    value={formData.dryLoss || ''}
                    onChange={(e) => setFormData({ ...formData, dryLoss: e.target.value })}
                    placeholder="13% 이하"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* ash */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    회분 (ash)
                  </label>
                  <input
                    type="text"
                    value={formData.ash || ''}
                    onChange={(e) => setFormData({ ...formData, ash: e.target.value })}
                    placeholder="6.0% 이하"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* acidAsh */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    산불용성회분 (acidAsh)
                  </label>
                  <input
                    type="text"
                    value={formData.acidAsh || ''}
                    onChange={(e) => setFormData({ ...formData, acidAsh: e.target.value })}
                    placeholder="1.0% 이하"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* extractContent */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    엑스함량 (extractContent)
                  </label>
                  <input
                    type="text"
                    value={formData.extractContent || ''}
                    onChange={(e) => setFormData({ ...formData, extractContent: e.target.value })}
                    placeholder="물엑스 20.0% 이상"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* essentialOil */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    정유함량 (essentialOil)
                  </label>
                  <input
                    type="text"
                    value={formData.essentialOil || ''}
                    onChange={(e) => setFormData({ ...formData, essentialOil: e.target.value })}
                    placeholder="0.5 mL 이상"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* specimenIdsStr */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    관련 표본 관리번호들 (쉼표로 구분)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.specimenIdsStr}
                    onChange={(e) => setFormData({ ...formData, specimenIdsStr: e.target.value })}
                    placeholder="KHR19016745V, KHR18004993V, KHR19011244V"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:border-emerald-500 resize-none font-mono text-xs"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="border-t border-slate-800 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 font-semibold rounded-lg text-sm transition-colors text-slate-350"
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

      {/* Delete confirm modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 text-white">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-5 animate-in zoom-in-95 duration-150">
            <h3 className="text-md font-bold text-slate-200 mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              공정서 품목 삭제
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              정말로 이 공정서 품목 데이터를 영구히 삭제하시겠습니까? 이 작업은 로컬 데이터베이스에서 완전히 삭제되며 되돌릴 수 없습니다.
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
