import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    // 1. Get the device API key from headers
    const apiKey = request.headers.get('x-device-key');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing x-device-key header' }, { status: 401 });
    }

    // 2. Parse the body sent from the ESP32
    const body = await request.json();
    const { eventType, details, compartmentNumber, batteryPercentage, rssiSignal } = body;

    // 3. Find the pill box in Supabase using the API key
    const { data: box, error: boxError } = await supabase
      .from('pill_boxes')
      .select('id')
      .eq('device_api_key', apiKey)
      .single();

    if (boxError || !box) {
      return NextResponse.json({ error: 'Invalid device API key' }, { status: 403 });
    }

    // 4. Update the Pill Box heartbeat & status
    const { error: heartbeatError } = await supabase
      .from('pill_boxes')
      .update({
        last_heartbeat: new Date().toISOString(),
        battery_percentage: batteryPercentage ?? 100,
        rssi_signal: rssiSignal ?? -60,
      })
      .eq('id', box.id);

    if (heartbeatError) {
      console.error('Error updating device heartbeat:', heartbeatError);
      return NextResponse.json({ error: 'Failed to update device heartbeat' }, { status: 500 });
    }

    // 5. If there's an actual event (e.g., MEDICINE_TAKEN, BOX_OPENED), log it
    if (eventType) {
      const { error: eventError } = await supabase
        .from('device_events')
        .insert({
          pill_box_id: box.id,
          event_type: eventType,
          details: details || 'No details provided',
          compartment_number: compartmentNumber || null,
          raw_payload: body // Save the exact JSON sent by ESP32 for debugging
        });

      if (eventError) {
        console.error('Error logging event:', eventError);
        return NextResponse.json({ error: 'Failed to log event' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'Event recorded successfully' });

  } catch (error) {
    console.error('ESP32 Event API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
