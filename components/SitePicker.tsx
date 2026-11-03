'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, MapPin, Check } from 'lucide-react';
import type { Site } from '@/lib/types';

interface Props {
  open: boolean;
  sites: Site[];
  currentSiteId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export default function SitePicker({
  open,
  sites,
  currentSiteId,
  onSelect,
  onClose
}: Props) {
  const [search, setSearch] = useState('');

  const filteredSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter(s => s.name.toLowerCase().includes(q));
  }, [sites, search]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-emerald-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-lg font-black text-emerald-900">
                  เลือกสถานที่
                </h3>
                <p className="text-xs text-emerald-600">
                  {sites.length} แห่ง
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-emerald-50 shrink-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อสถานที่..."
                className="w-full pl-10 pr-4 py-3 text-base bg-emerald-50/50 border-2 border-emerald-100 rounded-xl focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition-all text-emerald-900"
              />
            </div>
          </div>

          {/* List (Grid ตาราง) */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredSites.length === 0 ? (
              <div className="text-center py-8 text-emerald-400">
                ไม่พบสถานที่ที่ค้นหา
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {filteredSites.map(site => {
                  const active = site.id === currentSiteId;
                  return (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => {
                        onSelect(site.id);
                        onClose();
                      }}
                      className={`w-full h-16 px-3 py-2 rounded-xl text-center transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 ${
                        active
                          ? 'bg-emerald-50 border-2 border-emerald-600 shadow-sm'
                          : 'bg-white border-2 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/30'
                      }`}
                    >
                      <span className={`text-base font-bold leading-tight line-clamp-2 ${active ? 'text-emerald-900' : 'text-slate-700'}`}>
                        {site.name}
                      </span>
                      {active && (
                        <Check className="w-4 h-4 text-emerald-700 shrink-0" strokeWidth={3} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-emerald-50 text-center shrink-0">
            <p className="text-xs font-bold text-emerald-600">
              แสดง {filteredSites.length} / {sites.length} สถานที่
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}