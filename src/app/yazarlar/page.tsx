import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { YazarProfile } from '@/types';
import YazarlarListesi from './yazarlar-listesi';
import { Users, PenSquare } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Yazarlar | Erciyes Kampüs',
  description:
    'Erciyes Üniversitesi öğrencilerinin seçkin yazarlarını keşfedin. Makale, takipçi ve beğeni sayılarına göre sıralanmış yazarlar.',
};

// 5 dakikada bir ISR — yeni yazar eklenince yenilenir
export const revalidate = 300;

async function getYazarlar(): Promise<YazarProfile[]> {
  // Yazar, editör ve admin rollerini getir
  const { data: kullanicilar } = await supabaseAdmin
    .from('kullanicilar')
    .select('*')
    .in('role', ['yazar', 'editor', 'admin'])
    .order('created_at', { ascending: true });

  if (!kullanicilar || kullanicilar.length === 0) return [];

  // Her yazar için istatistik ve son makale verilerini toplu getir
  const yazarProfilPromises = kullanicilar.map(async (k) => {
    const [
      makaleResult,
      takipciResult,
      begeniResult,
    ] = await Promise.all([
      supabaseAdmin
        .from('makaleler')
        .select('views_count, title, slug, created_at')
        .eq('author_id', k.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false }),

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

  const yazarlar = await Promise.all(yazarProfilPromises);

  // Toplam okuma sayısına göre sırala (en popüler yazar önce)
  return yazarlar.sort((a, b) => b.toplam_okuma - a.toplam_okuma);
}

export default async function YazarlarPage() {
  const yazarlar = await getYazarlar();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Başlık */}
      <div className="mb-10 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-3 justify-center sm:justify-start">
          <div className="p-2.5 rounded-xl bg-erciyes-red/10 border border-erciyes-red/20">
            <PenSquare className="w-5 h-5 text-erciyes-red" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Yazarlar</h1>
        </div>
        <p className="text-muted-foreground max-w-xl mx-auto sm:mx-0 text-sm">
          Erciyes Üniversitesi&apos;nin seçkin yazarlarını keşfedin. Takip edin, beğenin ve makalelerini inceleyin.
        </p>

        {yazarlar.length > 0 && (
          <div className="flex items-center justify-center sm:justify-start gap-2 mt-4">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Sistemde <span className="font-semibold text-foreground">{yazarlar.length}</span> yazar kayıtlı
            </span>
          </div>
        )}
      </div>

      {/* Yazar Listesi (client component — arama filtresi için) */}
      <YazarlarListesi yazarlar={yazarlar} />
    </div>
  );
}
