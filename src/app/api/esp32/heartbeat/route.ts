import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const apiKey = body.apiKey || request.headers.get('x-device-key');
    const { batteryPercentage, rssiSignal, firmwareVersion } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing device API key' }, { status: 401 });
    }

    const { data: box, error: lookupError } = await supabase
      .from('pill_boxes')
      .select('id, battery_percentage, rssi_signal')
      .eq('device_api_key', apiKey)
      .maybeSingle();

    if (lookupError) {
      console.error('Device lookup failed:', lookupError);
      return NextResponse.json({ error: 'Failed to validate device' }, { status: 500 });
    }

    if (!box) {
      return NextResponse.json({ error: 'Invalid device API key' }, { status: 403 });
    }

    const { error: updateError } = await supabase
      .from('pill_boxes')
      .update({
        battery_percentage: batteryPercentage ?? box.battery_percentage,
        rssi_signal: rssiSignal ?? box.rssi_signal,
        firmware_version: firmwareVersion,
        status: 'ONLINE',
        last_heartbeat: new Date().toISOString()
      })
      .eq('id', box.id);

    if (updateError) {
      console.error('Device heartbeat update failed:', updateError);
      return NextResponse.json({ error: 'Failed to update heartbeat' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status: 'ONLINE',
      serverTime: new Date().toISOString(),
      syncNeeded: false
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
