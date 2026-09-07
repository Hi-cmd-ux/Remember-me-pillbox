'use client';

import React from 'react';
import { PackageCheck, Cpu, Key, Plus, X, Copy, Check } from 'lucide-react';
import { store } from '@/lib/store';
import { PillBox } from '@/lib/types';
import PillBoxVisualizer from '@/components/PillBoxVisualizer';

export default function BoxesPage() {
  const [boxes, setBoxes] = React.useState<PillBox[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Form State
  const [name, setName] = React.useState('');
  const [model, setModel] = React.useState<'BOX_1_SERVO_WEIGHT' | 'BOX_2_MODULAR_IR_RFID'>('BOX_1_SERVO_WEIGHT');
  const [apiKey, setApiKey] = React.useState(`esp32_key_${Math.random().toString(36).substring(2, 8)}`);

  const refresh = React.useCallback(async () => {
    const response = await fetch('/api/data?entity=pillBoxes');
    if (!response.ok) return;
    const result = await response.json();
    setBoxes((result.data || []).map((box: Record<string, unknown>) => ({
      id: box.id,
      name: box.name,
      model: box.model,
      patientId: box.patient_id || undefined,
      patientName: Array.isArray(box.patients) ? (box.patients[0] as Record<string, string> | undefined)?.name : undefined,
      deviceApiKey: 'configured',
      status: box.status,
      batteryPercentage: box.battery_percentage,
      rssiSignal: box.rssi_signal,
      lastHeartbeat: box.last_heartbeat,
      firmwareVersion: box.firmware_version,
      ipAddress: box.ip_address || 'Not reported',
      compartments: Array.isArray(box.compartments) ? box.compartments.map((compartment: Record<string, unknown>) => ({
        id: compartment.compartment_number,
        label: compartment.label,
        medicineId: compartment.medicine_id || undefined,
        medicineName: Array.isArray(compartment.medicines) ? (compartment.medicines[0] as Record<string, string> | undefined)?.name : undefined,
        dosage: compartment.dosage,
        currentPillCount: compartment.current_pill_count,
        maxCapacity: compartment.max_capacity,
        status: compartment.status,
        ledColor: compartment.led_color
      })) : []
    })));
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleAddBox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const patient = store.getPatients()[0];
    const databasePatientId = patient?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(patient.id)
      ? patient.id
      : undefined;

    const box: Omit<PillBox, 'id' | 'lastHeartbeat'> = {
      name,
      model,
      patientId: databasePatientId,
      patientName: patient?.name || 'Unassigned',
      deviceApiKey: apiKey || `esp32_key_${Date.now()}`,
      status: 'ONLINE',
      batteryPercentage: 100,
      rssiSignal: -55,
      firmwareVersion: 'v1.0.0-esp32',
      ipAddress: '192.168.1.100',
      compartments: model === 'BOX_1_SERVO_WEIGHT' ? [
        { id: 1, label: 'Slot 1', dosage: '1 Tablet', currentPillCount: 20, maxCapacity: 30, status: 'READY', ledColor: '#10b981' },
        { id: 2, label: 'Slot 2', dosage: '1 Tablet', currentPillCount: 20, maxCapacity: 30, status: 'READY', ledColor: '#06b6d4' },
        { id: 3, label: 'Slot 3', dosage: '1 Tablet', currentPillCount: 15, maxCapacity: 30, status: 'READY', ledColor: '#06b6d4' },
        { id: 4, label: 'Slot 4', dosage: '1 Tablet', currentPillCount: 10, maxCapacity: 30, status: 'READY', ledColor: '#f59e0b' },
      ] : [
        { id: 1, label: 'Module A', dosage: '1 Tablet', currentPillCount: 20, maxCapacity: 30, status: 'READY', ledColor: '#8b5cf6' },
        { id: 2, label: 'Module B', dosage: '1 Tablet', currentPillCount: 15, maxCapacity: 30, status: 'READY', ledColor: '#ef4444' },
      ]
    };
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'pillBox', data: box })
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      window.alert(result?.error || 'Could not save pill box to the database.');
      return;
    }
    store.addPillBox(box);

    setIsModalOpen(false);
    setName('');
  };

  const handleEditBox = async (box: PillBox) => {
    const updatedName = window.prompt('Pill box name', box.name);
    if (!updatedName) return;
    const response = await fetch('/api/data', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'pillBox', id: box.id, data: { name: updatedName, status: box.status, model: box.model, patientId: box.patientId } })
    });
    if (!response.ok) window.alert('Could not update pill box.');
    else await refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-cyan-400" />
            Smart Pill Boxes
          </h2>
          <p className="text-xs text-slate-400">Register ESP32 microcontrollers, device API keys, and compartment maps.</p>
        </div>

        <button
          onClick={() => {
            setApiKey(`esp32_key_${Math.random().toString(36).substring(2, 8)}`);
            setIsModalOpen(true);
          }}
          className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Register Pill Box</span>
        </button>
      </div>

      {boxes.length === 0 ? (
        <div className="clean-card p-12 text-center space-y-3">
          <Cpu className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No Pill Boxes Registered</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Click &quot;Register Pill Box&quot; to generate an ESP32 API Key and configure sensor compartments.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs"
          >
            Register First Pill Box
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {boxes.map(box => (
            <div key={box.id} className="space-y-2">
              <PillBoxVisualizer box={box} />
              <button onClick={() => void handleEditBox(box)} className="text-cyan-300 hover:text-cyan-200 text-xs font-semibold">
                Edit Pill Box
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="clean-card w-full max-w-md p-5 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-slate-100">Register ESP32 Pill Box</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleAddBox} className="space-y-3">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Device Label / Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Smart Pill Box Alpha"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Hardware Model Type</label>
                <select
                  value={model}
                  onChange={e => setModel(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200"
                >
                  <option value="BOX_1_SERVO_WEIGHT">Box 1: Servo Motor + Weight Load Cell</option>
                  <option value="BOX_2_MODULAR_IR_RFID">Box 2: Modular IR Beam + RFID Scanner</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">ESP32 REST API Key</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono"
                />
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
                  Register Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
