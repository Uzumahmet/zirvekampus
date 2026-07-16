import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { extractBearerToken } from '@/lib/utils';
import slugify from 'slugify';

export const runtime = 'nodejs';

/**
 * GET /api/clubs
 * ──────────────
 * Tüm kulüpleri listeler (arama ve filtreleme destekli).
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';

  try {
    let dbQuery = supabaseAdmin
      .from('clubs')
      .select('*, founder:founder_id(username, display_name, avatar_url), president:president_id(username, display_name, avatar_url)');

    if (query) {
      dbQuery = dbQuery.ilike('name', `%${query}%`);
    }

    const { data: clubs, error } = await dbQuery.order('name', { ascending: true });
    if (error) throw error;

    // Her kulüp için üye sayısını çekelim
    const clubsWithMemberCount = await Promise.all(
      (clubs || []).map(async (club) => {
        const { count, error: countErr } = await supabaseAdmin
          .from('club_members')
          .select('*', { count: 'exact', head: true })
          .eq('club_id', club.id)
          .eq('status', 'approved');

        return {
          ...club,
          member_count: countErr ? 0 : (count || 0),
        };
      })
    );

    return NextResponse.json({ clubs: clubsWithMemberCount });
  } catch (err: any) {
    console.error('[Clubs GET] Hata:', err.message || err);
    return NextResponse.json({ error: 'Kulüpler listelenemedi' }, { status: 500 });
  }
}

/**
 * POST /api/clubs
 * ───────────────
 * Yeni bir kulüp oluşturur (Yalnızca giriş yapmış kullanıcılar).
 */
export async function POST(request: NextRequest) {
  const token = extractBearerToken(request.headers.get('Authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz: Oturum açmalısınız' }, { status: 401 });
  }

  try {
    const decoded = await verifyFirebaseToken(token);
    const body = await request.json();
    const { name, description, logoUrl, vision } = body as {
      name: string;
      description?: string;
      logoUrl?: string;
      vision?: string;
    };

    if (!name || name.trim().length < 3) {
      return NextResponse.json({ error: 'Kulüp adı en az 3 karakter olmalıdır' }, { status: 400 });
    }

    const slug = slugify(name, { lower: true, strict: true });

    // 1. Kulübü oluştur
    const { data: newClub, error: insertError } = await supabaseAdmin
      .from('clubs')
      .insert({
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        logo_url: logoUrl?.trim() || null,
        vision: vision?.trim() || null,
        founder_id: decoded.uid,
        president_id: decoded.uid,
        president_appointed_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Bu isimde veya slugda bir kulüp zaten mevcut' }, { status: 400 });
      }
      throw insertError;
    }

    // 2. Kurucuyu "president" rolünde üye olarak ekle
    const { error: memberError } = await supabaseAdmin
      .from('club_members')
      .insert({
        club_id: newClub.id,
        user_id: decoded.uid,
        role: 'president',
        status: 'approved',
      });

    if (memberError) throw memberError;

    return NextResponse.json({ club: newClub });
  } catch (err: any) {
    console.error('[Clubs POST] Hata:', err.message || err);
    return NextResponse.json({ error: 'Kulüp oluşturulamadı' }, { status: 500 });
  }
}
