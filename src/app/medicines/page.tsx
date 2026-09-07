'use client';

import React from 'react';
import { Pill, Plus, AlertTriangle, RefreshCw, CheckCircle2, PackageCheck, X } from 'lucide-react';
import { store } from '@/lib/store';
import { Medicine } from '@/lib/types';

export default function MedicinesPage() {
  const [medicines, setMedicines] = React.useState<Medicine[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [refillingMedId, setRefillingMedId] = React.useState<string | null>(null);
  const [refillAmount, setRefillAmount] = React.useState(30);
  const [editingMedicine, setEditingMedicine] = React.useState<Medicine | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editThreshold, setEditThreshold] = React.useState('');

  // New med form state
  const [name, setName] = React.useState('');
  const [strength, setStrength] = React.useState('500mg');
  const [stock, setStock] = React.useState('60');
  const [minThreshold, setMinThreshold] = React.useState('15');
  const [instructions, setInstructions] = React.useState('Take 1 tablet daily with water');
  const [colorHex, setColorHex] = React.useState('#06b6d4');

  const refresh = React.useCallback(async () => {
    const response = await fetch('/api/data?entity=medicines');
    if (!response.ok) return;
    const result = await response.json();
    setMedicines((result.data || []).map((medicine: Record<string, unknown>) => {
      const totalStock = Number(medicine.total_stock) || 0;
      const minThreshold = Number(medicine.min_threshold) || 0;
      return {
      id: medicine.id,
      name: medicine.name,
      genericName: medicine.generic_name || medicine.name,
      dosageForm: medicine.dosage_form,
      strength: medicine.strength,
      totalStock,
      minThreshold,
      colorHex: medicine.color_hex,
      shape: medicine.shape || 'Round',
      instructions: medicine.instructions || '',
      refillNeeded: totalStock <= minThreshold
      };
    }));
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const medicine = {
      name,
      genericName: name,
      dosageForm: 'Tablet',
      strength,
      totalStock: parseInt(stock) || 30,
      minThreshold: parseInt(minThreshold) || 10,
      colorHex,
      shape: 'Round',
      instructions
    };
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'medicine', data: medicine })
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      window.alert(result?.error || 'Could not save medicine to the database.');
      return;
    }
    store.addMedicine(medicine);

    setIsAddModalOpen(false);
    setName('');
  };

  const handleRefillSubmit = async (id: string) => {
    const medicine = medicines.find(item => item.id === id);
    if (!medicine) return;
    const response = await fetch('/api/data', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'medicine', id, data: { totalStock: medicine.totalStock + refillAmount } })
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      window.alert(result?.error || 'Could not update medicine stock.');
      return;
    }
    await refresh();
    setRefillingMedId(null);
  };

  const openEditMedicine = (medicine: Medicine) => {
    setEditingMedicine(medicine);
    setEditName(medicine.name);
    setEditThreshold(String(medicine.minThreshold));
  };

  const handleEditMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedicine || !editName.trim()) return;
    const threshold = Number(editThreshold);
    const response = await fetch('/api/data', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'medicine', id: editingMedicine.id, data: { name: editName.trim(), minThreshold: Number.isFinite(threshold) ? threshold : editingMedicine.minThreshold } })
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      window.alert(result?.error || 'Could not update medicine.');
      return;
    }
    setEditingMedicine(null);
    await refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-3">
            <Pill className="w-7 h-7 text-cyan-400" />
            Medication Inventory & Stock Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track pharmacy inventory, pill strengths, dosage instructions, and low-stock threshold triggers.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Medicine</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {medicines.map(med => (
          <div 
            key={med.id} 
            className={`glass-panel rounded-2xl p-6 border space-y-4 transition ${
              med.refillNeeded 
                ? 'border-amber-500/40 bg-amber-950/10' 
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-slate-950 shadow-md"
                  style={{ backgroundColor: med.colorHex }}
                >
                  <Pill className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-base">{med.name}</h3>
                  <p className="text-xs text-slate-400">
                    {med.strength} • <span className="text-slate-300">{med.dosageForm}</span>
                  </p>
                </div>
              </div>

              {med.refillNeeded ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Low Stock
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  In Stock
                </span>
              )}
            </div>

            {/* Stock Progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Stock Count:</span>
                <span className="font-bold text-slate-200">{med.totalStock} units</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    med.refillNeeded ? 'bg-amber-400' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${Math.min(100, (med.totalStock / (med.minThreshold * 4)) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 text-right">
                Refill alert threshold: &lt; {med.minThreshold} units
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300">
              <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">Instructions:</span>
              <p>{med.instructions}</p>
            </div>

            {/* Refill Button */}
            <div className="pt-2 border-t border-slate-800/80 flex justify-end">
              {refillingMedId === med.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="number"
                    value={refillAmount}
                    onChange={e => setRefillAmount(parseInt(e.target.value) || 10)}
                    className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200"
                  />
                  <button
                    onClick={() => handleRefillSubmit(med.id)}
                    className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setRefillingMedId(null)}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setRefillingMedId(med.id)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refill Stock</span>
                </button>
              )}
            </div>
            <button onClick={() => openEditMedicine(med)} className="text-cyan-300 hover:text-cyan-200 text-xs font-semibold">
              Edit Medicine
            </button>
          </div>
        ))}
      </div>

      {/* Add Med Modal */}
      {editingMedicine && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base">Edit Medicine</h3>
              <button onClick={() => setEditingMedicine(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditMedicine} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Medicine Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} required className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200" />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Minimum Stock Threshold</label>
                <input type="number" min="0" value={editThreshold} onChange={e => setEditThreshold(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200" />
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button type="button" onClick={() => setEditingMedicine(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <Pill className="w-5 h-5 text-cyan-400" />
                Add New Medicine
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMedicine} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Medicine Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Omeprazole"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Strength</label>
                  <input
                    type="text"
                    value={strength}
                    onChange={e => setStrength(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={e => setStock(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Min Alert</label>
                  <input
                    type="number"
                    value={minThreshold}
                    onChange={e => setMinThreshold(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Instructions</label>
                <input
                  type="text"
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20"
                >
                  Save Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
