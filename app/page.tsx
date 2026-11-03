'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Shield,
  ArrowLeft,
  Lock,
  Loader2,
  Leaf,
  Sparkles
} from 'lucide-react';
import {
  loginAsRecorder,
  loginAsStaff,
  getSession,
  autoLoginRecorder,
  hasRecorderProfile
} from '@/lib/session';
import PinInput from '@/components/PinInput';

type Mode = null | 'recorder' | 'staff';

export default function LandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [checked, setChecked] = useState(false);
  const [autoLogging, setAutoLogging] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (s) {
      router.replace(s.role === 'staff' ? '/calendar' : '/record');
      return;
    }
    setChecked(true);
  }, [router]);

  const handleRecorderClick = () => {
    if (hasRecorderProfile()) {
      setAutoLogging(true);
      const res = autoLoginRecorder();
      if (res.ok) {
        router.replace('/record');
        return;
      }
      setAutoLogging(false);
    }
    setMode('recorder');
  };

  if (!checked) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (autoLogging) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm font-bold text-emerald-700">
          กำลังเข้าใช้งาน...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center py-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-28 h-28 mx-auto rounded-full bg-white shadow-2xl shadow-emerald-200/60 flex items-center justify-center overflow-hidden mb-5 ring-4 ring-emerald-100"
        >
          <img
            src="/logo.png"
            alt="logo"
            className="w-full h-full object-contain p-2"
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </motion.div>
        <h1 className="text-3xl font-black text-emerald-800 mb-1 tracking-tight">
          เทศบาลตำบลท่าวังทอง
        </h1>
      </motion.div>

      <AnimatePresence mode="wait">
        {mode === null ? (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md space-y-3"
          >

            <RoleCard
              icon={<User className="w-8 h-8" />}
              title="คนบันทึก"
              desc="ใช้ PIN 4 หลัก · ดู/แก้ไขข้อมูลของตัวเอง"
              variant="light"
              onClick={handleRecorderClick}
            />

            <RoleCard
              icon={<Shield className="w-8 h-8" />}
              title="เจ้าหน้าที่"
              desc="ใช้ PIN 6 หลัก · ดู/แก้ไข/ลบข้อมูลทั้งหมด"
              variant="dark"
              onClick={() => setMode('staff')}
            />
          </motion.div>
        ) : mode === 'recorder' ? (
          <RecorderLogin key="rec" onBack={() => setMode(null)} />
        ) : (
          <StaffLogin key="staff" onBack={() => setMode(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════ Role Card ═══════════ */
function RoleCard({
  icon,
  title,
  desc,
  variant,
  onClick
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  variant: 'light' | 'dark';
  onClick: () => void;
}) {
  const isDark = variant === 'dark';
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full p-5 rounded-3xl flex items-center gap-4 text-left relative overflow-hidden group shadow-xl transition-all ${
        isDark
          ? 'bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-600 text-white shadow-emerald-300/50'
          : 'bg-white border-2 border-emerald-200 text-emerald-900 shadow-emerald-100/50'
      }`}
    >
      <div
        className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-2xl transition-all ${
          isDark
            ? 'bg-emerald-400/20 group-hover:bg-emerald-400/30'
            : 'bg-emerald-100 group-hover:bg-emerald-200'
        }`}
      />
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ring-2 ${
          isDark
            ? 'bg-white/15 ring-white/25 text-white'
            : 'bg-emerald-700 ring-emerald-300 text-white'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 relative z-10">
        <div className="font-black text-xl leading-tight">{title}</div>
        <div
          className={`text-sm mt-1 ${
            isDark ? 'text-white/90' : 'text-emerald-700'
          }`}
        >
          {desc}
        </div>
      </div>
      <div
        className={`transition-all group-hover:translate-x-1 ${
          isDark
            ? 'text-white/60 group-hover:text-white'
            : 'text-emerald-400 group-hover:text-emerald-700'
        }`}
      >
        →
      </div>
    </motion.button>
  );
}

/* ═══════════ Recorder Login (ครั้งแรกเท่านั้น) ═══════════ */
function RecorderLogin({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const handlePinComplete = () => {
    setTimeout(() => nameRef.current?.focus(), 100);
  };

  const submit = () => {
    if (loading) return;
    if (pin.length !== 4) {
      setError('กรุณาใส่ PIN 4 หลัก');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (!name.trim()) {
      setError('กรุณาใส่ชื่อ-นามสกุล');
      nameRef.current?.focus();
      return;
    }
    setLoading(true);
    const res = loginAsRecorder(name, pin);
    if (!res.ok) {
      setError(res.error!);
      setPin('');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setLoading(false);
      return;
    }
    router.replace('/record');
  };

  const canSubmit = pin.length === 4 && name.trim().length > 0 && !loading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border-2 border-emerald-200"
      onKeyDown={e => {
        if (e.key === 'Enter') submit();
      }}
    >
      <button
        onClick={onBack}
        className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1 text-sm mb-4 transition-colors font-bold"
      >
        <ArrowLeft className="w-4 h-4" /> กลับ
      </button>

      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-emerald-700 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200 mb-3">
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-lg font-black text-emerald-900">ตั้งค่าเริ่มต้น</h2>
        <p className="text-sm text-emerald-600 mt-1">
          ใส่ครั้งเดียว — ครั้งต่อไปเข้าได้เลย
        </p>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-black text-emerald-800 mb-2.5 text-center uppercase tracking-wider">
          🔐 PIN 4 หลัก
        </label>
        <PinInput
          length={4}
          value={pin}
          onChange={v => {
            setPin(v);
            setError('');
          }}
          onComplete={handlePinComplete}
          onEnter={() => nameRef.current?.focus()}
          color="dark"
          autoFocus
          shake={shake}
          showDigits
        />
      </div>

      <div className="mb-2">
        <label className="block text-sm font-black text-emerald-800 mb-1.5 uppercase tracking-wider">
          👤 ชื่อ-นามสกุล
        </label>
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={e => {
            setName(e.target.value);
            setError('');
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="เช่น สมชาย ใจดี"
          className="w-full px-4 py-3 text-base font-bold bg-emerald-50/50 border-2 border-emerald-200 rounded-2xl focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 transition-all text-emerald-900 placeholder:text-emerald-300"
        />
      </div>

      <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
        <p className="text-xs text-emerald-700 leading-relaxed">
          💡 <b>ครั้งแรกเท่านั้น</b> — ระบบจะจดจำคุณไว้
          ครั้งต่อไปเปิดเว็บเข้ามาใช้งานได้ทันที
          จะถาม PIN อีกครั้งเมื่อ<b>แก้ไข/ลบ</b>ข้อมูลเท่านั้น
        </p>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-red-600 font-bold text-center mt-3 bg-red-50 py-2 rounded-xl border border-red-100"
          >
            ❌ {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: canSubmit ? 1.02 : 1 }}
        whileTap={{ scale: canSubmit ? 0.98 : 1 }}
        onClick={submit}
        disabled={!canSubmit}
        className="w-full mt-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-500 text-white font-black disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Lock className="w-4 h-4" />
        )}
        ยืนยันและเข้าใช้งาน
      </motion.button>

      <p className="text-xs text-emerald-500 text-center mt-3">
        กด{' '}
        <kbd className="px-1.5 py-0.5 bg-emerald-100 rounded text-emerald-800 font-black">
          Enter
        </kbd>{' '}
        เพื่อยืนยัน
      </p>
    </motion.div>
  );
}

/* ═══════════ Staff Login ═══════════ */
function StaffLogin({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const submit = () => {
    if (loading || pin.length !== 6) return;
    setLoading(true);
    const res = loginAsStaff(pin);
    if (!res.ok) {
      setError(res.error!);
      setPin('');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setLoading(false);
      return;
    }
    router.replace('/calendar');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border-2 border-emerald-700"
      onKeyDown={e => {
        if (e.key === 'Enter') submit();
      }}
    >
      <button
        onClick={onBack}
        className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1 text-sm mb-4 transition-colors font-bold"
      >
        <ArrowLeft className="w-4 h-4" /> กลับ
      </button>

      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-300 mb-3">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-lg font-black text-emerald-900">โหมดเจ้าหน้าที่</h2>
        <p className="text-sm text-emerald-600 mt-1">
          ใส่ PIN 6 หลักเพื่อเข้าใช้งาน
        </p>
      </div>

      <PinInput
        length={6}
        value={pin}
        onChange={v => {
          setPin(v);
          setError('');
        }}
        onComplete={submit}
        onEnter={submit}
        color="dark"
        autoFocus
        shake={shake}
      />

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-red-600 font-bold text-center mt-4 bg-red-50 py-2 rounded-xl border border-red-100"
          >
            ❌ {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: pin.length === 6 ? 1.02 : 1 }}
        whileTap={{ scale: pin.length === 6 ? 0.98 : 1 }}
        onClick={submit}
        disabled={loading || pin.length !== 6}
        className="w-full mt-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-600 text-white font-black disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-300"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Lock className="w-4 h-4" />
        )}
        เข้าใช้งาน
      </motion.button>

      <p className="text-xs text-emerald-500 text-center mt-3">
        กด{' '}
        <kbd className="px-1.5 py-0.5 bg-emerald-100 rounded text-emerald-800 font-black">
          Enter
        </kbd>{' '}
        เพื่อยืนยัน
      </p>
    </motion.div>
  );
}