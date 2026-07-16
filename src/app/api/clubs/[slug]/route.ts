import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * GET /api/clubs/[slug]
 * ────────────────────
 * Belirli bir kulübün detaylarını getirir (üye sayısı ve aktif kullanıcı rolü ile birlikte).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const token = extractBearerToken(request.headers.get('Authorization'));
  const slug = params.slug;

  try {
    // 1. Kulübü çek
    const { data: club, error } = await supabaseAdmin
      .from('clubs')
      .select('*, founder:founder_id(username, display_name, avatar_url), president:president_id(username, display_name, avatar_url)')
      .eq('slug', slug)
      .single();

    if (error || !club) {
      return NextResponse.json({ error: 'Kulüp bulunamadı' }, { status: 404 });
    }

    // 2. Üye sayısı
    const { count: memberCount } = await supabaseAdmin
      .from('club_members')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', club.id)
      .eq('status', 'approved');

    // 3. İstek yapan kullanıcının üyelik/rol durumu
    let userRole: string | null = null;
    let userStatus: string | null = null;

    if (token) {
      try {
        const decoded = await verifyFirebaseToken(token);
        const { data: member } = await supabaseAdmin
          .from('club_members')
          .select('role, status')
          .eq('club_id', club.id)
          .eq('user_id', decoded.uid)
          .maybeSingle();

        if (member) {
          userRole = member.role;
          userStatus = member.status;
        }
      } catch (tokenErr) {
        console.warn('[Clubs GET] Token doğrulama hatası (misafir modu):', tokenErr);
      }
    }

    return NextResponse.json({
      club: {
        ...club,
        member_count: memberCount || 0,
        user_role: userRole,
        user_status: userStatus,
      },
    });
  } catch (err: any) {
    console.error('[Club GET Slug] Hata:', err.message || err);
    return NextResponse.json({ error: 'Kulüp detayları yüklenemedi' }, { status: 500 });
  }
}

/**
 * PUT /api/clubs/[slug]
 * ────────────────────
 * Kulüp bilgilerini günceller (Yalnızca Kulüp Başkanı / Yönetici).
 */
export async function PUT(
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

    // 1. Kulübü çek ve yetki kontrolü yap
    const { data: club, error: clubErr } = await supabaseAdmin
      .from('clubs')
      .select('id, president_id')
      .eq('slug', slug)
      .single();

    if (clubErr || !club) {
      return NextResponse.json({ error: 'Kulüp bulunamadı' }, { status: 404 });
    }

    if (club.president_id !== decoded.uid) {
      return NextResponse.json({ error: 'Bu işlemi yapmaya yetkiniz yok. Sadece Başkan güncelleyebilir.' }, { status: 403 });
    }

    const body = await request.json();
    const { description, logoUrl, vision } = body as {
      description?: string;
      logoUrl?: string;
      vision?: string;
    };

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof description === 'string') updatePayload.description = description.trim() || null;
    if (typeof logoUrl === 'string') updatePayload.logo_url = logoUrl.trim() || null;
    if (typeof vision === 'string') updatePayload.vision = vision.trim() || null;

    const { data: updatedClub, error: updateErr } = await supabaseAdmin
      .from('clubs')
      .update(updatePayload)
      .eq('id', club.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ club: updatedClub });
  } catch (err: any) {
    console.error('[Club PUT Slug] Hata:', err.message || err);
    return NextResponse.json({ error: 'Kulüp güncellenemedi' }, { status: 500 });
  }
}
