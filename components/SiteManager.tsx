'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Trash2, MapPin, Loader2, Check, Navigation, Pencil,
  Search, XCircle
} from 'lucide-react';
import {
  MapContainer, TileLayer, Marker, useMapEvents, useMap
} from 'react-leaflet';
import { SITE_TYPES, DENSITY_HINTS } from '@/lib/constants';
import { createSite, deleteSite, updateSite } from '@/lib/sites';
import type { Site } from '@/lib/types';

const DEFAULT_CENTER: [number, number] = [19.1907, 99.9315];

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

function MapClickHandler({
  onClick
}: {
  onClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (isFinite(lat) && isFinite(lng)) {
      map.flyTo([lat, lng], 16, { duration: 0.8 });
    }
  }, [lat, lng, map]);
  return null;
}

interface Props {
  sites: Site[];
  onClose: () => void;
  onReload: () => void;
}

export default function SiteManager({ sites, onClose, onReload }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState('office');
  const [density, setDensity] = useState(180);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [markerIcon, setMarkerIcon] = useState<any>(null);

  // ⭐ Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const selectedType = SITE_TYPES.find(t => t.id === type);
  const hasPin = lat != null && lng != null;
  const isEditing = editingId != null;

  useEffect(() => {
    import('leaflet').then(L => {
      const icon = L.divIcon({
        html: `
          <div style="position:relative;">
            <div style="background:#047857;color:white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 3px 12px rgba(4,120,87,.5);cursor:grab;">
              📍
            </div>
            <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #047857;"></div>
          </div>
        `,
        iconSize: [34, 42],
        iconAnchor: [17, 42],
        className: ''
      });
      setMarkerIcon(icon);
    });
  }, []);

  // ⭐ Click outside → ปิด dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ⭐ Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    const q = searchQuery.trim();

    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            new URLSearchParams({
              q,
              format: 'json',
              limit: '8',
              addressdetails: '0',
              'accept-language': 'th,en'
            }),
          {
            headers: { 'User-Agent': 'TWT-Waste-Predict/1.0' }
          }
        );
        if (!res.ok) throw new Error('Search failed');
        const data: SearchResult[] = await res.json();
        setSearchResults(data);
        setShowResults(true);
      } catch (err) {
        console.warn('Search error:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  const pickSearchResult = (r: SearchResult) => {
    const latNum = parseFloat(parseFloat(r.lat).toFixed(7));
    const lngNum = parseFloat(parseFloat(r.lon).toFixed(7));
    setLat(latNum);
    setLng(lngNum);
    setLatInput(String(latNum));
    setLngInput(String(lngNum));
    setShowResults(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const resetForm = () => {
    setName('');
    setType('office');
    setDensity(180);
    setLat(null);
    setLng(null);
    setLatInput('');
    setLngInput('');
    setNote('');
    setEditingId(null);
    setShowForm(false);
    clearSearch();
  };

  const startAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (site: Site) => {
    setName(site.name);
    setType(site.type);
    setDensity(site.density);
    setLat(site.lat);
    setLng(site.lng);
    setLatInput(site.lat != null ? String(site.lat) : '');
    setLngInput(site.lng != null ? String(site.lng) : '');
    setNote(site.note || '');
    setEditingId(site.id);
    setShowForm(true);
  };

  const handleMapClick = (newLat: number, newLng: number) => {
    const lat7 = parseFloat(newLat.toFixed(7));
    const lng7 = parseFloat(newLng.toFixed(7));
    setLat(lat7);
    setLng(lng7);
    setLatInput(String(lat7));
    setLngInput(String(lng7));
  };

  const handleMarkerDrag = (e: any) => {
    const pos = e.target.getLatLng();
    const lat7 = parseFloat(pos.lat.toFixed(7));
    const lng7 = parseFloat(pos.lng.toFixed(7));
    setLat(lat7);
    setLng(lng7);
    setLatInput(String(lat7));
    setLngInput(String(lng7));
  };

  const applyManualCoords = () => {
    const latNum = parseFloat(latInput);
    const lngNum = parseFloat(lngInput);
    if (!isFinite(latNum) || !isFinite(lngNum)) {
      alert('กรุณากรอกตัวเลขให้ถูกต้อง');
      return;
    }
    if (latNum < -90 || latNum > 90) {
      alert('ละติจูดต้องอยู่ระหว่าง -90 ถึง 90');
      return;
    }
    if (lngNum < -180 || lngNum > 180) {
      alert('ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180');
      return;
    }
    setLat(parseFloat(latNum.toFixed(7)));
    setLng(parseFloat(lngNum.toFixed(7)));
  };

  const getGPS = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ไม่รองรับ GPS');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat7 = parseFloat(pos.coords.latitude.toFixed(7));
        const lng7 = parseFloat(pos.coords.longitude.toFixed(7));
        setLat(lat7);
        setLng(lng7);
        setLatInput(String(lat7));
        setLngInput(String(lng7));
        setGpsLoading(false);
      },
      err => {
        alert('ไม่สามารถดึงพิกัด: ' + err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('กรุณาใส่ชื่อสถานที่');
      return;
    }
    setSaving(true);
    try {
      if (isEditing) {
        await updateSite(editingId!, {
          name: name.trim(),
          type,
          density,
          lat,
          lng,
          note: note.trim() || null
        });
      } else {
        await createSite({
          name: name.trim(),
          type,
          density,
          lat,
          lng,
          note: note.trim() || null
        });
      }
      resetForm();
      onReload();
    } catch (err) {
      alert(
        (isEditing ? 'แก้ไข' : 'เพิ่ม') +
          'ไม่สำเร็จ: ' +
          (err as Error).message
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, siteName: string) => {
    if (
      !confirm(
        `ลบ "${siteName}" ?\n\nข้อมูลขยะที่ผูกกับสถานที่นี้จะยังอยู่ แต่จะไม่แสดงชื่อสถานที่`
      )
    )
      return;
    try {
      await deleteSite(id);
      onReload();
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('foreign key')) {
        alert(
          '❌ ลบไม่ได้ เพราะมีข้อมูลขยะผูกอยู่\n\nแนะนำ: ใช้วิธี "ซ่อน" แทน หรือลบข้อมูลขยะก่อน'
        );
      } else {
        alert('ลบไม่สำเร็จ: ' + msg);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-emerald-100 px-5 py-4 flex items-center justify-between z-30">
          <div>
            <h3 className="text-lg font-black text-emerald-900">
              {isEditing ? 'แก้ไขสถานที่' : 'จัดการสถานที่'}
            </h3>
            <p className="text-xs text-emerald-600 mt-0.5">
              {isEditing ? `กำลังแก้: ${name}` : `${sites.length} สถานที่`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* List */}
          {!isEditing && (
            <div className="space-y-2">
              {sites.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  ยังไม่มีสถานที่ — กดปุ่มด้านล่างเพื่อเพิ่ม
                </div>
              ) : (
                sites.map((site, i) => {
                  const t = SITE_TYPES.find(st => st.id === site.type);
                  return (
                    <motion.div
                      key={site.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-3 rounded-2xl bg-emerald-50/50 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm shrink-0">
                        {t?.icon || '📍'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate text-emerald-900">
                          {site.name}
                        </div>
                        <div className="text-xs text-emerald-600">
                          {t?.label || site.type} · {site.density} กก./ลบ.ม.
                        </div>
                        {site.lat && site.lng && (
                          <div className="text-[10px] text-emerald-500 font-mono truncate">
                            📍 {site.lat.toFixed(5)}, {site.lng.toFixed(5)}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => startEdit(site)}
                        className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center hover:bg-emerald-200 shrink-0"
                        title="แก้ไข"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(site.id, site.name)}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 shrink-0"
                        title="ลบ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {/* Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className={`p-4 rounded-2xl border-2 space-y-3 ${
                    isEditing
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  {isEditing && (
                    <div className="flex items-center gap-2 pb-2 border-b border-amber-200">
                      <Pencil className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-bold text-amber-800">
                        กำลังแก้ไขสถานที่
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-emerald-800 mb-1.5">
                      ชื่อสถานที่ *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="เช่น ตลาดสดท่าวังทอง"
                      className="w-full px-3.5 py-2.5 text-base font-semibold bg-white border-2 border-transparent rounded-xl focus:outline-none focus:border-emerald-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-emerald-800 mb-1.5">
                      ประเภทสถานประกอบการ
                    </label>
                    <select
                      value={type}
                      onChange={e => {
                        setType(e.target.value);
                        const t = SITE_TYPES.find(
                          st => st.id === e.target.value
                        );
                        if (t) setDensity(t.density);
                      }}
                      className="w-full px-3.5 py-2.5 text-base font-semibold bg-white border-2 border-transparent rounded-xl focus:outline-none focus:border-emerald-600 transition-all"
                    >
                      {SITE_TYPES.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.icon} {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-emerald-800 mb-1.5">
                      ความหนาแน่น (กก./ลบ.ม.)
                    </label>
                    <input
                      type="number"
                      value={density}
                      onChange={e =>
                        setDensity(parseInt(e.target.value) || 0)
                      }
                      className="w-full px-3.5 py-2.5 text-base font-semibold bg-white border-2 border-transparent rounded-xl focus:outline-none focus:border-emerald-600 transition-all"
                    />
                    {selectedType && DENSITY_HINTS[selectedType.id] && (
                      <p className="text-xs text-emerald-600 mt-1">
                        💡 {DENSITY_HINTS[selectedType.id]}
                      </p>
                    )}
                  </div>

                  {/* ⭐ พิกัด */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-bold text-emerald-800">
                        📍 พิกัด (lat / long)
                      </label>
                      <button
                        type="button"
                        onClick={getGPS}
                        disabled={gpsLoading}
                        className="text-xs font-bold text-emerald-700 px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-100 flex items-center gap-1 disabled:opacity-50 transition-colors"
                      >
                        {gpsLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />{' '}
                            กำลังดึง
                          </>
                        ) : (
                          <>
                            <Navigation className="w-3.5 h-3.5" /> ตำแหน่งฉัน
                          </>
                        )}
                      </button>
                    </div>

                    {/* ⭐⭐ Search Box */}
                    <div ref={searchWrapRef} className="relative mb-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          onFocus={() => {
                            if (searchResults.length > 0)
                              setShowResults(true);
                          }}
                          placeholder="🔍 ค้นหาสถานที่ เช่น ตลาดท่าวังทอง พะเยา"
                          className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border-2 border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-600 transition-all"
                        />
                        {(searching || searchQuery) && (
                          <button
                            type="button"
                            onClick={clearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600"
                          >
                            {searching ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Dropdown ผลลัพธ์ */}
                      <AnimatePresence>
                        {showResults && searchResults.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute top-full left-0 right-0 mt-1 z-[1100]
                                       bg-white rounded-xl shadow-xl border-2 border-emerald-100
                                       max-h-64 overflow-y-auto"
                          >
                            {searchResults.map((r, i) => (
                              <button
                                key={`${r.lat}-${r.lon}-${i}`}
                                type="button"
                                onClick={() => pickSearchResult(r)}
                                className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50
                                           border-b border-emerald-50 last:border-0
                                           flex items-start gap-2.5 transition-colors"
                              >
                                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-emerald-900 line-clamp-2">
                                    {r.display_name}
                                  </div>
                                  <div className="text-[10px] text-emerald-500 font-mono mt-0.5">
                                    {parseFloat(r.lat).toFixed(5)},{' '}
                                    {parseFloat(r.lon).toFixed(5)}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}

                        {showResults &&
                          !searching &&
                          searchQuery.trim().length >= 2 &&
                          searchResults.length === 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              className="absolute top-full left-0 right-0 mt-1 z-[1100]
                                         bg-white rounded-xl shadow-xl border-2 border-emerald-100
                                         px-3.5 py-3 text-sm text-emerald-500 text-center"
                            >
                              ไม่พบสถานที่ — ลองพิมพ์ชื่ออื่น
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </div>

                    {/* 2 ช่องกรอก lat/lng */}
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2">
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={latInput}
                        onChange={e => setLatInput(e.target.value)}
                        onBlur={applyManualCoords}
                        placeholder="ละติจูด (lat)"
                        className="w-full px-3 py-2.5 text-sm bg-white border-2 border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-600 font-mono"
                      />
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={lngInput}
                        onChange={e => setLngInput(e.target.value)}
                        onBlur={applyManualCoords}
                        placeholder="ลองจิจูด (lng)"
                        className="w-full px-3 py-2.5 text-sm bg-white border-2 border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-600 font-mono"
                      />
                      <button
                        type="button"
                        onClick={applyManualCoords}
                        className="px-3.5 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-sm hover:bg-emerald-800 active:scale-95 transition-all"
                      >
                        <Check className="w-4 h-4" strokeWidth={3} />
                      </button>
                    </div>

                    <p className="text-[10px] text-emerald-600 mb-2">
                      💡 ค้นหาสถานที่ · พิมพ์พิกัด · คลิกแผนที่ · ลากหมุด
                    </p>

                    <div
                      className="rounded-2xl overflow-hidden shadow-md border-2 border-white"
                      style={{ height: '240px' }}
                    >
                      {markerIcon ? (
                        <MapContainer
                          center={hasPin ? [lat!, lng!] : DEFAULT_CENTER}
                          zoom={hasPin ? 16 : 13}
                          style={{ height: '100%', width: '100%' }}
                          scrollWheelZoom={true}
                        >
                          <TileLayer
                            attribution="Tiles &copy; Esri"
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            maxZoom={19}
                          />
                          <MapClickHandler onClick={handleMapClick} />

                          {hasPin && (
                            <>
                              <Marker
                                position={[lat!, lng!]}
                                icon={markerIcon}
                                draggable={true}
                                eventHandlers={{ dragend: handleMarkerDrag }}
                              />
                              <FlyTo lat={lat!} lng={lng!} />
                            </>
                          )}
                        </MapContainer>
                      ) : (
                        <div className="h-full bg-slate-100 animate-pulse flex items-center justify-center">
                          <span className="text-slate-400 text-xs">
                            กำลังโหลดแผนที่...
                          </span>
                        </div>
                      )}
                    </div>

                    {/* สถานะพิกัด */}
                    <div className="mt-2 p-2.5 rounded-xl bg-white border border-emerald-200 flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          hasPin ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      >
                        {hasPin ? (
                          <Check
                            className="w-3.5 h-3.5 text-white"
                            strokeWidth={3}
                          />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {hasPin ? (
                          <div className="text-xs font-mono text-emerald-800 font-bold truncate">
                            {lat!.toFixed(6)}, {lng!.toFixed(6)}
                          </div>
                        ) : (
                          <div className="text-xs text-emerald-500">
                            ยังไม่ได้ปักหมุด
                          </div>
                        )}
                      </div>
                      {hasPin && (
                        <button
                          type="button"
                          onClick={() => {
                            setLat(null);
                            setLng(null);
                            setLatInput('');
                            setLngInput('');
                          }}
                          className="text-xs font-bold text-red-500 px-2 py-1 rounded-lg hover:bg-red-50"
                        >
                          ล้าง
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-emerald-800 mb-1.5">
                      หมายเหตุ
                    </label>
                    <input
                      type="text"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="เช่น เปิด จ-ศ 8:00-17:00"
                      className="w-full px-3.5 py-2.5 text-base bg-white border-2 border-transparent rounded-xl focus:outline-none focus:border-emerald-600 transition-all"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 py-3 rounded-xl bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className={`flex-1 py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all active:scale-[0.98] ${
                        isEditing
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-emerald-700 hover:bg-emerald-800'
                      }`}
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isEditing ? (
                        <Pencil className="w-4 h-4" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      {isEditing ? 'บันทึก' : 'เพิ่ม'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!showForm && (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={startAdd}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-600 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
            >
              <Plus className="w-5 h-5" />
              เพิ่มสถานที่ใหม่
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}