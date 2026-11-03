'use client';

export type Role = 'recorder' | 'staff';

export interface Session {
  role: Role;
  name: string;
  pinHash: string;
  userId: string;
  loginAt: number;
}

export interface RecorderProfile {
  name: string;
  pinHash: string;
  userId: string;
  savedAt: number;
}

const SESSION_KEY = 'twt_session';
const PROFILE_KEY = 'twt_recorder_profile';
const TTL = 1000 * 60 * 60 * 24 * 30; // 30 วัน
const STAFF_PIN = process.env.NEXT_PUBLIC_STAFF_PIN || '888888';

/* ═══════════════════ Session ═══════════════════ */

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (Date.now() - s.loginAt > TTL) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function setSession(s: Omit<Session, 'loginAt'>) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ ...s, loginAt: Date.now() })
  );
}

/**
 * ⭐ สำคัญ: ลบแค่ SESSION_KEY เท่านั้น
 * ไม่ลบ PROFILE_KEY → auto-login ครั้งต่อไปได้
 */
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/* ═══════════════════ Recorder Profile (ถาวร) ═══════════════════ */

export function getRecorderProfile(): RecorderProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RecorderProfile;
  } catch {
    return null;
  }
}

export function hasRecorderProfile(): boolean {
  return !!getRecorderProfile();
}

export function clearRecorderProfile() {
  localStorage.removeItem(PROFILE_KEY);
}

/* ═══════════════════ Login ═══════════════════ */

/**
 * Login ครั้งแรก — บันทึกโปรไฟล์ถาวร + สร้าง session
 */
export function loginAsRecorder(
  name: string,
  pin4: string
): { ok: boolean; error?: string } {
  if (!name.trim()) return { ok: false, error: 'กรุณาใส่ชื่อ' };
  if (!/^\d{4}$/.test(pin4))
    return { ok: false, error: 'PIN ต้องเป็นตัวเลข 4 หลัก' };

  const trimmedName = name.trim();
  const pinHash = hashPin(pin4);
  const userId = `u_${hashPin(trimmedName.toLowerCase() + ':' + pin4)}`;

  // ⭐ บันทึกโปรไฟล์ถาวร
  const profile: RecorderProfile = {
    name: trimmedName,
    pinHash,
    userId,
    savedAt: Date.now()
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

  // สร้าง session
  setSession({
    role: 'recorder',
    name: trimmedName,
    pinHash,
    userId
  });

  return { ok: true };
}

/**
 * Auto-login จากโปรไฟล์ที่บันทึกไว้
 * ใช้เมื่อเปิดครั้งต่อไป — ไม่ต้องใส่ PIN
 */
export function autoLoginRecorder(): { ok: boolean; error?: string } {
  const p = getRecorderProfile();
  if (!p) return { ok: false, error: 'ไม่พบโปรไฟล์' };

  setSession({
    role: 'recorder',
    name: p.name,
    pinHash: p.pinHash,
    userId: p.userId
  });
  return { ok: true };
}

export function loginAsStaff(pin6: string): { ok: boolean; error?: string } {
  if (!/^\d{6}$/.test(pin6))
    return { ok: false, error: 'PIN ต้องเป็นตัวเลข 6 หลัก' };
  if (pin6 !== STAFF_PIN)
    return { ok: false, error: 'PIN เจ้าหน้าที่ไม่ถูกต้อง' };

  setSession({
    role: 'staff',
    name: 'เจ้าหน้าที่',
    pinHash: hashPin(pin6),
    userId: 'staff'
  });
  return { ok: true };
}

/* ═══════════════════ Helpers ═══════════════════ */

export function isStaff() {
  return getSession()?.role === 'staff';
}

export function ownsRecord(r: { user_name: string }): boolean {
  const s = getSession();
  if (!s) return false;
  if (s.role === 'staff') return true;
  return r.user_name?.trim().toLowerCase() === s.name.trim().toLowerCase();
}

export function hashPin(pin: string): string {
  let hash = 0;
  const salt = 'twt-waste-2026';
  const str = salt + pin + salt;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = (hash << 5) - hash + c;
    hash = hash & hash;
  }
  return 'h' + Math.abs(hash).toString(36);
}

// backward compat
export const clearStaffSession = clearSession;