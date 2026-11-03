'use client';

import { useEffect } from 'react';

export default function Protection() {
  useEffect(() => {
    // 1. ปิดการคลิกขวา
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 2. ปิด Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 - DevTools
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+I/J/C - DevTools
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
        e.preventDefault();
        return false;
      }

      // Ctrl+U - View Source
      if (e.ctrlKey && e.key.toUpperCase() === 'U') {
        e.preventDefault();
        return false;
      }

      // Ctrl+S - Save Page
      if (e.ctrlKey && e.key.toUpperCase() === 'S') {
        e.preventDefault();
        return false;
      }

      // Ctrl+P - Print (ให้ทำงานเฉพาะบางหน้า)
      // ถ้าไม่ต้องการปิดการพิมพ์ ให้ comment บรรทัดนี้
      // if (e.ctrlKey && e.key.toUpperCase() === 'P') {
      //   e.preventDefault();
      //   return false;
      // }

      // Ctrl+A - Select All
      if (e.ctrlKey && e.key.toUpperCase() === 'A') {
        const target = e.target as HTMLElement;
        // อนุญาตให้ select ได้ถ้าอยู่ใน input
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          return false;
        }
      }
    };

    // 3. ปิดการ drag รูป
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.preventDefault();
      }
    };

    // 4. ตรวจจับ DevTools (เบา ๆ)
    const detectDevTools = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      if (widthDiff > threshold || heightDiff > threshold) {
        console.log('%c⚠️ กรุณาปิด Developer Tools',
          'color: red; font-size: 30px; font-weight: bold;');
        console.log('%cระบบนี้เป็นลิขสิทธิ์ของเทศบาลตำบลท่าวังทอง',
          'color: red; font-size: 16px;');
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragstart', handleDragStart);

    const interval = setInterval(detectDevTools, 1000);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragstart', handleDragStart);
      clearInterval(interval);
    };
  }, []);

  return null;
}