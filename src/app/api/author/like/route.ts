import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * POST /api/author/like
 * ───────────────────────
 * Yazarı beğenme / beğeniyi geri alma (toggle).
 * Body: { yazarId: string }
 * Yanıt: { liked: boolean }
 */
export async function POST(request: NextRequest) {
  const token = extractBearerToken(request.headers.get('Authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  try {
    const decoded = await verifyFirebaseToken(token);
    const { yazarId } = await request.json();

    if (!yazarId || typeof yazarId !== 'string') {
      return NextResponse.json({ error: 'Geçersiz yazarId' }, { status: 400 });
    }

    if (decoded.uid === yazarId) {
      return NextResponse.json({ error: 'Kendinizi beğenemezsiniz' }, { status: 400 });
    }

    // Mevcut beğeni kaydını kontrol et
    const { data: existingLike } = await supabaseAdmin
      .from('yazar_begeni')
      .select('kullanici_id')
      .eq('kullanici_id', decoded.uid)
      .eq('yazar_id', yazarId)
      .single();

    if (existingLike) {
      // Beğeniyi geri al
      await supabaseAdmin
        .from('yazar_begeni')
        .delete()
        .eq('kullanici_id', decoded.uid)
        .eq('yazar_id', yazarId);

      return NextResponse.json({ liked: false });
    } else {
      // Beğen
      await supabaseAdmin
        .from('yazar_begeni')
        .insert({ kullanici_id: decoded.uid, yazar_id: yazarId });

      return NextResponse.json({ liked: true });
    }
  } catch (err) {
    console.error('[Author Like API] Hata:', err);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
