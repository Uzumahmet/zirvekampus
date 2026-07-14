import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabaseAdmin } from '@/lib/supabase/server';
import { FolderHeart, BookOpen, MessageSquare, ArrowLeft, Calendar, User } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Props {
  params: { id: string };
}

// Koleksiyon detay verisini çeken sunucu taraflı fonksiyon
async function getCollectionData(id: string) {
  const { data: col } = await supabaseAdmin
    .from('koleksiyonlar')
    .select(`
      *,
      creator:kullanicilar!koleksiyonlar_user_id_fkey(username, display_name, avatar_url)
    `)
    .eq('id', id)
    .single();

  if (!col) return null;

  // Sadece kamuya açık olanlar veya admin çekebilir
  if (!col.is_public) return null;

  const { data: ogeler } = await supabaseAdmin
    .from('koleksiyon_ogeleri')
    .select('*')
    .eq('koleksiyon_id', id);

  const items = [];
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
        if (art) items.push({ ...oge, details: art });
      } else {
        const { data: frm } = await supabaseAdmin
          .from('forum_basliklari')
          .select(`
            id, title, slug, created_at,
            creator:kullanicilar!forum_basliklari_created_by_fkey(display_name, username)
          `)
          .eq('id', oge.oge_id)
          .single();
        if (frm) items.push({ ...oge, details: frm });
      }
    }
  }

  return { collection: col, ogeler: items };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getCollectionData(params.id);
  if (!data) return { title: 'Koleksiyon Bulunamadı' };

  const { collection } = data;
  const creatorName = collection.creator?.display_name ?? collection.creator?.username ?? 'Bir Kullanıcı';
  const title = `${collection.name} | ${creatorName} Koleksiyonu`;
  const description = collection.description ?? `${creatorName} tarafından oluşturulmuş makale ve forum konuları arşivi.`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erciyeskampus.com';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${appUrl}/koleksiyon/${collection.id}`,
      type: 'website',
      siteName: 'Erciyes Kampüs',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `${appUrl}/koleksiyon/${collection.id}`,
    },
  };
}

export const dynamic = 'force-dynamic';

export default async function KoleksiyonDetayPage({ params }: Props) {
  const data = await getCollectionData(params.id);

  if (!data) notFound();

  const { collection, ogeler } = data;
  const creatorName = collection.creator?.display_name ?? collection.creator?.username ?? 'Anonim';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erciyeskampus.com';

  // Google botlar için JSON-LD Yapısal Veri (CollectionPage / ItemList şeması)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection.name,
    description: collection.description ?? undefined,
    url: `${appUrl}/koleksiyon/${collection.id}`,
    creator: {
      '@type': 'Person',
      name: creatorName,
      url: `${appUrl}/yazar/${collection.creator?.username}`,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: ogeler.length,
      itemListElement: ogeler.map((oge: any, index: number) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: oge.oge_tipi === 'article' 
          ? `${appUrl}/makale/${oge.details.slug}`
          : `${appUrl}/forum/${oge.details.slug}`,
        name: oge.details.title,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Geri Dön */}
        <Link
          href={`/yazar/${collection.creator?.username}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-erciyes-red transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          {creatorName} Profiline Dön
        </Link>

        {/* Koleksiyon Üst Bilgisi */}
        <div className="p-6 sm:p-8 bg-card border border-border rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-erciyes-red to-erciyes-gold" />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-erciyes-red">
                <FolderHeart className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Kullanıcı Koleksiyonu</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                {collection.name}
              </h1>
              {collection.description && (
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{collection.description}</p>
              )}
            </div>

            {/* Oluşturan Kullanıcı */}
            <Link
              href={`/yazar/${collection.creator?.username}`}
              className="flex items-center gap-3 p-3 bg-secondary/40 rounded-xl hover:bg-secondary transition-colors"
            >
              {collection.creator?.avatar_url ? (
                <Image
                  src={collection.creator.avatar_url}
                  alt={creatorName}
                  width={36}
                  height={36}
                  className="rounded-full"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-erciyes-red/10 flex items-center justify-center border border-border">
                  <User className="w-4 h-4 text-erciyes-red" />
                </div>
              )}
              <div className="text-left">
                <span className="block text-xs text-muted-foreground leading-none">Oluşturan:</span>
                <span className="text-xs font-bold text-foreground hover:text-erciyes-red transition-colors">
                  {creatorName}
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-6 pt-4 border-t border-border/40">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(collection.created_at)}</span>
            <span>•</span>
            <span>{ogeler.length} Öğe içeriyor</span>
          </div>
        </div>

        {/* Koleksiyon Öğeleri */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-widest text-muted-foreground">Koleksiyon İçeriği</h2>
          
          {ogeler.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10 bg-card border border-border rounded-xl">
              Bu koleksiyonda henüz hiç öğe bulunmuyor.
            </p>
          ) : (
            <div className="space-y-3">
              {ogeler.map((oge: any) => {
                const isArticle = oge.oge_tipi === 'article';
                return (
                  <Link
                    key={oge.oge_id}
                    href={isArticle ? `/makale/${oge.details.slug}` : `/forum/${oge.details.slug}`}
                    className="flex items-center justify-between p-5 bg-card border border-border rounded-xl hover:border-erciyes-red/30 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                        isArticle ? 'bg-erciyes-red/10 text-erciyes-red' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {isArticle ? <BookOpen className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {isArticle ? 'Makale' : 'Forum Konusu'}
                        </span>
                        <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-erciyes-red transition-colors truncate mt-0.5 leading-snug">
                          {oge.details.title}
                        </h3>
                      </div>
                    </div>

                    <div className="text-right text-xs text-muted-foreground hidden sm:block">
                      {isArticle && oge.details.author && (
                        <span>Yazar: @{oge.details.author.username}</span>
                      )}
                      {!isArticle && oge.details.creator && (
                        <span>Açan: @{oge.details.creator.username}</span>
                      )}
                      <span className="block text-[10px]">{formatDate(oge.details.created_at)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
