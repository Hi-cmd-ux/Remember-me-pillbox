'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Pill, Lock, Mail, ArrowRight } from 'lucide-react';
import { store } from '@/lib/store';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState<'CARE_GIVER' | 'PATIENT' | 'ADMIN'>('CARE_GIVER');
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide an email and password.');
      return;
    }

    const displayName = name || email.split('@')[0];

    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      return;
    }

    if (!authData.user) {
      setError('Authentication succeeded but no user session was returned.');
      return;
    }

    if (role === 'CARE_GIVER') {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'caregiver',
          data: {
            name: displayName,
            email,
            phone: '',
            role: 'NURSE',
            notifyTelegram: true,
            notifyEmail: true
          }
        })
      });
    }

    store.login(email, role, displayName);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#08111f] flex items-center justify-center px-5 py-10 sm:px-8">
      <div className="w-full max-w-4xl grid lg:grid-cols-[0.9fr_1.1fr] bg-[#101d2d] border border-[#263852] rounded-lg overflow-hidden shadow-2xl shadow-black/30">
        {/* Brand */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-[#0d1a2b] border-r border-[#263852]">
          <div>
            <div className="w-10 h-10 rounded-md bg-cyan-400 flex items-center justify-center text-slate-950 mb-8">
              <Pill className="w-6 h-6 stroke-[2.5]" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/80 font-semibold mb-3">Medication operations</p>
            <h1 className="text-3xl font-semibold text-slate-50 tracking-tight leading-tight">
              PillCare <span className="text-cyan-300">IoT</span>
            </h1>
            <p className="text-sm text-slate-400 leading-6 mt-4 max-w-xs">
              Keep patients, care teams, and connected pill boxes in one calm operational view.
            </p>
          </div>
          <p className="text-[11px] text-slate-500">Smart Pill Box & Medication Management System</p>
        </div>

        {/* Login Card */}
        <div className="p-6 sm:p-10 space-y-6">
          <div className="flex items-start border-b border-[#263852] pb-4 justify-between gap-4 text-xs">
            <div>
              <div className="lg:hidden flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-md bg-cyan-400 flex items-center justify-center text-slate-950">
                  <Pill className="w-5 h-5" />
                </div>
                <span className="font-semibold text-slate-100">PillCare <span className="text-cyan-300">IoT</span></span>
              </div>
              <span className="font-semibold text-slate-100 uppercase tracking-[0.14em]">
              Sign In
              </span>
            </div>
            <span className="text-slate-500 text-right">Authorized users only</span>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="caregiver@example.com"
                  className="w-full bg-[#08111f] border border-[#263852] rounded-md pl-9 pr-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#08111f] border border-[#263852] rounded-md pl-9 pr-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1.5">Select User Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as any)}
                className="w-full bg-[#08111f] border border-[#263852] rounded-md px-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="CARE_GIVER">Caregiver / Nurse</option>
                <option value="PATIENT">Patient</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-md bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs transition flex items-center justify-center gap-2"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
