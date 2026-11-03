'use client';

import { useRef, useEffect } from 'react';

interface Props {
  length: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  onEnter?: () => void;
  color?: 'emerald' | 'dark';
  autoFocus?: boolean;
  shake?: boolean;
  showDigits?: boolean;
}

export default function PinInput({
  length,
  value,
  onChange,
  onComplete,
  onEnter,
  color = 'emerald',
  autoFocus,
  shake,
  showDigits = false
}: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }).map((_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus) setTimeout(() => refs.current[0]?.focus(), 200);
  }, [autoFocus]);

  const setAt = (i: number, ch: string) => {
    const arr = value.split('');
    arr[i] = ch;
    const next = arr.join('').slice(0, length);
    onChange(next);
    if (ch && i < length - 1) refs.current[i + 1]?.focus();
    if (next.length === length && next.split('').every(c => c)) {
      onComplete?.(next);
    }
  };

  const palette =
    color === 'dark'
      ? {
          border: 'border-emerald-600',
          focus: 'focus:border-emerald-800 focus:ring-emerald-200',
          filled: 'border-emerald-800 bg-emerald-50',
          dot: 'bg-emerald-800',
          text: 'text-emerald-900'
        }
      : {
          border: 'border-emerald-300',
          focus: 'focus:border-emerald-600 focus:ring-emerald-100',
          filled: 'border-emerald-600 bg-emerald-50',
          dot: 'bg-emerald-600',
          text: 'text-emerald-900'
        };

  return (
    <div
      className="flex justify-center gap-2.5"
      style={shake ? { animation: 'pinShake 0.4s ease-in-out' } : undefined}
    >
      {Array.from({ length }).map((_, i) => {
        const filled = !!digits[i];
        return (
          <div key={i} className="relative">
            <input
              ref={el => {
                refs.current[i] = el;
              }}
              type={showDigits ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={1}
              autoComplete="off"
              value={digits[i]}
              onChange={e =>
                setAt(i, e.target.value.replace(/\D/g, '').slice(-1))
              }
              onKeyDown={e => {
                if (e.key === 'Backspace' && !digits[i] && i > 0)
                  refs.current[i - 1]?.focus();
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onEnter?.();
                }
              }}
              className={`w-14 h-16 text-center text-3xl font-black bg-white border-2 ${
                palette.border
              } ${
                filled ? palette.filled : ''
              } ${palette.text} rounded-2xl focus:outline-none focus:ring-4 ${
                palette.focus
              } transition-all duration-200 ${showDigits ? '' : 'caret-transparent'}`}
            />
            {filled && !showDigits && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-3.5 h-3.5 rounded-full ${palette.dot}`} />
              </div>
            )}
          </div>
        );
      })}
      <style jsx global>{`
        @keyframes pinShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}