import { Specimen, PharmacItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { db } from './firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
  query, limit, where, writeBatch, getCountFromServer 
} from 'firebase/firestore';

export interface DataStore {
  createSpecimen(data: Omit<Specimen, 'id'>): Promise<Specimen>;
  updateSpecimen(id: string, data: Partial<Specimen>): Promise<Specimen>;
  deleteSpecimen(id: string): Promise<void>;

  createPharmacoItem(data: Omit<PharmacItem, 'id'>): Promise<PharmacItem>;
  updatePharmacoItem(id: string, data: Partial<PharmacItem>): Promise<PharmacItem>;
  deletePharmacoItem(id: string): Promise<void>;

  clearAll(onProgress?: (msg: string) => void): Promise<void>;
  initialize(specimens: Specimen[], pharmacopoeia: PharmacItem[], onProgress?: (msg: string) => void): Promise<void>;
  isInitialized(): Promise<boolean>;
  
  appendSpecimens(newSpecimens: Specimen[], onProgress?: (msg: string) => void): Promise<void>;
  appendPharmacopoeia(newPharma: PharmacItem[], onProgress?: (msg: string) => void): Promise<void>;
  
  getCachedStats(): Promise<any | null>;
  saveCachedStats(stats: any): Promise<void>;
}

const getBaseFilename = (id: string): string | null => {
  if (!id || id.length < 5) return null;
  const prefixMatch = id.match(/^[A-Za-z]+/);
  const prefix = prefixMatch ? prefixMatch[0] : 'KHR';
  const digitsMatch = id.match(/\d+/);
  if (!digitsMatch) return null;
  const digits = digitsMatch[0];
  const numPart = digits.length >= 5 ? digits.slice(-5) : digits.padStart(5, '0');
  return `${prefix}_${numPart}`;
};

const calculateStats = (specimens: Specimen[], pharmacopoeia: PharmacItem[]) => {
  let kp = 0;
  let khp = 0;
  let both = 0;
  let none = 0;
  
  const specimenIdMap = new Map<string, PharmacItem>();
  pharmacopoeia.forEach((p) => {
    if (p.specimenIds) {
      p.specimenIds.forEach((id) => {
        specimenIdMap.set(id, p);
      });
    }
  });

  specimens.forEach((s) => {
    const pharm = s.pharmacopoeia ? s.pharmacopoeia.trim().toUpperCase() : '';
    if (pharm === 'KP') {
      kp++;
    } else if (pharm === 'KHP') {
      khp++;
    } else if (pharm.includes('KP') && pharm.includes('KHP')) {
      both++;
    } else {
      none++;
    }
  });

  const donutData = [
    { name: 'KP 등재', value: kp },
    { name: 'KHP 등재', value: khp },
    { name: 'KP & KHP 공동 등재', value: both },
    { name: '미등재 표본', value: none },
  ];

  let kpTotal = 0;
  let khpTotal = 0;
  let kpWithSpecimens = 0;
  let khpWithSpecimens = 0;

  pharmacopoeia.forEach((p) => {
    const type = p.pharmacopoeia ? p.pharmacopoeia.trim().toUpperCase() : '';
    const hasSpecimen = p.specimenIds && p.specimenIds.length > 0;

    if (type === 'KP') {
      kpTotal++;
      if (hasSpecimen) kpWithSpecimens++;
    } else if (type === 'KHP') {
      khpTotal++;
      if (hasSpecimen) khpWithSpecimens++;
    }
  });

  const compareData = [
    { name: 'KP', '전체 공정서 품목': kpTotal, '표본 보유 품목': kpWithSpecimens },
    { name: 'KHP', '전체 공정서 품목': khpTotal, '표본 보유 품목': khpWithSpecimens },
  ];

  const storageMap = new Map<string, { total: number; registered: number; kp: number; khp: number; both: number }>();
  let totalRegistered = 0;
  let totalKp = 0;
  let totalKhp = 0;
  let totalBoth = 0;

  specimens.forEach((s) => {
    const rawStorage = s.storage ? s.storage.trim() : '미기재';
    const pharm = s.pharmacopoeia ? s.pharmacopoeia.trim().toUpperCase() : '';
    
    const isKp = pharm === 'KP' || (pharm.includes('KP') && pharm.includes('KHP'));
    const isKhp = pharm === 'KHP' || (pharm.includes('KP') && pharm.includes('KHP'));
    const isBoth = pharm.includes('KP') && pharm.includes('KHP');
    const isRegistered = isKp || isKhp;
    
    if (isRegistered) totalRegistered++;
    if (isKp) totalKp++;
    if (isKhp) totalKhp++;
    if (isBoth) totalBoth++;
    
    if (!storageMap.has(rawStorage)) {
      storageMap.set(rawStorage, { total: 0, registered: 0, kp: 0, khp: 0, both: 0 });
    }
    
    const stats = storageMap.get(rawStorage)!;
    stats.total++;
    if (isRegistered) stats.registered++;
    if (isKp) stats.kp++;
    if (isKhp) stats.khp++;
    if (isBoth) stats.both++;
  });

  const storageStatsList = Array.from(storageMap.entries()).map(([storageName, data]) => {
    const storageRatio = data.total > 0 ? ((data.registered / data.total) * 100).toFixed(1) : '0.0';
    const kpRatio = data.total > 0 ? ((data.kp / data.total) * 100).toFixed(1) : '0.0';
    const khpRatio = data.total > 0 ? ((data.khp / data.total) * 100).toFixed(1) : '0.0';
    const shareOfTotal = totalRegistered > 0 ? ((data.registered / totalRegistered) * 100).toFixed(1) : '0.0';
    return {
      storageName,
      total: data.total,
      registered: data.registered,
      kp: data.kp,
      khp: data.khp,
      both: data.both,
      storageRatio,
      kpRatio,
      khpRatio,
      shareOfTotal,
    };
  }).sort((a, b) => b.registered - a.registered);

  const storageTotals = { totalRegistered, totalKp, totalKhp, totalBoth };

  const testMethodMap = new Map<string, number>();
  pharmacopoeia.forEach((p) => {
    const test = p.confirmTest ? p.confirmTest.trim() : '';
    if (!test) {
      testMethodMap.set('미기재', (testMethodMap.get('미기재') || 0) + 1);
      return;
    }

    let normalized = '기타';
    const testUpper = test.toUpperCase();
    if (testUpper.includes('TLC') || test.includes('박층')) {
      normalized = 'TLC (박층크로마토그래피)';
    } else if (testUpper.includes('HPLC') || test.includes('액체크로마토')) {
      normalized = 'HPLC (액체크로마토그래피)';
    } else if (test.includes('정성') || test.includes('색반응') || test.includes('침전')) {
      normalized = '정성반응 (화학반응)';
    } else if (testUpper.includes('GC') || test.includes('기체크로마토')) {
      normalized = 'GC (기체크로마토그래피)';
    } else if (testUpper.includes('UV') || test.includes('흡광도')) {
      normalized = 'UV 분광학법';
    } else if (test.length < 12) {
      normalized = test;
    }
    testMethodMap.set(normalized, (testMethodMap.get(normalized) || 0) + 1);
  });

  const testMethodData = Array.from(testMethodMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const quantMethodMap = new Map<string, number>();
  pharmacopoeia.forEach((p) => {
    const quant = p.quantMethod ? p.quantMethod.trim() : '';
    if (!quant) {
      quantMethodMap.set('미기재', (quantMethodMap.get('미기재') || 0) + 1);
      return;
    }

    let normalized = '기타';
    const quantUpper = quant.toUpperCase();
    if (quantUpper.includes('HPLC') || quant.includes('액체크로마토')) {
      normalized = 'HPLC (액체크로마토그래피)';
    } else if (quantUpper.includes('GC') || quant.includes('기체크로마토')) {
      normalized = 'GC (기체크로마토그래피)';
    } else if (quant.includes('정량') || quant.includes('함량') || quant.includes('적정')) {
      normalized = '정량적적정법';
    } else if (quant.length < 12) {
      normalized = quant;
    }
    quantMethodMap.set(normalized, (quantMethodMap.get(normalized) || 0) + 1);
  });

  const quantMethodData = Array.from(quantMethodMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const familyMap = new Map<string, number>();
  let joinedCount = 0;

  specimens.forEach((s) => {
    if (s.family) {
      const cleaned = s.family.trim();
      familyMap.set(cleaned, (familyMap.get(cleaned) || 0) + 1);
    }
    if (specimenIdMap.has(s.managementId)) {
      joinedCount++;
    }
  });

  const sortedFamilies = Array.from(familyMap.entries()).sort((a, b) => b[1] - a[1]);
  const topFamily = sortedFamilies[0] ? sortedFamilies[0][0] : '-';
  const topFamilyCount = sortedFamilies[0] ? sortedFamilies[0][1] : 0;

  const familyMetrics = {
    total: specimens.length,
    familyCount: familyMap.size,
    topFamily,
    topFamilyCount,
    joinedCount,
  };

  const chartFamilies = sortedFamilies.slice(0, 20);
  const othersCount = sortedFamilies.slice(20).reduce((sum, f) => sum + f[1], 0);

  const familyCountChartData = chartFamilies.map(([name, value]) => ({
    name,
    '표본 수': value,
  }));
  if (othersCount > 0) {
    familyCountChartData.push({ name: '기타', '표본 수': othersCount });
  }

  const familySpecimensMap = new Map<string, Specimen[]>();
  specimens.forEach((s) => {
    const fam = s.family ? s.family.trim() : '미확인';
    if (!familySpecimensMap.has(fam)) {
      familySpecimensMap.set(fam, []);
    }
    familySpecimensMap.get(fam)!.push(s);
  });

  const familiesTableData = Array.from(familySpecimensMap.entries()).map(([familyName, list]) => {
    let joined = 0;
    const regionMap = new Map<string, number>();
    const herbMap = new Map<string, number>();
    const importanceCounts = { A1: 0, A2: 0, B1: 0, B2: 0 };

    list.forEach((s) => {
      if (specimenIdMap.has(s.managementId)) {
        joined++;
      }
      const region = s.collectPlace ? s.collectPlace.split(' ')[0] : '미기재';
      regionMap.set(region, (regionMap.get(region) || 0) + 1);

      const herb = s.herbName ? s.herbName.trim() : '미기재';
      herbMap.set(herb, (herbMap.get(herb) || 0) + 1);

      if (s.importance) {
        const imp = s.importance.trim();
        if (imp === 'A1') importanceCounts.A1++;
        else if (imp === 'A2') importanceCounts.A2++;
        else if (imp === 'B1') importanceCounts.B1++;
        else if (imp.startsWith('B2')) importanceCounts.B2++;
      }
    });

    const joinedRatio = list.length > 0 ? ((joined / list.length) * 100).toFixed(1) : '0.0';

    const topRegions = Array.from(regionMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    const topHerbs = Array.from(herbMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    return {
      family: familyName,
      count: list.length,
      importanceCounts,
      joinedCount: joined,
      joinedRatio,
      topRegions,
      topHerbs,
    };
  }).sort((a, b) => b.count - a.count);

  const fields = [
    { key: 'purityTest', name: '순도시험' },
    { key: 'dryLoss', name: '건조감량' },
    { key: 'ash', name: '회분' },
    { key: 'acidAsh', name: '산불용성회분' },
    { key: 'extractContent', name: '엑스함량' },
    { key: 'essentialOil', name: '정유함량' },
  ];
  const totalCountVal = pharmacopoeia.length || 1;
  const columnCompletenessData = fields.map((f) => {
    let count = 0;
    pharmacopoeia.forEach((p) => {
      const val = p[f.key as keyof typeof p];
      if (val !== undefined && val !== null) {
        const str = String(val).trim();
        if (str && str !== '-' && str.toLowerCase() !== 'x') {
          count++;
        }
      }
    });
    return {
      name: f.name,
      '기재 품목 수': count,
      '미기재 품목 수': pharmacopoeia.length - count,
      ratio: parseFloat(((count / totalCountVal) * 100).toFixed(1)),
    };
  });

  const typeMap = new Map<string, { itemsCount: number; itemsWithSpecimen: number; specimenIds: Set<string> }>();
  pharmacopoeia.forEach((p) => {
    let typeName = p.type ? p.type.trim() : '미분류';
    if (!typeName) typeName = '미분류';
    if (!typeMap.has(typeName)) {
      typeMap.set(typeName, { itemsCount: 0, itemsWithSpecimen: 0, specimenIds: new Set() });
    }
    const stats = typeMap.get(typeName)!;
    stats.itemsCount++;
    const hasSpecimen = p.specimenIds && p.specimenIds.length > 0;
    if (hasSpecimen) {
      stats.itemsWithSpecimen++;
      p.specimenIds.forEach((id) => stats.specimenIds.add(id));
    }
  });
  const typeStatsData = Array.from(typeMap.entries()).map(([name, data]) => ({
    name,
    '전체 품목 수': data.itemsCount,
    '표본 보유 품목 수': data.itemsWithSpecimen,
    '보유 표본 수': data.specimenIds.size,
    ratio: ((data.itemsWithSpecimen / (data.itemsCount || 1)) * 100).toFixed(1),
  })).sort((a, b) => b['보유 표본 수'] - a['보유 표본 수']);

  const top10Families = sortedFamilies.slice(0, 10).map(([name]) => name);
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
  const stackedImportanceChartData = top10Families.map((family) => ({
    family,
    ...dataMap.get(family)
  }));

  const famStorageMap = new Map<string, { count: number; families: Set<string> }>();
  specimens.forEach((s) => {
    const room = s.storage ? s.storage.trim() : '미지정';
    if (!famStorageMap.has(room)) {
      famStorageMap.set(room, { count: 0, families: new Set<string>() });
    }
    const data = famStorageMap.get(room)!;
    data.count++;
    const fam = s.family ? s.family.trim() : '미확인';
    data.families.add(fam);
  });
  const familyStorageStatsData = Array.from(famStorageMap.entries()).map(([room, details]) => ({
    room,
    count: details.count,
    familyCount: details.families.size,
    percentage: specimens.length > 0 ? ((details.count / specimens.length) * 100).toFixed(1) : '0.0',
  })).sort((a, b) => b.count - a.count);

  const globalImportanceCounts = { A1: 0, A2: 0, B1: 0, 'B2-1': 0, 'B2-2': 0, 'B2-3': 0, 'B2-4': 0 };
  specimens.forEach((s) => {
    if (s.importance) {
      const imp = s.importance.trim();
      if ((globalImportanceCounts as any)[imp] !== undefined) {
        (globalImportanceCounts as any)[imp]++;
      }
    }
  });

  return {
    donutData,
    compareData,
    storageStatsList,
    storageTotals,
    testMethodData,
    quantMethodData,
    familyMetrics,
    familyCountChartData,
    familiesTableData,
    columnCompletenessData,
    typeStatsData,
    stackedImportanceChartData,
    familyStorageStatsData,
    globalImportanceCounts,
    totalSpecimensCount: specimens.length,
    totalPharmacopoeiaCount: pharmacopoeia.length,
    updatedAt: new Date().toISOString(),
  };
};

export class FirebaseStore implements DataStore {
  async createSpecimen(data: Omit<Specimen, 'id'>): Promise<Specimen> {
    const id = uuidv4();
    const docRef = doc(db, 'specimens', id);
    const newItem: Specimen = { 
      ...data, 
      id, 
      pharmacopoeia: data.pharmacopoeia || null,
      lat: Number(data.lat) || 0,
      lng: Number(data.lng) || 0
    };
    // Pre-calculate image matched base for fast storage match
    const base = getBaseFilename(newItem.managementId);
    if (base) {
      (newItem as any).imageMatchedBase = base;
    }
    await setDoc(docRef, newItem);
    return newItem;
  }

  async updateSpecimen(id: string, data: Partial<Specimen>): Promise<Specimen> {
    const docRef = doc(db, 'specimens', id);
    const cleanData = { ...data };
    if (cleanData.lat !== undefined) cleanData.lat = Number(cleanData.lat);
    if (cleanData.lng !== undefined) cleanData.lng = Number(cleanData.lng);
    if (cleanData.managementId) {
      const base = getBaseFilename(cleanData.managementId);
      if (base) {
        (cleanData as any).imageMatchedBase = base;
      }
    }
    await updateDoc(docRef, cleanData);
    const snap = await getDoc(docRef);
    return { ...snap.data(), id } as Specimen;
  }

  async deleteSpecimen(id: string): Promise<void> {
    const docRef = doc(db, 'specimens', id);
    await deleteDoc(docRef);
  }

  async createPharmacoItem(data: Omit<PharmacItem, 'id'>): Promise<PharmacItem> {
    const id = uuidv4();
    const docRef = doc(db, 'pharmacopoeia', id);
    const newItem: PharmacItem = { ...data, id };
    await setDoc(docRef, newItem);
    return newItem;
  }

  async updatePharmacoItem(id: string, data: Partial<PharmacItem>): Promise<PharmacItem> {
    const docRef = doc(db, 'pharmacopoeia', id);
    await updateDoc(docRef, data);
    const snap = await getDoc(docRef);
    return { ...snap.data(), id } as PharmacItem;
  }

  async deletePharmacoItem(id: string): Promise<void> {
    const docRef = doc(db, 'pharmacopoeia', id);
    await deleteDoc(docRef);
  }

  // Delete all documents in a collection via client-side batches of 500
  private async clearCollection(name: string, onProgress?: (msg: string) => void) {
    if (onProgress) onProgress(`${name} 기존 데이터를 삭제하는 중...`);
    const colRef = collection(db, name);
    const snapshot = await getDocs(colRef);
    const docs = snapshot.docs;
    const total = docs.length;

    if (total === 0) return;

    const chunkSize = 500;
    for (let i = 0; i < total; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const d of chunk) {
        batch.delete(doc(db, name, d.id));
      }
      await batch.commit();
      if (onProgress) onProgress(`${name} 기존 데이터 삭제 중: ${Math.min(i + chunkSize, total)} / ${total} 건 완료`);
    }
  }

  async clearAll(onProgress?: (msg: string) => void): Promise<void> {
    await this.clearCollection('specimens', onProgress);
    await this.clearCollection('pharmacopoeia', onProgress);
    try {
      await deleteDoc(doc(db, 'metadata', 'stats'));
    } catch {}
  }

  async initialize(specimens: Specimen[], pharmacopoeia: PharmacItem[], onProgress?: (msg: string) => void): Promise<void> {
    // 1. Clear old data
    await this.clearAll(onProgress);

    // 2. Pre-calculate statistics
    if (onProgress) onProgress('통계 데이터 연산 중...');
    const stats = calculateStats(specimens, pharmacopoeia);

    // 3. Upload pharmacopoeia items in batches
    if (onProgress) onProgress('공정서 시험법 데이터 업로드 중...');
    const pharmaSize = pharmacopoeia.length;
    const chunkSize = 500;

    for (let i = 0; i < pharmaSize; i += chunkSize) {
      const chunk = pharmacopoeia.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const item of chunk) {
        batch.set(doc(db, 'pharmacopoeia', item.id), item);
      }
      await batch.commit();
      await new Promise((resolve) => setTimeout(resolve, 200)); // prevent write queue overflow
      if (onProgress) onProgress(`공정서 시험법 업로드 진행률: ${Math.min(i + chunkSize, pharmaSize)} / ${pharmaSize} 건`);
    }

    // 4. Upload specimens in batches
    if (onProgress) onProgress('제주센터 표본 데이터 업로드 중...');
    const specSize = specimens.length;

    for (let i = 0; i < specSize; i += chunkSize) {
      const chunk = specimens.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const item of chunk) {
        const docItem = { ...item };
        const base = getBaseFilename(item.managementId);
        if (base) {
          (docItem as any).imageMatchedBase = base;
        }
        batch.set(doc(db, 'specimens', item.id), docItem);
      }
      await batch.commit();
      await new Promise((resolve) => setTimeout(resolve, 400)); // prevent write queue overflow
      if (onProgress) onProgress(`표본 데이터 업로드 진행률: ${Math.min(i + chunkSize, specSize)} / ${specSize} 건`);
    }

    // 5. Save pre-calculated stats document
    if (onProgress) onProgress('통계 정보 캐시 저장 중...');
    await this.saveCachedStats(stats);
    
    if (onProgress) onProgress('데이터베이스 로드 성공!');
  }

  async isInitialized(): Promise<boolean> {
    try {
      const snap = await getCountFromServer(collection(db, 'specimens'));
      return snap.data().count > 0;
    } catch {
      return false;
    }
  }

  async getCachedStats(): Promise<any | null> {
    try {
      const snap = await getDoc(doc(db, 'metadata', 'stats'));
      if (snap.exists()) return snap.data();
    } catch (e) {
      console.error('Failed to get cached stats:', e);
    }
    return null;
  }

  async saveCachedStats(stats: any): Promise<void> {
    await setDoc(doc(db, 'metadata', 'stats'), stats);
  }

  private async getAllSpecimens(): Promise<Specimen[]> {
    const list: Specimen[] = [];
    const snapshot = await getDocs(collection(db, 'specimens'));
    snapshot.forEach((doc) => {
      list.push({ ...doc.data(), id: doc.id } as Specimen);
    });
    return list;
  }

  private async getAllPharmacopoeia(): Promise<PharmacItem[]> {
    const list: PharmacItem[] = [];
    const snapshot = await getDocs(collection(db, 'pharmacopoeia'));
    snapshot.forEach((doc) => {
      list.push({ ...doc.data(), id: doc.id } as PharmacItem);
    });
    return list;
  }

  async appendSpecimens(newSpecimens: Specimen[], onProgress?: (msg: string) => void): Promise<void> {
    const chunkSize = 500;
    const total = newSpecimens.length;

    for (let i = 0; i < total; i += chunkSize) {
      const chunk = newSpecimens.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const item of chunk) {
        const docItem = { ...item };
        const base = getBaseFilename(item.managementId);
        if (base) {
          (docItem as any).imageMatchedBase = base;
        }
        batch.set(doc(db, 'specimens', item.id), docItem);
      }
      await batch.commit();
      await new Promise((resolve) => setTimeout(resolve, 400)); // prevent write queue overflow
      if (onProgress) onProgress(`표본 추가 업로드 진행률: ${Math.min(i + chunkSize, total)} / ${total} 건`);
    }

    if (onProgress) onProgress('통계 정보 갱신을 위해 전체 데이터를 로딩하는 중...');
    const allSpecs = await this.getAllSpecimens();
    const allPharma = await this.getAllPharmacopoeia();

    if (onProgress) onProgress('전체 통계 정보 재계산 중...');
    const stats = calculateStats(allSpecs, allPharma);

    if (onProgress) onProgress('통계 정보 캐시 저장 중...');
    await this.saveCachedStats(stats);
  }

  async appendPharmacopoeia(newPharma: PharmacItem[], onProgress?: (msg: string) => void): Promise<void> {
    const chunkSize = 500;
    const total = newPharma.length;

    for (let i = 0; i < total; i += chunkSize) {
      const chunk = newPharma.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const item of chunk) {
        batch.set(doc(db, 'pharmacopoeia', item.id), item);
      }
      await batch.commit();
      await new Promise((resolve) => setTimeout(resolve, 200)); // prevent write queue overflow
      if (onProgress) onProgress(`공정서 추가 업로드 진행률: ${Math.min(i + chunkSize, total)} / ${total} 건`);
    }

    if (onProgress) onProgress('통계 정보 갱신을 위해 전체 데이터를 로딩하는 중...');
    const allSpecs = await this.getAllSpecimens();
    const allPharma = await this.getAllPharmacopoeia();

    if (onProgress) onProgress('전체 통계 정보 재계산 중...');
    const stats = calculateStats(allSpecs, allPharma);

    if (onProgress) onProgress('통계 정보 캐시 저장 중...');
    await this.saveCachedStats(stats);
  }
}

export const dataStore: DataStore = new FirebaseStore();
