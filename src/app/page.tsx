'use client';

import React from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, Clock, AlertTriangle, Cpu, TrendingUp, 
  Plus, Users, Pill, CalendarClock, Zap, ShieldAlert, ArrowRight
} from 'lucide-react';
import { store } from '@/lib/store';
import { DoseRecord, PillBox, DeviceEvent, Patient, Medicine } from '@/lib/types';
import PillBoxVisualizer from '@/components/PillBoxVisualizer';
import { useDeviceRealtime } from '@/lib/useDeviceRealtime';

export default function Dashboard() {
  const [doses, setDoses] = React.useState<DoseRecord[]>([]);
  const [boxes, setBoxes] = React.useState<PillBox[]>([]);
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [medicines, setMedicines] = React.useState<Medicine[]>([]);
  const [events, setEvents] = React.useState<DeviceEvent[]>([]);

  const refreshData = React.useCallback(async () => {
    const response = await fetch('/api/data?entity=dashboard');
    if (!response.ok) return;
    const data = await response.json();
    setPatients(data.patients || []);
    setBoxes((data.boxes || []).map((box: Record<string, unknown>) => ({
      ...box,
      patientName: Array.isArray(box.patients) ? (box.patients[0] as Record<string, string> | undefined)?.name : undefined,
      compartments: Array.isArray(box.compartments) ? box.compartments.map((compartment: Record<string, unknown>) => ({
        ...compartment,
        id: compartment.compartment_number,
        medicineName: Array.isArray(compartment.medicines) ? (compartment.medicines[0] as Record<string, string> | undefined)?.name : undefined
      })) : []
    })));
    setDoses((data.doses || []).map((dose: Record<string, unknown>) => ({
      ...dose,
      compartmentId: dose.compartment_number,
      patientName: Array.isArray(dose.patients) ? (dose.patients[0] as Record<string, string> | undefined)?.name || 'Patient' : 'Patient',
      medicineName: Array.isArray(dose.medicines) ? (dose.medicines[0] as Record<string, string> | undefined)?.name || 'Medicine' : 'Medicine',
      scheduledDate: dose.scheduled_date,
      scheduledTime: dose.scheduled_time
    })));
    setEvents((data.events || []).map((event: Record<string, unknown>) => ({
      ...event,
      pillBoxId: event.pill_box_id,
      pillBoxName: Array.isArray(event.pill_boxes) ? (event.pill_boxes[0] as Record<string, string> | undefined)?.name || 'Pill Box' : 'Pill Box',
      eventType: event.event_type,
      compartmentId: event.compartment_number,
      timestamp: event.created_at,
      rawPayload: event.raw_payload
    })));
  }, []);

  React.useEffect(() => {
    void refreshData();
    const timer = window.setInterval(() => {
      void fetch('/api/missed-doses', { method: 'POST' }).then(() => refreshData());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [refreshData]);

  useDeviceRealtime(() => { void refreshData(); });

  const checkMissedDoses = async () => {
    await fetch('/api/missed-doses', { method: 'POST' });
    await refreshData();
  };

  // Derived metrics
  const totalDosesToday = doses.length;
  const takenDosesToday = doses.filter(d => d.status === 'TAKEN').length;
  const pendingDosesToday = doses.filter(d => d.status === 'PENDING').length;
  const missedDosesToday = doses.filter(d => d.status === 'MISSED').length;
  const adherenceRate = totalDosesToday > 0 ? Math.round((takenDosesToday / totalDosesToday) * 100) : 100;
  const onlineBoxes = boxes.filter(b => b.status === 'ONLINE').length;

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Smart Pill Box Dashboard</h2>
          <p className="text-xs text-slate-400">Live medication monitoring and ESP32 hardware telemetry.</p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => {
              void checkMissedDoses();
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium transition flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Check Missed Doses</span>
          </button>

          <Link
            href="/patients"
            className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Patient</span>
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="clean-card p-4 space-y-1">
          <span className="text-xs text-slate-400 font-medium block">Total Patients</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-100">{patients.length}</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-[11px] text-slate-500">Monitored in system</p>
        </div>

        <div className="clean-card p-4 space-y-1">
          <span className="text-xs text-slate-400 font-medium block">Connected Devices</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-100">{onlineBoxes}/{boxes.length}</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-[11px] text-slate-500">ESP32 Online</p>
        </div>

        <div className="clean-card p-4 space-y-1">
          <span className="text-xs text-slate-400 font-medium block">Adherence Rate</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-400">{adherenceRate}%</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-[11px] text-slate-500">{takenDosesToday} taken / {totalDosesToday} scheduled</p>
        </div>

        <div className="clean-card p-4 space-y-1">
          <span className="text-xs text-slate-400 font-medium block">Missed Doses</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-400">{missedDosesToday}</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-[11px] text-slate-500">{pendingDosesToday} pending today</p>
        </div>
      </div>

      {/* Main Grid: Today's Timeline & Live Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule Timeline (2 Columns) */}
        <div className="lg:col-span-2 clean-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Today&apos;s Medication Schedule
            </h3>
            <Link href="/schedules" className="text-xs text-cyan-400 hover:underline">
              Manage Schedules
            </Link>
          </div>

          {doses.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-xs text-slate-400">No schedules configured yet.</p>
              <div className="flex justify-center gap-2">
                <Link 
                  href="/patients" 
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-cyan-400 hover:bg-slate-700 text-xs font-semibold"
                >
                  1. Add Patient
                </Link>
                <Link 
                  href="/schedules" 
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs"
                >
                  2. Create Schedule
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {doses.map(dose => (
                <div 
                  key={dose.id}
                  className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-cyan-400 bg-slate-950 px-2 py-1 rounded">
                      {dose.scheduledTime}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-200">{dose.medicineName}</p>
                      <p className="text-[11px] text-slate-400">Patient: {dose.patientName} (Slot {dose.compartmentId})</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    dose.status === 'TAKEN'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : dose.status === 'MISSED'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {dose.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hardware Telemetry Feed (1 Column) */}
        <div className="clean-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              Live Events Stream
            </h3>
            <Link href="/monitoring" className="text-xs text-cyan-400 hover:underline">
              Console
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No hardware telemetry recorded.
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {events.slice(0, 5).map(evt => (
                <div key={evt.id} className="p-2.5 rounded-lg bg-slate-900 text-xs space-y-0.5">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>{evt.eventType}</span>
                    <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-200 text-[11px]">{evt.details}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pill Box Cards */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-100 text-sm">Monitored Smart Pill Boxes</h3>
        {boxes.length === 0 ? (
          <div className="clean-card p-8 text-center space-y-3">
            <p className="text-xs text-slate-400">No Pill Boxes registered in system.</p>
            <Link 
              href="/boxes" 
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Register Pill Box</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {boxes.map(box => (
              <PillBoxVisualizer key={box.id} box={box} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
