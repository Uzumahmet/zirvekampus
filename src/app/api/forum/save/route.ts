import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ saved: false });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    const userId = decodedToken.uid;

    const { searchParams } = new URL(request.url);
    const forumId = searchParams.get('forumId');

    if (!forumId) {
      return NextResponse.json({ saved: false });
    }

    const { data } = await supabaseAdmin
      .from('kaydedilen_forumlar')
      .select('*')
      .eq('kullanici_id', userId)
      .eq('forum_id', forumId)
      .maybeSingle();

    return NextResponse.json({ saved: !!data });
  } catch {
    return NextResponse.json({ saved: false });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    const userId = decodedToken.uid;

    const { forumId } = await request.json();

    if (!forumId) {
      return NextResponse.json({ error: 'Forum ID eksik' }, { status: 400 });
    }

    // Var mı kontrol et
    const { data: existing } = await supabaseAdmin
      .from('kaydedilen_forumlar')
      .select('*')
      .eq('kullanici_id', userId)
      .eq('forum_id', forumId)
      .maybeSingle();

    if (existing) {
      // Kaydı kaldır
      await supabaseAdmin
        .from('kaydedilen_forumlar')
        .delete()
        .eq('kullanici_id', userId)
        .eq('forum_id', forumId);

      return NextResponse.json({ saved: false });
    } else {
      // Kaydet
      await supabaseAdmin
        .from('kaydedilen_forumlar')
        .insert({
          kullanici_id: userId,
          forum_id: forumId,
        });

      return NextResponse.json({ saved: true });
    }
  } catch (error) {
    console.error('Forum kaydetme hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
