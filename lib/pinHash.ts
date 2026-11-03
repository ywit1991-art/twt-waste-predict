// Simple hash สำหรับ PIN (ไม่ใช่ cryptographic แต่พอใช้)
export function hashPin(pin: string): string {
  let hash = 0;
  const salt = 'twt-waste-2026';
  const str = salt + pin + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h' + Math.abs(hash).toString(36);
}

export function verifyPin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}