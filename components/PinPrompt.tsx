'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, Unlock } from 'lucide-react';
import { hashPin } from '@/lib/session';

interface Props {
  open: boolean;
  title?: string;
  pinLength?: number;
  expectedPin?: string;
  expectedHash?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function PinPrompt({
  open,
  title,
  pinLength = 4,
  expectedPin,
  expectedHash,
  onSuccess,
  onClose
}: Props) {
  const [pin, setPin] = useState<string[]>(Array(pinLength).fill(''));
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isStaff = pinLength === 6;

  useEffect(() => {
    if (open) {
      setPin(Array(pinLength).fill(''));
      setError('');
      setShake(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [open, pinLength]);

  const checkPin = (values: string[]) => {
    const entered = values.join('');
    if (entered.length < pinLength) return;

    const ok = expectedHash
      ? hashPin(entered) === expectedHash
      : entered ===
        (expectedPin || process.env.NEXT_PUBLIC_STAFF_PIN || '888888');

    if (ok) {
      onSuccess();
      setPin(Array(pinLength).fill(''));
    } else {
      setError('รหัสไม่ถูกต้อง ลองอีกครั้ง');
      setShake(true);
      setPin(Array(pinLength).fill(''));
      setTimeout(() => {
        setShake(false);
        inputRefs.current[0]?.focus();
      }, 500);
    }
  };

  const handleChange = (i: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const newPin = [...pin];
    newPin[i] = clean;
    setPin(newPin);
    setError('');
    if (clean && i < pinLength - 1) inputRefs.current[i + 1]?.focus();
    if (newPin.every(p => p !== '')) setTimeout(() => checkPin(newPin), 100);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[i] && i > 0)
      inputRefs.current[i - 1]?.focus();
    if (e.key === 'Enter') checkPin(pin);
  };

  if (!open) return null;

  const defaultTitle = isStaff ? 'ยืนยันเจ้าหน้าที่' : 'ยืนยันตัวตน';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-center">
            <div
              className={`w-16 h-16 mx-auto rounded-3xl flex items-center justify-center shadow-xl mb-4 ${
                isStaff
                  ? 'bg-gradient-to-br from-emerald-700 to-emerald-600 shadow-emerald-200'
                  : 'bg-gradient-to-br from-emerald-600 to-emerald-500 shadow-emerald-200'
              }`}
            >
              <Lock className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-lg font-black text-slate-800 mb-1">
              {title || defaultTitle}
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              กรุณาใส่รหัส {pinLength} หลัก
            </p>

            <div className="flex gap-2 justify-center mb-4 flex-wrap">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={el => {
                    inputRefs.current[i] = el;
                  }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-2xl font-black bg-white border-2 rounded-2xl shadow-sm outline-none transition-all ${
                    isStaff
                      ? 'border-emerald-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100'
                      : 'border-emerald-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100'
                  } ${
                    digit
                      ? 'border-emerald-500 bg-emerald-50'
                      : ''
                  }`}
                />
              ))}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-red-600 font-bold mb-2"
                >
                  ❌ {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => checkPin(pin)}
              disabled={!pin.every(p => p !== '')}
              className="w-full mt-4 py-3.5 rounded-2xl text-white font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-700 to-emerald-600 shadow-emerald-200"
            >
              <Unlock className="w-4 h-4" />
              ยืนยัน
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}