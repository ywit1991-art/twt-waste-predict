export type DayType =
  | 'normal' | 'weekend' | 'holiday' | 'festival'
  | 'term' | 'break' | 'activity';

export interface BinItem {
  size_liters: number;
  count: number;
}

export interface Site {
  id: string;
  name: string;
  type: string;
  density: number;
  lat: number | null;
  lng: number | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
}

export interface WasteRecord {
  id: string;
  created_at: string;
  user_name: string;
  record_date: string;
  site_id: string | null;
  location: string;
  prev_day_type: DayType;
  measurement_source: string;
  volume_m3: number;
  density: number;
  weight_kg: number;
  note: string | null;
  bins_json: BinItem[] | null;
  gps_lat: number | null;
  gps_lng: number | null;
  photo_url: string | null;
  area_width: number | null;
  area_length: number | null;
  area_height: number | null;
  area_fill: number | null;
}

export interface SiteType {
  id: string;
  label: string;
  density: number;
  icon: string;
  hasTerm?: boolean;
}