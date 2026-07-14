import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * POST /api/article/save
 * ────────────────────────
 * Makaleyi kaydetme / kaydı silme (toggle).
 * Body: { makaleId: string }
 * Yanıt: { saved: boolean }
 */
export async function POST(request: NextRequest) {
  const token = extractBearerToken(request.headers.get('Authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  try {
    const decoded = await verifyFirebaseToken(token);
    const { makaleId } = await request.json();

    if (!makaleId || typeof makaleId !== 'string') {
      return NextResponse.json({ error: 'Geçersiz makaleId' }, { status: 400 });
    }

    // Mevcut kayıt var mı kontrol et
    const { data: existingSave } = await supabaseAdmin
      .from('kaydedilen_makaleler')
      .select('kullanici_id')
      .eq('kullanici_id', decoded.uid)
      .eq('makale_id', makaleId)
      .single();

    if (existingSave) {
      // Kaydı sil
      await supabaseAdmin
        .from('kaydedilen_makaleler')
        .delete()
        .eq('kullanici_id', decoded.uid)
        .eq('makale_id', makaleId);

      return NextResponse.json({ saved: false });
    } else {
      // Kaydet
      await supabaseAdmin
        .from('kaydedilen_makaleler')
        .insert({ kullanici_id: decoded.uid, makale_id: makaleId });

      return NextResponse.json({ saved: true });
    }
  } catch (err) {
    console.error('[Article Save API] Hata:', err);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}

/**
 * GET /api/article/save?makaleId=xxx
 * Kullanıcının makaleyi kaydedip kaydetmediğini döner.
 */
export async function GET(request: NextRequest) {
  const token = extractBearerToken(request.headers.get('Authorization'));
  if (!token) {
    return NextResponse.json({ saved: false });
  }

  try {
    const decoded = await verifyFirebaseToken(token);
    const { searchParams } = new URL(request.url);
    const makaleId = searchParams.get('makaleId');

    if (!makaleId) {
      return NextResponse.json({ saved: false });
    }

    const { data } = await supabaseAdmin
      .from('kaydedilen_makaleler')
      .select('kullanici_id')
      .eq('kullanici_id', decoded.uid)
      .eq('makale_id', makaleId)
      .single();

    return NextResponse.json({ saved: !!data });
  } catch {
    return NextResponse.json({ saved: false });
  }
}
