import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Koleksiyon ID eksik' }, { status: 400 });
    }

    // 1. Koleksiyonu çek
    const { data: col, error: colError } = await supabaseAdmin
      .from('koleksiyonlar')
      .select(`
        *,
        creator:kullanicilar!koleksiyonlar_user_id_fkey(username, display_name, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (colError || !col) {
      return NextResponse.json({ error: 'Koleksiyon bulunamadı.' }, { status: 404 });
    }

    // 2. Koleksiyon ögelerini çek
    const { data: ogeler, error: ogelerError } = await supabaseAdmin
      .from('koleksiyon_ogeleri')
      .select('*')
      .eq('koleksiyon_id', id);

    const itemsWithDetails = [];
    if (ogeler) {
      for (const oge of ogeler) {
        if (oge.oge_tipi === 'article') {
          const { data: art } = await supabaseAdmin
            .from('makaleler')
            .select(`
              id, title, slug, excerpt, cover_image, views_count, created_at,
              author:kullanicilar!makaleler_author_id_fkey(display_name, username)
            `)
            .eq('id', oge.oge_id)
            .single();
          if (art) itemsWithDetails.push({ ...oge, details: art });
        } else {
          const { data: frm } = await supabaseAdmin
            .from('forum_basliklari')
            .select(`
              id, title, slug, created_at,
              creator:kullanicilar!forum_basliklari_created_by_fkey(display_name, username)
            `)
            .eq('id', oge.oge_id)
            .single();
          if (frm) itemsWithDetails.push({ ...oge, details: frm });
        }
      }
    }

    return NextResponse.json({
      success: true,
      collection: col,
      ogeler: itemsWithDetails,
    });
  } catch (error) {
    console.error('Koleksiyon detay hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
