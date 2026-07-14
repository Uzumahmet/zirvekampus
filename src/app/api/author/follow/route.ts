import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * POST /api/author/follow
 * ─────────────────────────
 * Yazarı takip etme / takibi bırakma (toggle).
 * Body: { yazarId: string }
 * Yanıt: { followed: boolean }
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
      return NextResponse.json({ error: 'Kendinizi takip edemezsiniz' }, { status: 400 });
    }

    // Mevcut takip kaydını kontrol et
    const { data: existingFollow } = await supabaseAdmin
      .from('yazar_takip')
      .select('takipci_id')
      .eq('takipci_id', decoded.uid)
      .eq('yazar_id', yazarId)
      .single();

    if (existingFollow) {
      // Takibi bırak
      await supabaseAdmin
        .from('yazar_takip')
        .delete()
        .eq('takipci_id', decoded.uid)
        .eq('yazar_id', yazarId);

      return NextResponse.json({ followed: false });
    } else {
      // Takip et
      await supabaseAdmin
        .from('yazar_takip')
        .insert({ takipci_id: decoded.uid, yazar_id: yazarId });

      return NextResponse.json({ followed: true });
    }
  } catch (err) {
    console.error('[Author Follow API] Hata:', err);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
