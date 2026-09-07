'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, UserCheck, PackageCheck, Pill,
  CalendarClock, Radio, LogOut
} from 'lucide-react';
import { store } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { UserSession } from '@/lib/types';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = React.useState<UserSession | null>(null);

  React.useEffect(() => {
    const update = () => setSession(store.getUserSession());
    update();
    return store.subscribe(update);
  }, []);

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Patients', href: '/patients', icon: Users },
    { name: 'Caregivers', href: '/caregivers', icon: UserCheck },
    { name: 'Pill Boxes', href: '/boxes', icon: PackageCheck },
    { name: 'Medicines', href: '/medicines', icon: Pill },
    { name: 'Schedules', href: '/schedules', icon: CalendarClock },
    { name: 'Live Monitor', href: '/monitoring', icon: Radio },
  ];

  return (
    <aside className="w-60 h-screen fixed left-0 top-0 z-40 bg-[#0b1728]/95 border-r border-[#263852] flex flex-col justify-between">
      <div>
        {/* Brand */}
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-[#263852]">
          <div className="w-8 h-8 rounded-md bg-cyan-400 flex items-center justify-center text-slate-950 font-bold">
            <Pill className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-100 text-base leading-none tracking-tight">
              PillCare <span className="text-cyan-400">IoT</span>
            </h1>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] text-[12px]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition ${
                  isActive
                    ? 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/25'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile / Logout */}
      <div className="p-3 border-t border-[#263852] bg-[#08111f]/55 text-xs">
        {session ? (
          <div className="flex items-center justify-between">
            <div className="overflow-hidden mr-2">
              <p className="font-semibold text-slate-200 truncate">{session.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{session.role}</p>
            </div>
            <button
              onClick={async () => {
                await supabase?.auth.signOut();
                store.logout();
                router.push('/login');
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link href="/login" className="block text-center text-cyan-400 font-semibold py-1">
            Sign In Account
          </Link>
        )}
      </div>
    </aside>
  );
}
