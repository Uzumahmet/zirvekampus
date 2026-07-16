import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * GET /api/clubs/[slug]/members
 * ─────────────────────────────
 * Kulüp üyelerini listeler. Giriş yapan kişi başkan veya lider ise beklemedeki başvuruları da döner.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const token = extractBearerToken(request.headers.get('Authorization'));
  const slug = params.slug;

  try {
    // 1. Kulübü bul
    const { data: club, error: clubErr } = await supabaseAdmin
      .from('clubs')
      .select('id, president_id')
      .eq('slug', slug)
      .single();

    if (clubErr || !club) {
      return NextResponse.json({ error: 'Kulüp bulunamadı' }, { status: 404 });
    }

    // 2. İstek yapan kişinin rolünü bul
    let isManager = false;
    if (token) {
      try {
        const decoded = await verifyFirebaseToken(token);
        const { data: member } = await supabaseAdmin
          .from('club_members')
          .select('role, status')
          .eq('club_id', club.id)
          .eq('user_id', decoded.uid)
          .single();

        if (member && member.status === 'approved' && (member.role === 'president' || member.role === 'leader')) {
          isManager = true;
        }
      } catch (err) {
        // Misafir modu veya hatalı token
      }
    }

    // 3. Üyeleri çek
    let query = supabaseAdmin
      .from('club_members')
      .select('*, user:user_id(username, display_name, avatar_url, fakulte)')
      .eq('club_id', club.id);

    // Yönetici değilse sadece onaylanmış üyeleri döner
    if (!isManager) {
      query = query.eq('status', 'approved');
    }

    const { data: members, error: membersErr } = await query.order('created_at', { ascending: true });
    if (membersErr) throw membersErr;

    return NextResponse.json({ members });
  } catch (err: any) {
    console.error('[Club Members GET] Hata:', err.message || err);
    return NextResponse.json({ error: 'Kulüp üyeleri listelenemedi' }, { status: 500 });
  }
}

/**
 * POST /api/clubs/[slug]/members
 * ──────────────────────────────
 * Kulübe katılma başvurusu yapar.
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

    // 2. Kullanıcı zaten kayıtlı mı?
    const { data: existingMember } = await supabaseAdmin
      .from('club_members')
      .select('id, status')
      .eq('club_id', club.id)
      .eq('user_id', decoded.uid)
      .maybeSingle();

    if (existingMember) {
      if (existingMember.status === 'approved') {
        return NextResponse.json({ error: 'Zaten bu kulübün üyesisiniz' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Daha önce yaptığınız başvuru onay bekliyor' }, { status: 400 });
    }

    const body = await request.json();
    const { teamName, role, status } = body as { teamName?: string; role?: string; status?: string };

    const targetRole = (role === 'alumni' || role === 'member') ? role : 'member';
    const targetStatus = (status === 'approved' || status === 'pending') ? status : 'pending';

    // 3. Başvuruyu ekle
    const { data: newMember, error: insertErr } = await supabaseAdmin
      .from('club_members')
      .insert({
        club_id: club.id,
        user_id: decoded.uid,
        role: targetRole,
        status: targetStatus,
        team_name: teamName?.trim() || null,
      })
      .select('*')
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({ member: newMember });
  } catch (err: any) {
    console.error('[Club Members POST] Hata:', err.message || err);
    return NextResponse.json({ error: 'Kulübe katılma başvurusu yapılamadı' }, { status: 500 });
  }
}

/**
 * PUT /api/clubs/[slug]/members
 * ─────────────────────────────
 * Başvuruyu onaylar/reddeder ya da üyenin rolünü/ekibini değiştirir (Yönetici yetkisi gerektirir).
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

    // 1. Kulübü bul
    const { data: club, error: clubErr } = await supabaseAdmin
      .from('clubs')
      .select('id, president_id')
      .eq('slug', slug)
      .single();

    if (clubErr || !club) {
      return NextResponse.json({ error: 'Kulüp bulunamadı' }, { status: 404 });
    }

    const body = await request.json();
    const { userId, role, status, teamName, teamId } = body as {
      userId: string;
      role?: string;
      status?: string;
      teamName?: string | null;
      teamId?: string | null;
    };

    if (!userId) {
      return NextResponse.json({ error: 'Güncellenecek kullanıcı ID gereklidir' }, { status: 400 });
    }

    const isSelfUpdate = userId === decoded.uid;

    // 2. İstek yapanın rolünü denetle
    const { data: caller, error: callerErr } = await supabaseAdmin
      .from('club_members')
      .select('role, status')
      .eq('club_id', club.id)
      .eq('user_id', decoded.uid)
      .single();

    if (callerErr) {
      return NextResponse.json({ error: 'Bu kulübün üyesi değilsiniz' }, { status: 403 });
    }

    if (!isSelfUpdate) {
      if (caller.status !== 'approved' || (caller.role !== 'president' && caller.role !== 'leader')) {
        return NextResponse.json({ error: 'Yetkisiz: Üyeleri yönetmek için başkan veya takım lideri olmalısınız' }, { status: 403 });
      }
    } else {
      // Kendini güncellerken rolü başkan veya lider yapamaz
      if (role && role !== 'member' && role !== 'alumni') {
        return NextResponse.json({ error: 'Yetkisiz: Kendi rolünüzü başkan veya takım lideri olarak değiştiremezsiniz' }, { status: 403 });
      }
      // Kendini güncellerken onay durumunu değiştiremez
      if (status && status !== caller.status) {
        return NextResponse.json({ error: 'Yetkisiz: Kendi onay durumunuzu değiştiremezsiniz' }, { status: 403 });
      }
    }

    // 3. Hedef üyenin mevcut durumunu bul
    const { data: target, error: targetErr } = await supabaseAdmin
      .from('club_members')
      .select('role, status')
      .eq('club_id', club.id)
      .eq('user_id', userId)
      .single();

    if (targetErr || !target) {
      return NextResponse.json({ error: 'Hedef üye bulunamadı' }, { status: 404 });
    }

    // Yetki kısıtlamaları:
    // - Takım Liderleri (leader) başkanın rolünü, durumunu veya diğer takım liderlerini değiştiremez.
    if (caller.role === 'leader') {
      if (target.role === 'president' || target.role === 'leader' || role === 'president' || role === 'leader') {
        return NextResponse.json({ error: 'Yetkisiz: Takım Liderleri başkan veya diğer liderlerin yetkilerini değiştiremez' }, { status: 403 });
      }
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (role) updatePayload.role = role;
    if (status) updatePayload.status = status;
    if (teamName !== undefined) updatePayload.team_name = teamName;

    if (teamId !== undefined) {
      if (teamId === null) {
        updatePayload.team_id = null;
        updatePayload.team_name = null;
      } else {
        const { data: teamData } = await supabaseAdmin
          .from('club_teams')
          .select('name')
          .eq('id', teamId)
          .eq('club_id', club.id)
          .single();

        if (teamData) {
          updatePayload.team_id = teamId;
          updatePayload.team_name = teamData.name;
        }
      }
    }

    // Eğer rol 'president' olarak atanmak isteniyorsa, bu sadece devir algoritmasıyla ya da başkanın kendisiyle yapılabilir
    if (role === 'president' && decoded.uid !== club.president_id) {
      return NextResponse.json({ error: 'Başkan ataması sadece yönetim devri veya mevcut başkan tarafından yapılabilir' }, { status: 403 });
    }

    const { data: updatedMember, error: updateErr } = await supabaseAdmin
      .from('club_members')
      .update(updatePayload)
      .eq('club_id', club.id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    // Eğer yeni başkan atandıysa kulüp tablosunu da güncelle
    if (role === 'president' && status === 'approved') {
      await supabaseAdmin
        .from('clubs')
        .update({
          president_id: userId,
          president_appointed_at: new Date().toISOString()
        })
        .eq('id', club.id);
        
      // Eski başkanı 'member' yapalım
      await supabaseAdmin
        .from('club_members')
        .update({ role: 'member' })
        .eq('club_id', club.id)
        .eq('user_id', club.president_id)
        .eq('role', 'president');
    }

    return NextResponse.json({ member: updatedMember });
  } catch (err: any) {
    console.error('[Club Members PUT] Hata:', err.message || err);
    return NextResponse.json({ error: 'Üye güncellenemedi' }, { status: 500 });
  }
}

/**
 * DELETE /api/clubs/[slug]/members
 * ───────────────────────────────
 * Üyeyi kulüpten çıkarır veya üye kendi isteğiyle ayrılır.
 */
export async function DELETE(
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
      .select('id, president_id')
      .eq('slug', slug)
      .single();

    if (clubErr || !club) {
      return NextResponse.json({ error: 'Kulüp bulunamadı' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ error: 'Çıkarılacak kullanıcı ID gereklidir' }, { status: 400 });
    }

    const isSelfLeaving = targetUserId === decoded.uid;

    if (!isSelfLeaving) {
      // Çıkarma işlemi yetki kontrolü: Sadece Kulüp Başkanı resmi olarak üye çıkarabilir
      if (club.president_id !== decoded.uid) {
        return NextResponse.json({ error: 'Yetkisiz: Sadece Kulüp Başkanı üye çıkarabilir' }, { status: 403 });
      }
      
      // Başkan kendini çıkaramaz, önce yönetimi devretmeli
      if (targetUserId === club.president_id) {
        return NextResponse.json({ error: 'Başkan kulüpten çıkmadan önce yönetimi devretmelidir' }, { status: 400 });
      }
    } else {
      // Üye kendi çıkmak istiyor. Başkan ise çıkamaz.
      if (decoded.uid === club.president_id) {
        return NextResponse.json({ error: 'Başkan kulüpten çıkmadan önce yönetimi devretmelidir' }, { status: 400 });
      }
    }

    const { error: deleteErr } = await supabaseAdmin
      .from('club_members')
      .delete()
      .eq('club_id', club.id)
      .eq('user_id', targetUserId);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Club Members DELETE] Hata:', err.message || err);
    return NextResponse.json({ error: 'Üye kulüpten çıkarılamadı' }, { status: 500 });
  }
}
