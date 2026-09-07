import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type DeviceEventBody = {
  apiKey?: string;
  eventType?: 'COMPARTMENT_OPENED' | 'BOX_OPENED' | 'MEDICINE_TAKEN' | string;
  compartmentId?: number;
  compartmentNumber?: number;
  eventTimestamp?: string;
  notes?: string;
};

function minutesSinceMidnight(value: Date) {
  return value.getUTCHours() * 60 + value.getUTCMinutes();
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json() as DeviceEventBody;
    const apiKey = body.apiKey || request.headers.get('x-device-key');
    const { eventType, notes } = body;
    const compartmentNumber = body.compartmentNumber ?? body.compartmentId;
    const eventTime = body.eventTimestamp ? new Date(body.eventTimestamp) : new Date();

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing device API key' }, { status: 401 });
    }

    if (!eventType) {
      return NextResponse.json({ error: 'Missing event type' }, { status: 400 });
    }
    if (Number.isNaN(eventTime.getTime())) {
      return NextResponse.json({ error: 'Invalid event timestamp' }, { status: 400 });
    }

    const { data: box, error: boxError } = await supabase
      .from('pill_boxes')
      .select('id, name, patient_id')
      .eq('device_api_key', apiKey)
      .maybeSingle();

    if (boxError) {
      console.error('Device lookup failed:', boxError);
      return NextResponse.json({ error: 'Failed to validate device' }, { status: 500 });
    }
    if (!box) {
      return NextResponse.json({ error: 'Invalid device API key' }, { status: 403 });
    }

    const isDoseEvent = eventType === 'COMPARTMENT_OPENED' || eventType === 'BOX_OPENED' || eventType === 'MEDICINE_TAKEN';
    if (isDoseEvent && !compartmentNumber) {
      return NextResponse.json({ error: 'Compartment number is required for dose events' }, { status: 400 });
    }
    let doseCompleted = false;
    let doseMissed = false;

    if (isDoseEvent && compartmentNumber) {
      const { data: compartment, error: compartmentError } = await supabase
        .from('compartments')
        .select('id, current_pill_count')
        .eq('pill_box_id', box.id)
        .eq('compartment_number', compartmentNumber)
        .maybeSingle();

      if (compartmentError || !compartment) {
        return NextResponse.json({ error: 'Compartment not found' }, { status: 404 });
      }

      const eventDate = eventTime.toISOString().slice(0, 10);
      const { data: pendingDose } = await supabase
        .from('dose_records')
        .select('id, scheduled_date, scheduled_time, schedules(time_window_minutes)')
        .eq('pill_box_id', box.id)
        .eq('compartment_number', compartmentNumber)
        .eq('scheduled_date', eventDate)
        .eq('status', 'PENDING')
        .order('scheduled_time', { ascending: true })
        .limit(1)
        .maybeSingle();

      const schedule = (pendingDose as { schedules?: unknown } | null)?.schedules;
      const scheduleItem = Array.isArray(schedule) ? schedule[0] : schedule;
      const timeWindow = scheduleItem && typeof scheduleItem === 'object' && 'time_window_minutes' in scheduleItem
        ? Number(scheduleItem.time_window_minutes) || 30
        : 30;
      const [hours, minutes] = String(pendingDose?.scheduled_time || '').split(':').map(Number);
      const scheduledMinutes = hours * 60 + minutes;
      const eventMinutes = minutesSinceMidnight(eventTime);
      const doseIsInWindow = Boolean(pendingDose) && Number.isFinite(scheduledMinutes) && Math.abs(eventMinutes - scheduledMinutes) <= timeWindow;

      if (doseIsInWindow && pendingDose) {
        const { error: doseUpdateError } = await supabase
          .from('dose_records')
          .update({
            status: 'TAKEN',
            taken_at: eventTime.toISOString(),
            dispensed_by_sensor: true,
            notes: notes || 'Compartment opened during scheduled dose window'
          })
          .eq('id', pendingDose.id)
          .eq('status', 'PENDING');

        if (doseUpdateError) {
          return NextResponse.json({ error: 'Failed to complete dose' }, { status: 500 });
        }
        doseCompleted = true;

        const { error: compartmentUpdateError } = await supabase
          .from('compartments')
          .update({
            current_pill_count: compartment.current_pill_count - 1,
            status: compartment.current_pill_count - 1 <= 3 ? 'REFILL_NEEDED' : 'READY'
          })
          .eq('id', compartment.id);

        if (compartmentUpdateError) {
          return NextResponse.json({ error: 'Failed to update compartment' }, { status: 500 });
        }
      } else if (
        pendingDose &&
        Number.isFinite(scheduledMinutes) &&
        eventMinutes > scheduledMinutes + timeWindow
      ) {
        const { error: missedUpdateError } = await supabase
          .from('dose_records')
          .update({ status: 'MISSED', notes: 'Compartment opened after the scheduled dose window' })
          .eq('id', pendingDose.id)
          .eq('status', 'PENDING');

        if (missedUpdateError) {
          return NextResponse.json({ error: 'Failed to mark dose as missed' }, { status: 500 });
        }
        doseMissed = true;

        await supabase.from('notifications').insert({
          title: 'MISSED DOSE ALERT!',
          message: `Compartment ${compartmentNumber} was opened after the scheduled dose window.`,
          type: 'DOSE_MISSED',
          patient_id: box.patient_id
        });
      }
    }

    const { error: eventError } = await supabase
      .from('device_events')
      .insert({
        pill_box_id: box.id,
        event_type: eventType,
        compartment_number: compartmentNumber || null,
        details: notes || (doseCompleted
          ? `Compartment ${compartmentNumber} opened during the scheduled dose window`
          : doseMissed
          ? `Compartment ${compartmentNumber} opened after the scheduled dose window; dose marked missed`
          : `Compartment ${compartmentNumber || 'unknown'} opened outside a scheduled dose window`),
        severity: doseCompleted ? 'SUCCESS' : doseMissed ? 'ALERT' : isDoseEvent ? 'WARNING' : 'INFO',
        raw_payload: body
      });

    if (eventError) {
      console.error('Event insert failed:', eventError);
      return NextResponse.json({ error: 'Failed to log device event' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      doseCompleted,
      doseMissed,
      message: doseCompleted
        ? 'Dose completed from the ESP32 event'
        : doseMissed
        ? 'Dose marked missed because the compartment opened after the dose window'
        : 'Event logged; dose not completed'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.startsWith('Supabase backend is not configured') ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
