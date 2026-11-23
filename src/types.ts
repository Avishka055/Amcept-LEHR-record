export type Language = 'en' | 'si';

export type TcCode =
  | 'TC-3'
  | 'TC-4'
  | 'TC-5'
  | 'TC-6'
  | 'TC-7'
  | 'TC-8'
  | 'TC-9'
  | 'TC-10'
  | 'TC-11'
  | 'TC-12'
  | 'TC-13';

export interface TcDefinition {
  tc: TcCode;
  zoneEn: string;
  zoneSi: string;
  rowHint: 'top' | 'bottom';
}

export const TC_DEFINITIONS: TcDefinition[] = [
  { tc: 'TC-3', zoneEn: 'Zone 1 (RC-3)', zoneSi: 'කලාපය 1 (RC-3)', rowHint: 'top' },
  { tc: 'TC-4', zoneEn: 'Zone 2 (RC-4)', zoneSi: 'කලාපය 2 (RC-4)', rowHint: 'bottom' },
  { tc: 'TC-5', zoneEn: 'Zone 3 (RC-5)', zoneSi: 'කලාපය 3 (RC-5)', rowHint: 'top' },
  { tc: 'TC-6', zoneEn: 'Zone 4 (RC-6)', zoneSi: 'කලාපය 4 (RC-6)', rowHint: 'bottom' },
  { tc: 'TC-7', zoneEn: 'Zone 5 (RC-7)', zoneSi: 'කලාපය 5 (RC-7)', rowHint: 'top' },
  { tc: 'TC-8', zoneEn: 'Zone 6 (RC-8)', zoneSi: 'කලාපය 6 (RC-8)', rowHint: 'top' },
  { tc: 'TC-9', zoneEn: 'Zone 7 (RC-9)', zoneSi: 'කලාපය 7 (RC-9)', rowHint: 'bottom' },
  { tc: 'TC-10', zoneEn: 'Zone 8 (RC-10)', zoneSi: 'කලාපය 8 (RC-10)', rowHint: 'top' },
  { tc: 'TC-11', zoneEn: 'Zone 9 (RC-11)', zoneSi: 'කලාපය 9 (RC-11)', rowHint: 'bottom' },
  { tc: 'TC-12', zoneEn: 'Zone 10 (RC-12)', zoneSi: 'කලාපය 10 (RC-12)', rowHint: 'top' },
  { tc: 'TC-13', zoneEn: 'Zone 11 (Exit)', zoneSi: 'කලාපය 11 (පිටවීම)', rowHint: 'bottom' },
];

export interface TcReading {
  tc: TcCode;
  pv: number | null;
  sv: number | null;
}

export interface Operator {
  id: string;
  name: string;
  code: string;
  shift: 'Morning' | 'Evening' | 'Night';
  role: string;
}

export interface LehrLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  hour: number; // 0..23
  timestamp: string; // ISO string
  operatorId: string;
  operatorName: string;
  recipe: string;
  mode: string;
  matSpeed: number | null;
  fan1Hz: number | null;
  fan2Hz: number | null;
  zones: TcReading[];
  notes: string;
  source: 'ai-camera' | 'manual';
  photoDataUrl?: string;
}

export interface HmiExtractionResponse {
  zones: TcReading[];
  matSpeed: number | null;
  recipe: string;
  mode: string;
  fan1Hz: number | null;
  fan2Hz: number | null;
  notes: string;
}
