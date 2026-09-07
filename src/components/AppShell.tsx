'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { supabase } from '@/lib/supabase';
import { store } from '@/lib/store';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(pathname !== '/login');

  React.useEffect(() => {
    if (pathname === '/login' || !supabase) {
      setIsCheckingAuth(false);
      return;
    }

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        store.logout();
        router.replace('/login');
        return;
      }
      setIsCheckingAuth(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        store.logout();
        router.replace('/login');
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (isCheckingAuth) {
    return <div className="min-h-screen bg-[#08111f]" />;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <Header />
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}