import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    const { data: konular, error } = await supabaseAdmin
      .from('konular')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Konular çekilemedi.' }, { status: 500 });
    }

    return NextResponse.json(konular);
  } catch (error) {
    console.error('Konular GET hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
