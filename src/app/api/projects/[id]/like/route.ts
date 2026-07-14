import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';
import { extractBearerToken } from '@/lib/utils';

export const runtime = 'nodejs';

interface Params {
  params: { id: string };
}

// POST /api/projects/[id]/like
// Beğeniyi aç/kapat (like toggle)
export async function POST(request: NextRequest, { params }: Params) {
  const projectId = params.id;
  const token = extractBearerToken(request.headers.get('Authorization'));

  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const decoded = await verifyFirebaseToken(token);
    const userId = decoded.uid;

    // Beğeni kaydının olup olmadığını kontrol et
    const { data: existingLike, error: checkError } = await supabaseAdmin
      .from('proje_begeniler')
      .select('kullanici_id')
      .eq('project_id', projectId)
      .eq('kullanici_id', userId)
      .maybeSingle();

    if (checkError) throw checkError;

    let liked = false;

    if (existingLike) {
      // Beğeniyi geri al
      const { error: deleteError } = await supabaseAdmin
        .from('proje_begeniler')
        .delete()
        .eq('project_id', projectId)
        .eq('kullanici_id', userId);

      if (deleteError) throw deleteError;
      liked = false;
    } else {
      // Beğen
      const { error: insertError } = await supabaseAdmin
        .from('proje_begeniler')
        .insert({
          project_id: projectId,
          kullanici_id: userId,
        });

      if (insertError) throw insertError;
      liked = true;
    }

    // Toplam beğeni sayısını çek
    const { count: likeCount } = await supabaseAdmin
      .from('proje_begeniler')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    // Projeler tablosundaki likes_count değerini güncelle
    await supabaseAdmin
      .from('projeler')
      .update({ likes_count: likeCount ?? 0 })
      .eq('id', projectId);

    return NextResponse.json({ liked, likes_count: likeCount ?? 0 });
  } catch (err) {
    console.error('[Project Like Toggle Error]', err);
    return NextResponse.json({ error: 'Beğeni işlemi gerçekleştirilemedi' }, { status: 500 });
  }
}
