'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  PenLine,
  Calendar,
  BarChart3,
  User,
  Shield,
  LogOut,
  RotateCcw,
  Calculator,
  Users,
  Printer
} from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import {
  getSession,
  clearSession,
  clearRecorderProfile,
  type Session
} from '@/lib/session';
import ConfirmDialog from '@/components/ConfirmDialog';

interface TabDef {
  href: string;
  icon: any;
  label: string;
}

const RECORDER_TABS: TabDef[] = [
  { href: '/record', icon: PenLine, label: 'บันทึก' },
  { href: '/calendar', icon: Calendar, label: 'ปฏิทิน' }
];

const STAFF_TABS: TabDef[] = [
  { href: '/calendar', icon: Calendar, label: 'ปฏิทิน' },
  { href: '/data', icon: BarChart3, label: 'ดูข้อมูล' }
];

const DATA_SUB_TABS = [
  { key: 'calc', icon: Calculator, label: 'พยากรณ์', href: '/data?mode=calc' },
  { key: 'stats', icon: BarChart3, label: 'สถิติ', href: '/data?mode=stats' },
  { key: 'collectors', icon: Users, label: 'ผู้บันทึก', href: '/data?mode=collectors' }
];

export default function NavTabs() {
  return (
    <Suspense fallback={null}>
      <NavTabsInner />
    </Suspense>
  );
}

function NavTabsInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  // Dialog states
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setReady(true);
  }, [pathname]);

  if (!ready || !session) return null;

  const isStaff = session.role === 'staff';
  const TABS = isStaff ? STAFF_TABS : RECORDER_TABS;
  const isDataPage = pathname === '/data' && isStaff;
  const currentMode = searchParams.get('mode') || 'calc';

  const activeIndex = Math.max(
    0,
    TABS.findIndex(
      t => pathname === t.href || pathname.startsWith(t.href + '/')
    )
  );
  const colWidth = 100 / TABS.length;

  const doLogout = () => {
    clearSession();
    router.replace('/');
  };

  const doReset = () => {
    clearRecorderProfile();
    clearSession();
    router.replace('/');
  };

  const handlePrint = () => {
    window.dispatchEvent(
      new CustomEvent('twt-print', { detail: currentMode })
    );
  };

  return (
    <>
      <div className="no-print mb-4 lg:mb-5">
        <motion.nav
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="relative flex flex-wrap lg:flex-nowrap items-center gap-2
                     bg-white/85 backdrop-blur-xl
                     p-1.5 rounded-2xl
                     shadow-[0_4px_24px_-8px_rgba(6,95,70,0.15)]
                     border border-emerald-100/70"
        >
          {/* Role badge (desktop) */}
          <div className="hidden lg:flex items-center gap-2.5 pl-3 pr-3 shrink-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                isStaff ? 'bg-emerald-700' : 'bg-emerald-600'
              }`}
            >
              {isStaff ? (
                <Shield className="w-4 h-4 text-white" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-emerald-900 leading-tight truncate max-w-[140px]">
                {isStaff ? 'เจ้าหน้าที่' : session.name}
              </div>
              <div className="text-xs text-emerald-600 leading-tight">
                {isStaff ? 'เห็นข้อมูลทั้งหมด' : 'บันทึกข้อมูลของฉัน'}
              </div>
            </div>
            <div className="w-px h-7 bg-emerald-100" />
          </div>

          {/* Main tabs */}
          <div
            className="relative grid gap-1 flex-1 lg:flex lg:gap-1 lg:flex-initial order-1"
            style={{ gridTemplateColumns: `repeat(${TABS.length}, 1fr)` }}
          >
            <motion.div
              className={`absolute top-1.5 bottom-1.5 rounded-xl shadow-md lg:hidden ${
                isStaff
                  ? 'bg-gradient-to-br from-emerald-800 to-emerald-600 shadow-emerald-300/50'
                  : 'bg-gradient-to-br from-emerald-700 to-emerald-500 shadow-emerald-200/50'
              }`}
              initial={false}
              animate={{
                left: `calc(${activeIndex * colWidth}% + 6px)`,
                width: `calc(${colWidth}% - 12px)`
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />

            {TABS.map(tab => {
              const Icon = tab.icon;
              const active =
                pathname === tab.href || pathname.startsWith(tab.href + '/');
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`relative z-10 py-3 lg:py-2.5 lg:px-5 rounded-xl
                              text-base font-bold
                              flex lg:flex-row flex-col items-center justify-center
                              gap-0.5 lg:gap-2 transition-all duration-200 ${
                    active
                      ? 'text-white lg:bg-gradient-to-br lg:from-emerald-700 lg:to-emerald-600 lg:shadow-md lg:shadow-emerald-200/60'
                      : 'text-slate-500 lg:text-emerald-700 hover:text-emerald-700 lg:hover:bg-emerald-50'
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Sub-tabs (เฉพาะ /data) */}
          {isDataPage && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-full lg:w-auto order-3 lg:order-2
                         flex items-center gap-1.5 lg:flex-initial
                         pt-2 lg:pt-0 border-t lg:border-t-0 border-emerald-100"
            >
              <div className="hidden lg:block w-px h-7 bg-emerald-100 shrink-0 mr-0.5" />

              {DATA_SUB_TABS.map(tab => {
                const Icon = tab.icon;
                const active = currentMode === tab.key;
                return (
                  <Link
                    key={tab.key}
                    href={tab.href}
                    className={`flex-1 lg:flex-initial flex items-center justify-center gap-1.5
                                px-3 py-2 rounded-xl text-sm font-bold
                                transition-all active:scale-[0.97] ${
                      active
                        ? 'bg-emerald-700 text-white shadow-md shadow-emerald-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </Link>
                );
              })}

              {currentMode !== 'collectors' && (
                <button
                  onClick={handlePrint}
                  className="flex-1 lg:flex-initial flex items-center justify-center gap-1.5
                             px-3 py-2 rounded-xl text-sm font-bold
                             transition-all active:scale-[0.97]
                             bg-white border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">พิมพ์</span>
                </button>
              )}
            </motion.div>
          )}

          {/* Reset (recorder only) */}
          {!isStaff && (
            <button
              onClick={() => setConfirmReset(true)}
              title="ตั้งค่าใหม่"
              className="flex items-center justify-center gap-1.5 text-sm font-bold text-emerald-700
                         px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100
                         active:scale-[0.97] transition-all shrink-0 order-4 lg:order-3"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline lg:inline">ตั้งค่า</span>
            </button>
          )}

          {/* Logout */}
          <button
            onClick={() => setConfirmLogout(true)}
            className="flex items-center gap-1.5 text-sm font-bold text-red-600
                       px-3 lg:px-4 py-2.5 rounded-xl
                       bg-red-50 hover:bg-red-100 active:scale-[0.97]
                       transition-all lg:mr-1 shrink-0 order-2 lg:order-5"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden lg:inline">ออก</span>
          </button>
        </motion.nav>
      </div>

      {/* ═══════ Confirm Dialogs ═══════ */}

      <ConfirmDialog
        open={confirmLogout}
        title="ออกจากระบบ?"
        message="คุณต้องการออกจากระบบใช่หรือไม่?"
        confirmText="ออกจากระบบ"
        cancelText="ยกเลิก"
        variant="danger"
        onConfirm={() => {
          setConfirmLogout(false);
          doLogout();
        }}
        onCancel={() => setConfirmLogout(false)}
      />

      <ConfirmDialog
        open={confirmReset}
        title="ตั้งค่าใหม่?"
        message="จะต้องใส่ชื่อ + PIN ใหม่อีกครั้งในครั้งถัดไป"
        confirmText="ตั้งค่าใหม่"
        cancelText="ยกเลิก"
        variant="warning"
        onConfirm={() => {
          setConfirmReset(false);
          doReset();
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  );
}