'use client';

import React from 'react';
import { Radio, Terminal } from 'lucide-react';
import { store } from '@/lib/store';
import { DeviceEvent } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useDeviceRealtime } from '@/lib/useDeviceRealtime';

export default function MonitoringPage() {
  const [events, setEvents] = React.useState<DeviceEvent[]>([]);
  const [filterSeverity, setFilterSeverity] = React.useState<string>('ALL');

  const refresh = React.useCallback(async () => {
    if (!supabase) {
      setEvents([...store.getEvents()]);
      return;
    }

    const { data } = await supabase
      .from('device_events')
      .select('id, pill_box_id, event_type, compartment_number, details, severity, raw_payload, created_at, pill_boxes(name)')
      .order('created_at', { ascending: false })
      .limit(50);

    setEvents((data || []).map(event => {
      const pillBox = Array.isArray(event.pill_boxes) ? event.pill_boxes[0] : event.pill_boxes;
      return {
        id: event.id,
        pillBoxId: event.pill_box_id,
        pillBoxName: pillBox?.name || 'ESP32 Pill Box',
        eventType: event.event_type,
        compartmentId: event.compartment_number || undefined,
        details: event.details,
        timestamp: event.created_at,
        rawPayload: event.raw_payload || undefined,
        severity: event.severity || 'INFO'
      } as DeviceEvent;
    }));
  }, []);

  React.useEffect(() => {
    void refresh();
    return store.subscribe(() => { void refresh(); });
  }, [refresh]);

  useDeviceRealtime(() => { void refresh(); });

  const filteredEvents = events.filter(e => {
    if (filterSeverity === 'ALL') return true;
    return e.severity === filterSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-3">
            <Radio className="w-7 h-7 text-cyan-400 animate-pulse" />
            Real-Time IoT Telemetry Monitor & Console
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Live WebSocket / Supabase Realtime event feed for hardware triggers, IR beam interrupts, and weight load changes.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Event Severities</option>
            <option value="SUCCESS">SUCCESS (Intake Verified)</option>
            <option value="ALERT">ALERT (Missed Doses)</option>
            <option value="WARNING">WARNING (Low Stock)</option>
          </select>
        </div>
      </div>

      {/* Terminal View */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden font-mono">
        {/* Terminal Bar */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-200">ESP32 Live Stream Payload Console</span>
          </div>

          <div className="flex items-center gap-2 text-[10px]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400 font-bold">SUPABASE REALTIME ACTIVE</span>
          </div>
        </div>

        {/* Log Lines */}
        <div className="p-4 bg-[#070a13] max-h-[500px] overflow-y-auto space-y-2 text-xs">
          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-sans">
              No events captured matching severity filter.
            </div>
          ) : (
            filteredEvents.map(evt => (
              <div 
                key={evt.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      evt.severity === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' :
                      evt.severity === 'ALERT' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      [{evt.severity}] {evt.eventType}
                    </span>
                    <span className="text-slate-400">{evt.pillBoxName}</span>
                  </div>

                  <span className="text-slate-500">
                    {new Date(evt.timestamp).toISOString()}
                  </span>
                </div>

                <p className="text-slate-200 font-sans font-medium text-xs pt-1">{evt.details}</p>

                {evt.rawPayload && (
                  <pre className="text-[10px] text-cyan-300/80 bg-slate-950 p-2 rounded-lg border border-slate-800/60 overflow-x-auto mt-2">
                    {JSON.stringify(evt.rawPayload, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
