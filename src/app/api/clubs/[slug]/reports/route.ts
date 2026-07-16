import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * POST /api/clubs/[slug]/reports
 * ──────────────────────────────
 * Kulüp içi kural ihlallerini veya uygunsuz paylaşımları raporlar.
 * Sadece kulübün onaylı üyeleri şikayette bulunabilir.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const token = extractBearerToken(request.headers.get('Authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz: Oturum açmalısınız' }, { status: 401 });
  }

  try {
    const decoded = await verifyFirebaseToken(token);
    const slug = params.slug;

    // 1. Kulübü bul
    const { data: club, error: clubErr } = await supabaseAdmin
      .from('clubs')
      .select('id')
      .eq('slug', slug)
      .single();

    if (clubErr || !club) {
      return NextResponse.json({ error: 'Kulüp bulunamadı' }, { status: 404 });
    }

    // 2. Raporlayanın onaylı üye olup olmadığını denetle
    const { data: member } = await supabaseAdmin
      .from('club_members')
      .select('id, status')
      .eq('club_id', club.id)
      .eq('user_id', decoded.uid)
      .eq('status', 'approved')
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Sadece kulübün resmi onaylı üyeleri şikayette bulunabilir' }, { status: 403 });
    }

    const body = await request.json();
    const { description } = body as { description: string };

    if (!description || description.trim().length < 10) {
      return NextResponse.json({ error: 'Şikayet açıklaması en az 10 karakter olmalıdır' }, { status: 400 });
    }

    // 3. Şikayeti veritabanına ekle
    const { data: violation, error: insertErr } = await supabaseAdmin
      .from('club_violations')
      .insert({
        club_id: club.id,
        reporter_id: decoded.uid,
        description: description.trim(),
      })
      .select('*')
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({
      success: true,
      message: 'Şikayetiniz sistem yönetimine başarıyla iletildi. En kısa sürede incelenecektir.',
      violation,
    });
  } catch (err: any) {
    console.error('[Club Violation POST] Hata:', err.message || err);
    return NextResponse.json({ error: 'Şikayet iletilemedi' }, { status: 500 });
  }
}
