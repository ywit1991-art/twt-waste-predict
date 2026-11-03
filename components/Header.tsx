'use client';

import { motion } from 'framer-motion';

export default function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="no-print flex flex-col lg:flex-row items-center lg:items-center py-5 lg:py-4 lg:gap-5 text-center lg:text-left"
    >
      {/* Logo */}
      <motion.div
        whileHover={{ scale: 1.05, rotate: 3 }}
        whileTap={{ scale: 0.95 }}
className="relative w-16 h-16 lg:w-14 lg:h-14 rounded-full
           bg-white shadow-[0_6px_24px_-8px_rgba(6,95,70,0.25)]
           ring-2 ring-emerald-100
           flex items-center justify-center overflow-hidden
           mb-3 lg:mb-0 shrink-0"
      >
        <img
          src="/logo.png"
          alt="logo"
          className="w-full h-full object-contain p-2.5 lg:p-2"
          onError={e => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <span className="absolute inset-0 rounded-full ring-2 ring-emerald-200/60 animate-pulse-ring" />
      </motion.div>

      {/* Title block */}
      <div className="lg:flex-1 lg:min-w-0">
        <h1 className="text-page-title text-gradient-emerald">
          เทศบาลตำบลท่าวังทอง
        </h1>
        <p className="text-sm lg:text-base font-semibold text-emerald-700 mt-1 lg:mt-0.5">
          สถิติการจัดเก็บขยะเพื่อพยากรณ์ปริมาณขยะทั้งปี
        </p>
      </div>
    </motion.header>
  );
}