import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * GET /api/clubs/[slug]/projects
 * ──────────────────────────────
 * Kulübün projelerini listeler.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;

  try {
    const { data: club, error: clubErr } = await supabaseAdmin
      .from('clubs')
      .select('id')
      .eq('slug', slug)
      .single();

    if (clubErr || !club) {
      return NextResponse.json({ error: 'Kulüp bulunamadı' }, { status: 404 });
    }

    const { data: projects, error: projectsErr } = await supabaseAdmin
      .from('club_projects')
      .select('*, leader:leader_id(username, display_name, avatar_url)')
      .eq('club_id', club.id)
      .order('created_at', { ascending: false });

    if (projectsErr) throw projectsErr;

    return NextResponse.json({ projects });
  } catch (err: any) {
    console.error('[Club Projects GET] Hata:', err.message || err);
    return NextResponse.json({ error: 'Projeler yüklenemedi' }, { status: 500 });
  }
}

/**
 * POST /api/clubs/[slug]/projects
 * ───────────────────────────────
 * Kulübe yeni bir proje ekler (Başkan veya Takım Lideri yetkisi).
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

    // 2. Yetki denetimi (Başkan veya Takım Lideri mi?)
    const { data: caller } = await supabaseAdmin
      .from('club_members')
      .select('role, status')
      .eq('club_id', club.id)
      .eq('user_id', decoded.uid)
      .maybeSingle();

    if (!caller || caller.status !== 'approved' || (caller.role !== 'president' && caller.role !== 'leader')) {
      return NextResponse.json({ error: 'Yetkisiz: Proje eklemek için başkan veya takım lideri olmalısınız' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, imageUrls, leaderId } = body as {
      title: string;
      description?: string;
      imageUrls?: string[];
      leaderId?: string | null;
    };

    if (!title || title.trim().length < 3) {
      return NextResponse.json({ error: 'Proje başlığı en az 3 karakter olmalıdır' }, { status: 400 });
    }

    // 3. Projeyi oluştur
    const { data: newProject, error: insertErr } = await supabaseAdmin
      .from('club_projects')
      .insert({
        club_id: club.id,
        title: title.trim(),
        description: description?.trim() || null,
        image_urls: imageUrls || [],
        leader_id: leaderId || decoded.uid, // Varsayılan olarak ekleyen kişi lider olur
        status: 'active',
      })
      .select('*')
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({ project: newProject });
  } catch (err: any) {
    console.error('[Club Projects POST] Hata:', err.message || err);
    return NextResponse.json({ error: 'Proje eklenemedi' }, { status: 500 });
  }
}

/**
 * PUT /api/clubs/[slug]/projects
 * ──────────────────────────────
 * Proje günceller (Sadece başkan veya ilgili projenin lideri).
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
    const { projectId, title, description, imageUrls, status, leaderId } = body as {
      projectId: string;
      title?: string;
      description?: string;
      imageUrls?: string[];
      status?: string;
      leaderId?: string | null;
    };

    if (!projectId) {
      return NextResponse.json({ error: 'Proje ID gereklidir' }, { status: 400 });
    }

    // 2. Projenin kendisini bul
    const { data: project, error: projErr } = await supabaseAdmin
      .from('club_projects')
      .select('*')
      .eq('id', projectId)
      .eq('club_id', club.id)
      .single();

    if (projErr || !project) {
      return NextResponse.json({ error: 'Proje bulunamadı' }, { status: 404 });
    }

    // 3. Yetki kontrolü: Sadece Kulüp Başkanı veya projenin lideri güncelleyebilir
    const isPresident = club.president_id === decoded.uid;
    const isProjectLeader = project.leader_id === decoded.uid;

    if (!isPresident && !isProjectLeader) {
      return NextResponse.json({ error: 'Yetkisiz: Sadece kulüp başkanı veya bu projenin takım lideri güncelleyebilir' }, { status: 403 });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (title) updatePayload.title = title.trim();
    if (description !== undefined) updatePayload.description = description?.trim() || null;
    if (imageUrls) updatePayload.image_urls = imageUrls;
    if (status) updatePayload.status = status;
    if (leaderId !== undefined) {
      // Proje liderini sadece başkan değiştirebilir
      if (isPresident) {
        updatePayload.leader_id = leaderId;
      }
    }

    const { data: updatedProject, error: updateErr } = await supabaseAdmin
      .from('club_projects')
      .update(updatePayload)
      .eq('id', projectId)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ project: updatedProject });
  } catch (err: any) {
    console.error('[Club Projects PUT] Hata:', err.message || err);
    return NextResponse.json({ error: 'Proje güncellenemedi' }, { status: 500 });
  }
}

/**
 * DELETE /api/clubs/[slug]/projects
 * ─────────────────────────────────
 * Proje siler (Sadece Kulüp Başkanı).
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
      return NextResponse.json({ error: 'Yetkisiz: Sadece Kulüp Başkanı projeleri silebilir' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Silinecek proje ID gereklidir' }, { status: 400 });
    }

    const { error: deleteErr } = await supabaseAdmin
      .from('club_projects')
      .delete()
      .eq('id', projectId)
      .eq('club_id', club.id);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Club Projects DELETE] Hata:', err.message || err);
    return NextResponse.json({ error: 'Proje silinemedi' }, { status: 500 });
  }
}
