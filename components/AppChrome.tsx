'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import NavTabs from '@/components/NavTabs';
import { getSession, type Session } from '@/lib/session';

export default function AppChrome({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setReady(true);
  }, [pathname]);

  const isLanding = pathname === '/';
  const showChrome = !isLanding && ready && !!session;

  return (
    <>
      {/* Decorative background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none no-print">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-emerald-200/30 rounded-full blur-3xl animate-float" />
        <div
          className="absolute -bottom-40 -left-32 w-[500px] h-[500px] bg-emerald-100/40 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '1.5s' }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #047857 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <div className="relative mx-auto w-full px-4 lg:px-8 pb-24 lg:pb-8 max-w-2xl lg:max-w-[1400px] overflow-x-hidden">
        {showChrome && (
          <div className="no-print">
            <Header />
            <NavTabs />
          </div>
        )}
        <main>{children}</main>
      </div>
    </>
  );
}