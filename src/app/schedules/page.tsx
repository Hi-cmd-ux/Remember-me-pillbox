'use client';

import React from 'react';
import { CalendarClock, Plus, Clock, Pill, Cpu, CheckCircle2, X } from 'lucide-react';
import { store } from '@/lib/store';
import { Schedule } from '@/lib/types';

type ScheduleOptions = {
  patients: { id: string; name: string; room_number: string | null }[];
  medicines: { id: string; name: string; strength: string }[];
  boxes: { id: string; name: string; patient_id: string | null; compartments: { compartment_number: number; label: string }[] }[];
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = React.useState<Schedule[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  // Form State
  const [patientId, setPatientId] = React.useState(store.getPatients()[0]?.id || '');
  const [medicineId, setMedicineId] = React.useState(store.getMedicines()[0]?.id || '');
  const [compartmentId, setCompartmentId] = React.useState(1);
  const [scheduledTime, setScheduledTime] = React.useState('14:00');
  const [timeWindow, setTimeWindow] = React.useState(30);
  const [formError, setFormError] = React.useState('');
  const [options, setOptions] = React.useState<ScheduleOptions>({ patients: [], medicines: [], boxes: [] });

  const selectedBox = options.boxes.find(item => item.patient_id === patientId) || options.boxes[0];

  const refresh = React.useCallback(async () => {
    const response = await fetch('/api/data?entity=schedules');
    if (!response.ok) return;
    const result = await response.json();
    setSchedules((result.data || []).map((schedule: Record<string, unknown>) => ({
      id: schedule.id,
      patientId: schedule.patient_id,
      patientName: Array.isArray(schedule.patients) ? (schedule.patients[0] as Record<string, string> | undefined)?.name || 'Patient' : 'Patient',
      pillBoxId: schedule.pill_box_id,
      compartmentId: schedule.compartment_id,
      medicineId: schedule.medicine_id,
      medicineName: Array.isArray(schedule.medicines) ? (schedule.medicines[0] as Record<string, string> | undefined)?.name || 'Medicine' : 'Medicine',
      dosage: schedule.dosage,
      scheduledTime: schedule.scheduled_time,
      timeWindowMinutes: schedule.time_window_minutes,
      repeatDays: schedule.repeat_days || [],
      isActive: schedule.is_active
    })));
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    void fetch('/api/data?entity=schedule-options')
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Could not load schedule options')))
      .then(data => {
        setOptions(data);
        setPatientId(current => data.patients.some((patient: { id: string }) => patient.id === current) ? current : data.patients[0]?.id || '');
        setMedicineId(current => data.medicines.some((medicine: { id: string }) => medicine.id === current) ? current : data.medicines[0]?.id || '');
        setCompartmentId(data.boxes[0]?.compartments[0]?.compartment_number || 1);
      })
      .catch(error => setFormError(error instanceof Error ? error.message : 'Could not load schedule options.'));
  }, []);

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const patient = options.patients.find(item => item.id === patientId);
    const medicine = options.medicines.find(item => item.id === medicineId);
    const box = selectedBox;

    if (!patient || !medicine || !box) {
      setFormError(
        options.patients.length === 0
          ? 'No patients are saved in the database. Add a patient first.'
          : options.boxes.length === 0
          ? 'No pill boxes are saved in the database. Register a pill box first.'
          : 'Select a valid patient, medicine, and pill box before saving.'
      );
      return;
    }

    const schedule = {
      patientId: patient.id,
      patientName: patient.name,
      pillBoxId: box.id,
      compartmentId,
      medicineId: medicine.id,
      medicineName: medicine.name,
      dosage: '1 Tablet',
      scheduledTime,
      timeWindowMinutes: timeWindow,
      repeatDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      isActive: true
    };
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'schedule', data: schedule })
    });
    if (!response.ok) {
      setFormError('Could not save schedule to the database.');
      return;
    }
    store.addSchedule(schedule);

    setIsAddModalOpen(false);
  };

  const handleEditSchedule = async (schedule: Schedule) => {
    const scheduledTime = window.prompt('Scheduled time (HH:MM)', schedule.scheduledTime);
    if (!scheduledTime) return;
    const timeWindowMinutes = Number(window.prompt('Time window in minutes', String(schedule.timeWindowMinutes)));
    const response = await fetch('/api/data', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'schedule', id: schedule.id, data: { scheduledTime, timeWindowMinutes: Number.isFinite(timeWindowMinutes) ? timeWindowMinutes : schedule.timeWindowMinutes, compartmentId: schedule.compartmentId, isActive: schedule.isActive } })
    });
    if (!response.ok) window.alert('Could not update schedule.');
    else await refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-3">
            <CalendarClock className="w-7 h-7 text-cyan-400" />
            Medication Schedules & Time Windows
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Assign medicines to specific pill box compartments, alarm times, and allowable intake grace windows.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Schedule</span>
        </button>
      </div>

      {/* Schedule Table Matrix */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4">Scheduled Time</th>
                <th className="p-4">Patient</th>
                <th className="p-4">Medicine</th>
                <th className="p-4">Box & Compartment</th>
                <th className="p-4">Time Window</th>
                <th className="p-4">Repeat</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {schedules.map(sch => (
                <tr key={sch.id} className="hover:bg-slate-900/40 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-2 font-bold text-sm text-cyan-300">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>{sch.scheduledTime}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <button onClick={() => void handleEditSchedule(sch)} className="text-cyan-300 hover:text-cyan-200 font-semibold">
                      Edit
                    </button>
                  </td>
                  <td className="p-4 font-semibold">{sch.patientName}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Pill className="w-3.5 h-3.5 text-teal-400" />
                      <span>{sch.medicineName}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                      <Cpu className="w-3.5 h-3.5 text-purple-400" />
                      <span>Slot {sch.compartmentId}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px]">
                      ±{sch.timeWindowMinutes} mins
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">{sch.repeatDays.join(', ')}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Schedule Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-cyan-400" />
                Assign Schedule
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-4 text-xs">
              {formError && (
                <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-rose-300">
                  {formError}
                </div>
              )}
              {(options.patients.length === 0 || options.boxes.length === 0) && (
                <p className="text-slate-400 leading-5">
                  Create the patient and register the ESP32 pill box in the database before assigning a schedule.
                </p>
              )}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Select Patient</label>
                <select
                  value={patientId}
                  onChange={e => setPatientId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                >
                  {options.patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.room_number || 'No room'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Select Medicine</label>
                <select
                  value={medicineId}
                  onChange={e => setMedicineId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                >
                  {options.medicines.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.strength})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Compartment</label>
                  <select
                    value={compartmentId}
                    onChange={e => setCompartmentId(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  >
                    {(selectedBox?.compartments || []).map(compartment => (
                      <option key={compartment.compartment_number} value={compartment.compartment_number}>
                        {compartment.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Time (HH:MM)</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={e => setScheduledTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Window (Mins)</label>
                  <input
                    type="number"
                    value={timeWindow}
                    onChange={e => setTimeWindow(parseInt(e.target.value) || 30)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
