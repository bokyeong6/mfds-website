'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '../../../store/useAppStore';
import { PharmacItem } from '../../../types';
import { collection, query, where, getDocs, limit, orderBy, startAfter, getCountFromServer } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import * as XLSX from 'xlsx';
import {
  Search,
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
  const router = useRouter();
  const isInitialized = useAppStore((state) => state.isInitialized);
  const addPharmacoItem = useAppStore((state) => state.addPharmacoItem);
  const updatePharmacoItem = useAppStore((state) => state.updatePharmacoItem);
  const deletePharmacoItem = useAppStore((state) => state.deletePharmacoItem);
  const cachedStats = useAppStore((state) => state.cachedStats);

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

  const [formError, setFormError] = useState<string | null>(null);

  const itemsPerPage = 50;

  // Pagination states for Firestore
  const [items, setItems] = useState<PharmacItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  const [lastDocs, setLastDocs] = useState<any[]>([]);

  const fetchPharmacopoeia = useCallback(async () => {
    setLoading(true);
    try {
      const pharmaRef = collection(db, 'pharmacopoeia');

      // 1. Query matching count
      let qCount = query(pharmaRef);
      if (searchTerm) {
        const term = searchTerm.trim();
        qCount = query(
          pharmaRef,
          where('item', '>=', term),
          where('item', '<=', term + '\uf8ff')
        );
      }

      const countSnap = await getCountFromServer(qCount);
      setTotalCount(countSnap.data().count);

      // 2. Query page items
      let q = query(pharmaRef);

      if (searchTerm) {
        const term = searchTerm.trim();
        q = query(
          pharmaRef,
          where('item', '>=', term),
          where('item', '<=', term + '\uf8ff'),
          orderBy('item', 'asc'),
          limit(itemsPerPage)
        );
      } else {
        const sortField = sortConfig?.key || 'idx';
        const sortDir = sortConfig?.direction || 'asc';
        q = query(
          pharmaRef,
          orderBy(sortField, sortDir),
          limit(itemsPerPage)
        );
      }

      if (currentPage > 1 && lastDocs[currentPage - 2]) {
        q = query(q, startAfter(lastDocs[currentPage - 2]));
      }

      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as PharmacItem));
      setItems(list);

      if (snap.docs.length > 0) {
        const lastDoc = snap.docs[snap.docs.length - 1];
        setLastDocs(prev => {
          const next = [...prev];
          next[currentPage - 1] = lastDoc;
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to fetch pharmacopoeia page:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, currentPage, sortConfig, lastDocs]);

  useEffect(() => {
    setLastDocs([]);
    setCurrentPage(1);
  }, [searchTerm, sortConfig]);

  useEffect(() => {
    fetchPharmacopoeia();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Sorting
  const requestSort = (key: keyof PharmacItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const paginatedItems = items;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Open forms
  const handleOpenCreate = async () => {
    setEditingItem(null);
    try {
      const pharmaRef = collection(db, 'pharmacopoeia');
      const qMax = query(pharmaRef, orderBy('idx', 'desc'), limit(1));
      const snapMax = await getDocs(qMax);
      const maxIdx = !snapMax.empty ? snapMax.docs[0].data().idx || 0 : 0;

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
    } catch (err) {
      console.error('Failed to get max index from Firestore:', err);
    }
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
        // Check duplicate item
        const qCheck = query(collection(db, 'pharmacopoeia'), where('item', '==', payload.item));
        const snapCheck = await getDocs(qCheck);
        if (!snapCheck.empty) {
          setFormError('동일한 품목명의 공정서 규격 정보가 이미 존재합니다.');
          return;
        }
        await addPharmacoItem(payload);
      }

      setIsFormOpen(false);
      fetchPharmacopoeia();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setFormError(errMsg || '저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId) {
      await deletePharmacoItem(deleteConfirmId);
      setDeleteConfirmId(null);
      fetchPharmacopoeia();
    }
  };

  const handleItemClick = (itemName: string, pharmacopoeia?: string) => {
    const pharmaParam = pharmacopoeia ? `&pharma=${encodeURIComponent(pharmacopoeia)}` : '';
    router.push(`/map?search=${encodeURIComponent(itemName)}${pharmaParam}`);
  };

  const handleExcelExport = async () => {
    try {
      const colRef = collection(db, 'pharmacopoeia');
      let q = query(colRef);
      if (searchTerm) {
        const term = searchTerm.trim();
        q = query(colRef, where('item', '>=', term), where('item', '<=', term + '\uf8ff'));
      }
      const snap = await getDocs(q);
      const allItems = snap.docs.map((doc) => doc.data() as PharmacItem);

      const exportData = allItems.map((item) => ({
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
          const cellVal = String(row[key as keyof typeof row] || '');
          const valLen = cellVal.length;
          acc[key] = Math.max(acc[key] || 0, valLen);
        });
        return acc;
      }, {} as Record<string, number>);

      ws['!cols'] = Object.keys(maxLen).map((key) => ({ wch: Math.min(Math.max(maxLen[key], 10), 50) }));

      XLSX.writeFile(wb, '공정서_시험법_목록.xlsx');
    } catch (err) {
      console.error('Failed to export Excel:', err);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <p className="text-lg font-medium">데이터가 초기화되지 않았습니다.</p>
        <p className="text-sm text-slate-400 mt-1">엑셀 데이터를 먼저 업로드해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">공정서 시험법 규격 관리</h1>
          <p className="text-sm text-slate-500 mt-1">
            공정서 등재 규격 품목 목록과 적용 가능한 시험법 정보를 확인하고 관리합니다.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExcelExport}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm transition-all flex items-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            엑셀 다운로드
          </button>
        </div>
      </div>

      {/* Filter and counts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-100/50 p-4 border border-slate-200 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="품목명, 확인시험, 정량법 또는 공정서 검색"
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          검색 결과: <span className="text-emerald-600 font-bold">{totalCount.toLocaleString()}</span> / {(cachedStats?.totalPharmacopoeiaCount || 0).toLocaleString()} 건
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-650">
            <thead className="bg-slate-50 text-slate-550 uppercase text-xs border-b border-slate-200">
              <tr>
                <th
                  onClick={() => requestSort('idx')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <span className="flex items-center gap-1.5">
                    번호
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </span>
                </th>
                <th
                  onClick={() => requestSort('pharmacopoeia')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <span className="flex items-center gap-1.5">
                    공정서
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </span>
                </th>
                <th
                  onClick={() => requestSort('item')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <span className="flex items-center gap-1.5">
                    품목명
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </span>
                </th>
                <th className="px-4 py-3.5">형태</th>
                <th className="px-4 py-3.5">확인시험</th>
                <th className="px-4 py-3.5">순도시험</th>
                <th className="px-4 py-3.5">건조감량</th>
                <th className="px-4 py-3.5">회분</th>
                <th className="px-4 py-3.5">산불용성회분</th>
                <th className="px-4 py-3.5">정유함량</th>
                <th className="px-4 py-3.5">엑스함량</th>
                <th className="px-4 py-3.5">정량법</th>
                <th
                  onClick={() => requestSort('specimenIds')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <span className="flex items-center gap-1.5">
                    관련 표본수
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </span>
                </th>
                <th className="px-4 py-3.5 text-right">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-500">{item.idx}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded text-xs font-semibold font-mono">
                      {item.pharmacopoeia}
                    </span>
                  </td>
                  <td
                    onClick={() => handleItemClick(item.item, item.pharmacopoeia)}
                    className="px-4 py-3 text-emerald-600 font-bold hover:underline cursor-pointer"
                  >
                    {item.item}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{item.type || '-'}</td>
                  <td className="px-4 py-3 text-xs leading-snug truncate max-w-[200px] text-slate-655" title={item.confirmTest || ''}>
                    {item.confirmTest || '-'}
                  </td>
                  <td className="px-4 py-3 text-xs leading-snug truncate max-w-[180px] text-slate-655" title={`${item.purityTest || ''} ${item.purityItems || ''}`.trim()}>
                    {item.purityTest || '-'}
                    {item.purityItems ? ` (${item.purityItems})` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-650 text-xs whitespace-nowrap">{item.dryLoss || '-'}</td>
                  <td className="px-4 py-3 text-slate-650 text-xs whitespace-nowrap">{item.ash || '-'}</td>
                  <td className="px-4 py-3 text-slate-650 text-xs whitespace-nowrap">{item.acidAsh || '-'}</td>
                  <td className="px-4 py-3 text-slate-650 text-xs whitespace-nowrap">{item.essentialOil || '-'}</td>
                  <td className="px-4 py-3 text-slate-650 text-xs whitespace-nowrap">{item.extractContent || '-'}</td>
                  <td className="px-4 py-3 text-xs leading-snug truncate max-w-[150px] text-slate-655" title={item.quantMethod || ''}>
                    {item.quantMethod || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleItemClick(item.item, item.pharmacopoeia)}
                      disabled={!item.specimenIds || item.specimenIds.length === 0}
                      className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-500/25 text-emerald-600 rounded text-xs font-semibold font-mono hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:hover:bg-emerald-50 disabled:cursor-not-allowed"
                    >
                      {item.specimenIds ? item.specimenIds.length : 0} 건
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-emerald-600 transition-colors"
                        title="편집"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-rose-600 transition-colors"
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
                  <td colSpan={14} className="text-center py-12 text-slate-450 font-medium">
                    일치하는 공정서 품목이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200 bg-slate-50/70 text-xs">
          <span className="text-slate-500">
            총 {totalPages} 페이지 중 {currentPage} 페이지 (결과 {totalCount.toLocaleString()}건)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              처음
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 bg-white border border-slate-200 text-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
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
                        ? 'bg-emerald-500 text-white font-bold shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-655 hover:bg-slate-50'
                    }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 bg-white border border-slate-200 text-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 bg-white border border-slate-200 text-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              끝
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 text-slate-900 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col my-8 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-md font-bold text-slate-800">
                {editingItem ? '공정서 품목 수정' : '새 공정서 품목 추가'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              {formError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-lg text-sm flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* idx */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    인덱스 번호 (idx) *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.idx}
                    onChange={(e) => setFormData({ ...formData, idx: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* pharmacopoeia */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    공정서 (pharmacopoeia)
                  </label>
                  <select
                    value={formData.pharmacopoeia}
                    onChange={(e) => setFormData({ ...formData, pharmacopoeia: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="KP">KP</option>
                    <option value="KHP">KHP</option>
                  </select>
                </div>

                {/* item */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    품목명 (item) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.item}
                    onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                    placeholder="갈근"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* type */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    형태 (type)
                  </label>
                  <input
                    type="text"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    placeholder="식물성"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* confirmTest */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    확인시험 (confirmTest)
                  </label>
                  <input
                    type="text"
                    value={formData.confirmTest || ''}
                    onChange={(e) => setFormData({ ...formData, confirmTest: e.target.value })}
                    placeholder="TLC"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* quantMethod */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    정량법 (quantMethod)
                  </label>
                  <input
                    type="text"
                    value={formData.quantMethod || ''}
                    onChange={(e) => setFormData({ ...formData, quantMethod: e.target.value })}
                    placeholder="HPLC"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* purityTest */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    순도시험 (purityTest)
                  </label>
                  <input
                    type="text"
                    value={formData.purityTest || ''}
                    onChange={(e) => setFormData({ ...formData, purityTest: e.target.value })}
                    placeholder="O"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* purityItems */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    순도시험 항목 (purityItems)
                  </label>
                  <input
                    type="text"
                    value={formData.purityItems || ''}
                    onChange={(e) => setFormData({ ...formData, purityItems: e.target.value })}
                    placeholder="중금속, 잔류농약, 이산화황"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* dryLoss */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    건조감량 (dryLoss)
                  </label>
                  <input
                    type="text"
                    value={formData.dryLoss || ''}
                    onChange={(e) => setFormData({ ...formData, dryLoss: e.target.value })}
                    placeholder="13% 이하"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* ash */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    회분 (ash)
                  </label>
                  <input
                    type="text"
                    value={formData.ash || ''}
                    onChange={(e) => setFormData({ ...formData, ash: e.target.value })}
                    placeholder="6.0% 이하"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* acidAsh */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    산불용성회분 (acidAsh)
                  </label>
                  <input
                    type="text"
                    value={formData.acidAsh || ''}
                    onChange={(e) => setFormData({ ...formData, acidAsh: e.target.value })}
                    placeholder="1.0% 이하"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* extractContent */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    엑스함량 (extractContent)
                  </label>
                  <input
                    type="text"
                    value={formData.extractContent || ''}
                    onChange={(e) => setFormData({ ...formData, extractContent: e.target.value })}
                    placeholder="물엑스 20.0% 이상"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* essentialOil */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    정유함량 (essentialOil)
                  </label>
                  <input
                    type="text"
                    value={formData.essentialOil || ''}
                    onChange={(e) => setFormData({ ...formData, essentialOil: e.target.value })}
                    placeholder="0.5 mL 이상"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* specimenIdsStr */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    관련 표본 관리번호들 (쉼표로 구분)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.specimenIdsStr}
                    onChange={(e) => setFormData({ ...formData, specimenIdsStr: e.target.value })}
                    placeholder="KHR19016745V, KHR18004993V, KHR19011244V"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 resize-none font-mono text-xs"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="border-t border-slate-200 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-semibold rounded-lg text-sm transition-colors text-slate-600"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-sm transition-colors shadow-md shadow-emerald-500/10"
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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 text-slate-900">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-5 animate-in zoom-in-95 duration-150">
            <h3 className="text-md font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              공정서 품목 삭제
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              정말로 이 공정서 품목 데이터를 영구히 삭제하시겠습니까? 이 작업은 로컬 데이터베이스에서 완전히 삭제되며 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-semibold rounded-lg text-sm transition-colors text-slate-600"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-sm transition-colors"
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
