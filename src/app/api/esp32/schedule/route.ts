import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function relatedName(value: unknown) {
  const item = Array.isArray(value) ? value[0] : value;
  if (item && typeof item === 'object' && 'name' in item && typeof item.name === 'string') {
    return item.name;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey') || request.headers.get('x-device-key');

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing device API key' }, { status: 401 });
    }

    const { data: box, error: boxError } = await supabase
      .from('pill_boxes')
      .select('id, name, model, patient_id, battery_percentage, rssi_signal, patients(name), compartments(compartment_number, label, medicine_id, dosage, current_pill_count, max_capacity, status, led_color, medicines(name)), schedules(id, compartment_id, medicine_id, dosage, scheduled_time, time_window_minutes, repeat_days, is_active, medicines(name))')
      .eq('device_api_key', apiKey)
      .maybeSingle();

    if (boxError) {
      console.error('Schedule device lookup failed:', boxError);
      return NextResponse.json({ error: 'Failed to load device schedule' }, { status: 500 });
    }
    if (!box) {
      return NextResponse.json({ error: 'Invalid device API key' }, { status: 403 });
    }

    await supabase
      .from('pill_boxes')
      .update({ last_heartbeat: new Date().toISOString(), status: 'ONLINE' })
      .eq('id', box.id);

    const schedules = Array.isArray(box.schedules) ? box.schedules : [];
    return NextResponse.json({
      success: true,
      deviceId: box.id,
      deviceName: box.name,
      model: box.model,
      patientName: relatedName(box.patients) || 'Unknown',
      serverTime: new Date().toISOString(),
      compartments: (box.compartments || []).map(compartment => ({
        ...compartment,
        id: compartment.compartment_number
      })),
      schedules: schedules.filter(schedule => schedule.is_active).map(schedule => ({
        scheduleId: schedule.id,
        compartmentId: schedule.compartment_id,
        medicineName: relatedName(schedule.medicines),
        dosage: schedule.dosage,
        scheduledTime: schedule.scheduled_time,
        timeWindowMinutes: schedule.time_window_minutes
      }))
    });
  } catch (error) {
    console.error('Schedule API error:', error);
    return NextResponse.json({ error: 'Backend is not configured or unavailable' }, { status: 503 });
  }
}
