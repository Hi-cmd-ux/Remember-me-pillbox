'use client';

import React from 'react';
import { Bell, CheckCheck, Trash2, AlertTriangle, CheckCircle2, Package, WifiOff } from 'lucide-react';
import { store } from '@/lib/store';
import { NotificationAlert } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({ isOpen, onClose }: Props) {
  const [notifications, setNotifications] = React.useState<NotificationAlert[]>([]);

  React.useEffect(() => {
    const update = () => setNotifications([...store.getNotifications()]);
    update();
    return store.subscribe(update);
  }, []);

  if (!isOpen) return null;

  const getIcon = (type: NotificationAlert['type']) => {
    switch (type) {
      case 'DOSE_TAKEN':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'DOSE_MISSED':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'LOW_STOCK':
        return <Package className="w-4 h-4 text-amber-400" />;
      case 'DEVICE_OFFLINE':
        return <WifiOff className="w-4 h-4 text-slate-400" />;
      default:
        return <Bell className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="absolute right-0 top-14 w-96 glass-panel rounded-2xl border border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-slate-100">Live Alerts & Telegram Logs</h3>
          <span className="px-2 py-0.5 text-[10px] rounded-full bg-cyan-500/20 text-cyan-300 font-bold">
            {notifications.filter(n => !n.isRead).length} New
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => notifications.forEach(n => store.markNotificationAsRead(n.id))}
            title="Mark all as read"
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
          >
            <CheckCheck className="w-4 h-4" />
          </button>
          <button
            onClick={() => store.clearAllNotifications()}
            title="Clear all"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No active alerts at the moment.
          </div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id}
              onClick={() => store.markNotificationAsRead(n.id)}
              className={`p-3 text-xs transition cursor-pointer flex gap-3 ${
                n.isRead ? 'bg-slate-950/40 opacity-75' : 'bg-slate-900/80 hover:bg-slate-800/80 border-l-2 border-cyan-500'
              }`}
            >
              <div className="mt-0.5">{getIcon(n.type)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-200">{n.title}</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-slate-300 leading-snug">{n.message}</p>
                {n.sentToTelegram && (
                  <span className="inline-block mt-1 text-[9px] text-sky-400 font-medium">
                    ✓ Telegram alert sent
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
