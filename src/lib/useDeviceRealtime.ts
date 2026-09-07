'use client';

import React from 'react';
import { supabase } from './supabase';

type RealtimeChange = {
  table: 'device_events' | 'dose_records' | 'pill_boxes';
  payload: Record<string, unknown>;
};

export function useDeviceRealtime(onChange: (change: RealtimeChange) => void) {
  React.useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    const channel = client
      .channel('pillcare-device-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_events' }, payload => {
        onChange({ table: 'device_events', payload: payload.new as Record<string, unknown> });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dose_records' }, payload => {
        onChange({ table: 'dose_records', payload: payload.new as Record<string, unknown> });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pill_boxes' }, payload => {
        onChange({ table: 'pill_boxes', payload: payload.new as Record<string, unknown> });
      })
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [onChange]);
}