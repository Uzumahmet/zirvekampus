import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username')?.trim().toLowerCase();

    if (!username) {
      return NextResponse.json({ error: 'Kullanıcı adı parametresi gereklidir.' }, { status: 400 });
    }

    const { data: user, error } = await supabaseAdmin
      .from('kullanicilar')
      .select('email')
      .eq('username', username)
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      return NextResponse.json({ error: 'Bu kullanıcı adına sahip bir hesap bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json({ email: user.email });
  } catch (error) {
    console.error('Kullanıcı adı çözümleme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
