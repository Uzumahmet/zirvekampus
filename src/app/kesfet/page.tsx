import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Compass, Users } from 'lucide-react';
import type { YazarProfile, Proje, Makale } from '@/types';
import KesfetListesi from './kesfet-listesi';

export const metadata: Metadata = {
  title: 'Keşfet | Zirve Kampüs',
  description:
    'Erciyes Üniversitesi öğrencilerinin projelerini ve makalelerini keşfedin. Kullanıcıları arayın ve takip edin.',
};

// Her zaman taze veri - kullanıcılar anında görünsün
export const dynamic = 'force-dynamic';

async function getKesfetVerisi() {
  // 1. Kullanıcıları getir
  const { data: kullanicilar, error: kullanicilarError } = await supabaseAdmin
    .from('kullanicilar')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (kullanicilarError) {
    console.error('[Keşfet] Kullanıcılar çekilirken hata:', kullanicilarError);
  }

  // Her kullanıcı için istatistikleri çek
  const yazarProfilleri: YazarProfile[] = [];
  if (kullanicilar && kullanicilar.length > 0) {
    const promises = kullanicilar.map(async (k) => {
      const [makaleResult, takipciResult, begeniResult] = await Promise.all([
        supabaseAdmin
          .from('makaleler')
          .select('views_count, title, slug, created_at')
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
      const toplam_okuma = makaleler.reduce((sum, m) => sum + (m.views_count ?? 0), 0);
      const son_makale = makaleler[0]
        ? { title: makaleler[0].title, slug: makaleler[0].slug, created_at: makaleler[0].created_at }
        : null;

      return {
        ...k,
        makale_sayisi: makaleler.length,
        takipci_sayisi: takipciResult.count ?? 0,
        begeni_sayisi: begeniResult.count ?? 0,
        toplam_okuma,
        son_makale,
      } as YazarProfile;
    });

    const resolved = await Promise.all(promises);
    yazarProfilleri.push(...resolved.sort((a, b) => b.takipci_sayisi - a.takipci_sayisi));
  }

  // 2. Projeleri getir (detaylı görsel akışı için)
  const { data: projeler } = await supabaseAdmin
    .from('projeler')
    .select(`
      *,
      author:kullanicilar!projeler_author_id_fkey(username, display_name, avatar_url)
    `)
    .not('fakulte', 'eq', 'gonderi')
    .order('views_count', { ascending: false })
    .limit(20);

  // 3. Makaleleri getir
  const { data: makaleler } = await supabaseAdmin
    .from('makaleler')
    .select(`
      *,
      author:kullanicilar!makaleler_author_id_fkey(username, display_name, avatar_url)
    `)
    .eq('status', 'published')
    .order('views_count', { ascending: false })
    .limit(20);

  // 4. Gönderileri getir
  const { data: gonderiler } = await supabaseAdmin
    .from('projeler')
    .select(`
      *,
      author:kullanicilar!projeler_author_id_fkey(username, display_name, avatar_url)
    `)
    .eq('fakulte', 'gonderi')
    .order('created_at', { ascending: false })
    .limit(20);

  // 5. Kulüpleri getir
  const { data: clubs } = await supabaseAdmin
    .from('clubs')
    .select('*, founder:founder_id(username, display_name, avatar_url), president:president_id(username, display_name, avatar_url)')
    .order('name', { ascending: true });

  const clubsWithMemberCount = await Promise.all(
    (clubs || []).map(async (club) => {
      const { count } = await supabaseAdmin
        .from('club_members')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', club.id)
        .eq('status', 'approved');
      return {
        ...club,
        member_count: count || 0,
      };
    })
  );

  return {
    kullanicilar: yazarProfilleri,
    projeler: (projeler ?? []) as any[],
    makaleler: (makaleler ?? []) as any[],
    gonderiler: (gonderiler ?? []) as any[],
    clubs: clubsWithMemberCount,
  };
}

export default async function KesfetPage() {
  const { kullanicilar, projeler, makaleler, gonderiler, clubs } = await getKesfetVerisi();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Başlık */}
      <div className="mb-10 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-3 justify-center sm:justify-start">
          <div className="p-2.5 rounded-xl bg-erciyes-red/10 border border-erciyes-red/20">
            <Compass className="w-6 h-6 text-erciyes-red" />
          </div>
          <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Keşfet
          </h1>
        </div>
        <p className="text-muted-foreground max-w-xl mx-auto sm:mx-0 text-sm">
          Erciyes Üniversitesi topluluğundaki projeleri, makaleleri, öğrencileri ve kulüpleri keşfedin.
        </p>
      </div>

      <KesfetListesi
        kullanicilar={kullanicilar}
        projeler={projeler}
        makaleler={makaleler}
        gonderiler={gonderiler}
        clubs={clubs}
      />
    </div>
  );
}
