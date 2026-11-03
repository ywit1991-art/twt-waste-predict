import type { WasteRecord, DayType } from './types';

const LABELS: Record<DayType, string> = {
  normal: 'วันปกติ (จ-ศ)', weekend: 'เสาร์-อาทิตย์',
  holiday: 'วันหยุดยาว', festival: 'เทศกาล',
  term: 'เปิดเทอม', break: 'ปิดเทอม', activity: 'กิจกรรม'
};

export interface DayStats {
  type: DayType;
  label: string;
  count: number;
  avgKg: number;
  daysPerYear: number;
  totalKg: number;
}

export interface PredictionInput {
  records: WasteRecord[];
  isSchool: boolean;
  holidayDays: number;
  festivalDays: number;
  weekendDays: number;
  activityDays: number;
  termDays: number;
  breakDays: number;
}

export interface PredictionResult {
  yearKg: number;
  monthKg: number;
  breakdown: DayStats[];
}

export function predict(input: PredictionInput): PredictionResult {
  const groups: Record<DayType, number[]> = {
    normal: [], weekend: [], holiday: [], festival: [],
    term: [], break: [], activity: []
  };

  input.records.forEach(r => {
    const t = (r.prev_day_type || 'normal') as DayType;
    if (groups[t]) groups[t].push(r.weight_kg || 0);
  });

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0;

  const breakdown: DayStats[] = [];
  let yearKg = 0;

  const types: { t: DayType; d: number }[] = input.isSchool
    ? [
        { t: 'term', d: input.termDays },
        { t: 'break', d: input.breakDays },
        { t: 'holiday', d: input.holidayDays },
        { t: 'festival', d: input.festivalDays },
        { t: 'activity', d: input.activityDays }
      ]
    : [
        { t: 'normal', d: Math.max(0, 365 - input.weekendDays - input.holidayDays - input.festivalDays - input.activityDays) },
        { t: 'weekend', d: input.weekendDays },
        { t: 'holiday', d: input.holidayDays },
        { t: 'festival', d: input.festivalDays },
        { t: 'activity', d: input.activityDays }
      ];

  types.forEach(({ t, d }) => {
    const a = avg(groups[t]);
    const total = a * d;
    yearKg += total;
    breakdown.push({
      type: t, label: LABELS[t], count: groups[t].length,
      avgKg: a, daysPerYear: d, totalKg: total
    });
  });

  return {
    yearKg,
    monthKg: yearKg / 12,
    breakdown
  };
}