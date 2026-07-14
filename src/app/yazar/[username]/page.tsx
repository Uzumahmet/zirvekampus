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
      title: `${displayName} | Erciyes Kampüs Yazarları`,
      description: kullanici.bio ?? `${displayName} kullanıcısının Erciyes Kampüs profili.`,
      images: kullanici.avatar_url ? [{ url: kullanici.avatar_url }] : [],
      url: `${appUrl}/yazar/${kullanici.username}`,
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${displayName} | Erciyes Kampüs`,
      description: kullanici.bio ?? `${displayName} kullanıcısının Erciyes Kampüs profili.`,
      images: kullanici.avatar_url ? [kullanici.avatar_url] : [],
    },
    alternates: {
      canonical: `${appUrl}/yazar/${kullanici.username}`,
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

  return {
    kullanici: kullanici as Kullanici,
    makaleler,
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
      url: `${appUrl}/yazar/${kullanici.username}`,
      sameAs: [`${appUrl}/yazar/${kullanici.username}`],
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
        takipciSayisi={veri.takipciSayisi}
        begeniSayisi={veri.begeniSayisi}
        toplamOkuma={veri.toplamOkuma}
        baslangicTakipDurumu={false}
        baslangicBegeniDurumu={false}
      />
    </>
  );
}
