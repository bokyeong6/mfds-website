export interface Specimen {
  id: string;              // Auto-generated UUID
  managementId: string;    // JOIN Key (e.g., KHR19016745V)
  specimenNo: string;
  storage: string;
  storageLocation: string;
  herbName: string;        // 생약명
  korName: string;         // 국명
  sciName: string;         // 학명
  collectDate: string;     // 수집날짜
  collectPlace: string;    // 수집장소
  importance: string;      // 중요도 (A1, A2, B1, B2-1 등)
  genus: string;           // 속명
  family: string;          // 과명 (e.g. 국화과, 장미과 등)
  gps: string;             // 원본 GPS 문자열
  lat: number;             // 위도
  lng: number;             // 경도
  pharmacopoeia: string | null; // KP / KHP / KP, KHP / null
  projectName: string;     // 과제명
  imageUrls?: string[];    // Array of Firebase Storage image download URLs
  imageMatchedBase?: string; // Precomputed image base filename (e.g. KHR_19369)
}

export interface PharmacItem {
  id: string;              // Auto-generated UUID
  idx: number;             // 인덱스 번호
  pharmacopoeia: string; // "KP" | "KHP"
  item: string;          // 품목명 (e.g. 갈근)
  type: string;          // 형태 (식물성 등)
  confirmTest: string | null;
  purityTest: string | null;
  purityItems: string | null;
  quantMethod: string | null;
  dryLoss: string | null;
  ash: string | null;
  acidAsh: string | null;
  extractContent: string | null;
  essentialOil: string | null;
  specimenIds: string[]; // 파싱하여 얻은 제주센터 관리번호 배열
}
