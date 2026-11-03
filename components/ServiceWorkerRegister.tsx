'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    let refreshing = false;

    /* ⭐ เมื่อ SW ใหม่เข้ามา → reload หน้าอัตโนมัติ */
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      console.log('🔄 พบเวอร์ชันใหม่ — กำลังโหลด...');
      window.location.reload();
    });

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        console.log('✅ SW registered');

        /* เช็คอัปเดตทุก 30 วินาที */
        setInterval(() => {
          reg.update().catch(() => {});
        }, 30 * 1000);
      } catch (err) {
        console.warn('SW registration failed:', err);
      }
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}