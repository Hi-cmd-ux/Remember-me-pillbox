import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('pill_boxes').select('id').limit(1);

    if (error) {
      console.error('Supabase health check failed:', error);
      return NextResponse.json({ status: 'error', database: 'unreachable' }, { status: 503 });
    }

    return NextResponse.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ status: 'error', database: 'not-configured' }, { status: 503 });
  }
}