import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

async function triggerMissedDoses() {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const { data: doses, error } = await supabase
    .from('dose_records')
    .select('id, patient_id, pill_box_id, compartment_number, scheduled_date, scheduled_time, patients(name), medicines(name)')
    .eq('status', 'PENDING')
    .lte('scheduled_date', today);

  if (error) throw error;

  let triggered = 0;
  for (const dose of doses || []) {
    const [hours, minutes] = String(dose.scheduled_time).split(':').map(Number);
    const isLate = dose.scheduled_date < today || currentMinutes > hours * 60 + minutes + 30;
    if (!isLate) continue;

    const { error: updateError } = await supabase
      .from('dose_records')
      .update({ status: 'MISSED' })
      .eq('id', dose.id)
      .eq('status', 'PENDING');
    if (updateError) throw updateError;

    const patient = Array.isArray(dose.patients) ? dose.patients[0] : dose.patients;
    const medicine = Array.isArray(dose.medicines) ? dose.medicines[0] : dose.medicines;
    const message = `${patient?.name || 'Patient'} missed ${medicine?.name || 'medication'} at ${dose.scheduled_time}`;
    await supabase.from('device_events').insert({
      pill_box_id: dose.pill_box_id,
      event_type: 'DOSE_MISSED',
      compartment_number: dose.compartment_number,
      details: message,
      severity: 'ALERT'
    });
    await supabase.from('notifications').insert({
      title: 'MISSED DOSE ALERT!',
      message,
      type: 'DOSE_MISSED',
      patient_id: dose.patient_id
    });
    triggered++;
  }

  return triggered;
}

export async function GET() {
  try {
    const triggered = await triggerMissedDoses();
    return NextResponse.json({ success: true, triggeredMissedDosesCount: triggered, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Missed-dose processing failed:', error);
    return NextResponse.json({ error: 'Backend is not configured or unavailable' }, { status: 503 });
  }
}

export async function POST() {
  return GET();
}
