import type { DayType, SiteType } from './types';

export const SITE_TYPES: SiteType[] = [
  { id: 'hospital',   label: 'โรงพยาบาล',             density: 150, icon: '🏥' },
  { id: 'mall',       label: 'ห้างสรรพสินค้า',           density: 250, icon: '🏬' },
  { id: 'hotel',      label: 'โรงแรม/หอพัก/ห้องเช่า',        density: 200, icon: '🏨' },
  { id: 'school',     label: 'โรงเรียน',                   density: 200, icon: '🏫', hasTerm: true },
  { id: 'office',     label: 'สำนักงาน/ศูนย์จำหน่ายรถยนต์',  density: 180, icon: '🏢' },
  { id: 'restaurant', label: 'ร้านอาหาร/สะสมอาหาร',       density: 300, icon: '🍽️' },
  { id: 'store',      label: 'ร้านค้า/ร้านสะดวกซื้อ',          density: 200, icon: '🏘️' },
  { id: 'factory',    label: 'โรงงาน/ร้านซ่อมรถ/ล้างอัดฉีด',          density: 250, icon: '🏭' },
  { id: 'market',     label: 'ตลาดสด',         density: 350, icon: '🛒' },
  { id: 'temple',     label: 'วัด',             density: 200, icon: '🛕' }
];

export const DENSITY_HINTS: Record<string, string> = {
  hospital: 'ขยะติดเชื้อ / อันตราย',
  mall: 'ขยะทั่วไปผสม',
  hotel: 'ขยะทั่วไป',
  school: 'ขยะทั่วไป + เศษอาหาร',
  office: 'กระดาษ + ขยะทั่วไป',
  restaurant: 'เศษอาหารชื้น',
  store: 'ขยะร้านค้า',
  factory: 'ขยะอุตสาหกรรม',
  market: 'เศษผักผลไม้ชื้น',
  temple: 'ขยะทั่วไป + เศษอาหาร'
};

export const DAY_TYPES: { value: DayType; label: string; sym: string; color: string }[] = [
  { value: 'normal',   label: 'ปกติ',      sym: '○',  color: '#e5e7eb' },
  { value: 'weekend',  label: 'ส/อา',      sym: '▲',  color: '#ddd6fe' },
  { value: 'holiday',  label: 'หยุดยาว',   sym: '●',  color: '#fecaca' },
  { value: 'festival', label: 'เทศกาล',     sym: '🎉', color: '#fed7aa' },
  { value: 'term',     label: 'เปิดเทอม',  sym: '📚', color: '#bfdbfe' },
  { value: 'break',    label: 'ปิดเทอม',   sym: '🏖️', color: '#fde68a' },
  { value: 'activity', label: 'กิจกรรม',    sym: '🎪', color: '#a7f3d0' }
];

export const BIN_SIZES = [120, 200, 240];

export const MONTHS_TH = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];

export const MONTHS_TH_SHORT = [
  'ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'
];

export const DAY_HEADS = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];