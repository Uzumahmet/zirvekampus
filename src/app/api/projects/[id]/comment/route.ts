import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

interface Params {
  params: { id: string };
}

// POST /api/projects/[id]/comment
// Projeye yorum yap
export async function POST(request: NextRequest, { params }: Params) {
  const projectId = params.id;
  const token = extractBearerToken(request.headers.get('Authorization'));

  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const decoded = await verifyFirebaseToken(token);
    const userId = decoded.uid;
    const body = await request.json();
    const { content } = body as { content: string };

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Yorum içeriği boş olamaz.' }, { status: 400 });
    }

    // Yorum kaydını oluştur
    const { data: newComment, error: insertError } = await supabaseAdmin
      .from('proje_yorumlar')
      .insert({
        project_id: projectId,
        author_id: userId,
        content: content.trim(),
      })
      .select(`
        *,
        author:kullanicilar!proje_yorumlar_author_id_fkey(username, display_name, avatar_url)
      `)
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, comment: newComment });
  } catch (err) {
    console.error('[Project Comment Error]', err);
    return NextResponse.json({ error: 'Yorum paylaşılamadı' }, { status: 500 });
  }
}
