import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

type DataRequest = {
  entity?: 'caregiver' | 'patient' | 'medicine' | 'pillBox' | 'schedule';
  data?: Record<string, unknown>;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const entity = new URL(request.url).searchParams.get('entity');

    if (entity === 'dashboard') {
      const [patients, boxes, doses, events] = await Promise.all([
        supabase.from('patients').select('id, name, age, gender, room_number, caregiver_id, medical_conditions, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, compliance_rate, created_at').order('name'),
        supabase.from('pill_boxes').select('id, name, model, patient_id, status, battery_percentage, rssi_signal, firmware_version, ip_address, last_heartbeat, patients(name), compartments(compartment_number, label, medicine_id, dosage, current_pill_count, max_capacity, status, led_color, medicines(name))').order('name'),
        supabase.from('dose_records').select('id, schedule_id, patient_id, pill_box_id, compartment_number, medicine_id, scheduled_date, scheduled_time, taken_at, status, dispensed_by_sensor, notes, patients(name), medicines(name)').order('scheduled_date', { ascending: false }).order('scheduled_time', { ascending: true }).limit(100),
        supabase.from('device_events').select('id, pill_box_id, event_type, compartment_number, details, severity, raw_payload, created_at, pill_boxes(name)').order('created_at', { ascending: false }).limit(20)
      ]);

      const error = patients.error || boxes.error || doses.error || events.error;
      if (error) throw error;

      return NextResponse.json({ patients: patients.data || [], boxes: boxes.data || [], doses: doses.data || [], events: events.data || [] });
    }

    if (entity === 'patients') {
      const { data, error } = await supabase.from('patients').select('id, name, age, gender, room_number, caregiver_id, medical_conditions, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, compliance_rate, created_at, caregivers(name)').order('name');
      if (error) throw error;
      return NextResponse.json({ data: data || [] });
    }

    if (entity === 'medicines') {
      const { data, error } = await supabase.from('medicines').select('id, name, generic_name, dosage_form, strength, total_stock, min_threshold, color_hex, shape, instructions, created_at').order('name');
      if (error) throw error;
      const uniqueMedicines = (data || []).filter((medicine, index, list) =>
        list.findIndex(item => item.name.trim().toLowerCase() === medicine.name.trim().toLowerCase()) === index
      );
      return NextResponse.json({ data: uniqueMedicines });
    }

    if (entity === 'pillBoxes') {
      const { data, error } = await supabase.from('pill_boxes').select('id, name, model, patient_id, status, battery_percentage, rssi_signal, firmware_version, ip_address, last_heartbeat, patients(name), compartments(compartment_number, label, medicine_id, dosage, current_pill_count, max_capacity, status, led_color, medicines(name))').order('name');
      if (error) throw error;
      return NextResponse.json({ data: data || [] });
    }

    if (entity === 'schedules') {
      const { data, error } = await supabase.from('schedules').select('id, patient_id, pill_box_id, compartment_id, medicine_id, dosage, scheduled_time, time_window_minutes, repeat_days, is_active, patients(name), medicines(name)').order('scheduled_time');
      if (error) throw error;
      return NextResponse.json({ data: data || [] });
    }

    if (entity === 'patient-options') {
      const { data, error } = await supabase
        .from('caregivers')
        .select('id, name, email, role')
        .order('name');
      if (error) throw error;
      return NextResponse.json({ caregivers: data || [] });
    }

    if (entity === 'caregivers') {
      const [caregivers, patients] = await Promise.all([
        supabase.from('caregivers').select('id, name, email, phone, role, notify_email, notify_telegram').order('name'),
        supabase.from('patients').select('id, name, room_number, caregiver_id').order('name')
      ]);
      const error = caregivers.error || patients.error;
      if (error) throw error;
      return NextResponse.json({ caregivers: caregivers.data || [], patients: patients.data || [] });
    }

    if (entity !== 'schedule-options') {
      return NextResponse.json({ error: 'Unknown data query' }, { status: 400 });
    }

    const [patients, medicines, boxes] = await Promise.all([
      supabase.from('patients').select('id, name, room_number').order('name'),
      supabase.from('medicines').select('id, name, strength').order('name'),
      supabase.from('pill_boxes').select('id, name, patient_id, compartments(compartment_number, label)').order('name')
    ]);

    const error = patients.error || medicines.error || boxes.error;
    if (error) throw error;

    return NextResponse.json({
      patients: patients.data || [],
      medicines: medicines.data || [],
      boxes: boxes.data || []
    });
  } catch (error) {
    console.error('Core data query failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to load data from Supabase';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { entity, data } = await request.json() as DataRequest;
    if (!entity || !data) {
      return NextResponse.json({ error: 'Entity and data are required' }, { status: 400 });
    }

    if (entity === 'caregiver') {
      const { data: row, error } = await supabase.from('caregivers').upsert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        role: data.role || 'NURSE',
        notify_telegram: data.notifyTelegram ?? true,
        notify_email: data.notifyEmail ?? true
      }, { onConflict: 'email' }).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, data: row });
    }

    if (entity === 'patient') {
      const emergencyContact = data.emergencyContact as Record<string, string> | undefined;
      const { data: row, error } = await supabase.from('patients').insert({
        name: data.name,
        age: data.age,
        gender: data.gender,
        room_number: data.roomNumber || null,
        caregiver_id: data.caregiverId || null,
        medical_conditions: data.medicalConditions || [],
        emergency_contact_name: emergencyContact?.name || null,
        emergency_contact_phone: emergencyContact?.phone || null,
        emergency_contact_relationship: emergencyContact?.relationship || null,
        compliance_rate: data.complianceRate ?? 100
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, data: row });
    }

    if (entity === 'medicine') {
      const { data: existing, error: existingError } = await supabase
        .from('medicines')
        .select('id')
        .ilike('name', String(data.name || '').trim())
        .limit(1);
      if (existingError) throw existingError;
      if (existing?.length) {
        return NextResponse.json({ error: 'A medicine with this name already exists.' }, { status: 409 });
      }

      const { data: row, error } = await supabase.from('medicines').insert({
        name: data.name,
        generic_name: data.genericName || data.name,
        dosage_form: data.dosageForm || 'Tablet',
        strength: data.strength,
        total_stock: data.totalStock ?? 0,
        min_threshold: data.minThreshold ?? 10,
        color_hex: data.colorHex || '#06b6d4',
        shape: data.shape || 'Round',
        instructions: data.instructions || null
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, data: row });
    }

    if (entity === 'pillBox') {
      const compartments = Array.isArray(data.compartments) ? data.compartments as Record<string, unknown>[] : [];
      const { compartments: _, ...boxData } = data;
      const { data: row, error } = await supabase.from('pill_boxes').insert({
        name: boxData.name,
        model: boxData.model,
        patient_id: boxData.patientId || null,
        device_api_key: boxData.deviceApiKey,
        status: boxData.status || 'ONLINE',
        battery_percentage: boxData.batteryPercentage ?? 100,
        rssi_signal: boxData.rssiSignal ?? -60,
        firmware_version: boxData.firmwareVersion || 'v1.0.0',
        ip_address: boxData.ipAddress || null
      }).select().single();
      if (error) throw error;

      if (compartments.length) {
        const { error: compartmentError } = await supabase.from('compartments').insert(compartments.map(compartment => ({
          pill_box_id: row.id,
          compartment_number: compartment.id,
          label: compartment.label,
          medicine_id: compartment.medicineId || null,
          dosage: compartment.dosage || '1 Tablet',
          current_pill_count: compartment.currentPillCount ?? 0,
          max_capacity: compartment.maxCapacity ?? 30,
          status: compartment.status || 'READY',
          led_color: compartment.ledColor || '#06b6d4'
        })));
        if (compartmentError) throw compartmentError;
      }
      return NextResponse.json({ success: true, data: row });
    }

    const { data: row, error } = await supabase.from('schedules').insert({
      patient_id: data.patientId,
      pill_box_id: data.pillBoxId,
      compartment_id: data.compartmentId,
      medicine_id: data.medicineId,
      dosage: data.dosage || '1 Tablet',
      scheduled_time: data.scheduledTime,
      time_window_minutes: data.timeWindowMinutes ?? 30,
      repeat_days: data.repeatDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      is_active: data.isActive ?? true
    }).select().single();
    if (error) throw error;

    const scheduledDate = new Date().toISOString().slice(0, 10);
    const { error: doseError } = await supabase.from('dose_records').insert({
      schedule_id: row.id,
      patient_id: data.patientId,
      pill_box_id: data.pillBoxId,
      compartment_number: data.compartmentId,
      medicine_id: data.medicineId,
      scheduled_date: scheduledDate,
      scheduled_time: data.scheduledTime,
      status: 'PENDING'
    });
    if (doseError) throw doseError;
    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    console.error('Core data persistence failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to save data to Supabase';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { entity, id, data } = await request.json() as DataRequest & { id?: string };
    if (!entity || !id || !data) return NextResponse.json({ error: 'Entity, id, and data are required' }, { status: 400 });

    const table = entity === 'patient' ? 'patients' : entity === 'medicine' ? 'medicines' : entity === 'pillBox' ? 'pill_boxes' : entity === 'schedule' ? 'schedules' : 'caregivers';
    const columnData = entity === 'patient' ? {
      name: data.name, age: data.age, gender: data.gender, room_number: data.roomNumber,
      caregiver_id: data.caregiverId || null, medical_conditions: data.medicalConditions,
      emergency_contact_name: data.emergencyContactName, emergency_contact_phone: data.emergencyContactPhone,
      emergency_contact_relationship: data.emergencyContactRelationship
    } : entity === 'medicine' ? {
      total_stock: data.totalStock, min_threshold: data.minThreshold, instructions: data.instructions,
      name: data.name, strength: data.strength
    } : entity === 'pillBox' ? {
      name: data.name, model: data.model, patient_id: data.patientId || null, status: data.status
    } : entity === 'schedule' ? {
      scheduled_time: data.scheduledTime, time_window_minutes: data.timeWindowMinutes,
      is_active: data.isActive, compartment_id: data.compartmentId
    } : {
      name: data.name, role: data.role, notify_email: data.notifyEmail, notify_telegram: data.notifyTelegram
    };

    const { data: row, error } = await supabase.from(table).update(columnData).eq('id', id).select().single();
    if (error) throw error;
    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}