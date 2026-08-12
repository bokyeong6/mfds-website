'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Specimen } from '../../../types';
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

type SortConfig = { key: keyof Specimen; direction: 'asc' | 'desc' } | null;

export default function SpecimensCRUD() {
  const isInitialized = useAppStore((state) => state.isInitialized);
  const addSpecimen = useAppStore((state) => state.addSpecimen);
  const updateSpecimen = useAppStore((state) => state.updateSpecimen);
  const deleteSpecimen = useAppStore((state) => state.deleteSpecimen);
  const cachedStats = useAppStore((state) => state.cachedStats);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [photoOnly, setPhotoOnly] = useState(false);
  const [selectedSpecimen, setSelectedSpecimen] = useState<Specimen | null>(null);
  
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

  // Pagination and sorting states for Firestore
  const [items, setItems] = useState<Specimen[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  const [lastDocs, setLastDocs] = useState<any[]>([]);

  const fetchSpecimens = useCallback(async () => {
    setLoading(true);
    try {
      const specimensRef = collection(db, 'specimens');
      
      // 1. Query matching count
      let qCount = query(specimensRef);
      if (searchTerm) {
        const term = searchTerm.trim();
        qCount = query(
          specimensRef,
          where('managementId', '>=', term),
          where('managementId', '<=', term + '\uf8ff')
        );
      }
      if (photoOnly) {
        qCount = query(qCount, where('imageUrls', '!=', []));
      }
      
      const countSnap = await getCountFromServer(qCount);
      setTotalCount(countSnap.data().count);

      // 2. Query page items
      let q = query(specimensRef);
      
      if (searchTerm) {
        const term = searchTerm.trim();
        q = query(
          specimensRef,
          where('managementId', '>=', term),
          where('managementId', '<=', term + '\uf8ff'),
          orderBy('managementId', 'asc'),
          limit(itemsPerPage)
        );
      } else {
        const sortField = sortConfig?.key || 'managementId';
        const sortDir = sortConfig?.direction || 'asc';
        
        if (photoOnly) {
          q = query(
            specimensRef,
            where('imageUrls', '!=', []),
            orderBy('imageUrls', 'asc'),
            limit(itemsPerPage)
          );
        } else {
          q = query(
            specimensRef,
            orderBy(sortField, sortDir),
            limit(itemsPerPage)
          );
        }
      }

      if (currentPage > 1 && lastDocs[currentPage - 2]) {
        q = query(q, startAfter(lastDocs[currentPage - 2]));
      }

      const snap = await getDocs(q);
      let list = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Specimen));
      
      // Filter locally if both search and photoOnly are active
      if (searchTerm && photoOnly) {
        list = list.filter(item => item.imageUrls && item.imageUrls.length > 0);
      }
      
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
      console.error('Failed to fetch specimens page:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, currentPage, sortConfig, lastDocs, photoOnly]);

  useEffect(() => {
    setLastDocs([]);
    setCurrentPage(1);
  }, [searchTerm, sortConfig, photoOnly]);

  useEffect(() => {
    fetchSpecimens();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Sorting Handler
  const requestSort = (key: keyof Specimen) => {
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

  // Open Form Modal
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        // Check duplicate managementId in Firestore
        const qCheck = query(collection(db, 'specimens'), where('managementId', '==', payload.managementId));
        const snapCheck = await getDocs(qCheck);
        if (!snapCheck.empty) {
          setFormError('동일한 관리번호의 표본이 이미 존재합니다.');
          return;
        }
        await addSpecimen(payload);
      }

      setIsFormOpen(false);
      fetchSpecimens();
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
      fetchSpecimens();
    }
  };

  // Excel Export Handler
  const handleExcelExport = async () => {
    try {
      const colRef = collection(db, 'specimens');
      let q = query(colRef);
      if (searchTerm) {
        const term = searchTerm.trim();
        q = query(colRef, where('managementId', '>=', term), where('managementId', '<=', term + '\uf8ff'));
      }
      const snap = await getDocs(q);
      const allItems = snap.docs.map((doc) => doc.data() as Specimen);

      const exportData = allItems.map((item) => ({
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
          const cellVal = String(row[key as keyof typeof row] || '');
          acc[key] = Math.max(acc[key] || 0, cellVal.length);
        });
        return acc;
      }, {} as Record<string, number>);

      ws['!cols'] = Object.keys(maxLen).map((key) => ({ wch: Math.min(Math.max(maxLen[key], 10), 50) }));

      XLSX.writeFile(wb, `제주센터_표본목록_내보내기_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">표본 관리</h1>
          <p className="text-sm text-slate-500 mt-1">
            수집된 표본들의 데이터 목록을 확인합니다.
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

      {/* Filter and stats indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-100/50 p-4 border border-slate-200 rounded-xl">
        <div className="relative flex-1 max-w-lg flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="관리번호, 생약명, 국명 또는 과명 검색"
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          <button
            onClick={() => setPhotoOnly(!photoOnly)}
            className={`px-3 py-2 border rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 shrink-0 ${
              photoOnly
                ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <span>📷</span>
            사진 보유 품목만 보기
          </button>
        </div>
        
        <div className="text-xs text-slate-500 font-medium">
          검색 결과: <span className="text-emerald-600 font-bold">{totalCount.toLocaleString()}</span> / {(cachedStats?.totalSpecimensCount || 0).toLocaleString()} 건
        </div>
      </div>

      {/* Main Grid Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-650">
            <thead className="bg-slate-50 text-slate-550 uppercase text-xs border-b border-slate-200">
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
            <tbody className="divide-y divide-slate-200">
              {paginatedItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedSpecimen(item)}
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">{item.managementId}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{item.herbName || '-'}</td>
                  <td className="px-4 py-3 text-emerald-600 font-medium">{item.korName || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{item.family || '-'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">{item.collectDate || '-'}</td>
                  <td className="px-4 py-3 text-xs truncate max-w-[180px] text-slate-600" title={item.collectPlace}>
                    {item.collectPlace || '-'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {item.pharmacopoeia ? (
                      <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-500/25 text-emerald-600 rounded text-[10px] font-semibold font-mono">
                        {item.pharmacopoeia}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(item);
                        }}
                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-emerald-600 transition-colors"
                        title="편집"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(item.id);
                        }}
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
                  <td colSpan={8} className="text-center py-12 text-slate-450 font-medium">
                    일치하는 표본 데이터를 찾을 수 없습니다.
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
                        ? 'bg-emerald-500 text-white font-bold shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
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

      {/* CRUD Edit/Create Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 text-slate-900 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col my-8 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-md font-bold text-slate-800">
                {editingSpecimen ? '표본 수정' : '새 표본 추가'}
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
                {/* managementId */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    관리번호 (managementId) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.managementId}
                    onChange={(e) => setFormData({ ...formData, managementId: e.target.value })}
                    disabled={!!editingSpecimen}
                    placeholder="KHR19016745V"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  />
                </div>

                {/* specimenNo */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    표본번호 (specimenNo)
                  </label>
                  <input
                    type="text"
                    value={formData.specimenNo}
                    onChange={(e) => setFormData({ ...formData, specimenNo: e.target.value })}
                    placeholder="MFDS-V-6926"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* herbName */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    생약명 (herbName)
                  </label>
                  <input
                    type="text"
                    value={formData.herbName}
                    onChange={(e) => setFormData({ ...formData, herbName: e.target.value })}
                    placeholder="추목피(楸木皮)"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* korName */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    국명 (korName)
                  </label>
                  <input
                    type="text"
                    value={formData.korName}
                    onChange={(e) => setFormData({ ...formData, korName: e.target.value })}
                    placeholder="가래나무"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* sciName */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    학명 (sciName)
                  </label>
                  <input
                    type="text"
                    value={formData.sciName}
                    onChange={(e) => setFormData({ ...formData, sciName: e.target.value })}
                    placeholder="Juglans mandshurica Maxim."
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* family */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    과명 (family)
                  </label>
                  <input
                    type="text"
                    value={formData.family}
                    onChange={(e) => setFormData({ ...formData, family: e.target.value })}
                    placeholder="가래나무과"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* genus */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    속명 (genus)
                  </label>
                  <input
                    type="text"
                    value={formData.genus}
                    onChange={(e) => setFormData({ ...formData, genus: e.target.value })}
                    placeholder="Juglans"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* importance */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    중요도 (importance)
                  </label>
                  <select
                    value={formData.importance}
                    onChange={(e) => setFormData({ ...formData, importance: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-emerald-500"
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
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    수장고 (storage)
                  </label>
                  <input
                    type="text"
                    value={formData.storage}
                    onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                    placeholder="1수장고"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* storageLocation */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    수장위치 (storageLocation)
                  </label>
                  <input
                    type="text"
                    value={formData.storageLocation}
                    onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                    placeholder="1수장고 6-7-7 ~ 6-8-2"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* collectDate */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    수집날짜 (collectDate)
                  </label>
                  <input
                    type="text"
                    value={formData.collectDate}
                    onChange={(e) => setFormData({ ...formData, collectDate: e.target.value })}
                    placeholder="2019-05-01"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* gps */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    GPS (위도, 경도)
                  </label>
                  <input
                    type="text"
                    value={formData.gps}
                    onChange={(e) => setFormData({ ...formData, gps: e.target.value })}
                    placeholder="38.1616221, 128.2487148"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* pharmacopoeia */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    공정서 등재 (pharmacopoeia)
                  </label>
                  <select
                    value={formData.pharmacopoeia || ''}
                    onChange={(e) => setFormData({ ...formData, pharmacopoeia: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">미등재</option>
                    <option value="KP">KP</option>
                    <option value="KHP">KHP</option>
                  </select>
                </div>

                {/* projectName */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    과제명 (projectName)
                  </label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    placeholder="국가생약자원 수집조사 연구"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* collectPlace */}
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 text-slate-900">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-5 animate-in zoom-in-95 duration-150">
            <h3 className="text-md font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              표본 데이터 삭제
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              정말로 이 표본 정보를 영구히 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 로컬 스토리지 데이터베이스에서 완전히 삭제됩니다.
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

      {/* Specimen Detail & Photo Modal */}
      {selectedSpecimen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-slate-900 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col my-8 animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedSpecimen.korName || selectedSpecimen.herbName || '표본 상세 정보'}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedSpecimen.managementId}</p>
              </div>
              <button
                onClick={() => setSelectedSpecimen(null)}
                className="p-1.5 rounded-full hover:bg-slate-250 text-slate-550 hover:text-slate-850 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* Photo Area */}
              {selectedSpecimen.imageUrls && selectedSpecimen.imageUrls.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">표본 사진</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {selectedSpecimen.imageUrls.map((url, idx) => (
                      <div key={idx} className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`${selectedSpecimen.korName || '표본'} 사진 ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold"
                        >
                          원본 보기 ↗
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">
                  📷 등록된 표본 사진이 없습니다.
                </div>
              )}

              {/* Information Grid */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-550 uppercase tracking-wider border-b border-slate-100 pb-2">기본 정보</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div className="flex justify-between border-b border-slate-100/50 pb-2">
                    <span className="text-slate-400 font-medium">관리번호</span>
                    <span className="text-slate-800 font-semibold font-mono">{selectedSpecimen.managementId || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100/50 pb-2">
                    <span className="text-slate-400 font-medium">표본번호</span>
                    <span className="text-slate-800 font-semibold font-mono">{selectedSpecimen.specimenNo || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100/50 pb-2">
                    <span className="text-slate-400 font-medium">생약명</span>
                    <span className="text-slate-800 font-semibold">{selectedSpecimen.herbName || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100/50 pb-2">
                    <span className="text-slate-400 font-medium">국명</span>
                    <span className="text-slate-800 font-semibold text-emerald-600">{selectedSpecimen.korName || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100/50 pb-2">
                    <span className="text-slate-400 font-medium">학명</span>
                    <span className="text-slate-800 font-semibold italic">{selectedSpecimen.sciName || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100/50 pb-2">
                    <span className="text-slate-400 font-medium">과명</span>
                    <span className="text-slate-800 font-semibold">{selectedSpecimen.family || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100/50 pb-2">
                    <span className="text-slate-400 font-medium">속명</span>
                    <span className="text-slate-800 font-semibold">{selectedSpecimen.genus || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100/50 pb-2">
                    <span className="text-slate-400 font-medium">중요도</span>
                    <span className="text-slate-800 font-semibold">{selectedSpecimen.importance || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100/50 pb-2">
                    <span className="text-slate-400 font-medium">수장고</span>
                    <span className="text-slate-800 font-semibold">{selectedSpecimen.storage || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100/50 pb-2">
                    <span className="text-slate-400 font-medium">수장위치</span>
                    <span className="text-slate-800 font-semibold">{selectedSpecimen.storageLocation || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100/50 pb-2">
                    <span className="text-slate-400 font-medium">수집날짜</span>
                    <span className="text-slate-800 font-semibold font-mono">{selectedSpecimen.collectDate || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100/50 pb-2">
                    <span className="text-slate-400 font-medium">GPS 좌표</span>
                    <span className="text-slate-800 font-semibold font-mono">{selectedSpecimen.gps || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100/50 pb-2">
                    <span className="text-slate-400 font-medium">공정서 등재</span>
                    <span className="text-slate-800 font-semibold">
                      {selectedSpecimen.pharmacopoeia ? (
                        <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-500/25 text-emerald-600 rounded text-[10px] font-semibold font-mono">
                          {selectedSpecimen.pharmacopoeia}
                        </span>
                      ) : '미등재'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100/50 pb-2 md:col-span-2">
                    <span className="text-slate-400 font-medium">과제명</span>
                    <span className="text-slate-800 font-semibold">{selectedSpecimen.projectName || '-'}</span>
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-slate-400 font-medium">수집장소</span>
                    <span className="text-slate-800 font-semibold leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/60">{selectedSpecimen.collectPlace || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
              <button
                onClick={() => setSelectedSpecimen(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-colors shadow-md shadow-slate-950/10 cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
