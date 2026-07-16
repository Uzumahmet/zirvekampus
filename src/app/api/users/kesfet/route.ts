import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/users/kesfet
 * ──────────────────────────────────────
 * Keşfet sayfası için tüm kullanıcıları döndürür.
 * İstatistikleri de içerir: takipçi, makale, gönderi sayısı.
 */
export async function GET() {
  try {
    // Tüm kullanıcıları çek
    const { data: kullanicilar, error } = await supabaseAdmin
      .from('kullanicilar')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('[Keşfet API] Kullanıcılar çekilirken hata:', error);
      return NextResponse.json({ error: 'Kullanıcılar alınamadı' }, { status: 500 });
    }

    if (!kullanicilar || kullanicilar.length === 0) {
      return NextResponse.json([]);
    }

    // Her kullanıcı için istatistikleri çek (paralel)
    const yazarProfilleri = await Promise.all(
      kullanicilar.map(async (k: any) => {
        const [makaleResult, takipciResult, begeniResult] = await Promise.all([
          supabaseAdmin
            .from('makaleler')
            .select('views_count, title, slug, created_at', { count: 'exact' })
            .eq('author_id', k.id)
            .eq('status', 'published'),
          supabaseAdmin
            .from('yazar_takip')
            .select('takipci_id', { count: 'exact' })
            .eq('yazar_id', k.id),
          supabaseAdmin
            .from('yazar_begeni')
            .select('kullanici_id', { count: 'exact' })
            .eq('yazar_id', k.id),
        ]);

        const makaleler = makaleResult.data ?? [];
        const toplam_okuma = makaleler.reduce((sum: number, m: any) => sum + (m.views_count ?? 0), 0);
        const son_makale = makaleler[0]
          ? { title: makaleler[0].title, slug: makaleler[0].slug, created_at: makaleler[0].created_at }
          : null;

        return {
          ...k,
          makale_sayisi: makaleResult.count ?? makaleler.length,
          takipci_sayisi: takipciResult.count ?? 0,
          begeni_sayisi: begeniResult.count ?? 0,
          toplam_okuma,
          son_makale,
        };
      })
    );

    // Takipçi sayısına göre sırala
    yazarProfilleri.sort((a, b) => b.takipci_sayisi - a.takipci_sayisi);

    return NextResponse.json(yazarProfilleri);
  } catch (err) {
    console.error('[Keşfet API] Sunucu hatası:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
