'use client';

import React from 'react';
import { UserCheck, Mail } from 'lucide-react';
import { Caregiver } from '@/lib/types';

type DatabasePatient = { id: string; name: string; room_number: string | null; caregiver_id: string | null };

export default function CaregiversPage() {
  const [caregivers, setCaregivers] = React.useState<Caregiver[]>([]);
  const [patients, setPatients] = React.useState<DatabasePatient[]>([]);

  const refresh = React.useCallback(async () => {
    const response = await fetch('/api/data?entity=caregivers');
    if (!response.ok) return;
    const data = await response.json();
    const uniqueCaregivers = (data.caregivers || []).filter(
      (caregiver: Caregiver, index: number, list: Caregiver[]) =>
        list.findIndex(item => item.email.toLowerCase() === caregiver.email.toLowerCase()) === index
    );
    setCaregivers(uniqueCaregivers);
    setPatients(data.patients || []);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleEditCaregiver = async (caregiver: Caregiver) => {
    const name = window.prompt('Caregiver name', caregiver.name);
    if (!name) return;
    const response = await fetch('/api/data', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'caregiver', id: caregiver.id, data: { name, role: caregiver.role, notifyEmail: caregiver.notifyEmail, notifyTelegram: caregiver.notifyTelegram } })
    });
    if (!response.ok) window.alert('Could not update caregiver.');
    else await refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-3">
          <UserCheck className="w-7 h-7 text-cyan-400" />
          Caregivers
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Care team members and their assigned patient workloads.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {caregivers.map(cg => {
          const assignedPatients = patients.filter(patient => patient.caregiver_id === cg.id);

          return (
            <div key={cg.id} className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-400/15 text-cyan-200 border-2 border-cyan-500/30 flex items-center justify-center text-lg font-bold">
                    {cg.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-100 text-base">{cg.name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {cg.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{cg.email}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-slate-300">Email Alerts ({cg.email})</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    {cg.notifyEmail ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              </div>

              {/* Assigned Patients */}
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                  Assigned Patients ({assignedPatients.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {assignedPatients.map(p => (
                    <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                      <span className="w-5 h-5 rounded-full bg-cyan-400/20 text-cyan-300 flex items-center justify-center text-[9px] font-bold">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-slate-200 font-medium">{p.name}</span>
                      <span className="text-[10px] text-cyan-400 font-semibold">({p.room_number || 'No room'})</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => void handleEditCaregiver(cg)} className="text-cyan-300 hover:text-cyan-200 text-xs font-semibold">
                Edit Caregiver
              </button>

            </div>
          );
        })}
      </div>
    </div>
  );
}
