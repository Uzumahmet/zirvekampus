import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

interface Params {
  params: { id: string };
}

// GET /api/projects/[id]
// Tek proje getir, detayları ve yorumları ile birlikte
export async function GET(request: NextRequest, { params }: Params) {
  const projectId = params.id;

  // Oturum açmış kullanıcının kimliğini doğrula (opsiyonel)
  let currentUserId: string | null = null;
  const token = extractBearerToken(request.headers.get('Authorization'));
  if (token) {
    try {
      const decoded = await verifyFirebaseToken(token);
      currentUserId = decoded.uid;
    } catch (e) {}
  }

  try {
    // 1. Proje detayını çek
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projeler')
      .select(`
        *,
        author:kullanicilar!projeler_author_id_fkey(username, display_name, avatar_url, role)
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Proje bulunamadı' }, { status: 404 });
    }

    // Görüntülenme sayısını artır (sessizce)
    await supabaseAdmin
      .from('projeler')
      .update({ views_count: (project.views_count || 0) + 1 })
      .eq('id', projectId);

    // 2. Yorumları çek
    const { data: comments, error: commentsError } = await supabaseAdmin
      .from('proje_yorumlar')
      .select(`
        *,
        author:kullanicilar!proje_yorumlar_author_id_fkey(username, display_name, avatar_url)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (commentsError) throw commentsError;

    // 3. Beğenileri çek ve doğrula
    const { count: likeCount } = await supabaseAdmin
      .from('proje_begeniler')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    let likedByMe = false;
    if (currentUserId) {
      const { data: likeRecord } = await supabaseAdmin
        .from('proje_begeniler')
        .select('kullanici_id')
        .eq('project_id', projectId)
        .eq('kullanici_id', currentUserId)
        .maybeSingle();
      likedByMe = !!likeRecord;
    }

    return NextResponse.json({
      ...project,
      comments: comments ?? [],
      likes_count: likeCount ?? 0,
      liked_by_me: likedByMe,
    });
  } catch (err) {
    console.error('[Project Detail GET Error]', err);
    return NextResponse.json({ error: 'Proje yüklenirken hata oluştu' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]
// Projeyi sil
export async function DELETE(request: NextRequest, { params }: Params) {
  const projectId = params.id;
  const token = extractBearerToken(request.headers.get('Authorization'));

  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const decoded = await verifyFirebaseToken(token);
    const userId = decoded.uid;

    // Kullanıcının rolünü al
    const { data: userProfile } = await supabaseAdmin
      .from('kullanicilar')
      .select('role')
      .eq('id', userId)
      .single();

    // Projeyi kontrol et
    const { data: project, error: checkError } = await supabaseAdmin
      .from('projeler')
      .select('author_id')
      .eq('id', projectId)
      .single();

    if (checkError || !project) {
      return NextResponse.json({ error: 'Proje bulunamadı' }, { status: 404 });
    }

    const isAdminOrEditor = ['admin', 'editor'].includes(userProfile?.role || '');
    const isOwner = project.author_id === userId;

    if (!isOwner && !isAdminOrEditor) {
      return NextResponse.json({ error: 'Bu projeyi silmeye yetkiniz yok.' }, { status: 403 });
    }

    // Projeyi sil
    const { error: deleteError } = await supabaseAdmin
      .from('projeler')
      .delete()
      .eq('id', projectId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, message: 'Proje silindi' });
  } catch (err) {
    console.error('[Project DELETE Error]', err);
    return NextResponse.json({ error: 'Proje silinemedi' }, { status: 500 });
  }
}
