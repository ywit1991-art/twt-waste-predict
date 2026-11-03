'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';

interface Props {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = 'ยืนยันการทำรายการ',
  message = 'คุณแน่ใจหรือไม่?',
  confirmText = 'ตกลง',
  cancelText = 'ยกเลิก',
  variant = 'danger',
  onConfirm,
  onCancel
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel, onConfirm]);

  const palette = {
    danger: {
      icon: 'bg-red-100 text-red-600',
      btn: 'bg-gradient-to-r from-red-600 to-red-500 hover:shadow-lg shadow-red-200',
      Icon: AlertTriangle
    },
    warning: {
      icon: 'bg-amber-100 text-amber-600',
      btn: 'bg-gradient-to-r from-amber-600 to-amber-500 hover:shadow-lg shadow-amber-200',
      Icon: AlertTriangle
    },
    default: {
      icon: 'bg-emerald-100 text-emerald-700',
      btn: 'bg-gradient-to-r from-emerald-700 to-emerald-600 hover:shadow-lg shadow-emerald-200',
      Icon: AlertTriangle
    }
  }[variant];

  const { Icon } = palette;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
          >
            <button
              onClick={onCancel}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div
              className={`w-16 h-16 mx-auto rounded-full ${palette.icon} flex items-center justify-center mb-4`}
            >
              <Icon className="w-8 h-8" strokeWidth={2.5} />
            </div>

            <h3 className="text-lg font-black text-slate-800 text-center mb-2">
              {title}
            </h3>
            <p className="text-sm text-slate-500 text-center leading-relaxed mb-5">
              {message}
            </p>

            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all active:scale-[0.98]"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-3 rounded-2xl ${palette.btn} text-white font-bold text-sm transition-all active:scale-[0.98] shadow-md`}
              >
                {confirmText}
              </button>
            </div>

            <p className="text-[10px] text-slate-400 text-center mt-3">
              กด{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded font-black">
                Enter
              </kbd>{' '}
              ยืนยัน ·{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded font-black">
                Esc
              </kbd>{' '}
              ยกเลิก
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}