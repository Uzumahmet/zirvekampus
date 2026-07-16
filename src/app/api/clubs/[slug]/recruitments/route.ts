import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * GET /api/clubs/[slug]/recruitments
 * ──────────────────────────────────
 * 1. İlanları listeler.
 * 2. İstek yapan kişi yetkili ise (Başkan/Takım Lideri), her ilanın altındaki başvuruları da döner.
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
      .select('id, president_id')
      .eq('slug', slug)
      .single();

    if (clubErr || !club) {
      return NextResponse.json({ error: 'Kulüp bulunamadı' }, { status: 404 });
    }

    // 1. Yetki Kontrolü
    let isManager = false;
    let currentUserUid: string | null = null;
    if (token) {
      try {
        const decoded = await verifyFirebaseToken(token);
        currentUserUid = decoded.uid;
        
        const { data: caller } = await supabaseAdmin
          .from('club_members')
          .select('role, status')
          .eq('club_id', club.id)
          .eq('user_id', decoded.uid)
          .maybeSingle();

        if (caller && caller.status === 'approved' && (caller.role === 'president' || caller.role === 'leader')) {
          isManager = true;
        }
      } catch (err) {}
    }

    // 2. İlanları çek
    const { data: recruitments, error: recErr } = await supabaseAdmin
      .from('club_recruitments')
      .select('*')
      .eq('club_id', club.id)
      .order('created_at', { ascending: false });

    if (recErr) throw recErr;

    // 3. Başvuruları yerleştir
    const finalRecruitments = await Promise.all(
      (recruitments || []).map(async (rec) => {
        let applications: any[] = [];
        let myApplication: any = null;

        if (isManager) {
          // Yöneticiler tüm başvuruları görebilir
          const { data: apps } = await supabaseAdmin
            .from('club_recruitment_applications')
            .select('*, user:user_id(username, display_name, avatar_url, email, school_email, phone_number, fakulte)')
            .eq('recruitment_id', rec.id)
            .order('created_at', { ascending: false });
          applications = apps || [];
        }

        if (currentUserUid) {
          // Kullanıcının kendi başvurusu
          const { data: myApp } = await supabaseAdmin
            .from('club_recruitment_applications')
            .select('*')
            .eq('recruitment_id', rec.id)
            .eq('user_id', currentUserUid)
            .maybeSingle();
          myApplication = myApp;
        }

        return {
          ...rec,
          applications,
          my_application: myApplication,
        };
      })
    );

    return NextResponse.json({ recruitments: finalRecruitments });
  } catch (err: any) {
    console.error('[Club Recruitments GET] Hata:', err.message || err);
    return NextResponse.json({ error: 'İlanlar yüklenemedi' }, { status: 500 });
  }
}

/**
 * POST /api/clubs/[slug]/recruitments
 * ───────────────────────────────────
 * 1. Yeni pozisyon ilanı ekler (Sadece Kulüp Başkanı).
 * 2. `action: 'apply'` verilirse açık ilana başvuru yapar.
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

    const { data: club, error: clubErr } = await supabaseAdmin
      .from('clubs')
      .select('id, president_id')
      .eq('slug', slug)
      .single();

    if (clubErr || !club) {
      return NextResponse.json({ error: 'Kulüp bulunamadı' }, { status: 404 });
    }

    const body = await request.json();
    const { action, recruitmentId, coverLetter, title, description, requirements } = body as {
      action?: 'apply';
      recruitmentId?: string;
      coverLetter?: string;
      title?: string;
      description?: string;
      requirements?: string[];
    };

    // --- CASE A: İlana Başvuru Yapma ---
    if (action === 'apply') {
      if (!recruitmentId) {
        return NextResponse.json({ error: 'Başvurulacak ilan ID gereklidir' }, { status: 400 });
      }

      // Kullanıcının daha önce başvurup başvurmadığını kontrol et
      const { data: existingApp } = await supabaseAdmin
        .from('club_recruitment_applications')
        .select('id')
        .eq('recruitment_id', recruitmentId)
        .eq('user_id', decoded.uid)
        .maybeSingle();

      if (existingApp) {
        return NextResponse.json({ error: 'Bu ilana zaten başvuru yaptınız' }, { status: 400 });
      }

      const { data: newApp, error: appErr } = await supabaseAdmin
        .from('club_recruitment_applications')
        .insert({
          recruitment_id: recruitmentId,
          user_id: decoded.uid,
          cover_letter: coverLetter?.trim() || null,
          status: 'pending',
        })
        .select('*')
        .single();

      if (appErr) throw appErr;

      return NextResponse.json({ application: newApp });
    }

    // --- CASE B: Yeni İlan Açma ---
    if (club.president_id !== decoded.uid) {
      return NextResponse.json({ error: 'Yetkisiz: Sadece Kulüp Başkanı ilan oluşturabilir' }, { status: 403 });
    }

    if (!title || !description) {
      return NextResponse.json({ error: 'Pozisyon başlığı ve açıklaması zorunludur' }, { status: 400 });
    }

    const { data: newRec, error: insertErr } = await supabaseAdmin
      .from('club_recruitments')
      .insert({
        club_id: club.id,
        title: title.trim(),
        description: description.trim(),
        requirements: requirements || [],
        is_active: true,
      })
      .select('*')
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({ recruitment: newRec });
  } catch (err: any) {
    console.error('[Club Recruitments POST] Hata:', err.message || err);
    return NextResponse.json({ error: 'İşlem gerçekleştirilemedi' }, { status: 500 });
  }
}

/**
 * PUT /api/clubs/[slug]/recruitments
 * ──────────────────────────────────
 * Başvuruyu onaylar/reddeder (Başkan veya Lider).
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

    const { data: club, error: clubErr } = await supabaseAdmin
      .from('clubs')
      .select('id')
      .eq('slug', slug)
      .single();

    if (clubErr || !club) {
      return NextResponse.json({ error: 'Kulüp bulunamadı' }, { status: 404 });
    }

    // İstek yapanın rol kontrolü
    const { data: caller } = await supabaseAdmin
      .from('club_members')
      .select('role, status')
      .eq('club_id', club.id)
      .eq('user_id', decoded.uid)
      .single();

    if (!caller || caller.status !== 'approved' || (caller.role !== 'president' && caller.role !== 'leader')) {
      return NextResponse.json({ error: 'Yetkisiz: Başvuruları sadece kulüp yöneticileri inceleyebilir' }, { status: 403 });
    }

    const body = await request.json();
    const { applicationId, status } = body as {
      applicationId: string;
      status: 'accepted' | 'rejected';
    };

    if (!applicationId || !status) {
      return NextResponse.json({ error: 'Başvuru ID ve onay durumu (accepted/rejected) gereklidir' }, { status: 400 });
    }

    // Başvuruyu çekelim
    const { data: application, error: appErr } = await supabaseAdmin
      .from('club_recruitment_applications')
      .select('*, recruitment:recruitment_id(title)')
      .eq('id', applicationId)
      .single();

    if (appErr || !application) {
      return NextResponse.json({ error: 'Başvuru bulunamadı' }, { status: 404 });
    }

    // Başvuruyu güncelle
    const { data: updatedApp, error: updateErr } = await supabaseAdmin
      .from('club_recruitment_applications')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    // Eğer kabul edildiyse, kulübe üye olarak ekle
    if (status === 'accepted') {
      const teamName = application.recruitment.title; // Başvurulan pozisyon ismini ekibi yapar
      await supabaseAdmin
        .from('club_members')
        .upsert({
          club_id: club.id,
          user_id: application.user_id,
          role: 'member',
          status: 'approved',
          team_name: teamName,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'club_id,user_id' });
    }

    return NextResponse.json({ application: updatedApp });
  } catch (err: any) {
    console.error('[Club Recruitments PUT] Hata:', err.message || err);
    return NextResponse.json({ error: 'Başvuru güncellenemedi' }, { status: 500 });
  }
}

/**
 * DELETE /api/clubs/[slug]/recruitments
 * ─────────────────────────────────────
 * İlanı siler (Sadece Kulüp Başkanı).
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

    const { data: club, error: clubErr } = await supabaseAdmin
      .from('clubs')
      .select('id, president_id')
      .eq('slug', slug)
      .single();

    if (clubErr || !club) {
      return NextResponse.json({ error: 'Kulüp bulunamadı' }, { status: 404 });
    }

    if (club.president_id !== decoded.uid) {
      return NextResponse.json({ error: 'Yetkisiz: Sadece Kulüp Başkanı ilanları silebilir' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const recruitmentId = searchParams.get('recruitmentId');

    if (!recruitmentId) {
      return NextResponse.json({ error: 'Silinecek ilan ID gereklidir' }, { status: 400 });
    }

    const { error: deleteErr } = await supabaseAdmin
      .from('club_recruitments')
      .delete()
      .eq('id', recruitmentId)
      .eq('club_id', club.id);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Club Recruitments DELETE] Hata:', err.message || err);
    return NextResponse.json({ error: 'İlan silinemedi' }, { status: 500 });
  }
}
