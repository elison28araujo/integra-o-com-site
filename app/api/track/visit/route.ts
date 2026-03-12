import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { profile_id, referrer, user_agent } = await request.json();
    
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Database not configured' });
    }

    const { error } = await supabase
      .from('visits')
      .insert([
        { 
          profile_id: profile_id || null, 
          referrer, 
          user_agent 
        },
      ]);

    if (error) {
      console.error('Supabase error tracking visit:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
