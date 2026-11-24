export interface Stock {
  id?: string;
  length: number;
  quantity?: number;
}

export interface Part {
  id?: string;
  length: number;
  quantity: number;
  angle_left?: number;
  angle_right?: number;
  angle_extra_left?: number; // Угол во 2-й плоскости (наклон / bevel / фасад)
  angle_extra_right?: number; // Угол во 2-й плоскости
  label?: string; // Маркировка / позиция на фасаде (например "Р-1", "Импост")
}

export interface CutConfig {
  cut_width: number;
  trim_left: number;
  trim_right: number;
  min_remnant: number;
  two_profiles: boolean;
}

export type RemnantType = 'Waste' | 'Reusable';

export interface PlacedPart {
  part_id?: string;
  length: number;
  start_pos: number;
  end_pos: number;
  angle_left?: number;
  angle_right?: number;
  angle_extra_left?: number;
  angle_extra_right?: number;
  label?: string;
}

export interface CuttingPattern {
  stock_length: number;
  count: number;
  parts: PlacedPart[];
  used_length: number;
  remnant_length: number;
  remnant_type: RemnantType;
}

export interface PlanSummary {
  total_parts_requested: number;
  total_parts_placed: number;
  total_stocks_used: number;
  total_stock_length: number;
  total_parts_length: number;
  total_kerf_length: number;
  total_reusable_length: number;
  total_waste_length: number;
  waste_percent: number;
  efficiency_percent: number;
}

export interface AnglePreset {
  id: string;
  name: string;
  left: number;
  right: number;
  extra_left?: number;
  extra_right?: number;
}

export type CalcMode = 'instant' | 'timer' | 'manual';

export interface AppSettings {
  calcMode: CalcMode;
  timerSeconds: number;
  autoRecalcOnFocus: boolean;
  autoCheckUpdates: boolean;
  anglePresets: AnglePreset[];
  companyName: string;
  companyLogo: 'mobil' | 'custom' | 'none';
  companyPhone: string;
  companyWebsite: string;
  machineName: string;
  operatorName: string;
}

export interface UpdateCheckResult {
  has_update: boolean;
  current_version: string;
  latest_version: string;
  release_name: string;
  release_notes: string;
  release_url: string;
  published_at: string;
  asset_name?: string | null;
  asset_size?: number | null;
  download_url?: string | null;
}

export interface UpdateProgressEvent {
  downloaded: number;
  total: number;
  percent: number;
  stage: 'downloading' | 'verifying' | 'launching' | string;
}

export interface DocumentMeta {
  title: string;
  material: string;
  date: string;
  orderNumber?: string;
}

export interface CuttingPlan {
  patterns: CuttingPattern[];
  unplaced: Part[];
  summary: PlanSummary;
}
