'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Calculator, Calendar, Building2, ChevronDown, Loader2,
  Printer, AlertCircle, BarChart3, TrendingUp, TrendingDown, Activity,
  Target, PieChart, LineChart as LineIcon, GitCompare, ArrowUpRight,
  ArrowDownRight, Table, Users, MapPin, Clock, Search, X
} from 'lucide-react';
import { useRecords } from '@/lib/hooks';
import { SITE_TYPES, MONTHS_TH, MONTHS_TH_SHORT, DAY_TYPES } from '@/lib/constants';
import { predict } from '@/lib/calc';
import { fetchSites } from '@/lib/sites';
import { getSession, type Session } from '@/lib/session';
import type { Site } from '@/lib/types';
import AnimatedNumber from '@/components/AnimatedNumber';
import dynamic from 'next/dynamic';

const SiteManagerDynamic = dynamic(() => import('@/components/SiteManager'), {
  ssr: false
});

export default function DataPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <DataPageInner />
    </Suspense>
  );
}

function DataPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewMode =
    (searchParams.get('mode') as 'calc' | 'stats' | 'collectors') || 'calc';

  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const { records } = useRecords();

  const [sites, setSites] = useState<Site[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [siteId, setSiteId] = useState('');
  const [showManager, setShowManager] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const now = new Date();
  const [fromMonth, setFromMonth] = useState(0);
  const [fromYear, setFromYear] = useState(2023);
  const [toMonth, setToMonth] = useState(11);
  const [toYear, setToYear] = useState(now.getFullYear() + 1);

  const [holidayDays, setHolidayDays] = useState(15);
  const [festivalDays, setFestivalDays] = useState(5);
  const [weekendDays, setWeekendDays] = useState(104);
  const [activityDays, setActivityDays] = useState(10);
  const [termDays, setTermDays] = useState(200);
  const [breakDays, setBreakDays] = useState(150);

  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace('/'); return; }
    if (s.role !== 'staff') { router.replace('/calendar'); return; }
    setSession(s);
    setReady(true);
  }, [router]);

  const [rangeAutoSet, setRangeAutoSet] = useState(false);
  useEffect(() => {
    if (rangeAutoSet || records.length === 0) return;
    const dates = records
      .map(r => new Date(r.record_date))
      .filter(d => !isNaN(d.getTime()));
    if (dates.length === 0) return;
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    setFromMonth(min.getMonth());
    setFromYear(min.getFullYear());
    setToMonth(max.getMonth());
    setToYear(max.getFullYear());
    setRangeAutoSet(true);
  }, [records, rangeAutoSet]);

  const loadSites = async () => {
    setSitesLoading(true);
    try {
      const data = await fetchSites();
      setSites(data);
      if (data.length > 0 && !siteId) setSiteId(data[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setSitesLoading(false);
    }
  };

  useEffect(() => {
    if (ready) loadSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const selectedSite = sites.find(s => s.id === siteId);
  const siteType = selectedSite
    ? SITE_TYPES.find(t => t.id === selectedSite.type)
    : null;

  // ⭐ 1. เพิ่ม useEffect นี้เพื่อให้ Dropdown เปลี่ยนตามที่พิมพ์ค้นหา
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    
    // ถ้าพิมพ์คำค้นหา แล้วไปตรงกับชื่อสถานที่ไหน ให้เปลี่ยน dropdown ไปที่นั่นทันที
    const matchedSite = sites.find(s => s.name.toLowerCase().includes(q));
    if (matchedSite && matchedSite.id !== siteId) {
      setSiteId(matchedSite.id);
    }
  }, [searchQuery, sites, siteId]);


  // ⭐ 2. แก้ Logic การกรองข้อมูลให้ยึดตามสถานที่ที่เลือกใน Dropdown เป็นหลัก
  const filteredRecords = useMemo(() => {
    if (!selectedSite) return [];
    const from = new Date(fromYear, fromMonth, 1);
    const to = new Date(toYear, toMonth + 1, 0);
    const query = searchQuery.trim().toLowerCase();

    return records
      .filter(r => {
        // กรองเฉพาะข้อมูลของสถานที่ที่ถูกเลือกอยู่ตอนนี้เท่านั้น
        if (r.site_id !== selectedSite.id) return false;

        const d = new Date(r.record_date);
        if (d < from || d > to) return false;

        if (query) {
          const userName = r.user_name?.toLowerCase() || '';
          const note = r.note?.toLowerCase() || '';
          const siteName = selectedSite.name.toLowerCase();
          
          // ถ้าค้นหาแล้ว ไม่เจอทั้งชื่อคน, หมายเหตุ, หรือชื่อสถานที่ ให้กรองออก
          if (!siteName.includes(query) && !userName.includes(query) && !note.includes(query)) {
            return false;
          }
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(a.record_date).getTime() -
          new Date(b.record_date).getTime()
      );
  }, [records, selectedSite, fromMonth, fromYear, toMonth, toYear, searchQuery]);

  const stats = useMemo(() => {
    if (filteredRecords.length === 0) return null;
    const weights = filteredRecords.map(r => r.weight_kg || 0);
    const volumes = filteredRecords.map(r => r.volume_m3 || 0);
    const sorted = [...weights].sort((a, b) => a - b);
    const sum = weights.reduce((s, x) => s + x, 0);
    const mean = sum / weights.length;
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
    const variance =
      weights.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / weights.length;
    const sd = Math.sqrt(variance);
    const cv = mean > 0 ? (sd / mean) * 100 : 0;
    const q1 = sorted[Math.floor(sorted.length * 0.25)] || 0;
    const q3 = sorted[Math.floor(sorted.length * 0.75)] || 0;
    const iqr = q3 - q1;
    const totalKg = sum;
    const totalM3 = volumes.reduce((s, x) => s + x, 0);
    const avgDensity = totalM3 > 0 ? totalKg / totalM3 : 0;

    const byType: Record<string, any> = {};
    DAY_TYPES.forEach(dt => {
      const typeRecords = filteredRecords.filter(r => r.prev_day_type === dt.value);
      if (typeRecords.length > 0) {
        const ws = typeRecords.map(r => r.weight_kg || 0);
        byType[dt.value] = {
          count: typeRecords.length,
          total: ws.reduce((s, x) => s + x, 0),
          avg: ws.reduce((s, x) => s + x, 0) / ws.length,
          min: Math.min(...ws),
          max: Math.max(...ws)
        };
      }
    });

    const byMonth: Record<string, any> = {};
    filteredRecords.forEach(r => {
      const d = new Date(r.record_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { count: 0, total: 0, avg: 0 };
      byMonth[key].count++;
      byMonth[key].total += r.weight_kg || 0;
    });
    Object.keys(byMonth).forEach(k => {
      byMonth[k].avg = byMonth[k].total / byMonth[k].count;
    });

    const half = Math.floor(filteredRecords.length / 2);
    const firstHalf = filteredRecords.slice(0, half);
    const secondHalf = filteredRecords.slice(half);
    const firstAvg =
      firstHalf.length > 0
        ? firstHalf.reduce((s, r) => s + r.weight_kg, 0) / firstHalf.length
        : 0;
    const secondAvg =
      secondHalf.length > 0
        ? secondHalf.reduce((s, r) => s + r.weight_kg, 0) / secondHalf.length
        : 0;
    const trendPct = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    return {
      count: filteredRecords.length, totalKg, totalM3, avgDensity,
      mean, median, min, max, sd, cv, q1, q3, iqr,
      byType, byMonth, firstAvg, secondAvg, trendPct
    };
  }, [filteredRecords]);

  const result = useMemo(() => {
    if (!selectedSite || filteredRecords.length === 0) return null;
    return predict({
      records: filteredRecords,
      isSchool: siteType?.hasTerm ?? false,
      holidayDays, festivalDays, weekendDays, activityDays, termDays, breakDays
    });
  }, [
    filteredRecords, siteType?.hasTerm, holidayDays, festivalDays,
    weekendDays, activityDays, termDays, breakDays
  ]);

  const handlePrint = (mode: 'stats' | 'calc') => {
    const className = mode === 'stats' ? 'printing-stats' : 'printing-calc';
    document.body.classList.add(className);
    const cleanup = () => {
      document.body.classList.remove(className);
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => window.print(), 150);
  };

  const handlePrintRef = useRef<(mode: 'stats' | 'calc') => void>(() => {});
  handlePrintRef.current = handlePrint;

  useEffect(() => {
    const handler = (e: Event) => {
      const mode = (e as CustomEvent).detail;
      if (mode !== 'calc' && mode !== 'stats') return;
      handlePrintRef.current(mode);
    };
    window.addEventListener('twt-print', handler);
    return () => window.removeEventListener('twt-print', handler);
  }, []);

  if (!ready || !session) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-5">
        {/* SIDEBAR */}
        <aside className="no-print lg:col-span-4 xl:col-span-3 space-y-3 lg:space-y-4 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1">
          
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100/60">
            <label className="flex items-center gap-1.5 text-label mb-2">
              <Search className="w-3.5 h-3.5" /> ค้นหาข้อมูล
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ค้นหาสถานที่, ชื่อ..."
                className="w-full pl-10 pr-10 py-2.5 text-base bg-emerald-50/50 border-2 border-emerald-100 rounded-xl focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition-all text-emerald-900"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 hover:bg-emerald-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100/60 space-y-3">
            {sitesLoading ? (
              <div className="h-12 bg-emerald-50 rounded-xl animate-pulse" />
            ) : sites.length === 0 ? (
              <div className="text-center py-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                <div className="text-2xl mb-1">📍</div>
                <p className="text-sm text-amber-800 font-bold">ยังไม่มีสถานที่</p>
              </div>
            ) : (
              <div>
                <label className="flex items-center gap-1.5 text-label mb-1.5">
                  <Building2 className="w-3.5 h-3.5" /> สถานที่
                </label>
                <select
                  value={siteId}
                  onChange={e => setSiteId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base font-bold bg-emerald-50/50 border-2 border-emerald-100 rounded-xl focus:outline-none focus:bg-white focus:border-emerald-600 transition-all text-emerald-900"
                >
                  {sites.map(s => {
                    const t = SITE_TYPES.find(st => st.id === s.type);
                    return <option key={s.id} value={s.id}>{t?.icon || '📍'} {s.name}</option>;
                  })}
                </select>
                <button onClick={() => setShowManager(true)} className="w-full mt-2 text-xs font-bold text-emerald-700 px-2 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors">
                  ⚙️ จัดการสถานที่
                </button>
              </div>
            )}

            <div>
              <label className="flex items-center gap-1.5 text-label mb-1.5">
                <Calendar className="w-3.5 h-3.5" /> ช่วงเวลา
              </label>
              <div className="space-y-2">
                {(['from', 'to'] as const).map(which => {
                  const m = which === 'from' ? fromMonth : toMonth;
                  const y = which === 'from' ? fromYear : toYear;
                  const setM = which === 'from' ? setFromMonth : setToMonth;
                  const setY = which === 'from' ? setFromYear : setToYear;
                  return (
                    <div key={which} className="p-2.5 rounded-xl bg-emerald-50/50">
                      <div className="text-xs font-bold text-emerald-600 mb-1.5">
                        {which === 'from' ? 'ตั้งแต่' : 'ถึง'}
                      </div>
                      <div className="flex gap-1.5">
                        <select value={m} onChange={e => setM(parseInt(e.target.value))} className="flex-1 px-2.5 py-2 text-sm font-bold bg-white rounded-lg border border-emerald-100 focus:outline-none focus:border-emerald-600">
                          {MONTHS_TH_SHORT.map((mn, i) => <option key={i} value={i}>{mn}</option>)}
                        </select>
                        <select value={y} onChange={e => setY(parseInt(e.target.value))} className="w-20 px-2 py-2 text-sm font-bold bg-white rounded-lg border border-emerald-100 focus:outline-none focus:border-emerald-600">
                          {[2023, 2024, 2025, 2026, 2027].map(yr => <option key={yr} value={yr}>{yr + 543}</option>)}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-emerald-600 mt-2 text-center font-bold">
                📊 {filteredRecords.length} รายการ
              </p>
            </div>

            <details className="group">
              <summary className="cursor-pointer text-xs font-bold text-emerald-700 flex items-center gap-1 select-none py-1.5">
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                ตั้งค่าขั้นสูง
              </summary>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <NumField label="วันหยุด" value={holidayDays} onChange={setHolidayDays} />
                <NumField label="เทศกาล" value={festivalDays} onChange={setFestivalDays} />
                <NumField label="ส/อา" value={weekendDays} onChange={setWeekendDays} />
                <NumField label="กิจกรรม" value={activityDays} onChange={setActivityDays} />
                {siteType?.hasTerm && (
                  <>
                    <NumField label="เปิดเทอม" value={termDays} onChange={setTermDays} />
                    <NumField label="ปิดเทอม" value={breakDays} onChange={setBreakDays} />
                  </>
                )}
              </div>
            </details>
          </motion.div>
        </aside>

        <section className="lg:col-span-8 xl:col-span-9 space-y-4">
          {viewMode === 'stats' && stats && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="no-print space-y-4">
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100/60">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-emerald-100">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-section-title">สถิติข้อมูล</h3>
                    <p className="text-hint mt-0.5">จากการบันทึก {stats.count} ครั้ง ในช่วงที่เลือก</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-4">
                  <StatMini icon={<Activity className="w-4 h-4" />} label="ค่าเฉลี่ย" value={stats.mean.toFixed(1)} unit="กก." color="from-emerald-500 to-emerald-600" />
                  <StatMini icon={<Target className="w-4 h-4" />} label="มัธยฐาน" value={stats.median.toFixed(1)} unit="กก." color="from-emerald-600 to-emerald-700" />
                  <StatMini icon={<TrendingUp className="w-4 h-4" />} label="สูงสุด" value={stats.max.toFixed(1)} unit="กก." color="from-amber-500 to-amber-600" />
                  <StatMini icon={<TrendingDown className="w-4 h-4" />} label="ต่ำสุด" value={stats.min.toFixed(1)} unit="กก." color="from-green-500 to-green-600" />
                  <StatMini icon={<BarChart3 className="w-4 h-4" />} label="SD" value={stats.sd.toFixed(1)} unit="กก." color="from-rose-500 to-rose-600" />
                  <StatMini icon={<PieChart className="w-4 h-4" />} label="CV" value={stats.cv.toFixed(1)} unit="%" color="from-teal-500 to-teal-600" />
                </div>

                <div className="mb-4 p-4 rounded-2xl bg-emerald-50/50">
                  <div className="text-label mb-3 flex items-center gap-2"><LineIcon className="w-4 h-4" /> การกระจายตัว (Quartile)</div>
                  <div className="flex items-center justify-between text-center">
                    <div><div className="text-xs text-emerald-600 font-bold">ต่ำสุด</div><div className="text-number-sm text-emerald-900 mt-1">{stats.min.toFixed(1)}</div></div>
                    <div><div className="text-xs text-emerald-600 font-bold">Q1</div><div className="text-number-sm text-emerald-900 mt-1">{stats.q1.toFixed(1)}</div></div>
                    <div><div className="text-xs text-emerald-600 font-bold">มัธยฐาน</div><div className="text-number-sm text-emerald-700 mt-1">{stats.median.toFixed(1)}</div></div>
                    <div><div className="text-xs text-emerald-600 font-bold">Q3</div><div className="text-number-sm text-emerald-900 mt-1">{stats.q3.toFixed(1)}</div></div>
                    <div><div className="text-xs text-emerald-600 font-bold">สูงสุด</div><div className="text-number-sm text-emerald-900 mt-1">{stats.max.toFixed(1)}</div></div>
                  </div>
                </div>

                <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-100">
                  <div className="text-label mb-3">แนวโน้ม (ครึ่งแรก vs ครึ่งหลัง)</div>
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1"><div className="text-xs text-emerald-600 font-bold">ครึ่งแรก</div><div className="text-number text-emerald-900 mt-1">{stats.firstAvg.toFixed(1)} กก.</div></div>
                    <div className="text-3xl">{stats.trendPct > 0 ? '📈' : stats.trendPct < 0 ? '📉' : '➡️'}</div>
                    <div className="text-center flex-1"><div className="text-xs text-emerald-600 font-bold">ครึ่งหลัง</div><div className="text-number text-emerald-900 mt-1">{stats.secondAvg.toFixed(1)} กก.</div></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200">
                  <div className="text-center"><div className="text-xs font-bold text-emerald-700 mb-1">ปริมาตรรวม</div><div className="text-number text-emerald-800">{stats.totalM3.toFixed(3)}<span className="text-sm ml-1">ม³</span></div></div>
                  <div className="text-center"><div className="text-xs font-bold text-emerald-700 mb-1">ความหนาแน่นเฉลี่ย</div><div className="text-number text-emerald-800">{stats.avgDensity.toFixed(1)}<span className="text-sm ml-1">กก./ม³</span></div></div>
                </div>
              </div>
              <MonthComparison records={filteredRecords} siteId={selectedSite?.id || ''} />
            </motion.div>
          )}

          {viewMode === 'collectors' && selectedSite && (
            <div className="no-print"><CollectorReport records={filteredRecords} sites={sites} /></div>
          )}

          {viewMode === 'calc' && result && filteredRecords.length > 0 && (
            <div className="no-print">
              <CalcView siteName={selectedSite?.name || ''} siteType={siteType?.label || ''} fromLabel={`${MONTHS_TH[fromMonth]} ${fromYear + 543}`} toLabel={`${MONTHS_TH[toMonth]} ${toYear + 543}`} result={result} records={filteredRecords} />
            </div>
          )}

          {viewMode === 'calc' && filteredRecords.length === 0 && (
            <div className="no-print bg-white rounded-3xl p-10 shadow-sm border border-emerald-100/60 text-center">
              <AlertCircle className="w-14 h-14 mx-auto text-amber-500 mb-3" />
              <p className="text-card-title mb-1">ไม่พบข้อมูลในช่วงเวลานี้</p>
              <p className="text-body">ลองเลือกช่วงเวลาอื่น หรือเปลี่ยนสถานที่</p>
            </div>
          )}
        </section>
      </div>

      {result && selectedSite && (
        <CalcReport siteName={selectedSite.name} siteType={siteType?.label || ''} fromLabel={`${MONTHS_TH[fromMonth]} ${fromYear + 543}`} toLabel={`${MONTHS_TH[toMonth]} ${toYear + 543}`} result={result} records={filteredRecords} />
      )}
      {stats && selectedSite && (
        <StatsReport siteName={selectedSite.name} siteType={siteType?.label || ''} fromLabel={`${MONTHS_TH[fromMonth]} ${fromYear + 543}`} toLabel={`${MONTHS_TH[toMonth]} ${toYear + 543}`} stats={stats} />
      )}

      <AnimatePresence>
        {showManager && (
          <SiteManagerDynamic sites={sites} onClose={() => setShowManager(false)} onReload={loadSites} />
        )}
      </AnimatePresence>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * Sub-components
 * ═══════════════════════════════════════════════════════════════ */

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs font-bold text-emerald-700 mb-1">{label}</label>
      <input type="number" className="w-full px-2.5 py-2 text-sm bg-white border-2 border-emerald-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all font-bold text-emerald-900" value={value} onChange={e => onChange(parseInt(e.target.value) || 0)} />
    </div>
  );
}

function StatMini({ icon, label, value, unit, color }: { icon: React.ReactNode; label: string; value: string; unit: string; color: string; }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="p-3.5 rounded-2xl bg-white border-2 border-emerald-100 text-center relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${color} rounded-full -mr-8 -mt-8 opacity-10`} />
      <div className={`w-9 h-9 mx-auto rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-2 shadow-md`}>{icon}</div>
      <div className="text-xs font-bold text-emerald-600">{label}</div>
      <div className="text-number text-emerald-900 leading-tight mt-0.5">{value}</div>
      <div className="text-[10px] text-emerald-500">{unit}</div>
    </motion.div>
  );
}

function MonthComparison({ records, siteId }: { records: any[]; siteId: string }) {
  const data = useMemo(() => {
    const siteRecords = records.filter(r => r.site_id === siteId);
    const byYearMonth: Record<number, Record<number, { count: number; total: number }>> = {};
    const yearsSet = new Set<number>();
    siteRecords.forEach(r => {
      const d = new Date(r.record_date);
      const y = d.getFullYear(); const m = d.getMonth();
      yearsSet.add(y);
      if (!byYearMonth[y]) byYearMonth[y] = {};
      if (!byYearMonth[y][m]) byYearMonth[y][m] = { count: 0, total: 0 };
      byYearMonth[y][m].count++; byYearMonth[y][m].total += r.weight_kg || 0;
    });
    const years = Array.from(yearsSet).sort();
    const monthData: any[] = [];
    for (let m = 0; m < 12; m++) {
      const values: Record<number, any> = {}; let hasData = false;
      years.forEach(y => {
        const d = byYearMonth[y]?.[m];
        if (d && d.count > 0) { hasData = true; values[y] = { avg: d.total / d.count, total: d.total, count: d.count }; }
      });
      if (!hasData) continue;
      const yearsWithData = years.filter(y => values[y]);
      let trend: number | null = null;
      if (yearsWithData.length >= 2) {
        const lastYear = yearsWithData[yearsWithData.length - 1];
        const prevYear = yearsWithData[yearsWithData.length - 2];
        const lastVal = values[lastYear].avg; const prevVal = values[prevYear].avg;
        if (prevVal > 0) trend = ((lastVal - prevVal) / prevVal) * 100;
      }
      monthData.push({ month: m, values, trend });
    }
    return { years, monthData };
  }, [records, siteId]);

  if (data.years.length === 0 || data.monthData.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100/60">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-emerald-100">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center"><GitCompare className="w-5 h-5 text-emerald-600" /></div>
        <div className="flex-1"><h3 className="text-section-title">เปรียบเทียบรายเดือนข้ามปี</h3><p className="text-hint mt-0.5">เปรียบเทียบค่าเฉลี่ยต่อครั้ง ของเดือนเดียวกัน</p></div>
      </div>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm border-collapse min-w-[500px]">
          <thead>
            <tr className="bg-emerald-50">
              <th className="text-left p-3 font-black text-emerald-800 border border-emerald-200">เดือน</th>
              {data.years.map(y => <th key={y} className="p-3 font-black text-emerald-800 border border-emerald-200 text-center">{y + 543}</th>)}
              <th className="p-3 font-black text-emerald-800 border border-emerald-200 text-center">แนวโน้ม</th>
            </tr>
          </thead>
          <tbody>
            {data.monthData.map(md => {
              const trend = md.trend; const isUp = trend !== null && trend > 2; const isDown = trend !== null && trend < -2;
              return (
                <tr key={md.month}>
                  <td className="p-3 font-bold text-emerald-900 border border-emerald-200">{MONTHS_TH_SHORT[md.month]}</td>
                  {data.years.map(y => {
                    const v = md.values[y];
                    if (!v) return <td key={y} className="p-3 text-center border border-emerald-200 text-emerald-300">—</td>;
                    return (<td key={y} className="p-3 border border-emerald-200 text-center"><div className="text-number-sm text-emerald-900">{v.avg.toFixed(1)}</div><div className="text-xs text-emerald-500 mt-0.5">{v.count} ครั้ง</div></td>);
                  })}
                  <td className={`p-3 border border-emerald-200 text-center ${isUp ? 'bg-red-50' : isDown ? 'bg-emerald-50' : ''}`}>
                    {trend === null ? <span className="text-emerald-300">—</span> : <div className={`flex items-center justify-center gap-0.5 font-black text-base ${isUp ? 'text-red-600' : isDown ? 'text-emerald-600' : 'text-emerald-500'}`}>{isUp ? <ArrowUpRight className="w-4 h-4" /> : isDown ? <ArrowDownRight className="w-4 h-4" /> : '→'}{Math.abs(trend).toFixed(1)}%</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CalcView({ siteName, siteType, fromLabel, toLabel, result, records }: { siteName: string; siteType: string; fromLabel: string; toLabel: string; result: ReturnType<typeof predict>; records: any[]; }) {
  const totalRecords = records.length;
  const totalVolume = records.reduce((s: number, r: any) => s + (r.volume_m3 || 0), 0);
  const totalWeight = records.reduce((s: number, r: any) => s + (r.weight_kg || 0), 0);
  const avgDensity = totalVolume > 0 ? totalWeight / totalVolume : 0;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100/60">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-emerald-100">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center"><Calculator className="w-5 h-5 text-emerald-700" /></div>
          <div className="flex-1"><h3 className="text-section-title">ผลการคำนวณพยากรณ์</h3><p className="text-hint mt-0.5">{siteName} · {fromLabel} – {toLabel}</p></div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-600 text-white p-6 text-center shadow-xl shadow-emerald-200/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16" />
          <div className="relative">
            <div className="text-sm font-bold text-white/85 mb-2">ปริมาณขยะที่พยากรณ์ใน 1 ปี</div>
            <div className="text-3xl lg:text-4xl font-black tabular mb-1.5 text-number-highlight"><AnimatedNumber value={result.yearKg} decimals={0} /></div>
            <div className="text-base font-bold opacity-90 mb-4">กก./ปี</div>
            <div className="flex items-center justify-center gap-5 text-sm opacity-90">
              <div><div className="opacity-75 text-xs font-bold">ตัน/ปี</div><div className="font-black text-lg text-number-highlight mt-0.5">{(result.yearKg / 1000).toFixed(2)}</div></div>
              <div className="w-px h-9 bg-white/30" />
              <div><div className="opacity-75 text-xs font-bold">กก./เดือน</div><div className="font-black text-lg text-number-highlight mt-0.5">{result.monthKg.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</div></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 mt-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-center"><div className="text-xs font-bold text-emerald-600 mb-1">ข้อมูลที่ใช้</div><div className="text-number text-emerald-900">{totalRecords}</div><div className="text-xs text-emerald-500 mt-0.5">ครั้ง</div></div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-center"><div className="text-xs font-bold text-emerald-600 mb-1">ปริมาตรรวม</div><div className="text-number text-emerald-900">{totalVolume.toFixed(2)}</div><div className="text-xs text-emerald-500 mt-0.5">ลบ.ม.</div></div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-center"><div className="text-xs font-bold text-emerald-600 mb-1">ρ เฉลี่ย</div><div className="text-number text-emerald-900">{avgDensity.toFixed(0)}</div><div className="text-xs text-emerald-500 mt-0.5">กก./ม³</div></div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100/60">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-emerald-100">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center"><span className="text-xl">📐</span></div>
          <div><h3 className="text-section-title">สูตรการคำนวณ</h3><p className="text-hint mt-0.5">4 ขั้นตอนที่ใช้ในโมเดล</p></div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-100">
            <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">1</div><div className="text-sm font-black text-emerald-800">แปลงปริมาตรเป็นน้ำหนัก</div></div>
            <div className="font-mono text-sm text-emerald-900 bg-white px-3 py-2 rounded-xl mb-2.5 font-bold">W (กก.) = V (ลบ.ม.) × ρ (กก./ลบ.ม.)</div>
            <div className="text-xs text-emerald-700 space-y-1"><div>• ปริมาตรรวม = <b>{totalVolume.toFixed(3)}</b> ลบ.ม.</div><div>• ρ เฉลี่ย = <b>{avgDensity.toFixed(2)}</b> กก./ลบ.ม.</div><div>• น้ำหนักรวม = <b>{totalWeight.toFixed(2)}</b> กก.</div></div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-100">
            <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">2</div><div className="text-sm font-black text-emerald-800">ค่าเฉลี่ยต่อครั้ง</div></div>
            <div className="font-mono text-sm text-emerald-900 bg-white px-3 py-2 rounded-xl mb-2.5 font-bold">W̄ = (W₁ + W₂ + ... + Wₙ) ÷ n</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {result.breakdown.map(b => b.count > 0 ? (
                <div key={b.type} className="flex items-center justify-between text-xs py-1 border-b border-emerald-100 last:border-0"><span className="text-emerald-800 font-bold">{b.label}</span><span className="font-mono text-emerald-700">{b.count} → <b>{b.avgKg.toFixed(2)}</b> กก.</span></div>
              ) : null)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-100 xl:col-span-2">
            <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">3</div><div className="text-sm font-black text-emerald-800">พยากรณ์รายปี — W_ปี = Σ(W_ประเภท × D_ประเภท)</div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {result.breakdown.map(b => b.count > 0 ? (
                <div key={b.type} className="flex items-center justify-between text-xs py-2 px-2.5 rounded-lg bg-white border border-emerald-100"><span className="text-emerald-800 font-bold">{b.label}</span><span className="font-mono text-emerald-700">{b.avgKg.toFixed(2)} × {b.daysPerYear} = <b>{b.totalKg.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</b> กก.</span></div>
              ) : null)}
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t-2 border-emerald-300 font-black text-base"><span className="text-emerald-800">รวมทั้งปี</span><span className="text-emerald-800 text-number-lg">{result.yearKg.toLocaleString('th-TH', { maximumFractionDigits: 0 })}<span className="text-sm ml-1">กก.</span></span></div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-100 xl:col-span-2">
            <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">4</div><div className="text-sm font-black text-emerald-800">หาค่าเฉลี่ยต่อเดือน</div></div>
            <div className="font-mono text-sm text-emerald-900 bg-white px-3 py-2.5 rounded-xl">W_เดือน = {result.yearKg.toLocaleString('th-TH', { maximumFractionDigits: 0 })} ÷ 12 = <b>{result.monthKg.toLocaleString('th-TH', { maximumFractionDigits: 2 })}</b> กก./เดือน</div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100/60">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-emerald-100">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center"><Table className="w-5 h-5 text-emerald-700" /></div>
          <div><h3 className="text-section-title">ตารางสรุปการคำนวณ</h3><p className="text-hint mt-0.5">รายละเอียดแต่ละประเภทวัน</p></div>
        </div>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-emerald-50">
                <th className="text-left p-3 font-black text-emerald-800 border border-emerald-200">ประเภทวัน</th>
                <th className="p-3 font-black text-emerald-800 border border-emerald-200 text-center">จำนวนครั้ง</th>
                <th className="p-3 font-black text-emerald-800 border border-emerald-200 text-right">W เฉลี่ย/ครั้ง</th>
                <th className="p-3 font-black text-emerald-800 border border-emerald-200 text-center">วัน/ปี</th>
                <th className="p-3 font-black text-emerald-800 border border-emerald-200 text-right">รวม (กก.)</th>
              </tr>
            </thead>
            <tbody>
              {result.breakdown.map(b => (
                <tr key={b.type} className="hover:bg-emerald-50/50">
                  <td className="p-3 border border-emerald-200 font-bold text-emerald-900">{b.label}</td>
                  <td className="p-3 border border-emerald-200 text-center">{b.count}</td>
                  <td className="p-3 border border-emerald-200 text-right tabular">{b.avgKg.toFixed(2)}</td>
                  <td className="p-3 border border-emerald-200 text-center tabular">{b.daysPerYear}</td>
                  <td className="p-3 border border-emerald-200 text-right tabular font-black text-emerald-700">{b.totalKg.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
              <tr className="bg-emerald-50 font-black">
                <td className="p-3 border border-emerald-200 text-emerald-800" colSpan={4}>รวมทั้งปี</td>
                <td className="p-3 border border-emerald-200 text-right tabular text-emerald-800 text-number">{result.yearKg.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function CollectorReport({ records, sites }: { records: any[]; sites: Site[] }) {
  const [view, setView] = useState<'by-person' | 'by-site' | 'timeline'>('by-person');
  const getSiteName = (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    if (!site) return 'ไม่ระบุ';
    const t = SITE_TYPES.find(t => t.id === site.type);
    return `${t?.icon || '📍'} ${site.name}`;
  };

  const byPerson = useMemo(() => {
    const map: Record<string, any> = {};
    records.forEach(r => {
      const name = r.user_name || 'ไม่ระบุ';
      if (!map[name]) map[name] = { name, count: 0, totalKg: 0, sites: {}, lastDate: r.record_date };
      map[name].count++; map[name].totalKg += r.weight_kg || 0;
      if (!map[name].sites[r.site_id]) map[name].sites[r.site_id] = { count: 0, totalKg: 0 };
      map[name].sites[r.site_id].count++; map[name].sites[r.site_id].totalKg += r.weight_kg || 0;
      if (new Date(r.record_date) > new Date(map[name].lastDate)) map[name].lastDate = r.record_date;
    });
    return Object.values(map).sort((a: any, b: any) => b.totalKg - a.totalKg);
  }, [records]);

  const bySite = useMemo(() => {
    const map: Record<string, any> = {};
    records.forEach(r => {
      const sid = r.site_id || 'unknown';
      if (!map[sid]) map[sid] = { siteId: sid, count: 0, totalKg: 0, persons: {}, lastDate: r.record_date };
      map[sid].count++; map[sid].totalKg += r.weight_kg || 0;
      const name = r.user_name || 'ไม่ระบุ';
      if (!map[sid].persons[name]) map[sid].persons[name] = { count: 0, totalKg: 0 };
      map[sid].persons[name].count++; map[sid].persons[name].totalKg += r.weight_kg || 0;
      if (new Date(r.record_date) > new Date(map[sid].lastDate)) map[sid].lastDate = r.record_date;
    });
    return Object.values(map).sort((a: any, b: any) => b.totalKg - a.totalKg);
  }, [records]);

  const timeline = useMemo(() => [...records].sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime()), [records]);

  if (records.length === 0) {
    return (<div className="bg-white rounded-3xl p-12 shadow-sm border border-emerald-100/60 text-center"><AlertCircle className="w-14 h-14 mx-auto text-amber-500 mb-3" /><p className="text-card-title">ไม่พบข้อมูลในช่วงเวลานี้</p></div>);
  }

  const totalKg = records.reduce((s, r) => s + (r.weight_kg || 0), 0);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100/60">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-emerald-100">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center"><Users className="w-5 h-5 text-emerald-700" /></div>
          <div className="flex-1"><h3 className="text-section-title">รายงานผู้บันทึก</h3><p className="text-hint mt-0.5">ดูว่าใครไปเก็บที่ไหน ปริมาณเท่าไหร่</p></div>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-center"><div className="text-xs font-bold text-emerald-600 mb-1">ผู้บันทึก</div><div className="text-number text-emerald-800">{byPerson.length}</div><div className="text-xs text-emerald-500 mt-0.5">คน</div></div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-center"><div className="text-xs font-bold text-emerald-600 mb-1">จำนวนครั้ง</div><div className="text-number text-emerald-800">{records.length}</div><div className="text-xs text-emerald-500 mt-0.5">ครั้ง</div></div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-center"><div className="text-xs font-bold text-emerald-600 mb-1">น้ำหนักรวม</div><div className="text-number text-emerald-800">{totalKg.toFixed(0)}</div><div className="text-xs text-emerald-500 mt-0.5">กก.</div></div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button onClick={() => setView('by-person')} className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${view === 'by-person' ? 'bg-emerald-700 text-white shadow-md shadow-emerald-200' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}><Users className="w-4 h-4" /> ตามคน</button>
          <button onClick={() => setView('by-site')} className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${view === 'by-site' ? 'bg-emerald-700 text-white shadow-md shadow-emerald-200' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}><MapPin className="w-4 h-4" /> ตามสถานที่</button>
          <button onClick={() => setView('timeline')} className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${view === 'timeline' ? 'bg-emerald-700 text-white shadow-md shadow-emerald-200' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}><Clock className="w-4 h-4" /> ตามเวลา</button>
        </div>
      </div>

      {view === 'by-person' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {byPerson.map((p: any, i: number) => (
            <motion.div key={p.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white rounded-3xl p-4 shadow-sm border border-emerald-100/60">
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-emerald-100">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-200">{p.name.charAt(0).toUpperCase()}</div>
                <div className="flex-1"><div className="text-card-title">{p.name}</div><div className="text-xs text-emerald-500 mt-0.5">ล่าสุด: {new Date(p.lastDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</div></div>
                <div className="text-right"><div className="text-number-lg text-emerald-700">{p.totalKg.toFixed(0)}<span className="text-xs ml-1">กก.</span></div><div className="text-xs text-emerald-500 mt-0.5">{p.count} ครั้ง</div></div>
              </div>
              <div className="space-y-1.5">
                {Object.entries(p.sites).map(([sid, data]: [string, any]) => (
                  <div key={sid} className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50">
                    <div className="flex-1 min-w-0"><div className="text-sm font-bold text-emerald-900 truncate">{getSiteName(sid)}</div><div className="text-xs text-emerald-500 mt-0.5">{data.count} ครั้ง</div></div>
                    <div className="text-number-sm text-emerald-700 ml-2">{data.totalKg.toFixed(1)} กก.</div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {view === 'by-site' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {bySite.map((s: any, i: number) => (
            <motion.div key={s.siteId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-white rounded-3xl p-4 shadow-sm border border-emerald-100/60">
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-emerald-100">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 flex items-center justify-center text-white text-2xl shadow-md shadow-emerald-200">{(() => { const site = sites.find(st => st.id === s.siteId); const t = site ? SITE_TYPES.find(t => t.id === site.type) : null; return t?.icon || '📍'; })()}</div>
                <div className="flex-1 min-w-0"><div className="text-card-title truncate">{getSiteName(s.siteId)}</div><div className="text-xs text-emerald-500 mt-0.5">ล่าสุด: {new Date(s.lastDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</div></div>
                <div className="text-right"><div className="text-number-lg text-emerald-700">{s.totalKg.toFixed(0)}<span className="text-xs ml-1">กก.</span></div><div className="text-xs text-emerald-500 mt-0.5">{s.count} ครั้ง</div></div>
              </div>
              <div className="space-y-1.5">
                {Object.entries(s.persons).sort(([, a]: any, [, b]: any) => b.totalKg - a.totalKg).map(([name, data]: [string, any]) => (
                  <div key={name} className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/50">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-sm font-black text-emerald-700 shadow-sm shrink-0">{name.charAt(0).toUpperCase()}</div>
                      <div className="flex-1 min-w-0"><div className="text-sm font-bold text-emerald-900 truncate">{name}</div><div className="text-xs text-emerald-500 mt-0.5">{data.count} ครั้ง</div></div>
                    </div>
                    <div className="text-number-sm text-emerald-700 ml-2">{data.totalKg.toFixed(1)} กก.</div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {view === 'timeline' && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-emerald-100/60">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[500px]">
              <thead><tr className="bg-emerald-50"><th className="text-left p-3 font-black text-emerald-700 border border-emerald-200">วันที่</th><th className="text-left p-3 font-black text-emerald-700 border border-emerald-200">ผู้บันทึก</th><th className="text-left p-3 font-black text-emerald-700 border border-emerald-200">สถานที่</th><th className="p-3 font-black text-emerald-700 border border-emerald-200 text-right">ปริมาณ (กก.)</th></tr></thead>
              <tbody>
                {timeline.map(r => (
                  <tr key={r.id} className="hover:bg-emerald-50/50">
                    <td className="p-3 border border-emerald-200 text-emerald-900">{new Date(r.record_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                    <td className="p-3 border border-emerald-200"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center text-xs font-black text-emerald-700">{(r.user_name || '?').charAt(0).toUpperCase()}</div><span className="font-bold text-emerald-900 truncate">{r.user_name || 'ไม่ระบุ'}</span></div></td>
                    <td className="p-3 border border-emerald-200 text-emerald-900 truncate max-w-[200px]">{getSiteName(r.site_id)}</td>
                    <td className="p-3 border border-emerald-200 text-right tabular font-black text-emerald-700">{r.weight_kg.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsReport({ siteName, siteType, fromLabel, toLabel, stats }: any) {
  const today = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  const tdStyle: React.CSSProperties = { border: '1px solid #065f46', padding: '6px 10px', fontSize: '13px' };
  const thStyle: React.CSSProperties = { border: '1px solid #065f46', padding: '8px 10px', backgroundColor: '#ecfdf5', fontWeight: 'bold', fontSize: '13px', textAlign: 'center', color: '#064e3b' };
  const sectionTitle: React.CSSProperties = { fontSize: '15px', fontWeight: 'bold', color: '#065f46', marginTop: '18px', marginBottom: '8px', borderBottom: '1px solid #a7f3d0', paddingBottom: '4px' };
  const infoLabel: React.CSSProperties = { padding: '3px 0', fontSize: '13px', width: '200px', verticalAlign: 'top', color: '#334155' };
  const infoColon: React.CSSProperties = { padding: '3px 8px', fontSize: '13px', width: '15px', verticalAlign: 'top', color: '#334155' };
  const infoValue: React.CSSProperties = { padding: '3px 0', fontSize: '13px', fontWeight: 'bold', verticalAlign: 'top', color: '#1a202c' };

  return (
    <div className="print-stats-only bg-white p-8 md:p-12 text-slate-900">
      <div className="text-center mb-6">
        <img src="/logo.png" alt="logo" className="w-20 h-20 mx-auto mb-2 object-contain" onError={e => ((e.target as HTMLImageElement).style.display = 'none')} />
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#065f46' }}>เทศบาลตำบลท่าวังทอง</div>
        <div style={{ fontSize: '13px', color: '#334155' }}>กองสาธารณสุขและสิ่งแวดล้อม</div>
        <div style={{ fontSize: '13px', color: '#334155' }}>อำเภอเมืองพะเยา จังหวัดพะเยา</div>
      </div>
      <div className="text-center mb-6"><div style={{ fontSize: '20px', fontWeight: 'bold', color: '#065f46', letterSpacing: '0.5px' }}>รายงานสถิติปริมาณขยะมูลฝอย</div></div>
      <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={sectionTitle}>1. ข้อมูลทั่วไป</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
          <tbody>
            <tr><td style={infoLabel}>สถานที่เก็บขยะ</td><td style={infoColon}>:</td><td style={infoValue}>{siteName}</td></tr>
            <tr><td style={infoLabel}>ประเภทสถานประกอบการ</td><td style={infoColon}>:</td><td style={infoValue}>{siteType}</td></tr>
            <tr><td style={infoLabel}>ช่วงเวลาที่ใช้ข้อมูล</td><td style={infoColon}>:</td><td style={infoValue}>{fromLabel} ถึง {toLabel}</td></tr>
            <tr><td style={infoLabel}>จำนวนครั้งที่บันทึก</td><td style={infoColon}>:</td><td style={infoValue}>{stats.count} ครั้ง</td></tr>
            <tr><td style={infoLabel}>วันที่จัดทำรายงาน</td><td style={infoColon}>:</td><td style={infoValue}>{today}</td></tr>
          </tbody>
        </table>
      </div>
      <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={sectionTitle}>2. สถิติพื้นฐาน (หน่วย: กิโลกรัม)</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={{ ...thStyle, textAlign: 'left' }}>ตัวชี้วัด</th><th style={{ ...thStyle, textAlign: 'right', width: '120px' }}>ค่า</th><th style={{ ...thStyle, textAlign: 'left', width: '260px' }}>ความหมาย</th></tr></thead>
          <tbody>
            <tr><td style={tdStyle}>ค่าเฉลี่ย (Mean)</td><td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{stats.mean.toFixed(2)}</td><td style={tdStyle}>ผลรวมน้ำหนัก ÷ จำนวนครั้ง</td></tr>
            <tr><td style={tdStyle}>มัธยฐาน (Median)</td><td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{stats.median.toFixed(2)}</td><td style={tdStyle}>ค่ากลางของข้อมูล</td></tr>
            <tr><td style={tdStyle}>ค่าสูงสุด (Maximum)</td><td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{stats.max.toFixed(2)}</td><td style={tdStyle}>ค่าน้ำหนักมากที่สุด</td></tr>
            <tr><td style={tdStyle}>ค่าต่ำสุด (Minimum)</td><td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{stats.min.toFixed(2)}</td><td style={tdStyle}>ค่าน้ำหนักน้อยที่สุด</td></tr>
            <tr><td style={tdStyle}>ส่วนเบี่ยงเบนมาตรฐาน (SD)</td><td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{stats.sd.toFixed(2)}</td><td style={tdStyle}>การกระจายตัวของข้อมูล</td></tr>
            <tr><td style={tdStyle}>สัมประสิทธิ์การแปรผัน (CV)</td><td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{stats.cv.toFixed(2)}%</td><td style={tdStyle}>SD ÷ Mean × 100</td></tr>
          </tbody>
        </table>
      </div>
      <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={sectionTitle}>3. การกระจายตัวของข้อมูล (Quartile)</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={{ ...thStyle, textAlign: 'left' }}>ตำแหน่ง</th><th style={{ ...thStyle, textAlign: 'right', width: '120px' }}>ค่า (กก.)</th><th style={{ ...thStyle, textAlign: 'left', width: '260px' }}>ความหมาย</th></tr></thead>
          <tbody>
            <tr><td style={tdStyle}>ต่ำสุด (Min)</td><td style={{ ...tdStyle, textAlign: 'right' }}>{stats.min.toFixed(2)}</td><td style={tdStyle}>ค่าน้อยที่สุด</td></tr>
            <tr><td style={tdStyle}>Q1 (Quartile 1)</td><td style={{ ...tdStyle, textAlign: 'right' }}>{stats.q1.toFixed(2)}</td><td style={tdStyle}>25% ของข้อมูลต่ำกว่านี้</td></tr>
            <tr><td style={tdStyle}>Q2 (มัธยฐาน)</td><td style={{ ...tdStyle, textAlign: 'right' }}>{stats.median.toFixed(2)}</td><td style={tdStyle}>50% ของข้อมูล</td></tr>
            <tr><td style={tdStyle}>Q3 (Quartile 3)</td><td style={{ ...tdStyle, textAlign: 'right' }}>{stats.q3.toFixed(2)}</td><td style={tdStyle}>75% ของข้อมูลต่ำกว่านี้</td></tr>
            <tr><td style={tdStyle}>สูงสุด (Max)</td><td style={{ ...tdStyle, textAlign: 'right' }}>{stats.max.toFixed(2)}</td><td style={tdStyle}>ค่ามากที่สุด</td></tr>
            <tr><td style={tdStyle}>พิสัยระหว่างควอไทล์ (IQR)</td><td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{stats.iqr.toFixed(2)}</td><td style={tdStyle}>Q3 − Q1</td></tr>
          </tbody>
        </table>
      </div>
      <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={sectionTitle}>4. สถิติแยกตามประเภทวัน</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={{ ...thStyle, textAlign: 'left' }}>ประเภทวัน</th><th style={{ ...thStyle, textAlign: 'right' }}>จำนวน (ครั้ง)</th><th style={{ ...thStyle, textAlign: 'right' }}>รวม (กก.)</th><th style={{ ...thStyle, textAlign: 'right' }}>เฉลี่ย (กก.)</th><th style={{ ...thStyle, textAlign: 'right' }}>ต่ำสุด</th><th style={{ ...thStyle, textAlign: 'right' }}>สูงสุด</th></tr></thead>
          <tbody>
            {DAY_TYPES.map(dt => {
              const t = stats.byType[dt.value];
              if (!t) return null;
              return (<tr key={dt.value}><td style={tdStyle}>{dt.sym} {dt.label}</td><td style={{ ...tdStyle, textAlign: 'right' }}>{t.count}</td><td style={{ ...tdStyle, textAlign: 'right' }}>{t.total.toFixed(2)}</td><td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{t.avg.toFixed(2)}</td><td style={{ ...tdStyle, textAlign: 'right' }}>{t.min.toFixed(2)}</td><td style={{ ...tdStyle, textAlign: 'right' }}>{t.max.toFixed(2)}</td></tr>);
            })}
          </tbody>
        </table>
      </div>
      {Object.keys(stats.byMonth).length > 1 && (
        <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div style={sectionTitle}>5. สถิติรายเดือน</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ ...thStyle, textAlign: 'left' }}>เดือน / ปี</th><th style={{ ...thStyle, textAlign: 'right' }}>จำนวนครั้ง</th><th style={{ ...thStyle, textAlign: 'right' }}>น้ำหนักรวม (กก.)</th><th style={{ ...thStyle, textAlign: 'right' }}>เฉลี่ย/ครั้ง (กก.)</th></tr></thead>
            <tbody>
              {Object.entries(stats.byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([key, data]: [string, any]) => {
                const [y, m] = key.split('-');
                return (<tr key={key}><td style={tdStyle}>{MONTHS_TH[parseInt(m) - 1]} {parseInt(y) + 543}</td><td style={{ ...tdStyle, textAlign: 'right' }}>{data.count}</td><td style={{ ...tdStyle, textAlign: 'right' }}>{data.total.toFixed(2)}</td><td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{data.avg.toFixed(2)}</td></tr>);
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={sectionTitle}>6. สรุปภาพรวม</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
          <tbody>
            <tr><td style={infoLabel}>ปริมาตรรวม</td><td style={infoColon}>:</td><td style={infoValue}>{stats.totalM3.toFixed(3)} ลบ.ม.</td></tr>
            <tr><td style={infoLabel}>น้ำหนักรวม</td><td style={infoColon}>:</td><td style={infoValue}>{stats.totalKg.toFixed(2)} กก. ({(stats.totalKg / 1000).toFixed(3)} ตัน)</td></tr>
            <tr><td style={infoLabel}>ความหนาแน่นเฉลี่ย</td><td style={infoColon}>:</td><td style={infoValue}>{stats.avgDensity.toFixed(2)} กก./ลบ.ม.</td></tr>
            <tr><td style={infoLabel}>แนวโน้ม (ครึ่งแรก → ครึ่งหลัง)</td><td style={infoColon}>:</td><td style={{ ...infoValue, color: stats.trendPct > 0 ? '#c53030' : '#065f46' }}>{stats.firstAvg.toFixed(2)} กก. → {stats.secondAvg.toFixed(2)} กก. ({stats.trendPct > 0 ? '↑ เพิ่มขึ้น' : '↓ ลดลง'} {Math.abs(stats.trendPct).toFixed(2)}%)</td></tr>
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px dashed #94a3b8', pageBreakInside: 'avoid' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', textAlign: 'center', fontSize: '14px' }}>
          <div><div style={{ marginBottom: '60px' }}>ลงชื่อ ....................................................</div><div>( .................................................... )</div><div style={{ color: '#334155' }}>ผู้จัดทำรายงาน</div><div style={{ color: '#334155', marginTop: '4px', fontSize: '13px' }}>วันที่ ......... / ......... / .........</div></div>
          <div><div style={{ marginBottom: '60px' }}>ลงชื่อ ....................................................</div><div>( .................................................... )</div><div style={{ color: '#334155' }}>ผู้ตรวจสอบ / อนุมัติ</div><div style={{ color: '#334155', marginTop: '4px', fontSize: '13px' }}>วันที่ ......... / ......... / .........</div></div>
        </div>
      </div>
      <div style={{ marginTop: '30px', paddingTop: '10px', textAlign: 'center', fontSize: '11px', color: '#64748b', borderTop: '1px solid #cbd5e0' }}>รายงานนี้สร้างโดยระบบ TWT Waste Predict · เทศบาลตำบลท่าวังทอง</div>
    </div>
  );
}

function CalcReport({ siteName, siteType, fromLabel, toLabel, result, records }: any) {
  const today = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  const totalVolume = records.reduce((s: number, r: any) => s + (r.volume_m3 || 0), 0);
  const totalWeight = records.reduce((s: number, r: any) => s + (r.weight_kg || 0), 0);
  const avgDensity = totalVolume > 0 ? totalWeight / totalVolume : 0;
  const keepTogether: React.CSSProperties = { pageBreakInside: 'avoid', breakInside: 'avoid' };

  return (
    <div className="print-calc-only print-calc bg-white p-8 md:p-12 text-slate-900" style={{ fontSize: '15px', lineHeight: '1.8' }}>
      <div className="text-center mb-8" style={keepTogether}>
        <img src="/logo.png" alt="logo" className="w-24 h-24 mx-auto mb-3 object-contain" onError={e => ((e.target as HTMLImageElement).style.display = 'none')} />
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#065f46' }}>เทศบาลตำบลท่าวังทอง</div>
        <div style={{ fontSize: '14px', color: '#334155' }}>กองสาธารณสุขและสิ่งแวดล้อม</div>
        <div style={{ fontSize: '14px', color: '#334155', marginTop: '2px' }}>อำเภอเมืองพะเยา จังหวัดพะเยา</div>
      </div>
      <div className="text-center mb-8" style={keepTogether}>
        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#065f46', letterSpacing: '1px' }}>รายงานพยากรณ์ปริมาณขยะมูลฝอย</div>
        <div style={{ fontSize: '16px', color: '#334155', marginTop: '4px' }}>ประจำปีงบประมาณ</div>
      </div>
      <table className="w-full mb-8" style={{ fontSize: '15px', ...keepTogether }}>
        <tbody>
          <tr><td style={{ width: '180px', padding: '4px 0' }}>สถานที่เก็บขยะ</td><td style={{ width: '20px' }}>:</td><td style={{ fontWeight: 'bold' }}>{siteName}</td></tr>
          <tr><td style={{ padding: '4px 0' }}>ประเภทสถานประกอบการ</td><td>:</td><td>{siteType}</td></tr>
          <tr><td style={{ padding: '4px 0' }}>ช่วงเวลาที่ใช้ข้อมูล</td><td>:</td><td>{fromLabel} ถึง {toLabel}</td></tr>
          <tr><td style={{ padding: '4px 0' }}>จำนวนครั้งที่บันทึก</td><td>:</td><td>{records.length} ครั้ง</td></tr>
          <tr><td style={{ padding: '4px 0' }}>วันที่จัดทำรายงาน</td><td>:</td><td>{today}</td></tr>
        </tbody>
      </table>
      <div className="text-center py-6 mb-8" style={{ borderTop: '2px solid #065f46', borderBottom: '2px solid #065f46', backgroundColor: '#f0fdf4', ...keepTogether }}>
        <div style={{ fontSize: '15px', color: '#334155' }}>ปริมาณขยะมูลฝอยที่พยากรณ์ใน 1 ปี</div>
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#065f46', lineHeight: '1.2', margin: '8px 0' }}>{result.yearKg.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#065f46' }}>กิโลกรัมต่อปี</div>
        <div style={{ fontSize: '15px', color: '#334155', marginTop: '8px' }}>คิดเป็น {(result.yearKg / 1000).toFixed(2)} ตันต่อปี หรือเฉลี่ย {result.monthKg.toLocaleString('th-TH', { maximumFractionDigits: 0 })} กิโลกรัมต่อเดือน</div>
      </div>
      <div className="mb-8">
        <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#065f46', marginBottom: '12px', pageBreakAfter: 'avoid', breakAfter: 'avoid' }}>สูตรการคำนวณและการแทนค่า</div>
        <div className="mb-5" style={keepTogether}>
          <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '4px' }}>1. การแปลงปริมาตรเป็นน้ำหนัก</div>
          <div style={{ paddingLeft: '20px', fontSize: '15px' }}>
            <div>สูตร: W = V × ρ</div>
            <div>ความหมาย: น้ำหนัก (กก.) = ปริมาตร (ลบ.ม.) × ความหนาแน่น (กก./ลบ.ม.)</div>
            <div style={{ marginTop: '6px', color: '#065f46', fontWeight: 'bold' }}>ข้อมูลที่ใช้: ปริมาตรรวม = {totalVolume.toFixed(3)} ลบ.ม. | น้ำหนักรวม = {totalWeight.toFixed(2)} กก. | ความหนาแน่นเฉลี่ย = {avgDensity.toFixed(2)} กก./ลบ.ม.</div>
          </div>
        </div>
        <div className="mb-5" style={keepTogether}>
          <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '4px' }}>2. การหาค่าเฉลี่ยต่อครั้งของแต่ละประเภทวัน</div>
          <div style={{ paddingLeft: '20px', fontSize: '15px' }}>
            <div>สูตร: W̄ = (W₁ + W₂ + ... + Wₙ) ÷ n</div>
            <ul style={{ paddingLeft: '24px', marginTop: '4px' }}>
              {result.breakdown.map((b: any) => (<li key={b.type} style={{ fontSize: '15px' }}>{b.label}: {b.count} ครั้ง → เฉลี่ย <b>{b.avgKg.toFixed(2)}</b> กก./ครั้ง</li>))}
            </ul>
          </div>
        </div>
        <div className="mb-5" style={keepTogether}>
          <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '4px' }}>3. การพยากรณ์ปริมาณขยะรายปี</div>
          <div style={{ paddingLeft: '20px', fontSize: '15px' }}>
            <div>สูตร: W_ปี = Σ(W_ประเภท × D_ประเภท)</div>
            <table className="w-full mt-2" style={{ fontSize: '14px' }}>
              <tbody>
                {result.breakdown.map((b: any) => (
                  <tr key={b.type}><td style={{ padding: '2px 0', width: '40%' }}>{b.label}</td><td style={{ padding: '2px 0' }}>= {b.avgKg.toFixed(2)} กก./วัน × {b.daysPerYear} วัน</td><td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 'bold' }}>= {b.totalKg.toLocaleString('th-TH', { maximumFractionDigits: 0 })} กก.</td></tr>
                ))}
                <tr style={{ borderTop: '1px solid #065f46' }}><td style={{ padding: '6px 0', fontWeight: 'bold' }}>รวมทั้งปี</td><td></td><td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 'bold', color: '#065f46', fontSize: '15px' }}>= {result.yearKg.toLocaleString('th-TH', { maximumFractionDigits: 0 })} กก.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="mb-5" style={keepTogether}>
          <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '4px' }}>4. การหาค่าเฉลี่ยต่อเดือน</div>
          <div style={{ paddingLeft: '20px', fontSize: '15px' }}>
            <div>สูตร: W_เดือน = W_ปี ÷ 12</div>
            <div style={{ marginTop: '4px', color: '#065f46', fontWeight: 'bold', fontSize: '16px' }}>= {result.monthKg.toLocaleString('th-TH', { maximumFractionDigits: 2 })} กก./เดือน</div>
          </div>
        </div>
      </div>
      <div className="mb-10" style={keepTogether}>
        <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#065f46', marginBottom: '8px' }}>ตารางสรุปรายละเอียดการคำนวณ</div>
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '14px', border: '1.5px solid #065f46' }}>
          <thead><tr style={{ backgroundColor: '#ecfdf5' }}><th style={{ border: '1px solid #065f46', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>ประเภทวัน</th><th style={{ border: '1px solid #065f46', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>จำนวนครั้ง</th><th style={{ border: '1px solid #065f46', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>น้ำหนักเฉลี่ย/ครั้ง (กก.)</th><th style={{ border: '1px solid #065f46', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>จำนวนวัน/ปี</th><th style={{ border: '1px solid #065f46', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>รวม (กก.)</th></tr></thead>
          <tbody>
            {result.breakdown.map((b: any) => (
              <tr key={b.type}>
                <td style={{ border: '1px solid #065f46', padding: '8px' }}>{b.label}</td>
                <td style={{ border: '1px solid #065f46', padding: '8px', textAlign: 'center' }}>{b.count}</td>
                <td style={{ border: '1px solid #065f46', padding: '8px', textAlign: 'right' }}>{b.avgKg.toFixed(2)}</td>
                <td style={{ border: '1px solid #065f46', padding: '8px', textAlign: 'center' }}>{b.daysPerYear}</td>
                <td style={{ border: '1px solid #065f46', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{b.totalKg.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</td>
              </tr>
            ))}
            <tr style={{ backgroundColor: '#ecfdf5', fontWeight: 'bold' }}><td style={{ border: '1px solid #065f46', padding: '8px' }} colSpan={4}>รวมทั้งปี</td><td style={{ border: '1px solid #065f46', padding: '8px', textAlign: 'right', color: '#065f46', fontSize: '16px' }}>{result.yearKg.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="mt-16 pt-8" style={{ borderTop: '1px dashed #94a3b8', ...keepTogether }}>
        <div className="grid grid-cols-2 gap-16" style={{ fontSize: '15px' }}>
          <div className="text-center"><div style={{ marginBottom: '60px' }}>ลงชื่อ ....................................................</div><div>( .................................................... )</div><div style={{ fontSize: '14px', color: '#334155' }}>ผู้จัดทำรายงาน</div><div style={{ fontSize: '14px', color: '#334155', marginTop: '4px' }}>วันที่ ......... / ......... / .........</div></div>
          <div className="text-center"><div style={{ marginBottom: '60px' }}>ลงชื่อ ....................................................</div><div>( .................................................... )</div><div style={{ fontSize: '14px', color: '#334155' }}>ผู้ตรวจสอบ / อนุมัติ</div><div style={{ fontSize: '14px', color: '#334155', marginTop: '4px' }}>วันที่ ......... / ......... / .........</div></div>
        </div>
      </div>
      <div className="mt-10 pt-4 text-center" style={{ fontSize: '12px', color: '#64748b', borderTop: '1px solid #cbd5e0' }}>รายงานนี้สร้างโดยระบบ TWT Waste Predict · เทศบาลตำบลท่าวังทอง</div>
    </div>
  );
}