import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * GET /api/clubs/[slug]/handover
 * ─────────────────────────────
 * Kulübün aktif yönetim devir işlemlerini ve durumunu sorgular.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const token = extractBearerToken(request.headers.get('Authorization'));
  const slug = params.slug;

  try {
    const { data: club, error: clubErr } = await supabaseAdmin
      .from('clubs')
      .select('*, president:president_id(username, display_name)')
      .eq('slug', slug)
      .single();

    if (clubErr || !club) {
      return NextResponse.json({ error: 'Kulüp bulunamadı' }, { status: 404 });
    }

    // 1. Mevcut başkanın atama tarihine göre 1 yıl dolmuş mu kontrol edelim
    const appointedDate = new Date(club.president_appointed_at);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const isExpired = appointedDate <= oneYearAgo || !club.president_id;

    // 2. Aktif devir sürecini bul
    const { data: handover } = await supabaseAdmin
      .from('club_handovers')
      .select('*, candidate:candidate_id(username, display_name, avatar_url)')
      .eq('club_id', club.id)
      .eq('status', 'pending')
      .maybeSingle();

    let approvals: string[] = [];
    let myApproved = false;

    if (handover) {
      // Süresi geçmiş mi denetle
      if (new Date(handover.expires_at) <= new Date()) {
        await supabaseAdmin
          .from('club_handovers')
          .update({ status: 'expired' })
          .eq('id', handover.id);
        handover.status = 'expired';
      } else {
        // Onayları çek
        const { data: apprs } = await supabaseAdmin
          .from('club_handover_approvals')
          .select('user_id')
          .eq('handover_id', handover.id);
        approvals = apprs?.map((a) => a.user_id) || [];

        if (token) {
          try {
            const decoded = await verifyFirebaseToken(token);
            myApproved = approvals.includes(decoded.uid);
          } catch (e) {}
        }
      }
    }

    return NextResponse.json({
      president_expired: isExpired,
      handover: handover?.status === 'pending' ? handover : null,
      approvals_count: approvals.length,
      approvals,
      my_approved: myApproved,
    });
  } catch (err: any) {
    console.error('[Handover GET] Hata:', err.message || err);
    return NextResponse.json({ error: 'Yönetim devir bilgisi alınamadı' }, { status: 500 });
  }
}

/**
 * POST /api/clubs/[slug]/handover
 * ──────────────────────────────
 * 1. `action: 'claim'`: Başkanlık iddiasında bulunur (Geri sayım başlatır).
 * 2. `action: 'approve'`: Mevcut üyeler adayı onaylar. 5 onaya ulaşınca devir tamamlanır.
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
      .select('id, president_id, president_appointed_at')
      .eq('slug', slug)
      .single();

    if (clubErr || !club) {
      return NextResponse.json({ error: 'Kulüp bulunamadı' }, { status: 404 });
    }

    const body = await request.json();
    const { action, handoverId } = body as {
      action: 'claim' | 'approve';
      handoverId?: string;
    };

    // --- CASE A: BAŞKANLIK İDDİASI (CLAIM) ---
    if (action === 'claim') {
      // Zaten aktif bir iddia var mı?
      const { data: activeHandover } = await supabaseAdmin
        .from('club_handovers')
        .select('id, expires_at')
        .eq('club_id', club.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (activeHandover) {
        if (new Date(activeHandover.expires_at) > new Date()) {
          return NextResponse.json({ error: 'Bu kulüp için halihazırda başlatılmış aktif bir yönetim devir süreci mevcut' }, { status: 400 });
        } else {
          // Süresi dolmuş olanı iptal et
          await supabaseAdmin
            .from('club_handovers')
            .update({ status: 'expired' })
            .eq('id', activeHandover.id);
        }
      }

      // Mevcut başkanın 1 yıllık süresi dolmuş mu?
      const appointedDate = new Date(club.president_appointed_at);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const isExpired = appointedDate <= oneYearAgo || !club.president_id;

      if (!isExpired) {
        return NextResponse.json({ error: 'Kulüp başkanının görev süresi (1 yıl) henüz dolmamıştır' }, { status: 400 });
      }

      // Adayın bu kulübe onaylı üye olması gerekir
      const { data: candidateMember } = await supabaseAdmin
        .from('club_members')
        .select('id')
        .eq('club_id', club.id)
        .eq('user_id', decoded.uid)
        .eq('status', 'approved')
        .maybeSingle();

      if (!candidateMember) {
        return NextResponse.json({ error: 'Yönetimi devralabilmek için önce kulübün onaylanmış bir üyesi olmalısınız' }, { status: 400 });
      }

      // Devir kaydını oluştur (1 haftalık geri sayım)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: newHandover, error: handoverErr } = await supabaseAdmin
        .from('club_handovers')
        .insert({
          club_id: club.id,
          candidate_id: decoded.uid,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
        })
        .select('*')
        .single();

      if (handoverErr) throw handoverErr;

      return NextResponse.json({ handover: newHandover });
    }

    // --- CASE B: ADAYI ONAYLAMA (APPROVE) ---
    if (action === 'approve') {
      if (!handoverId) {
        return NextResponse.json({ error: 'Onaylanacak devir işlem ID gereklidir' }, { status: 400 });
      }

      // Devir kaydını bul
      const { data: handover, error: hndErr } = await supabaseAdmin
        .from('club_handovers')
        .select('*')
        .eq('id', handoverId)
        .eq('status', 'pending')
        .single();

      if (hndErr || !handover || new Date(handover.expires_at) <= new Date()) {
        return NextResponse.json({ error: 'Aktif veya geçerli bir devir süreci bulunamadı' }, { status: 400 });
      }

      // Oy verenin kulüp üyesi olup olmadığını kontrol et (Adayın kendisi oy veremez)
      if (decoded.uid === handover.candidate_id) {
        return NextResponse.json({ error: 'Aday kendisi için onay oyu kullanamaz' }, { status: 400 });
      }

      const { data: voterMember } = await supabaseAdmin
        .from('club_members')
        .select('role, status')
        .eq('club_id', club.id)
        .eq('user_id', decoded.uid)
        .eq('status', 'approved')
        .maybeSingle();

      if (!voterMember) {
        return NextResponse.json({ error: 'Sadece kulübün onaylı üyeleri yönetim devrini onaylayabilir' }, { status: 400 });
      }

      // Daha önce oy vermiş mi?
      const { data: existingApproval } = await supabaseAdmin
        .from('club_handover_approvals')
        .select('id')
        .eq('handover_id', handoverId)
        .eq('user_id', decoded.uid)
        .maybeSingle();

      if (existingApproval) {
        return NextResponse.json({ error: 'Bu devir işlemi için zaten onay oyu kullandınız' }, { status: 400 });
      }

      // Onayı kaydet
      const { error: approvalErr } = await supabaseAdmin
        .from('club_handover_approvals')
        .insert({
          handover_id: handoverId,
          user_id: decoded.uid,
        });

      if (approvalErr) throw approvalErr;

      // Toplam onay sayısını sorgula
      const { data: totalApprovals } = await supabaseAdmin
        .from('club_handover_approvals')
        .select('user_id')
        .eq('handover_id', handoverId);

      const voteCount = totalApprovals?.length || 0;

      // 5 Onay tamamlandıysa başkanı değiştir!
      if (voteCount >= 5) {
        // 1. Devir kaydını completed yap
        await supabaseAdmin
          .from('club_handovers')
          .update({ status: 'completed' })
          .eq('id', handoverId);

        // 2. Kulüpteki eski başkanın rolünü üye yap
        if (club.president_id) {
          await supabaseAdmin
            .from('club_members')
            .update({ role: 'member' })
            .eq('club_id', club.id)
            .eq('user_id', club.president_id);
        }

        // 3. Adayın rolünü president (başkan) yap
        await supabaseAdmin
          .from('club_members')
          .update({ role: 'president', team_name: 'Yönetim Kurulu' })
          .eq('club_id', club.id)
          .eq('user_id', handover.candidate_id);

        // 4. Kulübün president_id ve appointed_at alanlarını güncelle
        await supabaseAdmin
          .from('clubs')
          .update({
            president_id: handover.candidate_id,
            president_appointed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', club.id);

        return NextResponse.json({
          completed: true,
          message: 'Tebrikler! 5 üye onayı tamamlandı. Kulübün yeni başkanı atandı.',
        });
      }

      return NextResponse.json({
        completed: false,
        vote_count: voteCount,
        message: `Onayınız kaydedildi. Yeni başkanın atanması için ${5 - voteCount} onay daha gerekiyor.`,
      });
    }

    return NextResponse.json({ error: 'Geçersiz eylem' }, { status: 400 });
  } catch (err: any) {
    console.error('[Handover POST] Hata:', err.message || err);
    return NextResponse.json({ error: 'Yönetim devir işlemi yapılamadı' }, { status: 500 });
  }
}
