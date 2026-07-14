import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

/**
 * POST /api/forum/entry
 * ──────────────────────
 * Yeni bir forum entry'si oluşturur.
 * Kullanıcı kimliği Firebase token ile doğrulanır.
 */
export async function POST(request: NextRequest) {
  const token = extractBearerToken(request.headers.get('Authorization'));
  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  try {
    const decoded = await verifyFirebaseToken(token);
    const { topicId, content, isAnonymous } = await request.json();

    if (!topicId || !content || content.trim().length < 5) {
      return NextResponse.json({ error: 'Geçersiz veri' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Entry en fazla 2000 karakter olabilir' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('forum_entryleri')
      .insert({
        topic_id: topicId,
        content: content.trim(),
        author_id: decoded.uid,
        is_anonymous: !!isAnonymous,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ entry: data }, { status: 201 });
  } catch (err) {
    console.error('[Forum Entry API] Hata:', err);
    return NextResponse.json({ error: 'Entry oluşturulamadı' }, { status: 500 });
  }
}
