'use client';

import React from 'react';
import { Users, UserPlus, Phone, Cpu, X, Plus } from 'lucide-react';
import { store } from '@/lib/store';
import { Patient } from '@/lib/types';

type CaregiverOption = { id: string; name: string; email: string; role: string };

export default function PatientsPage() {
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Form State
  const [name, setName] = React.useState('');
  const [age, setAge] = React.useState('75');
  const [gender, setGender] = React.useState('Female');
  const [roomNumber, setRoomNumber] = React.useState('Room 101');
  const [conditions, setConditions] = React.useState('Hypertension');
  const [contactName, setContactName] = React.useState('');
  const [contactPhone, setContactPhone] = React.useState('');
  const [contactRelationship, setContactRelationship] = React.useState('Family');
  const [caregiverId, setCaregiverId] = React.useState('');
  const [caregivers, setCaregivers] = React.useState<CaregiverOption[]>([]);

  const refresh = React.useCallback(async () => {
    const response = await fetch('/api/data?entity=patients');
    if (!response.ok) return;
    const result = await response.json();
    setPatients((result.data || []).map((patient: Record<string, unknown>) => ({
      id: patient.id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      roomNumber: patient.room_number || '',
      caregiverId: patient.caregiver_id || undefined,
      medicalConditions: patient.medical_conditions || [],
      emergencyContact: {
        name: patient.emergency_contact_name || 'Not provided',
        phone: patient.emergency_contact_phone || 'Not provided',
        relationship: patient.emergency_contact_relationship || 'Not provided'
      },
      complianceRate: patient.compliance_rate ?? 100,
      createdAt: patient.created_at
    })));
  }, []);

  React.useEffect(() => {
    void refresh();
    return store.subscribe(refresh);
  }, [refresh]);

  React.useEffect(() => {
    void fetch('/api/data?entity=patient-options')
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Could not load caregivers')))
      .then(data => setCaregivers(data.caregivers || []))
      .catch(() => setCaregivers([]));
  }, []);

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const patient = {
      name,
      age: parseInt(age) || 70,
      gender,
      roomNumber,
      caregiverId: caregiverId || undefined,
      medicalConditions: conditions.split(',').map(s => s.trim()).filter(Boolean),
      emergencyContact: {
        name: contactName || 'Family Contact',
        phone: contactPhone || '+1 (555) 000-0000',
        relationship: contactRelationship
      },
      complianceRate: 100
    };

    const response = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'patient', data: patient })
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      window.alert(result?.error || 'Could not save patient to the database.');
      return;
    }
    store.addPatient(patient);

    setIsModalOpen(false);
    setName('');
  };

  const handleEditPatient = async (patient: Patient) => {
    const updatedName = window.prompt('Patient name', patient.name);
    if (!updatedName) return;
    const updatedRoom = window.prompt('Room / ward number', patient.roomNumber) || patient.roomNumber;
    const response = await fetch('/api/data', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'patient',
        id: patient.id,
        data: { name: updatedName, roomNumber: updatedRoom, caregiverId: patient.caregiverId }
      })
    });
    if (!response.ok) window.alert('Could not update patient.');
    else await refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Patients Directory
          </h2>
          <p className="text-xs text-slate-400">Manage patient profiles, ward rooms, and medical contacts.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register Patient</span>
        </button>
      </div>

      {patients.length === 0 ? (
        <div className="clean-card p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No Patients Added Yet</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Click &quot;Add Patient&quot; to create a new patient profile and assign smart pill boxes.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs"
          >
            Register First Patient
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map(patient => (
            <div key={patient.id} className="clean-card p-4 space-y-3 text-xs">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">{patient.name}</h3>
                  <p className="text-slate-400">{patient.age} yrs • {patient.gender} • <span className="text-cyan-400">{patient.roomNumber}</span></p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                  {patient.complianceRate}% Adherence
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Medical Conditions</span>
                <div className="flex flex-wrap gap-1">
                  {patient.medicalConditions.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 text-[10px]">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center text-[11px]">
                <div>
                  <span className="text-slate-400 block">Emergency Contact</span>
                  <span className="font-medium text-slate-200">{patient.emergencyContact.name} ({patient.emergencyContact.phone})</span>
                </div>
              </div>
              <button onClick={() => void handleEditPatient(patient)} className="text-cyan-300 hover:text-cyan-200 text-xs font-semibold">
                Edit Patient
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="clean-card w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-slate-100">Register Patient</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleAddPatient} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-slate-200"
                  >
                    <option>Female</option>
                    <option>Male</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Room / Ward Number</label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={e => setRoomNumber(e.target.value)}
                  placeholder="e.g. Room 204"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Medical Conditions</label>
                <input
                  type="text"
                  value={conditions}
                  onChange={e => setConditions(e.target.value)}
                  placeholder="Hypertension, Diabetes"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-3">
                <p className="text-slate-300 font-semibold">Emergency Contact</p>
                <div>
                  <label className="text-slate-400 block mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="e.g. Maria Silva"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Phone</label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                      placeholder="+1 555 000 0000"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Relationship</label>
                    <select
                      value={contactRelationship}
                      onChange={e => setContactRelationship(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-slate-200"
                    >
                      <option>Family</option>
                      <option>Spouse</option>
                      <option>Parent</option>
                      <option>Sibling</option>
                      <option>Friend</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Assign Caregiver</label>
                <select
                  value={caregiverId}
                  onChange={e => setCaregiverId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                >
                  <option value="">Unassigned</option>
                  {caregivers.map(caregiver => (
                    <option key={caregiver.id} value={caregiver.id}>
                      {caregiver.name} ({caregiver.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold"
                >
                  Save Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
