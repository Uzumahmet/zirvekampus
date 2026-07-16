import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

// GET /api/projects
// Projeleri listele (arama veya fakülte filtresi ile)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const fakulte = searchParams.get('fakulte');
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);

  // Oturum açmış kullanıcının kimliğini doğrula (beğenileri kontrol etmek için opsiyonel)
  let currentUserId: string | null = null;
  const token = extractBearerToken(request.headers.get('Authorization'));
  if (token) {
    try {
      const decoded = await verifyFirebaseToken(token);
      currentUserId = decoded.uid;
    } catch (e) {
      console.warn('[Projects API] Geçersiz token (opsiyonel auth):', e);
    }
  }

  try {
    let queryBuilder = supabaseAdmin
      .from('projeler')
      .select(`
        *,
        author:kullanicilar!projeler_author_id_fkey(username, display_name, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (fakulte) {
      queryBuilder = queryBuilder.eq('fakulte', fakulte);
    } else {
      queryBuilder = queryBuilder.not('fakulte', 'eq', 'gonderi');
    }

    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }

    const { data: projects, error } = await queryBuilder.limit(limit);

    if (error) throw error;

    // Beğeni ve yorum sayılarını ekle
    const projectsWithStats = await Promise.all(
      (projects ?? []).map(async (project) => {
        // Yorum sayısı
        const { count: commentCount } = await supabaseAdmin
          .from('proje_yorumlar')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);

        // Beğeni sayısı
        const { count: likeCount } = await supabaseAdmin
          .from('proje_begeniler')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);

        // Giriş yapan kullanıcı beğendi mi?
        let likedByMe = false;
        if (currentUserId) {
          const { data: likeRecord } = await supabaseAdmin
            .from('proje_begeniler')
            .select('kullanici_id')
            .eq('project_id', project.id)
            .eq('kullanici_id', currentUserId)
            .maybeSingle();
          likedByMe = !!likeRecord;
        }

        return {
          ...project,
          comment_count: commentCount ?? 0,
          likes_count: likeCount ?? 0,
          liked_by_me: likedByMe,
        };
      })
    );

    return NextResponse.json(projectsWithStats);
  } catch (err) {
    console.error('[Projects GET Error]', err);
    return NextResponse.json({ error: 'Projeler yüklenemedi' }, { status: 500 });
  }
}

// POST /api/projects
// Yeni proje oluştur
export async function POST(request: NextRequest) {
  const token = extractBearerToken(request.headers.get('Authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const decoded = await verifyFirebaseToken(token);
    const body = await request.json();
    const { title, description, imageUrls, fakulte, aspectRatio } = body as {
      title: string;
      description: string;
      imageUrls: string[];
      fakulte: string;
      aspectRatio?: string;
    };

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'Başlık ve açıklama alanları zorunludur.' }, { status: 400 });
    }

    if (!fakulte) {
      return NextResponse.json({ error: 'Lütfen bir fakülte seçin.' }, { status: 400 });
    }

    // Supabase'e kaydet
    const { data: project, error } = await supabaseAdmin
      .from('projeler')
      .insert({
        title: title.trim(),
        description: description.trim(),
        image_urls: imageUrls || [],
        author_id: decoded.uid,
        fakulte: fakulte,
        aspect_ratio: aspectRatio || '1:1'
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, project });
  } catch (err) {
    console.error('[Projects POST Error]', err);
    return NextResponse.json({ error: 'Proje paylaşılamadı' }, { status: 500 });
  }
}
