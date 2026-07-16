import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * GET /api/user/clubs
 * ───────────────────
 * Giriş yapmış kullanıcının onaylanmış kulüp üyeliklerini listeler.
 */
export async function GET(request: NextRequest) {
  const token = extractBearerToken(request.headers.get('Authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz: Giriş yapmalısınız' }, { status: 401 });
  }

  try {
    const decoded = await verifyFirebaseToken(token);

    const { data: memberships, error } = await supabaseAdmin
      .from('club_members')
      .select('*, club:club_id(name, slug, logo_url)')
      .eq('user_id', decoded.uid)
      .eq('status', 'approved');

    if (error) throw error;

    return NextResponse.json({ memberships });
  } catch (err: any) {
    console.error('[User Clubs GET] Hata:', err.message || err);
    return NextResponse.json({ error: 'Üyelikler yüklenemedi' }, { status: 500 });
  }
}
