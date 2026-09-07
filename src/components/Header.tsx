'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, LogOut } from 'lucide-react';
import { store } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { UserSession } from '@/lib/types';
import NotificationDrawer from './NotificationDrawer';

export default function Header() {
  const router = useRouter();
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [session, setSession] = React.useState<UserSession | null>(null);

  React.useEffect(() => {
    const update = () => {
      const currentSession = store.getUserSession();
      setSession(currentSession);
      const notifs = store.getNotifications();
      setUnreadCount(notifs.filter(n => !n.isRead).length);
    };
    update();
    return store.subscribe(update);
  }, []);

  const handleLogout = async () => {
    await supabase?.auth.signOut();
    store.logout();
    router.push('/login');
  };

  return (
    <header className="h-16 pl-[17.5rem] pr-10 fixed top-0 left-0 right-0 z-30 bg-[#0b1728]/88 border-b border-[#263852] flex items-center justify-between backdrop-blur-md">
      {/* Search */}
      <div className="w-80">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-[#08111f] border border-[#263852] rounded-md pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-400 transition relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
        </div>

        {/* Auth User Info & Logout */}
        {session ? (
          <div className="flex items-center gap-2 pl-3 border-l border-slate-800 text-xs">
            <div className="text-right">
              <span className="font-semibold text-slate-200 block leading-none">{session.name}</span>
              <span className="text-[10px] text-slate-400">{session.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="px-3 py-1 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
