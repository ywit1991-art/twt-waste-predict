'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, MapPin, Loader2, Check } from 'lucide-react';
import { SITE_TYPES, DENSITY_HINTS } from '@/lib/constants';
import { createSite, deleteSite } from '@/lib/sites';
import type { Site } from '@/lib/types';

interface Props {
  sites: Site[];
  onClose: () => void;
  onReload: () => void;
}

export default function SiteManager({ sites, onClose, onReload }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('office');
  const [density, setDensity] = useState(180);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const selectedType = SITE_TYPES.find(t => t.id === type);

  const getGPS = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ไม่รองรับ GPS');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(7));
        setLng(pos.coords.longitude.toFixed(7));
        setGpsLoading(false);
      },
      (err) => {
        alert('ไม่สามารถดึงพิกัด: ' + err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      alert('กรุณาใส่ชื่อสถานที่');
      return;
    }
    setSaving(true);
    try {
      await createSite({
        name: name.trim(),
        type,
        density,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        note: note.trim() || null
      });
      setName('');
      setType('office');
      setDensity(180);
      setLat('');
      setLng('');
      setNote('');
      setShowForm(false);
      onReload();
    } catch (err) {
      alert('เพิ่มไม่สำเร็จ: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, siteName: string) => {
    if (!confirm(`ลบ "${siteName}" ?`)) return;
    try {
      await deleteSite(id);
      onReload();
    } catch (err) {
      alert('ลบไม่สำเร็จ: ' + (err as Error).message);
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
        <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="font-black text-slate-800 text-lg">จัดการสถานที่</h3>
            <p className="text-[11px] text-slate-500">{sites.length} สถานที่</p>
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
                    className="p-3 rounded-2xl bg-slate-50 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm shrink-0">
                      {t?.icon || '📍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{site.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {t?.label || site.type} · {site.density} กก./ลบ.ม.
                      </div>
                      {site.lat && site.lng && (
                        <div className="text-[9px] text-slate-400 font-mono truncate">
                          📍 {site.lat.toFixed(4)}, {site.lng.toFixed(4)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(site.id, site.name)}
                      className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Add form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-2xl bg-blue-50 border-2 border-blue-200 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อสถานที่ *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="เช่น ตลาดสดท่าวังทอง"
                      className="w-full px-3 py-2.5 text-sm bg-white border-2 border-transparent rounded-xl focus:outline-none focus:border-primary-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">ประเภทสถานประกอบการ</label>
                    <select
                      value={type}
                      onChange={e => {
                        setType(e.target.value);
                        const t = SITE_TYPES.find(st => st.id === e.target.value);
                        if (t) setDensity(t.density);
                      }}
                      className="w-full px-3 py-2.5 text-sm bg-white border-2 border-transparent rounded-xl focus:outline-none focus:border-primary-500 transition-all"
                    >
                      {SITE_TYPES.map(t => (
                        <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">ความหนาแน่น (กก./ลบ.ม.)</label>
                    <input
                      type="number"
                      value={density}
                      onChange={e => setDensity(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 text-sm bg-white border-2 border-transparent rounded-xl focus:outline-none focus:border-primary-500 transition-all"
                    />
                    {selectedType && DENSITY_HINTS[selectedType.id] && (
                      <p className="text-[10px] text-slate-500 mt-1">💡 {DENSITY_HINTS[selectedType.id]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">พิกัด (ไม่บังคับ)</label>
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <input
                        type="text"
                        value={lat}
                        onChange={e => setLat(e.target.value)}
                        placeholder="ละติจูด"
                        className="w-full px-3 py-2.5 text-xs bg-white border-2 border-transparent rounded-xl focus:outline-none focus:border-primary-500 transition-all font-mono"
                      />
                      <input
                        type="text"
                        value={lng}
                        onChange={e => setLng(e.target.value)}
                        placeholder="ลองจิจูด"
                        className="w-full px-3 py-2.5 text-xs bg-white border-2 border-transparent rounded-xl focus:outline-none focus:border-primary-500 transition-all font-mono"
                      />
                      <button
                        onClick={getGPS}
                        disabled={gpsLoading}
                        className="px-3 rounded-xl bg-primary-600 text-white font-bold text-xs flex items-center gap-1 disabled:opacity-50"
                      >
                        {gpsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">หมายเหตุ</label>
                    <input
                      type="text"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="เช่น เปิด จ-ศ 8:00-17:00"
                      className="w-full px-3 py-2.5 text-sm bg-white border-2 border-transparent rounded-xl focus:outline-none focus:border-primary-500 transition-all"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowForm(false)}
                      className="flex-1 py-2.5 rounded-xl bg-white text-slate-600 font-bold text-sm"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={handleAdd}
                      disabled={saving}
                      className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      เพิ่ม
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
              onClick={() => setShowForm(true)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
            >
              <Plus className="w-4 h-4" />
              เพิ่มสถานที่ใหม่
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}