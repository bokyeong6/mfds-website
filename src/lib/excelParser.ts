import { Specimen, PharmacItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Helper to format date properly (handling Date objects, serial numbers, and strings)
const parseExcelDate = (val: unknown, XLSX: any): string => {
  if (val === undefined || val === null) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'number') {
    try {
      const date = XLSX.SSF.parse_date_code(val);
      const y = date.y;
      const m = String(date.m).padStart(2, '0');
      const d = String(date.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    } catch {
      return String(val);
    }
  }
  return String(val).trim();
};

// Safe string conversion
const safeString = (val: unknown): string => {
  if (val === undefined || val === null) return '';
  return String(val).trim();
};

// Detect the file type based on headers
export type DetectedFileType = 'pharmacopoeia' | 'specimen' | 'unknown';

export const detectFileType = (row: unknown[]): DetectedFileType => {
  if (!row || row.length === 0) return 'unknown';
  const rowStr = JSON.stringify(row).toLowerCase();
  
  // Look for signature keywords in headers
  if (
    rowStr.includes('confirmtest') || 
    rowStr.includes('확인시험') || 
    rowStr.includes('정량법') || 
    rowStr.includes('quantmethod') ||
    rowStr.includes('공정서')
  ) {
    // Check if it's the Pharmacopoeia file
    // Let's verify it has "확인시험" or similar
    if (rowStr.includes('수장고') || rowStr.includes('storage') || rowStr.includes('gps')) {
      // Avoid false matches, but they are generally disjoint
      return 'specimen';
    }
    return 'pharmacopoeia';
  }
  
  if (
    rowStr.includes('수장고') || 
    rowStr.includes('storage') || 
    rowStr.includes('gps') || 
    rowStr.includes('managementid') || 
    rowStr.includes('관리번호') ||
    rowStr.includes('수집장소')
  ) {
    return 'specimen';
  }
  
  // Default checks on structure size/indices
  if (row.length > 200) {
    return 'pharmacopoeia'; // Pharmacopoeia has 270 columns
  }
  
  return 'unknown';
};

// Parse Pharmacopoeia file
export const parsePharmacopoeiaExcel = async (arrayBuffer: ArrayBuffer): Promise<PharmacItem[]> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert sheet to 2D array
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  
  if (rows.length < 2) return [];
  
  const parsedItems: PharmacItem[] = [];
  
  // Find column indices dynamically based on header row
  const headers = Array.from(rows[0] || []).map((h) => String(h || '').trim());

  const getColIndex = (keywords: string[], fallback: number): number => {
    const idx = headers.findIndex((h) =>
      h && keywords.some((k) => h.toLowerCase().includes(k.toLowerCase()))
    );
    return idx !== -1 ? idx : fallback;
  };

  const getExactColIndex = (keyword: string, fallback: number): number => {
    const idx = headers.findIndex((h) => h && h.trim() === keyword);
    return idx !== -1 ? idx : fallback;
  };

  const pharmacopoeiaIdx = getColIndex(['공정서'], 1);
  const itemIdx = getColIndex(['품목'], 2);
  const typeIdx = getColIndex(['형태'], 3);
  const confirmTestIdx = getColIndex(['확인시험'], 4);
  const purityTestIdx = getExactColIndex('순도시험', 5);
  const purityItemsIdx = getColIndex(['순도시험(항목)', '순도시험 항목'], 6);
  const quantMethodIdx = getColIndex(['정량법'], 7);
  const dryLossIdx = getColIndex(['건조감량'], 8);
  
  const ashColIdx = headers.findIndex((h) => h && h.trim().includes('회분') && !h.trim().includes('산불용성'));
  const ashIdx = ashColIdx !== -1 ? ashColIdx : 9;
  
  const acidAshIdx = getColIndex(['산불용성회분'], 10);
  const extractContentIdx = getColIndex(['엑스함량'], 11);
  const essentialOilIdx = getColIndex(['정유함량'], 12);
  
  const specimenIdsStartColIdx = headers.findIndex((h) => h && h.trim().includes('제주센터표본'));
  const specimenIdsStartIdx = specimenIdsStartColIdx !== -1 ? specimenIdsStartColIdx + 1 : 13;

  // Start from row index 1 to skip headers
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    
    // Check if idx is valid or row is empty
    const idxVal = row[0];
    if (idxVal === undefined || idxVal === null || idxVal === '') continue;
    const idx = typeof idxVal === 'number' ? idxVal : parseInt(String(idxVal).trim(), 10);
    if (isNaN(idx)) continue;
    
    const pharmacopoeia = safeString(row[pharmacopoeiaIdx]);
    const item = safeString(row[itemIdx]);
    if (!item) continue; // Skip rows without item name
    
    const type = safeString(row[typeIdx]);
    const confirmTest = row[confirmTestIdx] !== undefined && row[confirmTestIdx] !== null ? safeString(row[confirmTestIdx]) : null;
    const purityTest = row[purityTestIdx] !== undefined && row[purityTestIdx] !== null ? safeString(row[purityTestIdx]) : null;
    const purityItems = row[purityItemsIdx] !== undefined && row[purityItemsIdx] !== null ? safeString(row[purityItemsIdx]) : null;
    const quantMethod = row[quantMethodIdx] !== undefined && row[quantMethodIdx] !== null ? safeString(row[quantMethodIdx]) : null;
    const dryLoss = row[dryLossIdx] !== undefined && row[dryLossIdx] !== null ? safeString(row[dryLossIdx]) : null;
    const ash = row[ashIdx] !== undefined && row[ashIdx] !== null ? safeString(row[ashIdx]) : null;
    const acidAsh = row[acidAshIdx] !== undefined && row[acidAshIdx] !== null ? safeString(row[acidAshIdx]) : null;
    const extractContent = row[extractContentIdx] !== undefined && row[extractContentIdx] !== null ? safeString(row[extractContentIdx]) : null;
    const essentialOil = row[essentialOilIdx] !== undefined && row[essentialOilIdx] !== null ? safeString(row[essentialOilIdx]) : null;
    
    // Extract specimenIds from specimenIdsStartIdx to end
    const specimenIds: string[] = [];
    for (let c = specimenIdsStartIdx; c < row.length; c++) {
      const val = row[c];
      if (val !== undefined && val !== null) {
        const idStr = String(val).trim();
        if (idStr && idStr.toLowerCase() !== 'x' && idStr !== '-') {
          specimenIds.push(idStr);
        }
      }
    }
    
    parsedItems.push({
      id: uuidv4(),
      idx,
      pharmacopoeia,
      item,
      type,
      confirmTest,
      purityTest,
      purityItems,
      quantMethod,
      dryLoss,
      ash,
      acidAsh,
      extractContent,
      essentialOil,
      specimenIds,
    });
  }
  
  return parsedItems;
};

// Parse Specimens file
export const parseSpecimensExcel = async (arrayBuffer: ArrayBuffer): Promise<Specimen[]> => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert sheet to 2D array
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  
  if (rows.length < 2) return [];
  
  const parsedItems: Specimen[] = [];
  
  // Find column indices dynamically based on header row
  const headers = Array.from(rows[0] || []).map((h) => String(h || '').trim());

  const getColIndex = (keywords: string[], fallback: number): number => {
    const idx = headers.findIndex((h) =>
      h && keywords.some((k) => h.toLowerCase().includes(k.toLowerCase()))
    );
    return idx !== -1 ? idx : fallback;
  };

  const managementIdIdx = getColIndex(['관리번호', 'managementid', 'id'], 0);
  const specimenNoIdx = getColIndex(['표본번호', 'specimenno'], 1);
  const storageIdx = getColIndex(['수장고', 'storage'], 2);
  const storageLocationIdx = getColIndex(['위치', 'storagelocation'], 3);
  const herbNameIdx = getColIndex(['생약명', 'herbname'], 4);
  const korNameIdx = getColIndex(['국명', 'korname'], 5);
  const sciNameIdx = getColIndex(['학명', 'sciname'], 6);
  const collectDateIdx = getColIndex(['수집일', '수집날짜', 'collectdate'], 7);
  const collectPlaceIdx = getColIndex(['수집지', '수집장소', 'collectplace'], 8);
  const importanceIdx = getColIndex(['중요도', 'importance'], 9);
  const genusIdx = getColIndex(['속명', 'genus'], 10);
  const familyIdx = getColIndex(['과명', 'family'], 11);
  const gpsIdx = getColIndex(['좌표', 'gps'], 12);
  const pharmacopoeiaIdx = getColIndex(['공정서', 'pharmacopoeia'], 13);
  const projectNameIdx = getColIndex(['과제명', 'projectname'], 14);

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    
    const managementId = safeString(row[managementIdIdx]);
    if (!managementId) continue; // Skip rows without management ID
    
    const specimenNo = safeString(row[specimenNoIdx]);
    const storage = safeString(row[storageIdx]);
    const storageLocation = safeString(row[storageLocationIdx]);
    const herbName = safeString(row[herbNameIdx]);
    const korName = safeString(row[korNameIdx]);
    const sciName = safeString(row[sciNameIdx]);
    const collectDate = parseExcelDate(row[collectDateIdx], XLSX);
    const collectPlace = safeString(row[collectPlaceIdx]);
    const importance = safeString(row[importanceIdx]);
    const genus = safeString(row[genusIdx]);
    const family = safeString(row[familyIdx]);
    const gpsRaw = safeString(row[gpsIdx]);
    const pharmacopoeia = row[pharmacopoeiaIdx] !== undefined && row[pharmacopoeiaIdx] !== null ? safeString(row[pharmacopoeiaIdx]) : null;
    const projectName = safeString(row[projectNameIdx]);
    
    // GPS Parsing: "latitude, longitude"
    let lat = 0;
    let lng = 0;
    if (gpsRaw) {
      const coords = gpsRaw.split(',').map(s => parseFloat(s.trim()));
      if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        lat = coords[0];
        lng = coords[1];
      }
    }
    
    parsedItems.push({
      id: uuidv4(),
      managementId,
      specimenNo,
      storage,
      storageLocation,
      herbName,
      korName,
      sciName,
      collectDate,
      collectPlace,
      importance,
      genus,
      family,
      gps: gpsRaw,
      lat,
      lng,
      pharmacopoeia: pharmacopoeia || null,
      projectName,
    });
  }
  
  return parsedItems;
};
