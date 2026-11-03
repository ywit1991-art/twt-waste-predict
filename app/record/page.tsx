'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  User,
  Trash2,
  Plus,
  Check,
  Loader2,
  Weight,
  Boxes,
  Building2,
  Camera,
  Image as ImageIcon,
  X,
  Pencil,
  Ruler,
  Layers
} from 'lucide-react';
import {
  SITE_TYPES,
  DENSITY_HINTS,
  DAY_TYPES,
  BIN_SIZES,
} from '@/lib/constants';
import type { DayType, BinItem, Site } from '@/lib/types';
import {
  insertRecord,
  updateRecord,
  fetchRecordById,
  uploadPhoto
} from '@/lib/supabase';
import { fetchSites } from '@/lib/sites';
import { getSession, type Session } from '@/lib/session';
import AnimatedNumber from '@/components/AnimatedNumber';
import SitePicker from '@/components/SitePicker';

type MeasureMethod = 'bins' | 'area' | 'both';

interface BinRowState extends BinItem {
  id: number;
  custom: string;
  isCustom: boolean;
}

function RecordPageInner() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const [sites, setSites] = useState<Site[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [siteId, setSiteId] = useState('');
  const [showSitePicker, setShowSitePicker] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [userName, setUserName] = useState('');
  const [dayType, setDayType] = useState<DayType>('normal');
  const [density, setDensity] = useState(250);
  const [note, setNote] = useState('');

  const [method, setMethod] = useState<MeasureMethod>('bins');

  const [bins, setBins] = useState<BinRowState[]>([
    { id: 1, size_liters: 120, count: 1, custom: '', isCustom: false }
  ]);
  const [rowId, setRowId] = useState(2);

  const [areaWidth, setAreaWidth] = useState(1);
  const [areaLength, setAreaLength] = useState(1);
  const [areaHeight, setAreaHeight] = useState(0.5);
  const [areaFill, setAreaFill] = useState(100);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEditMode = !!editId;

  /* ═══ Session Guard ═══ */
  useEffect(() => {
    const s = getSession();
    if (!s) {
      window.location.href = '/';
      return;
    }
    // ⭐ staff เข้าได้เฉพาะตอนแก้ไข (?edit=xxx)
    const isEdit = new URLSearchParams(window.location.search).get('edit');
    if (s.role === 'staff' && !isEdit) {
      window.location.href = '/calendar';
      return;
    }
    setSession(s);
    setUserName(s.name);
    setSessionReady(true);
  }, []);

  /* ═══ Load edit record ═══ */
  useEffect(() => {
    if (!editId || !sessionReady) return;
    const loadEdit = async () => {
      try {
        const record = await fetchRecordById(editId);
        if (!record) {
          alert('ไม่พบข้อมูลที่ต้องการแก้ไข');
          window.location.href = '/calendar';
          return;
        }
        if (
          session?.role === 'recorder' &&
          record.user_name?.trim().toLowerCase() !==
            session.name.trim().toLowerCase()
        ) {
          alert('คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้');
          window.location.href = '/calendar';
          return;
        }
        setSiteId(record.site_id || '');
        setDate(record.record_date);
        setDayType(record.prev_day_type as DayType);
        setDensity(record.density);
        setNote(record.note || '');

        const src = record.measurement_source;
        if (src === 'mixed') setMethod('both');
        else if (src === 'area') setMethod('area');
        else setMethod('bins');

        if (record.bins_json && record.bins_json.length > 0) {
          setBins(
            record.bins_json.map((b, i) => ({
              id: i + 1,
              size_liters: b.size_liters,
              count: b.count,
              custom: '',
              isCustom: false
            }))
          );
          setRowId(record.bins_json.length + 1);
        }

        if (record.area_width) setAreaWidth(Number(record.area_width));
        if (record.area_length) setAreaLength(Number(record.area_length));
        if (record.area_height) setAreaHeight(Number(record.area_height));
        if (record.area_fill) setAreaFill(Number(record.area_fill));
        if (record.photo_url) setPhotoPreview(record.photo_url);
      } catch (err) {
        console.error(err);
      }
    };
    loadEdit();
  }, [editId, session, sessionReady]);

  /* ═══ Load sites ═══ */
  useEffect(() => {
    const loadSites = async () => {
      try {
        const data = await fetchSites();
        setSites(data);
        if (data.length > 0 && !editId) {
          setSiteId(data[0].id);
          setDensity(data[0].density);
        }
      } catch (err) {
        console.error('Load sites error:', err);
      } finally {
        setSitesLoading(false);
      }
    };
    loadSites();
  }, [editId]);

  const selectedSite = sites.find(s => s.id === siteId);
  
// ให้เปลี่ยนกลับเป็นแบบเดิม
const siteType = selectedSite
  ? SITE_TYPES.find(t => t.id === selectedSite.type)
  : null;

  useEffect(() => {
    if (selectedSite && !isEditMode) setDensity(selectedSite.density);
  }, [siteId, isEditMode, selectedSite]);

  /* ═══ Calculations ═══ */
  const totalLiters = bins.reduce((sum, b) => {
    const size = b.isCustom ? parseFloat(b.custom) || 0 : b.size_liters;
    return sum + size * (b.count || 0);
  }, 0);
  const binsM3 = totalLiters / 1000;
  const areaM3 = areaWidth * areaLength * areaHeight * (areaFill / 100);

  let totalM3 = 0;
  if (method === 'bins') totalM3 = binsM3;
  else if (method === 'area') totalM3 = areaM3;
  else totalM3 = binsM3 + areaM3;

  const totalKg = totalM3 * density;

  /* ═══ Bin handlers ═══ */
  const addBin = () => {
    setBins([
      ...bins,
      { id: rowId, size_liters: 120, count: 1, custom: '', isCustom: false }
    ]);
    setRowId(rowId + 1);
  };
  const removeBin = (id: number) => {
    if (bins.length === 1) return;
    setBins(bins.filter(b => b.id !== id));
  };
  const updateBin = (id: number, patch: Partial<BinRowState>) => {
    setBins(bins.map(b => (b.id === id ? { ...b, ...patch } : b)));
  };

  /* ═══ Photo ═══ */
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('⚠️ ไฟล์ใหญ่เกิน 5 MB');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  /* ═══ Save ═══ */
  const handleSave = async () => {
    if (!siteId) {
      alert('กรุณาเลือกสถานที่');
      return;
    }
    if (!userName.trim()) {
      alert('ไม่พบชื่อผู้บันทึก');
      return;
    }
    if (totalM3 <= 0) return;
    setSaving(true);

    try {
      const binItems: BinItem[] =
        method === 'bins' || method === 'both'
          ? (bins
              .map(b => {
                const size = b.isCustom
                  ? parseFloat(b.custom) || 0
                  : b.size_liters;
                return size > 0 && b.count > 0
                  ? { size_liters: size, count: b.count }
                  : null;
              })
              .filter(Boolean) as BinItem[])
          : [];

      let photoUrl: string | null = isEditMode ? photoPreview : null;
      if (photoFile) {
        setPhotoUploading(true);
        try {
          photoUrl = await uploadPhoto(photoFile);
        } catch (err) {
          console.error('Photo upload failed:', err);
        } finally {
          setPhotoUploading(false);
        }
      }

      const source =
        method === 'both' ? 'mixed' : method === 'area' ? 'area' : 'bin';

      const areaCols =
        method === 'area' || method === 'both'
          ? {
              area_width: areaWidth,
              area_length: areaLength,
              area_height: areaHeight,
              area_fill: areaFill
            }
          : {
              area_width: null,
              area_length: null,
              area_height: null,
              area_fill: null
            };

      const recordData: any = {
        user_name: userName.trim() || 'ไม่ระบุ',
        record_date: date,
        site_id: siteId,
        location: selectedSite?.type || 'office',
        prev_day_type: dayType,
        measurement_source: source,
        volume_m3: parseFloat(totalM3.toFixed(4)),
        density,
        weight_kg: parseFloat(totalKg.toFixed(2)),
        note: note.trim() || null,
        bins_json: binItems.length > 0 ? binItems : null,
        gps_lat: selectedSite?.lat ?? null,
        gps_lng: selectedSite?.lng ?? null,
        photo_url: photoUrl,
        ...areaCols
      };

      if (isEditMode && editId) {
        await updateRecord(editId, recordData);
      } else {
        await insertRecord(recordData);
      }

      setSaved(true);
      setTimeout(() => {
        if (isEditMode) {
          window.location.href = '/calendar';
        } else {
          setBins([
            { id: 1, size_liters: 120, count: 1, custom: '', isCustom: false }
          ]);
          setAreaWidth(1);
          setAreaLength(1);
          setAreaHeight(0.5);
          setAreaFill(100);
          setNote('');
          setPhotoFile(null);
          setPhotoPreview(null);
          setSaved(false);
        }
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('บันทึกไม่สำเร็จ: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  /* ═══ Loading ═══ */
  if (!sessionReady || !session) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <>
      {/* ═══ Edit-mode banner ═══ */}
      {isEditMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 lg:mb-4 p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
            <Pencil className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-base font-black text-amber-800">โหมดแก้ไข</div>
            <div className="text-xs text-amber-700 mt-0.5">
              กำลังแก้ไขข้อมูลที่บันทึกไว้
            </div>
          </div>
          <button
            onClick={() => (window.location.href = '/calendar')}
            className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-amber-600 hover:bg-amber-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* ═══ Main Grid ═══ */}
      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-4">
        {/* ═══ LEFT ═══ */}
        <div className="lg:col-span-5 space-y-4">
          {/* STEP 1 — Site */}
          <Section num={1} title="เลือกสถานที่เก็บขยะ" icon={Building2}>
            {sitesLoading ? (
              <div className="h-16 bg-emerald-50 rounded-xl animate-pulse" />
            ) : sites.length === 0 ? (
              <div className="text-center py-6 bg-amber-50 border-2 border-amber-200 rounded-xl">
                <div className="text-3xl mb-2">📍</div>
                <p className="text-sm text-amber-800 font-bold">
                  ยังไม่มีสถานที่
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  กรุณาให้เจ้าหน้าที่เพิ่มก่อน
                </p>
              </div>
            ) : (
              <>
                {/* ปุ่มเปิด SitePicker */}
                <button
                  type="button"
                  onClick={() => setShowSitePicker(true)}
                  className="w-full p-4 rounded-2xl bg-emerald-50/50 hover:bg-emerald-50
                             border-2 border-emerald-200 hover:border-emerald-400
                             transition-all text-left flex items-center gap-3 active:scale-[0.99]"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-600 flex items-center justify-center text-2xl shadow-md shadow-emerald-200 shrink-0">
                    {siteType?.icon || '📍'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-black text-emerald-900 truncate">
                      {selectedSite?.name || 'เลือกสถานที่'}
                    </div>
                    <div className="text-sm text-emerald-600 mt-0.5">
                      {siteType?.label || ''} · {density} กก./ลบ.ม.
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1.5 rounded-lg shrink-0">
                    เปลี่ยน
                  </span>
                </button>
              </>
            )}
          </Section>

          {/* STEP 2 — Time */}
          <Section num={2} title="ช่วงเวลาที่ขยะถูกทิ้ง" icon={CalendarIcon}>
            <DayTypePicker value={dayType} onChange={setDayType} />

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-emerald-700 mb-2">
                  <CalendarIcon className="w-4 h-4" /> วันที่เก็บ
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-4 py-3 text-base font-semibold bg-emerald-50/50 border-2 border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition-all text-emerald-900"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-emerald-700 mb-2">
                  <User className="w-4 h-4" /> ผู้บันทึก
                </label>
                <div className="w-full px-4 py-3 text-base font-bold text-emerald-900
                                bg-white border-2 border-slate-200 rounded-xl
                                flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{userName || 'ไม่ระบุ'}</span>
                  <span className="ml-auto text-[10px] font-bold text-slate-400 shrink-0">
                    AUTO
                  </span>
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* ═══ RIGHT ═══ */}
        <div className="lg:col-span-7 space-y-4">
          {/* STEP 3 — Method */}
          <Section num={3} title="วิธีวัดปริมาณขยะ" icon={Ruler}>
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <MethodButton
                icon={Trash2}
                label="นับถัง"
                sub="ขนาด + จำนวน"
                active={method === 'bins'}
                onClick={() => setMethod('bins')}
              />
              <MethodButton
                icon={Ruler}
                label="วัดพื้นที่"
                sub="กว้าง×ยาว×สูง"
                active={method === 'area'}
                onClick={() => setMethod('area')}
              />
              <MethodButton
                icon={Layers}
                label="ทั้งสอง"
                sub="ถัง + พื้นที่"
                active={method === 'both'}
                onClick={() => setMethod('both')}
              />
            </div>

            {(method === 'bins' || method === 'both') && (
              <div className="mb-4">
                {method === 'both' && (
                  <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-dashed border-emerald-200">
                    <span className="text-sm font-black text-emerald-800">
                      ส่วนที่ 1: ถังขยะ
                    </span>
                  </div>
                )}
                <BinList
                  bins={bins}
                  onAdd={addBin}
                  onRemove={removeBin}
                  onUpdate={updateBin}
                />
              </div>
            )}

            {(method === 'area' || method === 'both') && (
              <div className="mb-4">
                {method === 'both' && (
                  <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-dashed border-emerald-200">
                    <span className="text-sm font-black text-emerald-800">
                      ส่วนที่ 2: พื้นที่กอง
                    </span>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    {(
                      [
                        ['กว้าง (ม.)', areaWidth, setAreaWidth],
                        ['ยาว (ม.)', areaLength, setAreaLength],
                        ['สูง (ม.)', areaHeight, setAreaHeight]
                      ] as const
                    ).map(([label, val, set], i) => (
                      <div key={i}>
                        <label className="block text-sm font-bold text-emerald-700 mb-2 text-center">
                          {label}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={val}
                          onChange={e => set(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-3 text-base font-bold text-center bg-emerald-50/50 border-2 border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-emerald-600 transition-all tabular text-emerald-900"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 items-center">
                    <span className="text-sm font-bold text-emerald-700 self-center whitespace-nowrap">
                      เต็ม:
                    </span>
                    {[25, 50, 75, 100].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setAreaFill(pct)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all active:scale-[0.98] ${
                          areaFill === pct
                            ? 'bg-emerald-700 text-white shadow-sm'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-700">
                      📐 ปริมาตร
                    </span>
                    <span className="text-xl font-black text-emerald-800 tabular">
                      {areaM3.toFixed(4)}
                      <span className="text-sm ml-1">ลบ.ม.</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ⭐ หมายเหตุ — เต็มแถว */}
            <div className="mt-3">
              <label className="block text-label mb-2">หมายเหตุ</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="เช่น ฝนตก, มีงานอีเวนต์"
                className="input-base placeholder:text-emerald-300"
              />
            </div>
          </Section>

          {/* STEP 4 — Photo */}
          <Section num={4} title="ถ่ายภาพหลักฐาน" icon={Camera}>
            <PhotoSection
              preview={photoPreview}
              onSelect={handlePhotoSelect}
              onRemove={removePhoto}
              uploading={photoUploading}
            />
          </Section>
        </div>
      </div>

      {/* ═══ Sticky Total ═══ */}
      <div className="mt-4 lg:sticky lg:bottom-3 z-30">
        <TotalBox
          method={method}
          binsM3={binsM3}
          areaM3={areaM3}
          totalLiters={totalLiters}
          totalM3={totalM3}
          totalKg={totalKg}
          siteId={siteId}
          saving={saving}
          saved={saved}
          onSave={handleSave}
          isEditMode={isEditMode}
        />
      </div>

      {/* ═══ SitePicker Modal ═══ */}
      <SitePicker
        open={showSitePicker}
        sites={sites}
        currentSiteId={siteId}
        onSelect={id => {
          setSiteId(id);
          const site = sites.find(s => s.id === id);
          if (site) setDensity(site.density);
        }}
        onClose={() => setShowSitePicker(false)}
      />
    </>
  );
}

export default function RecordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-200 border-t-emerald-600" />
        </div>
      }
    >
      <RecordPageInner />
    </Suspense>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * Sub-components
 * ═══════════════════════════════════════════════════════════════ */

function MethodButton({
  icon: Icon,
  label,
  sub,
  active,
  onClick
}: {
  icon: any;
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-xl border-2 transition-all text-center p-3 active:scale-[0.98] ${
        active
          ? 'border-emerald-600 bg-emerald-50 shadow-md shadow-emerald-100'
          : 'border-emerald-100 bg-white hover:border-emerald-300'
      }`}
    >
      <div
        className={`w-11 h-11 rounded-xl mx-auto flex items-center justify-center mb-2 ${
          active
            ? 'bg-gradient-to-br from-emerald-700 to-emerald-600 text-white shadow-sm'
            : 'bg-emerald-50 text-emerald-500'
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div
        className={`text-base font-black ${
          active ? 'text-emerald-800' : 'text-emerald-700'
        }`}
      >
        {label}
      </div>
      <div className="text-xs text-emerald-500 mt-0.5">{sub}</div>
    </button>
  );
}

function Section({
  num,
  title,
  icon: Icon,
  children
}: {
  num: number;
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 lg:p-5 shadow-sm border border-emerald-100/60">
      <div className="flex items-center gap-3 pb-3 mb-4 border-b-2 border-emerald-100">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-600 text-white flex items-center justify-center text-sm font-black shadow-md">
          {num}
        </div>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-emerald-700" />
          <h3 className="text-lg lg:text-xl font-black text-emerald-900">
            {title}
          </h3>
        </div>
      </div>
      {children}
    </div>
  );
}

function DayTypePicker({
  value,
  onChange
}: {
  value: DayType;
  onChange: (v: DayType) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {DAY_TYPES.map(dt => {
        const active = value === dt.value;
        return (
          <button
            key={dt.value}
            type="button"
            onClick={() => onChange(dt.value)}
            className={`relative py-3 rounded-xl text-center transition-all border-2 active:scale-[0.98] ${
              active
                ? 'border-emerald-600 bg-emerald-50 shadow-md shadow-emerald-100'
                : 'border-emerald-100 bg-white hover:border-emerald-300'
            }`}
          >
            <div className="text-2xl leading-none mb-1">{dt.sym}</div>
            <div
              className={`text-sm font-bold ${
                active ? 'text-emerald-800' : 'text-emerald-600'
              }`}
            >
              {dt.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function BinList({
  bins,
  onAdd,
  onRemove,
  onUpdate
}: {
  bins: BinRowState[];
  onAdd: () => void;
  onRemove: (id: number) => void;
  onUpdate: (id: number, patch: Partial<BinRowState>) => void;
}) {
  return (
    <>
      {bins.map((bin, idx) => (
        <div
          key={bin.id}
          className="p-4 rounded-2xl bg-white mb-3 border-2 border-emerald-200 shadow-sm overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-black text-emerald-800">
              ถังที่ {idx + 1}
            </span>
            {bins.length > 1 && (
              <button
                onClick={() => onRemove(bin.id)}
                className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 active:scale-95 transition-all border border-red-200 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* ขนาดถัง — Grid 4 ช่อง */}
          <div className="mb-3">
            <label className="block text-sm font-bold text-emerald-700 mb-2">
              ขนาดถัง (ลิตร)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {BIN_SIZES.map(size => {
                const active = !bin.isCustom && bin.size_liters === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() =>
                      onUpdate(bin.id, {
                        size_liters: size,
                        isCustom: false,
                        custom: ''
                      })
                    }
                    className={`h-14 min-w-0 rounded-xl font-black text-base transition-all active:scale-95 ${
                      active
                        ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-300 border-2 border-emerald-800'
                        : 'bg-white text-emerald-700 border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => onUpdate(bin.id, { isCustom: true })}
                className={`h-14 min-w-0 rounded-xl font-black text-xs transition-all active:scale-95 ${
                  bin.isCustom
                    ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-300 border-2 border-emerald-800'
                    : 'bg-white text-emerald-700 border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50'
                }`}
              >
                อื่นๆ
              </button>
            </div>
          </div>

          {/* ช่องกรอกขนาดเอง */}
          {bin.isCustom && (
            <div className="mb-3 p-3 rounded-xl bg-amber-50 border-2 border-amber-300">
              <label className="block text-sm font-bold text-amber-900 mb-2">
                ⚠️ ระบุขนาด (ลิตร)
              </label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="เช่น 180"
                value={bin.custom}
                onChange={e => onUpdate(bin.id, { custom: e.target.value })}
                className="w-full px-4 py-3 text-xl font-black text-center bg-white border-2 border-amber-400 rounded-xl focus:outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100 transition-all text-amber-900"
              />
            </div>
          )}

          {/* จำนวนถัง — ใช้ flex + min-w-0 */}
          <div>
            <label className="block text-sm font-bold text-emerald-700 mb-2">
              จำนวนถัง
            </label>
            <div className="flex gap-2 items-stretch">
              <button
                type="button"
                onClick={() =>
                  onUpdate(bin.id, { count: Math.max(1, bin.count - 1) })
                }
                className="w-14 h-14 shrink-0 rounded-xl bg-emerald-100 text-emerald-800 font-black text-3xl flex items-center justify-center hover:bg-emerald-200 active:scale-95 transition-all border-2 border-emerald-200"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={bin.count}
                onChange={e =>
                  onUpdate(bin.id, {
                    count: Math.max(1, parseInt(e.target.value) || 1)
                  })
                }
                className="flex-1 min-w-0 h-14 text-center bg-white border-2 border-emerald-300 rounded-xl text-2xl font-black tabular text-emerald-900 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition-all"
              />
              <button
                type="button"
                onClick={() => onUpdate(bin.id, { count: bin.count + 1 })}
                className="w-14 h-14 shrink-0 rounded-xl bg-emerald-700 text-white font-black text-3xl flex items-center justify-center hover:bg-emerald-800 active:scale-95 transition-all shadow-md shadow-emerald-200"
              >
                +
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onAdd}
        className="w-full py-4 border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 rounded-2xl text-emerald-700 font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
      >
        <Plus className="w-5 h-5" />
        เพิ่มถังอีกขนาด
      </button>
    </>
  );
}

function PhotoSection({
  preview,
  onSelect,
  onRemove,
  uploading
}: {
  preview: string | null;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  uploading: boolean;
}) {
  return (
    <div>
      {preview ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-emerald-200 shadow-sm">
          <img
            src={preview}
            alt="หลักฐาน"
            className="w-full max-h-44 object-contain bg-slate-900"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-white text-center">
                <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2" />
                <div className="text-sm font-bold">กำลังอัปโหลด...</div>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-lg active:scale-95 transition-all"
          >
            <X className="w-4 h-4" strokeWidth={3} />
          </button>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-5 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-md shadow-emerald-200 mb-2.5">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <p className="text-base font-bold text-emerald-800">
            ถ่ายภาพหรือเลือกจากคลัง
          </p>
          <p className="text-xs text-emerald-500 mt-1">ไม่เกิน 5 MB</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 mt-3">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          id="photo-camera"
          onChange={onSelect}
          className="hidden"
        />
        <input
          type="file"
          accept="image/*"
          id="photo-gallery"
          onChange={onSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => document.getElementById('photo-camera')?.click()}
          disabled={uploading}
          className="py-3 rounded-xl bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-200 disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          <Camera className="w-4 h-4" />
          {preview ? 'เปลี่ยน' : 'ถ่ายรูป'}
        </button>

        <button
          type="button"
          onClick={() => document.getElementById('photo-gallery')?.click()}
          disabled={uploading}
          className="py-3 rounded-xl bg-white text-emerald-700 border-2 border-emerald-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-50 disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          <ImageIcon className="w-4 h-4" />
          เลือกรูป
        </button>
      </div>
    </div>
  );
}

function TotalBox({
  method,
  binsM3,
  areaM3,
  totalLiters,
  totalM3,
  totalKg,
  siteId,
  saving,
  saved,
  onSave,
  isEditMode
}: {
  method: MeasureMethod;
  binsM3: number;
  areaM3: number;
  totalLiters: number;
  totalM3: number;
  totalKg: number;
  siteId: string;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  isEditMode?: boolean;
}) {
  const canSave = totalM3 > 0 && !!siteId && !saving && !saved;
  const isDisabled = totalM3 <= 0 || !siteId || saving || saved;

  return (
    <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-600 text-white rounded-2xl lg:rounded-3xl p-4 lg:p-5 shadow-xl shadow-emerald-300/40 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12 pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Boxes className="w-4 h-4 text-white/80" />
            <span className="text-sm font-bold text-white/80">ปริมาตรรวม</span>
            <span className="text-xs text-white/60 ml-auto lg:ml-2">
              {method === 'bins' && `${totalLiters.toLocaleString()} ลิตร`}
              {method === 'area' && 'จากพื้นที่'}
              {method === 'both' && 'ถัง + พื้นที่'}
            </span>
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            <div className="text-number-hero text-number-highlight">
              <AnimatedNumber value={totalM3} decimals={4} />
              <span className="text-lg lg:text-xl opacity-80 ml-1.5 font-bold">
                ม³
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 text-white/70">
              <Weight className="w-4 h-4 self-center" />
              <span className="text-number-lg text-white">
                <AnimatedNumber value={totalKg} decimals={2} />
              </span>
              <span className="text-sm font-bold">กก.</span>
            </div>
          </div>

          {method === 'both' && (
            <div className="text-xs text-white/70 mt-1.5 space-x-3">
              <span>ถัง: {binsM3.toFixed(4)} ม³</span>
              <span>พื้นที่: {areaM3.toFixed(4)} ม³</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={isDisabled}
          className={`w-full lg:w-auto lg:min-w-[220px] py-4 px-6 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2 shrink-0 active:scale-[0.98] ${
            saved
              ? 'bg-white text-emerald-700'
              : canSave
                ? 'bg-white text-emerald-700 hover:shadow-lg'
                : 'bg-white/25 text-white/70 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isEditMode ? 'กำลังบันทึก...' : 'กำลังบันทึก...'}
            </>
          ) : saved ? (
            <>
              <Check className="w-5 h-5" strokeWidth={3} /> บันทึกสำเร็จ!
            </>
          ) : !siteId ? (
            <>⚠️ เลือกสถานที่ก่อน</>
          ) : totalM3 > 0 ? (
            <>{isEditMode ? '💾 บันทึกการแก้ไข' : '💾 บันทึกข้อมูล'}</>
          ) : (
            <>⚠️ ใส่ปริมาณก่อน</>
          )}
        </button>
      </div>
    </div>
  );
}