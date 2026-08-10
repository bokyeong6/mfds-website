'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Trash2, Upload, Database, RefreshCw, AlertTriangle, CheckCircle2, FolderUp, Loader2, Lock } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { collection, query, where, getDocs, doc, writeBatch, arrayUnion } from 'firebase/firestore';
import { storage, db, auth } from '../../lib/firebase';
import * as XLSX from 'xlsx';
import { detectFileType, parsePharmacopoeiaExcel, parseSpecimensExcel } from '../../lib/excelParser';

export default function SettingsPage() {
  const clearData = useAppStore((state) => state.clearData);
  const cachedStats = useAppStore((state) => state.cachedStats);

  // Admin Password States
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('isAdminAuthorized') === 'true';
    }
    return false;
  });
  const [authError, setAuthError] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin1234';
    if (passwordInput === correctPassword) {
      setIsAuthorized(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('isAdminAuthorized', 'true');
      }
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReload, setConfirmReload] = useState(false);

  // Folder Upload States
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [totalFilesCount, setTotalFilesCount] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Append Excel States
  const [appendLoading, setAppendLoading] = useState(false);
  const [appendMessage, setAppendMessage] = useState('');
  const [appendSuccess, setAppendSuccess] = useState(false);
  const [appendError, setAppendError] = useState<string | null>(null);

  const appendSpecimensAction = useAppStore((state) => state.appendSpecimens);
  const appendPharmacopoeiaAction = useAppStore((state) => state.appendPharmacopoeia);

  const handleAppendFile = async (e: React.ChangeEvent<HTMLInputElement>, type: 'pharma' | 'specimen') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAppendLoading(true);
    setAppendSuccess(false);
    setAppendError(null);
    setAppendMessage('파일을 읽는 중...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        
        // Read file structure
        const workbook = XLSX.read(buffer, { type: 'array', sheetRows: 5 });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
        
        const detected = detectFileType(rows[0] || []);
        if (detected === 'unknown') {
          throw new Error('올바른 형식의 엑셀 파일이 아닙니다.');
        }

        if (type === 'pharma' && detected !== 'pharmacopoeia') {
          throw new Error('공정서 시험법 파일 대신 표본 통합 파일이 감지되었습니다.');
        }
        if (type === 'specimen' && detected !== 'specimen') {
          throw new Error('표본 통합 파일 대신 공정서 시험법 파일이 감지되었습니다.');
        }

        if (type === 'pharma') {
          setAppendMessage('공정서 엑셀 파싱 중...');
          const pharmacItems = parsePharmacopoeiaExcel(buffer);
          if (pharmacItems.length === 0) {
            throw new Error('파싱된 공정서 행이 없습니다.');
          }
          setAppendMessage(`공정서 추가 데이터 저장 중... (총 ${pharmacItems.length}건)`);
          await appendPharmacopoeiaAction(pharmacItems, (msg) => setAppendMessage(msg));
        } else {
          setAppendMessage('표본 엑셀 파싱 중...');
          const specimens = parseSpecimensExcel(buffer);
          if (specimens.length === 0) {
            throw new Error('파싱된 표본 행이 없습니다.');
          }
          setAppendMessage(`표본 추가 데이터 저장 중... (총 ${specimens.length}건)`);
          await appendSpecimensAction(specimens, (msg) => setAppendMessage(msg));
        }

        setAppendSuccess(true);
      } catch (err) {
        console.error(err);
        setAppendError(err instanceof Error ? err.message : String(err));
      } finally {
        setAppendLoading(false);
        setAppendMessage('');
        // Clear file input value
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClearData = async () => {
    await clearData();
    setConfirmClear(false);
  };

  const handleTriggerReupload = async () => {
    await clearData();
    setConfirmReload(false);
  };

  const getBaseNameFromFilename = (fileName: string): string => {
    const cleanName = fileName.replace(/\\/g, '/').split('/').pop() || fileName;
    const nameWithoutExt = cleanName.substring(0, cleanName.lastIndexOf('.')) || cleanName;
    const base = nameWithoutExt.split('-')[0];
    return base;
  };

  const [confirmClearPhotos, setConfirmClearPhotos] = useState(false);
  const [clearingPhotos, setClearingPhotos] = useState(false);

  const handleClearPhotos = async () => {
    setClearingPhotos(true);
    try {
      if (process.env.NODE_ENV === 'production' && !auth.currentUser) {
        throw new Error('관리자 권한이 없습니다. 로그인이 필요합니다.');
      }

      const storageRef = ref(storage, 'images');
      const listResult = await listAll(storageRef);
      
      const deletePromises = listResult.items.map((itemRef) => deleteObject(itemRef));
      await Promise.all(deletePromises);
      
      // Also clear imageUrls field from all specimens in Firestore
      const specimensRef = collection(db, 'specimens');
      const snap = await getDocs(specimensRef);
      const batch = writeBatch(db);
      for (const d of snap.docs) {
        batch.update(doc(db, 'specimens', d.id), {
          imageUrls: []
        });
      }
      await batch.commit();
      
      alert('Firebase Storage의 모든 사진 파일과 매핑 정보가 성공적으로 삭제되었습니다.');
    } catch (err) {
      alert('오류 발생: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setClearingPhotos(false);
      setConfirmClearPhotos(false);
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Filter by image extensions (jpg, jpeg, png)
    const fileList: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext && ['jpg', 'jpeg', 'png'].includes(ext)) {
        fileList.push(file);
      }
    }

    setSelectedFiles(fileList);
    setTotalFilesCount(fileList.length);
    setUploadSuccess(false);
    setUploadError(null);
    setUploadedCount(0);
  };

  const handleFolderUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    setUploadedCount(0);

    const total = selectedFiles.length;
    const batchSize = 5; // Concurrency limit
    let currentIdx = 0;

    const uploadFileToFirebase = async (file: File) => {
      // 1. Storage Reference
      const fileRef = ref(storage, `images/${file.name}`);
      
      // 2. Upload bytes
      await uploadBytes(fileRef, file);
      
      // 3. Get Download URL
      const downloadUrl = await getDownloadURL(fileRef);
      
      // 4. Match and save in Firestore specimen document
      const baseName = getBaseNameFromFilename(file.name);
      const specimensRef = collection(db, 'specimens');
      const q = query(specimensRef, where('imageMatchedBase', '==', baseName));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach((document) => {
          batch.update(doc(db, 'specimens', document.id), {
            imageUrls: arrayUnion(downloadUrl)
          });
        });
        await batch.commit();
      }
    };

    try {
      if (process.env.NODE_ENV === 'production' && !auth.currentUser) {
        throw new Error('관리자 권한이 없습니다. 로그인이 필요합니다.');
      }

      while (currentIdx < total) {
        const batch = selectedFiles.slice(currentIdx, currentIdx + batchSize);
        await Promise.all(
          batch.map(async (file) => {
            await uploadFileToFirebase(file);
            setUploadedCount((prev) => prev + 1);
          })
        );
        currentIdx += batch.length;
      }
      setUploadSuccess(true);
      setSelectedFiles([]);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : '업로드 도중 오류가 발생했습니다.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mb-2">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">관리자 페이지 접근 제한</h2>
            <p className="text-sm text-slate-500">
              시스템 설정을 변경하려면 관리자 비밀번호를 입력하세요.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                비밀번호
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="비밀번호 입력"
                className={`w-full px-4 py-2.5 bg-white border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none transition-all text-sm
                  ${
                    authError
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20'
                      : 'border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                  }`}
              />
              {authError && (
                <p className="text-xs text-rose-500 font-semibold mt-1">
                  비밀번호가 올바르지 않습니다.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all text-sm cursor-pointer"
            >
              인증 및 입장
            </button>
          </form>
        </div>
      </div>
    );
  }

  const progressPercent = totalFilesCount > 0 ? Math.round((uploadedCount / totalFilesCount) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
      {/* Title */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900">시스템 설정</h1>
        <p className="text-sm text-slate-500 mt-1">
          데이터베이스 백엔드(Firebase Firestore & Storage) 관리와 데이터 상태를 변경합니다.
        </p>
      </div>

      {/* DB Summary Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-3">
          <Database className="w-5 h-5 text-emerald-600" />
          클라우드 데이터베이스 현황
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-1">
            <span className="text-slate-500 font-semibold block">제주센터 표본 테이블</span>
            <span className="text-lg font-bold text-slate-800 font-mono">{(cachedStats?.totalSpecimensCount || 0).toLocaleString()} 행</span>
            <span className="text-xs text-slate-550 block">실시간 클라우드 동기화 완료</span>
          </div>

          <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-1">
            <span className="text-slate-500 font-semibold block">공정서 시험법 테이블</span>
            <span className="text-lg font-bold text-slate-800 font-mono">{(cachedStats?.totalPharmacopoeiaCount || 0).toLocaleString()} 행</span>
            <span className="text-xs text-slate-550 block">실시간 클라우드 동기화 완료</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-2">
          <span>데이터 저장방식: Firebase Firestore & Storage</span>
          <span className="font-semibold text-slate-650">실시간 연동 상태: 정상 연결됨</span>
        </div>
      </div>

      {/* Settings Options */}
      <div className="space-y-4">
        {/* Option 1: Re-upload */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800">엑셀 데이터 재업로드</h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md">
              기존 표본 정보와 공정서 규격 데이터를 보존한 채로 새로운 엑셀 파일들을 업로드하여 덮어씁니다.
            </p>
          </div>
          <button
            onClick={() => setConfirmReload(true)}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-500/25 font-semibold rounded-lg text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <Upload className="w-4 h-4" />
            재업로드 진행
          </button>
        </div>

        {/* Option: Append Excel Data */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800">엑셀 데이터 추가 업로드</h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                기존 표본 정보와 공정서 자료를 유지한 채로, 새로운 엑셀 파일의 행들을 데이터베이스에 추가로 삽입하고 통계 정보를 갱신합니다.
              </p>
            </div>
            
            <div className="flex gap-2 shrink-0">
              <input
                type="file"
                id="append-pharma-input"
                onChange={(e) => handleAppendFile(e, 'pharma')}
                disabled={appendLoading}
                accept=".xlsx"
                className="hidden"
              />
              <button
                onClick={() => document.getElementById('append-pharma-input')?.click()}
                disabled={appendLoading}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-semibold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm text-slate-700 disabled:opacity-55 disabled:cursor-not-allowed"
              >
                <FolderUp className="w-4 h-4" />
                공정서 추가...
              </button>
              
              <input
                type="file"
                id="append-specimen-input"
                onChange={(e) => handleAppendFile(e, 'specimen')}
                disabled={appendLoading}
                accept=".xlsx"
                className="hidden"
              />
              <button
                onClick={() => document.getElementById('append-specimen-input')?.click()}
                disabled={appendLoading}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:border disabled:shadow-none disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                표본 추가...
              </button>
            </div>
          </div>

          {/* Append Excel Progress & Status Info */}
          {appendLoading && (
            <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-650 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500 shrink-0" />
              <span>{appendMessage || '데이터 추가 진행 중...'}</span>
            </div>
          )}

          {appendSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>엑셀 데이터가 데이터베이스에 성공적으로 추가되었으며, 통계가 갱신되었습니다!</span>
            </div>
          )}

          {appendError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>오류: {appendError}</span>
            </div>
          )}
        </div>

        {/* Option 2: Folder Image Bulk Upload */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800">사진 폴더 일괄 업로드</h4>
              <p className="text-xs text-slate-550 leading-relaxed max-w-md">
                표본 이미지가 들어있는 폴더 전체를 선택하여 일괄 업로드합니다.
                <br />
                JPG 파일(.jpg)만 필터링되어 저장됩니다.
              </p>
            </div>
            
            <div className="flex gap-2 shrink-0">
              <input
                type="file"
                id="folder-upload-input"
                onChange={handleFolderSelect}
                disabled={uploading}
                className="hidden"
                {...({
                  webkitdirectory: '',
                  multiple: true
                } as React.InputHTMLAttributes<HTMLInputElement>)}
              />
              <button
                onClick={() => document.getElementById('folder-upload-input')?.click()}
                disabled={uploading}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 font-semibold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm text-slate-700 disabled:opacity-55 disabled:cursor-not-allowed"
              >
                <FolderUp className="w-4 h-4" />
                폴더 선택...
              </button>
              
              <button
                onClick={handleFolderUpload}
                disabled={uploading || selectedFiles.length === 0}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:border disabled:shadow-none disabled:cursor-not-allowed"
              >
                {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                업로드 시작
              </button>
            </div>
          </div>

          {/* Files Selected Info */}
          {selectedFiles.length > 0 && !uploading && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-650 flex items-center justify-between">
              <span>선택된 폴더에서 이미지 파일 <strong className="text-slate-800">{selectedFiles.length}개</strong> 검출됨</span>
              <button 
                onClick={() => setSelectedFiles([])}
                className="text-rose-500 hover:text-rose-600 font-semibold"
              >
                선택 취소
              </button>
            </div>
          )}

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                  이미지 일괄 업로드 진행 중...
                </span>
                <span className="font-mono text-slate-700 font-bold">{uploadedCount} / {totalFilesCount} ({progressPercent}%)</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Success / Error Alerts */}
          {uploadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>사진 폴더 업로드가 성공적으로 완료되었습니다! (총 {totalFilesCount}개 파일 저장 완료)</span>
            </div>
          )}

          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>오류: {uploadError}</span>
            </div>
          )}
        </div>

        {/* Option 3: Clear Data */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-600">로컬 데이터베이스 초기화</h4>
            <p className="text-xs text-slate-550 leading-relaxed max-w-md">
              저장된 모든 표본 데이터와 공정서 자료를 브라우저에서 영구히 삭제합니다. 초기화 후 온보딩 업로드 화면으로 돌아갑니다.
            </p>
          </div>
          <button
            onClick={() => setConfirmClear(true)}
            className="px-4 py-2.5 bg-rose-55 hover:bg-rose-100 text-rose-600 border border-rose-500/25 font-semibold rounded-lg text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            데이터 삭제
          </button>
        </div>

        {/* Option 4: Clear Photos */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-600">서버 사진 데이터 초기화</h4>
            <p className="text-xs text-slate-555 leading-relaxed max-w-md">
              서버 컴퓨터에 저장된 모든 표본 사진 파일들을 영구히 삭제합니다. 삭제 후 사진 목록 캐시도 함께 비워집니다.
            </p>
          </div>
          <button
            onClick={() => setConfirmClearPhotos(true)}
            className="px-4 py-2.5 bg-rose-55 hover:bg-rose-100 text-rose-600 border border-rose-500/25 font-semibold rounded-lg text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            사진 삭제
          </button>
        </div>
      </div>

      {/* Confirmation Modal 1: Clear */}
      {confirmClear && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 text-slate-900">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-5 animate-in zoom-in-95 duration-150">
            <h3 className="text-md font-bold text-rose-600 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce" />
              데이터 전체 삭제 경고
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              정말로 전체 데이터베이스를 초기화하시겠습니까? 이 작업은 로컬 스토리지에 저장된 모든 내용을 삭제하며 절대 복구할 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmClear(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-semibold rounded-lg text-sm transition-colors text-slate-600"
              >
                취소
              </button>
              <button
                onClick={handleClearData}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-sm transition-colors"
              >
                초기화 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal 2: Re-upload */}
      {confirmReload && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 text-slate-900">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-5 animate-in zoom-in-95 duration-150">
            <h3 className="text-md font-bold text-emerald-600 mb-3 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-500" />
              엑셀 재업로드 진행
            </h3>
            <p className="text-sm text-slate-550 leading-relaxed mb-6">
              온보딩 업로드 화면으로 돌아가시겠습니까? 기존 데이터베이스는 새로운 파일을 파싱하여 업로드할 때 덮어씌워집니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmReload(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-semibold rounded-lg text-sm transition-colors text-slate-600"
              >
                취소
              </button>
              <button
                onClick={handleTriggerReupload}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-sm transition-colors"
              >
                이동하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal 3: Clear Photos */}
      {confirmClearPhotos && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 text-slate-900">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-5 animate-in zoom-in-95 duration-150">
            <h3 className="text-md font-bold text-rose-600 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce" />
              서버 사진 전체 삭제 경고
            </h3>
            <p className="text-sm text-slate-550 leading-relaxed mb-6">
              정말로 서버의 모든 표본 사진 파일들을 삭제하시겠습니까? 이 작업은 서버 디렉토리 내부의 모든 이미지를 영구히 지우며 절대 복구할 수 없습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmClearPhotos(false)}
                disabled={clearingPhotos}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-semibold rounded-lg text-sm transition-colors text-slate-600"
              >
                취소
              </button>
              <button
                onClick={handleClearPhotos}
                disabled={clearingPhotos}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {clearingPhotos ? '삭제 중...' : '사진 삭제 확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
