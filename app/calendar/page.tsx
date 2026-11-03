'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Building2, TrendingUp, Weight, Calendar as Cal,
  Pencil, Trash2, X, Camera, Shield, Loader2, Search
} from 'lucide-react';
import { useRecords } from '@/lib/hooks';
import { fetchSites } from '@/lib/sites';
import { SITE_TYPES, MONTHS_TH, MONTHS_TH_SHORT, DAY_HEADS, DAY_TYPES } from '@/lib/constants';
import { deleteRecord } from '@/lib/supabase';
import { getSession, ownsRecord, type Session } from '@/lib/session';
import type { WasteRecord, Site } from '@/lib/types';
import AnimatedNumber from '@/components/AnimatedNumber';
import PinPrompt from '@/components/PinPrompt';

type ViewMode = 'single' | 'range';

export default function CalendarPage() {
  const { records, reload } = useRecords();
  const [sites, setSites] = useState<Site[]>([]);
  const [siteFilter, setSiteFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const now = new Date();
  const [fromMonth, setFromMonth] = useState(now.getMonth());
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth());
  const [toYear, setToYear] = useState(now.getFullYear());

  const [detail, setDetail] = useState<{ date: string; records: WasteRecord[]; } | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) { window.location.href = '/'; return; }
    setSession(s);
    setSessionReady(true);
  }, []);

  useEffect(() => { fetchSites().then(setSites).catch(console.error); }, []);

  const isStaff = session?.role === 'staff';

  const requireAuth = (action: () => void) => {
    if (isStaff) { action(); return; }
    setPendingAction(() => action);
    setPinOpen(true);
  };

  const handlePinSuccess = () => {
    setPinOpen(false);
    if (pendingAction) { pendingAction(); setPendingAction(null); }
  };

  // ⭐ 1. เพิ่ม useEffect เพื่อให้ Dropdown เปลี่ยนตามชื่อสถานที่ที่พิมพ์ค้นหา
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    
    const matchedSite = sites.find(s => s.name.toLowerCase().includes(q));
    if (matchedSite && matchedSite.id !== siteFilter) {
      setSiteFilter(matchedSite.id);
    }
  }, [searchQuery, sites, siteFilter]);

  // ⭐ 2. แก้ Logic การกรองข้อมูลให้ยึดตาม Dropdown เป็นหลัก
  const byDate = useMemo(() => {
    const map: Record<string, WasteRecord[]> = {};
    const query = searchQuery.trim().toLowerCase();

    records.forEach(r => {
      if (!isStaff && !ownsRecord(r)) return;

      // กรองตาม Dropdown สถานที่ที่เลือก
      if (siteFilter !== 'all' && r.site_id !== siteFilter) return;

      // กรองตามคำค้นหา (ค้นหาชื่อคน, หมายเหตุ, หรือชื่อสถานที่)
      if (query) {
        const site = sites.find(s => s.id === r.site_id);
        const siteName = site?.name?.toLowerCase() || '';
        const userName = r.user_name?.toLowerCase() || '';
        const note = r.note?.toLowerCase() || '';
        
        if (!siteName.includes(query) && !userName.includes(query) && !note.includes(query)) {
          return;
        }
      }

      const key = (r.record_date || '').slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [records, siteFilter, isStaff, searchQuery, sites]);

  const monthsToShow = useMemo(() => {
    if (viewMode === 'single') return [{ year, month }];
    const result: { year: number; month: number }[] = [];
    let y = fromYear; let m = fromMonth;
    const fromVal = fromYear * 12 + fromMonth;
    const toVal = toYear * 12 + toMonth;
    if (fromVal > toVal) return [];
    while (y < toYear || (y === toYear && m <= toMonth)) {
      result.push({ year: y, month: m });
      m++;
      if (m > 11) { m = 0; y++; }
    }
    return result;
  }, [viewMode, year, month, fromYear, fromMonth, toYear, toMonth]);

  const totalStats = useMemo(() => {
    let vol = 0, kg = 0, days = 0, daysInRange = 0;
    monthsToShow.forEach(({ year: y, month: m }) => {
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      daysInRange += daysInMonth;
      for (let d = 1; d <= daysInMonth; d++) {
        const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const recs = byDate[key] || [];
        if (recs.length) {
          days++;
          vol += recs.reduce((s, r) => s + r.volume_m3, 0);
          kg += recs.reduce((s, r) => s + r.weight_kg, 0);
        }
      }
    });
    return { vol, kg, days, daysInRange };
  }, [monthsToShow, byDate]);

  const prev = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); };
  const today = () => { setMonth(new Date().getMonth()); setYear(new Date().getFullYear()); };
  const setRangeCurrentYear = () => { setFromMonth(0); setFromYear(now.getFullYear()); setToMonth(11); setToYear(now.getFullYear()); };

  if (!sessionReady || !session) {
    return (<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>);
  }

  return (
    <>
      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-4">
        <aside className="no-print lg:col-span-4 xl:col-span-3 space-y-3 lg:sticky lg:top-3 lg:self-start lg:max-h-[calc(100vh-1.5rem)] lg:overflow-y-auto lg:pr-1">
          
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100/60">
            <label className="flex items-center gap-2 text-label mb-2.5">
              <Search className="w-4 h-4" /> ค้นหาข้อมูล
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ค้นหาสถานที่, ชื่อ, หมายเหตุ..."
                className="w-full pl-10 pr-10 py-3 text-base bg-emerald-50/50 border-2 border-emerald-100 rounded-xl focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition-all text-emerald-900"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 hover:bg-emerald-200">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100/60">
            <label className="flex items-center gap-2 text-label mb-2.5">
              <Building2 className="w-4 h-4" /> กรองตามสถานที่
            </label>
            <select
              className="w-full px-4 py-3 text-base font-semibold bg-emerald-50/50 border-2 border-emerald-100 rounded-xl focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition-all text-emerald-900"
              value={siteFilter}
              onChange={e => setSiteFilter(e.target.value)}
            >
              <option value="all">📊 ทั้งหมด</option>
              {sites.map(s => {
                const t = SITE_TYPES.find(st => st.id === s.type);
                return (<option key={s.id} value={s.id}>{t?.icon || '📍'} {s.name}</option>);
              })}
            </select>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-1.5 shadow-sm border border-emerald-100/60">
            <div className="grid grid-cols-2 gap-1">
              {(['single', 'range'] as const).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)} className={`py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${viewMode === mode ? 'bg-gradient-to-br from-emerald-700 to-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                  <Cal className="w-4 h-4" /> {mode === 'single' ? 'เดือนเดียว' : 'ช่วงเดือน'}
                </button>
              ))}
            </div>
          </motion.div>

          {viewMode === 'single' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100/60">
              <div className="flex items-center justify-between mb-3">
                <motion.button whileTap={{ scale: 0.9 }} onClick={prev} className="w-10 h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 flex items-center justify-center transition-all"><ChevronLeft className="w-5 h-5 text-emerald-700" /></motion.button>
                <AnimatePresence mode="wait">
                  <motion.h2 key={`${year}-${month}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="text-lg font-black text-emerald-800">{MONTHS_TH[month]} {year + 543}</motion.h2>
                </AnimatePresence>
                <motion.button whileTap={{ scale: 0.9 }} onClick={next} className="w-10 h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 flex items-center justify-center transition-all"><ChevronRight className="w-5 h-5 text-emerald-700" /></motion.button>
              </div>
              <button onClick={today} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-600 text-white text-sm font-bold shadow-md shadow-emerald-200 active:scale-[0.98] transition-all">กลับไปวันนี้</button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100/60 space-y-3">
              <div className="flex items-center justify-between"><span className="text-sm font-black text-emerald-900">เลือกช่วงเดือน</span><button onClick={setRangeCurrentYear} className="text-xs font-bold text-emerald-700 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100">ปีนี้ทั้งปี</button></div>
              <div className="grid grid-cols-1 gap-2">
                {(['from', 'to'] as const).map(which => {
                  const m = which === 'from' ? fromMonth : toMonth;
                  const y = which === 'from' ? fromYear : toYear;
                  const setM = which === 'from' ? setFromMonth : setToMonth;
                  const setY = which === 'from' ? setFromYear : setToYear;
                  return (
                    <div key={which} className="p-2.5 rounded-xl bg-emerald-50/50">
                      <div className="text-xs font-bold text-emerald-600 mb-1.5">{which === 'from' ? 'ตั้งแต่' : 'ถึง'}</div>
                      <div className="flex gap-1.5">
                        <select value={m} onChange={e => setM(parseInt(e.target.value))} className="flex-1 px-2.5 py-2 text-sm font-bold bg-white rounded-lg border border-emerald-100 focus:outline-none focus:border-emerald-600">
                          {MONTHS_TH_SHORT.map((mn, i) => (<option key={i} value={i}>{mn}</option>))}
                        </select>
                        <select value={y} onChange={e => setY(parseInt(e.target.value))} className="w-24 px-2 py-2 text-sm font-bold bg-white rounded-lg border border-emerald-100 focus:outline-none focus:border-emerald-600">
                          {[2023, 2024, 2025, 2026, 2027].map(yr => (<option key={yr} value={yr}>{yr + 543}</option>))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-emerald-600 text-center pt-1 border-t border-emerald-100">📊 {monthsToShow.length} เดือน</div>
            </motion.div>
          )}

          {monthsToShow.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-emerald-700 to-emerald-600 rounded-2xl p-4 text-white shadow-lg shadow-emerald-200/50">
              <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4" /><h3 className="text-sm font-black">{viewMode === 'single' ? 'สรุปเดือนนี้' : `สรุป ${monthsToShow.length} เดือน`}</h3></div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm bg-white/10 rounded-xl px-3 py-2.5"><span className="opacity-85 flex items-center gap-1.5"><Cal className="w-3.5 h-3.5" /> วันที่บันทึก</span><span className="text-number-sm">{totalStats.days}/{totalStats.daysInRange}</span></div>
                <div className="flex items-center justify-between text-sm bg-white/10 rounded-xl px-3 py-2.5"><span className="opacity-85 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> ปริมาตร</span><span className="text-number-sm"><AnimatedNumber value={totalStats.vol} decimals={1} /> ม³</span></div>
                <div className="flex items-center justify-between text-sm bg-white/10 rounded-xl px-3 py-2.5"><span className="opacity-85 flex items-center gap-1.5"><Weight className="w-3.5 h-3.5" /> น้ำหนัก</span><span className="text-number-sm"><AnimatedNumber value={totalStats.kg} decimals={0} /> กก.</span></div>
              </div>
            </motion.div>
          )}
        </aside>

        <section className="lg:col-span-8 xl:col-span-9 space-y-4">
          {monthsToShow.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 shadow-sm border border-emerald-100/60 text-center">
              <div className="text-5xl mb-3">📅</div>
              <p className="font-bold text-emerald-900">ช่วงเดือนไม่ถูกต้อง</p>
              <p className="text-sm text-emerald-600 mt-1">กรุณาเลือกช่วงเวลาใหม่</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {monthsToShow.map(({ year: y, month: m }) => (
                <CalendarMonth key={`${y}-${m}`} year={y} month={m} byDate={byDate} onDayClick={(dateKey, recs) => setDetail({ date: dateKey, records: recs })} />
              ))}
            </AnimatePresence>
          )}
        </section>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setDetail(null)}>
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} onClick={e => e.stopPropagation()} className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-emerald-100 px-5 py-4 flex items-center justify-between rounded-t-3xl z-10">
                <h3 className="text-card-title">📅 {detail.date.split('-').reverse().join('/')}</h3>
                <button onClick={() => setDetail(null)} className="w-9 h-9 rounded-full bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-700 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-2">
                {detail.records.map((r, i) => {
                  const site = sites.find(s => s.id === r.site_id);
                  const siteType = site ? SITE_TYPES.find(t => t.id === site.type) : null;
                  const dt = DAY_TYPES.find(d => d.value === r.prev_day_type);
                  const sourceLabel = ({ bin: '🗑️ ถัง', area: '📐 พื้นที่', mixed: '🔄 ถัง+พื้นที่' } as Record<string, string>)[r.measurement_source as string] || '🗑️';
                  const isMine = ownsRecord(r);
                  return (
                    <motion.div key={r.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-100/60">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-bold text-emerald-900">{siteType?.icon || '📍'} {site?.name || 'ไม่ระบุ'}{!isStaff && isMine && (<span className="inline-block text-[10px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded ml-1 align-middle">ของฉัน</span>)}</div>
                          <div className="text-hint mt-0.5">{dt?.label} · {sourceLabel} · {r.user_name}</div>
                          {r.bins_json && r.bins_json.length > 0 && (<div className="text-xs text-emerald-600 font-mono mt-1">🧺 {r.bins_json.map(b => `${b.size_liters}L×${b.count}`).join(' + ')}</div>)}
                          {r.area_width && (<div className="text-xs text-emerald-600 font-mono mt-0.5">📐 {r.area_width}×{r.area_length}×{r.area_height} ม.{r.area_fill != null && r.area_fill < 100 && ` (${r.area_fill}%)`}</div>)}
                          {r.note && (<div className="text-xs text-emerald-500 italic mt-1">📝 {r.note}</div>)}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-number text-emerald-700">{r.volume_m3.toFixed(4)}<span className="text-xs ml-1">ม³</span></div>
                          <div className="text-number-sm text-emerald-600 mt-0.5">{r.weight_kg.toFixed(2)}<span className="text-[10px] ml-1">กก.</span></div>
                        </div>
                      </div>
                      {r.photo_url && (
                        <button type="button" onClick={e => { e.stopPropagation(); setPhotoPreview(r.photo_url); }} className="block w-full mt-2 relative active:opacity-80 transition-opacity cursor-zoom-in">
                          <div className="rounded-xl overflow-hidden border-2 border-emerald-300"><img src={r.photo_url} alt="หลักฐาน" className="w-full max-h-48 object-cover" /></div>
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg pointer-events-none"><Camera className="w-3.5 h-3.5" /> ดูรูปใหญ่</div>
                        </button>
                      )}
                      <div className="flex gap-2 mt-2.5">
                        <button onClick={() => { requireAuth(() => { window.location.href = `/record?edit=${r.id}`; }); }} className="flex-1 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-emerald-100 active:scale-[0.98] transition-all"><Pencil className="w-3.5 h-3.5" /> แก้ไข</button>
                        <button onClick={() => { requireAuth(async () => { if (!confirm('ลบข้อมูลนี้?')) return; try { await deleteRecord(r.id); setDetail(null); reload(); } catch (err) { alert('ลบไม่สำเร็จ: ' + (err as Error).message); } }); }} className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-red-100 active:scale-[0.98] transition-all"><Trash2 className="w-3.5 h-3.5" /> ลบ</button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Lightbox */}
      <AnimatePresence>
        {photoPreview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPhotoPreview(null)}>
            <button onClick={() => setPhotoPreview(null)} className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-white flex items-center justify-center transition-all active:scale-95 z-10" aria-label="ปิด"><X className="w-5 h-5" strokeWidth={2.5} /></button>
            <motion.img initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} src={photoPreview} alt="หลักฐาน" onClick={e => e.stopPropagation()} className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-xs font-bold bg-white/10 backdrop-blur px-4 py-2 rounded-full pointer-events-none">คลิกพื้นหลังเพื่อปิด</div>
          </motion.div>
        )}
      </AnimatePresence>

      <PinPrompt open={pinOpen} title="ยืนยัน PIN ของคุณ" pinLength={4} expectedHash={session?.pinHash} onSuccess={handlePinSuccess} onClose={() => { setPinOpen(false); setPendingAction(null); }} />
    </>
  );
}

function CalendarMonth({ year, month, byDate, onDayClick }: { year: number; month: number; byDate: Record<string, WasteRecord[]>; onDayClick: (dateKey: string, records: WasteRecord[]) => void; }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDate = new Date();

  let daysWithData = 0; let monthKg = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const recs = byDate[key] || [];
    if (recs.length) { daysWithData++; monthKg += recs.reduce((s, r) => s + r.weight_kg, 0); }
  }

  const numRows = Math.ceil((firstDay + daysInMonth) / 7);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white rounded-3xl p-4 lg:p-3 shadow-sm border border-emerald-100/60 lg:h-full lg:flex lg:flex-col lg:min-h-0">
      <div className="flex items-center justify-between mb-3 pb-2.5 lg:mb-2 lg:pb-2 border-b-2 border-emerald-100 shrink-0">
        <h2 className="text-section-title">{MONTHS_TH[month]} {year + 543}</h2>
        <div className="text-right"><div className="text-hint font-bold">{daysWithData}/{daysInMonth} วัน</div><div className="text-number-sm text-emerald-700 mt-0.5">{monthKg.toFixed(0)} กก.</div></div>
      </div>
      <div className="grid grid-cols-7 gap-1 rounded-2xl overflow-hidden border-2 border-emerald-200 lg:flex-1 lg:min-h-0" style={{ gridTemplateRows: `auto repeat(${numRows}, minmax(0, 1fr))` }}>
        {DAY_HEADS.map((h, i) => (
          <div key={h} className={`text-center font-black text-sm py-2 bg-emerald-50 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-purple-500' : 'text-emerald-800'}`}>{h}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (<div key={`e-${i}`} className="bg-emerald-50/30 min-h-[68px] lg:min-h-0" />))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const recs = byDate[key] || [];
          const dow = (firstDay + i) % 7;
          const isSun = dow === 0; const isSat = dow === 6;
          const isToday = year === todayDate.getFullYear() && month === todayDate.getMonth() && d === todayDate.getDate();

          const vol = recs.reduce((s, r) => s + r.volume_m3, 0);
          const kg = recs.reduce((s, r) => s + r.weight_kg, 0);
          const mainType = recs[0]?.prev_day_type || 'normal';
          const dtInfo = DAY_TYPES.find(dt => dt.value === mainType);
          const hasPhoto = recs.some(r => r.photo_url);

          return (
            <motion.div key={key} whileHover={recs.length ? { scale: 1.03, zIndex: 5 } : {}} onClick={() => recs.length && onDayClick(key, recs)} className={`min-h-[68px] lg:min-h-0 p-2 lg:p-1.5 relative flex flex-col transition-all duration-200 ${recs.length ? 'cursor-pointer hover:bg-emerald-50' : ''} ${isToday ? 'bg-amber-50 ring-2 ring-amber-300 ring-inset' : recs.length ? isSun ? 'bg-red-50/60' : isSat ? 'bg-purple-50/60' : 'bg-white' : isSun ? 'bg-red-50/30' : isSat ? 'bg-purple-50/30' : 'bg-white'}`}>
              <div className={`text-base lg:text-sm font-black leading-none flex justify-between items-center ${isSun ? 'text-red-500' : isSat ? 'text-purple-500' : 'text-slate-700'}`}>
                {d} {isToday && <span className="w-2 h-2 rounded-full bg-amber-500" />}
              </div>
              {recs.length > 0 && (
                <div className="mt-auto">
                  {recs.length > 1 && (<div className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-sm">{recs.length}</div>)}
                  <div className="text-[10px] lg:text-[9px] font-black px-1.5 py-0.5 rounded inline-block mb-1" style={{ background: dtInfo?.color, color: '#4a5568' }}>{dtInfo?.label}</div>
                  <div className="text-xs lg:text-[11px] font-black text-emerald-700 tabular leading-tight">{vol.toFixed(2)} ม³</div>
                  <div className="text-[11px] lg:text-[10px] text-emerald-600 font-bold tabular leading-tight">{kg.toFixed(0)} กก.</div>
                  {hasPhoto && (<div className="absolute bottom-1 right-1 text-[11px] lg:text-[10px]">📷</div>)}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}