import * as XLSX from 'xlsx';
import { Specimen, PharmacItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Helper to format date properly (handling Date objects, serial numbers, and strings)
const parseExcelDate = (val: unknown): string => {
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
export const parsePharmacopoeiaExcel = (arrayBuffer: ArrayBuffer): PharmacItem[] => {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert sheet to 2D array
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  
  if (rows.length < 2) return [];
  
  const parsedItems: PharmacItem[] = [];
  
  // Start from row index 1 to skip headers
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    
    // Check if idx is valid or row is empty
    const idxVal = row[0];
    if (idxVal === undefined || idxVal === null || idxVal === '') continue;
    const idx = typeof idxVal === 'number' ? idxVal : parseInt(String(idxVal).trim(), 10);
    if (isNaN(idx)) continue;
    
    const pharmacopoeia = safeString(row[1]);
    const item = safeString(row[2]);
    if (!item) continue; // Skip rows without item name
    
    const type = safeString(row[3]);
    const confirmTest = row[4] !== undefined && row[4] !== null ? safeString(row[4]) : null;
    const purityTest = row[5] !== undefined && row[5] !== null ? safeString(row[5]) : null;
    const purityItems = row[6] !== undefined && row[6] !== null ? safeString(row[6]) : null;
    const quantMethod = row[7] !== undefined && row[7] !== null ? safeString(row[7]) : null;
    const dryLoss = row[8] !== undefined && row[8] !== null ? safeString(row[8]) : null;
    const ash = row[9] !== undefined && row[9] !== null ? safeString(row[9]) : null;
    const acidAsh = row[10] !== undefined && row[10] !== null ? safeString(row[10]) : null;
    const extractContent = row[11] !== undefined && row[11] !== null ? safeString(row[11]) : null;
    const essentialOil = row[12] !== undefined && row[12] !== null ? safeString(row[12]) : null;
    
    // Extract specimenIds from columns N (index 13) to end
    const specimenIds: string[] = [];
    for (let c = 13; c < row.length; c++) {
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
export const parseSpecimensExcel = (arrayBuffer: ArrayBuffer): Specimen[] => {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert sheet to 2D array
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  
  if (rows.length < 2) return [];
  
  const parsedItems: Specimen[] = [];
  
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    
    const managementId = safeString(row[0]);
    if (!managementId) continue; // Skip rows without management ID
    
    const specimenNo = safeString(row[1]);
    const storage = safeString(row[2]);
    const storageLocation = safeString(row[3]);
    const herbName = safeString(row[4]);
    const korName = safeString(row[5]);
    const sciName = safeString(row[6]);
    const collectDate = parseExcelDate(row[7]);
    const collectPlace = safeString(row[8]);
    const importance = safeString(row[9]);
    const genus = safeString(row[10]);
    const family = safeString(row[11]);
    const gpsRaw = safeString(row[12]);
    const pharmacopoeia = row[13] !== undefined && row[13] !== null ? safeString(row[13]) : null;
    const projectName = safeString(row[14]);
    
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
