'use client';

import React from 'react';
import { PillBox } from '@/lib/types';
import { Cpu, Wifi, Battery, AlertCircle, Hand, Scale } from 'lucide-react';

interface Props {
  box: PillBox;
}

export default function PillBoxVisualizer({ box }: Props) {
  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6 relative overflow-hidden">
      {/* Top Device Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-slate-950 ${
            box.model === 'BOX_1_SERVO_WEIGHT'
              ? 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20'
              : 'bg-gradient-to-br from-purple-400 to-indigo-600 shadow-lg shadow-purple-500/20'
          }`}>
            <Cpu className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-100 text-base">{box.name}</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                {box.model === 'BOX_1_SERVO_WEIGHT' ? 'Box 1: Servo + Weight' : 'Box 2: Modular IR + RFID'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Patient: <span className="text-slate-200 font-semibold">{box.patientName}</span> | IP: {box.ipAddress}
            </p>
          </div>
        </div>

        {/* Sensor & Telemetry Metrics */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300 font-medium">{box.rssiSignal} dBm</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <Battery className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-medium">{box.batteryPercentage}%</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{box.status}</span>
          </div>
        </div>
      </div>

      {/* Visual Hardware Layout Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            Hardware Compartments & Sensor Status
          </h4>
          <span className="text-[11px] text-slate-400">Dose status updates from the connected ESP32</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {box.compartments.map((comp) => {
            return (
              <div
                key={comp.id}
                className={`rounded-2xl p-4 transition-all duration-300 border relative overflow-hidden flex flex-col justify-between ${
                  comp.status === 'REFILL_NEEDED'
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : comp.status === 'EMPTY'
                    ? 'bg-slate-900/40 border-slate-800/80 opacity-60'
                    : 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/40'
                }`}
              >
                {/* Top Slot Header & LED Glow */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full shadow-sm transition-all animate-pulse"
                      style={{ 
                        backgroundColor: comp.ledColor,
                        boxShadow: `0 0 10px ${comp.ledColor}`
                      }}
                      title={`LED Status Color: ${comp.ledColor}`}
                    />
                    <span className="font-bold text-xs text-slate-200">{comp.label}</span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    comp.status === 'READY'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : comp.status === 'REFILL_NEEDED'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {comp.status}
                  </span>
                </div>

                {/* Medicine Content */}
                <div className="space-y-1 my-2">
                  <p className="text-sm font-semibold text-slate-100 truncate">
                    {comp.medicineName || 'Empty Slot'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Dosage: <span className="text-slate-300">{comp.dosage}</span>
                  </p>

                  {/* Stock Counter Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Pills Remaining:</span>
                      <span className="font-bold text-slate-200">
                        {comp.currentPillCount} / {comp.maxCapacity}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(comp.currentPillCount / comp.maxCapacity) * 100}%`,
                          backgroundColor: comp.ledColor
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Hardware sensor status */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  {box.model === 'BOX_1_SERVO_WEIGHT' ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Scale className="w-3 h-3 text-cyan-400" />
                      <span>Load Cell: {(comp.currentPillCount * 0.45).toFixed(1)}g</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Hand className="w-3 h-3 text-purple-400" />
                      <span>IR Beam: Active</span>
                    </div>
                  )}

                  <span className="text-[10px] text-slate-500 italic flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Awaiting ESP32 event
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
