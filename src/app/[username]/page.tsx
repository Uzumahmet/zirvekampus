import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import ProfilAnaIcerik from './profil-ana-icerik';
import type { Kullanici, MakaleWithAuthor } from '@/types';

interface Props {
  params: { username: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data: kullanici } = await supabaseAdmin
    .from('kullanicilar')
    .select('display_name, username, bio, avatar_url')
    .eq('username', params.username)
    .single();

  if (!kullanici) {
    return { title: 'Kullanıcı Bulunamadı' };
  }

  const displayName = kullanici.display_name ?? kullanici.username;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erciyeskampus.com';

  return {
    title: `${displayName} (@${kullanici.username}) | Erciyes Kampüs`,
    description:
      kullanici.bio ??
      `${displayName} profilini Erciyes Kampüs'te inceleyin. Makaleleri, takipçileri ve daha fazlası.`,
    openGraph: {
      title: `${displayName} | Erciyes Kampüs`,
      description: kullanici.bio ?? `${displayName} kullanıcısının Erciyes Kampüs profili.`,
      images: kullanici.avatar_url ? [{ url: kullanici.avatar_url }] : [],
      url: `${appUrl}/${kullanici.username}`,
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${displayName} | Erciyes Kampüs`,
      description: kullanici.bio ?? `${displayName} kullanıcısının Erciyes Kampüs profili.`,
      images: kullanici.avatar_url ? [kullanici.avatar_url] : [],
    },
    alternates: {
      canonical: `${appUrl}/${kullanici.username}`,
    },
  };
}

async function getProfilVerisi(username: string) {
  const { data: kullanici } = await supabaseAdmin
    .from('kullanicilar')
    .select('*')
    .eq('username', username)
    .single();

  if (!kullanici) return null;

  const isYazar = ['yazar', 'editor', 'admin'].includes(kullanici.role);

  const [makaleResult, takipciResult, begeniResult] = await Promise.all([
    isYazar
      ? supabaseAdmin
          .from('makaleler')
          .select(`
            *,
            author:kullanicilar!makaleler_author_id_fkey(username, display_name, avatar_url),
            konular:makale_konulari(konular(*))
          `)
          .eq('author_id', kullanici.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),

    supabaseAdmin
      .from('yazar_takip')
      .select('takipci_id', { count: 'exact' })
      .eq('yazar_id', kullanici.id),

    supabaseAdmin
      .from('yazar_begeni')
      .select('kullanici_id', { count: 'exact' })
      .eq('yazar_id', kullanici.id),
  ]);

  const makaleler = ((makaleResult.data ?? []) as any[]).map((m) => ({
    ...m,
    konular: (m.konular as any[]).map((mk: any) => mk.konular).filter(Boolean),
  })) as MakaleWithAuthor[];

  const toplamOkuma = makaleler.reduce((sum, m) => sum + (m.views_count ?? 0), 0);

  // Gönderileri çek (projeler tablosundan fakulte = 'gonderi')
  const { data: gonderilerData } = await supabaseAdmin
    .from('projeler')
    .select(`
      *,
      author:kullanicilar(id, username, display_name, avatar_url, role)
    `)
    .eq('author_id', kullanici.id)
    .eq('fakulte', 'gonderi')
    .order('created_at', { ascending: false });

  const gonderiler = gonderilerData || [];

  // Yeniden paylaşılanları (reposts) çek
  const { data: repostCollection } = await supabaseAdmin
    .from('koleksiyonlar')
    .select('id')
    .eq('user_id', kullanici.id)
    .eq('name', '__reposts')
    .maybeSingle();

  let reposts: any[] = [];
  if (repostCollection) {
    const { data: repostOgeleri } = await supabaseAdmin
      .from('koleksiyon_ogeleri')
      .select('*')
      .eq('koleksiyon_id', repostCollection.id)
      .order('created_at', { ascending: false });
    
    if (repostOgeleri && repostOgeleri.length > 0) {
      const fetchedReposts = await Promise.all(
        repostOgeleri.map(async (oge) => {
          if (oge.oge_tipi === 'article') {
            const { data: art } = await supabaseAdmin
              .from('makaleler')
              .select('*, author:kullanicilar(username, display_name, avatar_url)')
              .eq('id', oge.oge_id)
              .maybeSingle();
            return art ? { ...art, oge_tipi: 'article', reposted_at: oge.created_at } : null;
          } else if (oge.oge_tipi === 'forum') {
            const { data: frm } = await supabaseAdmin
              .from('forum_basliklari')
              .select('*, creator:kullanicilar(username, display_name)')
              .eq('id', oge.oge_id)
              .maybeSingle();
            return frm ? { ...frm, oge_tipi: 'forum', reposted_at: oge.created_at } : null;
          } else if (oge.oge_tipi === 'project') {
            const { data: prj } = await supabaseAdmin
              .from('projeler')
              .select('*, author:kullanicilar(username, display_name, avatar_url)')
              .eq('id', oge.oge_id)
              .maybeSingle();
            return prj ? { ...prj, oge_tipi: 'project', reposted_at: oge.created_at } : null;
          }
          return null;
        })
      );
      reposts = fetchedReposts.filter(Boolean);
    }
  }

  // Kaydedilenleri çek
  const [kaydedilenMakalelerResult, kaydedilenForumlarResult] = await Promise.all([
    supabaseAdmin
      .from('kaydedilen_makaleler')
      .select('makale_id, makaleler(*, author:kullanicilar(username, display_name, avatar_url))')
      .eq('kullanici_id', kullanici.id),
    supabaseAdmin
      .from('kaydedilen_forumlar')
      .select('forum_id, forum_basliklari(*, creator:kullanicilar(username, display_name))')
      .eq('kullanici_id', kullanici.id)
  ]);

  const savedArticles = (kaydedilenMakalelerResult.data || [])
    .map((item: any) => item.makaleler)
    .filter(Boolean)
    .map((m: any) => ({ ...m, oge_tipi: 'article' }));

  const savedForums = (kaydedilenForumlarResult.data || [])
    .map((item: any) => item.forum_basliklari)
    .filter(Boolean)
    .map((f: any) => ({ ...f, oge_tipi: 'forum' }));

  const savedItems = [...savedArticles, ...savedForums];

  // Kullanıcının ilgi alanlarını / etiketlerini çek
  const { data: yazarKonulari } = await supabaseAdmin
    .from('yazar_konulari')
    .select('konular(id, name, slug)')
    .eq('yazar_id', kullanici.id);

  const konular = (yazarKonulari ?? []).map((yk: any) => yk.konular).filter(Boolean);

  return {
    kullanici: kullanici as Kullanici,
    makaleler,
    gonderiler,
    reposts,
    savedItems,
    konular,
    takipciSayisi: takipciResult.count ?? 0,
    begeniSayisi: begeniResult.count ?? 0,
    toplamOkuma,
  };
}

function generateProfileJsonLd(
  kullanici: Kullanici,
  makale_sayisi: number,
  appUrl: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: kullanici.display_name ?? kullanici.username,
      identifier: kullanici.username,
      description: kullanici.bio ?? undefined,
      image: kullanici.avatar_url ?? undefined,
      url: `${appUrl}/${kullanici.username}`,
      sameAs: [`${appUrl}/${kullanici.username}`],
    },
  };
}

// SSR — her ziyarette taze veri
export const dynamic = 'force-dynamic';

export default async function YazarProfilPage({ params }: Props) {
  const veri = await getProfilVerisi(params.username);

  if (!veri) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erciyeskampus.com';
  const jsonLd = generateProfileJsonLd(veri.kullanici, veri.makaleler.length, appUrl);

  return (
    <>
      {/* JSON-LD Yapılandırılmış Veri — Google botlar için */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <ProfilAnaIcerik
        profil={veri.kullanici}
        makaleler={veri.makaleler}
        gonderiler={veri.gonderiler}
        reposts={veri.reposts}
        savedItems={veri.savedItems}
        konular={veri.konular}
        takipciSayisi={veri.takipciSayisi}
        begeniSayisi={veri.begeniSayisi}
        toplamOkuma={veri.toplamOkuma}
        baslangicTakipDurumu={false}
        baslangicBegeniDurumu={false}
      />
    </>
  );
}
