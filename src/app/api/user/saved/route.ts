import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Kullanıcı adı eksik' }, { status: 400 });
    }

    // 1. Kullanıcıyı bul
    const { data: user, error: userError } = await supabaseAdmin
      .from('kullanicilar')
      .select('id')
      .eq('username', username)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    // İstek atan kullanıcının kendisi mi kontrol et
    const authHeader = request.headers.get('Authorization');
    let isOwnProfile = false;
    let requestUserId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await verifyFirebaseToken(token);
        requestUserId = decodedToken.uid;
        isOwnProfile = requestUserId === user.id;
      } catch {}
    }

    // 2. Geçmiş Mesajlar (Forum entryleri + başlık bilgisi)
    const { data: entryler } = await supabaseAdmin
      .from('forum_entryleri')
      .select(`
        *,
        topic:forum_basliklari(title, slug)
      `)
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    // 3. Koleksiyonlar
    let colQuery = supabaseAdmin
      .from('koleksiyonlar')
      .select('*')
      .eq('user_id', user.id);

    if (!isOwnProfile) {
      // Başkası bakıyorsa sadece herkese açık koleksiyonlar
      colQuery = colQuery.eq('is_public', true);
    }
    const { data: koleksiyonlar } = await colQuery.order('created_at', { ascending: false });

    // Her koleksiyonun içindeki ögeleri de çek
    const koleksiyonlarWithItems = [];
    if (koleksiyonlar) {
      for (const col of koleksiyonlar) {
        const { data: ogeler } = await supabaseAdmin
          .from('koleksiyon_ogeleri')
          .select('*')
          .eq('koleksiyon_id', col.id);

        const itemsWithDetails = [];
        if (ogeler) {
          for (const oge of ogeler) {
            if (oge.oge_tipi === 'article') {
              const { data: art } = await supabaseAdmin
                .from('makaleler')
                .select('title, slug')
                .eq('id', oge.oge_id)
                .single();
              if (art) itemsWithDetails.push({ ...oge, title: art.title, slug: art.slug });
            } else {
              const { data: frm } = await supabaseAdmin
                .from('forum_basliklari')
                .select('title, slug')
                .eq('id', oge.oge_id)
                .single();
              if (frm) itemsWithDetails.push({ ...oge, title: frm.title, slug: frm.slug });
            }
          }
        }
        koleksiyonlarWithItems.push({ ...col, ogeler: itemsWithDetails });
      }
    }

    // 4. Kaydedilen Makaleler (Sadece kendi profiliyse)
    let kaydedilenMakaleler: any[] = [];
    if (isOwnProfile) {
      const { data: savedArt } = await supabaseAdmin
        .from('kaydedilen_makaleler')
        .select(`
          created_at,
          makale:makaleler(id, title, slug, excerpt, cover_image, views_count, created_at)
        `)
        .eq('kullanici_id', user.id);
      
      if (savedArt) {
        kaydedilenMakaleler = savedArt.map(item => item.makale).filter(Boolean);
      }
    }

    // 5. Kaydedilen Forumlar (Sadece kendi profiliyse)
    let kaydedilenForumlar: any[] = [];
    if (isOwnProfile) {
      const { data: savedFrm } = await supabaseAdmin
        .from('kaydedilen_forumlar')
        .select(`
          created_at,
          forum:forum_basliklari(id, title, slug, created_at)
        `)
        .eq('kullanici_id', user.id);
      
      if (savedFrm) {
        kaydedilenForumlar = savedFrm.map(item => item.forum).filter(Boolean);
      }
    }

    return NextResponse.json({
      success: true,
      isOwnProfile,
      entryler: entryler ?? [],
      koleksiyonlar: koleksiyonlarWithItems,
      kaydedilenMakaleler,
      kaydedilenForumlar,
    });
  } catch (error) {
    console.error('Saved items hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
