import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';
import ReadingProgressBar from '@/components/article/reading-progress-bar';
import MakaleKaydetButonu from '@/components/article/makale-kaydet-butonu';
import KoleksiyonaEkleButonu from '@/components/shared/koleksiyona-ekle-butonu';
import { formatDate, calculateReadingTime } from '@/lib/utils';
import { Eye, Clock, ArrowLeft, Calendar } from 'lucide-react';
import type { MakaleWithAuthor } from '@/types';

interface Props {
  params: { slug: string };
}

// ISR: Makale yayınlandıktan sonra 10 dakikada bir yenilenir
export const revalidate = 600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data: article } = await supabaseAdmin
    .from('makaleler')
    .select(`
      title, excerpt, cover_image, created_at, updated_at, slug,
      author:kullanicilar!makaleler_author_id_fkey(display_name, username, avatar_url)
    `)
    .eq('slug', params.slug)
    .single();

  if (!article) return { title: 'Makale Bulunamadı' };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erciyeskampus.com';
  const author = (article.author as unknown) as { display_name: string | null; username: string; avatar_url: string | null } | null;
  const description = article.excerpt ?? `${author?.display_name ?? 'Bir yazar'} tarafından kaleme alınan makaleyi Erciyes Kampüs'te okuyun.`;

  return {
    title: `${article.title} | Erciyes Kampüs`,
    description,
    authors: author ? [{ name: author.display_name ?? author.username, url: `${appUrl}/${author.username}` }] : [],
    openGraph: {
      title: article.title,
      description,
      type: 'article',
      url: `${appUrl}/makale/${article.slug}`,
      images: article.cover_image
        ? [{ url: article.cover_image, width: 1200, height: 630, alt: article.title }]
        : [],
      publishedTime: article.created_at,
      modifiedTime: article.updated_at,
      authors: author ? [`${appUrl}/${author.username}`] : [],
      siteName: 'Erciyes Kampüs',
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
      images: article.cover_image ? [article.cover_image] : [],
    },
    alternates: {
      canonical: `${appUrl}/makale/${article.slug}`,
    },
  };
}

async function getArticle(slug: string): Promise<MakaleWithAuthor | null> {
  const { data } = await supabaseAdmin
    .from('makaleler')
    .select(`
      *,
      author:kullanicilar!makaleler_author_id_fkey(username, display_name, avatar_url),
      konular:makale_konulari(konular(*))
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!data) return null;

  return {
    ...data,
    konular: (data.konular as any[]).map((mk) => mk.konular).filter(Boolean),
  } as MakaleWithAuthor;
}

export default async function MakaleDetayPage({ params }: Props) {
  const article = await getArticle(params.slug);

  if (!article) notFound();

  // Okunma sayısını artır (fire & forget)
  supabaseAdmin
    .from('makaleler')
    .update({ views_count: article.views_count + 1 })
    .eq('id', article.id)
    .then(() => {});

  const readingTime = calculateReadingTime(article.content);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erciyeskampus.com';

  // JSON-LD Yapılandırılmış Veri (NewsArticle şeması)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt ?? undefined,
    image: article.cover_image ? [article.cover_image] : [],
    datePublished: article.created_at,
    dateModified: article.updated_at,
    author: article.author
      ? [
          {
            '@type': 'Person',
            name: article.author.display_name ?? article.author.username,
            url: `${appUrl}/${article.author.username}`,
          },
        ]
      : [],
    publisher: {
      '@type': 'Organization',
      name: 'Erciyes Kampüs',
      url: appUrl,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${appUrl}/makale/${article.slug}`,
    },
    url: `${appUrl}/makale/${article.slug}`,
    articleSection:
      article.konular.length > 0 ? article.konular[0].name : undefined,
    keywords: article.konular.map((k) => k.name).join(', '),
    inLanguage: 'tr-TR',
  };

  return (
    <>
      {/* JSON-LD — Google arama sonuçlarında zengin snippet için */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Okuma İlerleme Çubuğu */}
      <ReadingProgressBar />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Geri Dön */}
        <Link
          href="/makale"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-erciyes-red transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Makalelere Dön
        </Link>

        {/* Konu Etiketleri */}
        {article.konular.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {article.konular.map((konu) => (
              <span
                key={konu.id}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-erciyes-red/10 text-erciyes-red border border-erciyes-red/20"
              >
                {konu.name}
              </span>
            ))}
          </div>
        )}

        {/* Başlık */}
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-6">
          {article.title}
        </h1>

        {/* Meta Bilgileri */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-6 mb-6 border-b border-border">
          <Link
            href={`/${article.author?.username}`}
            className="flex items-center gap-3 group"
          >
            {article.author?.avatar_url ? (
              <Image
                src={article.author.avatar_url}
                alt={article.author.display_name ?? ''}
                width={40}
                height={40}
                className="rounded-full border-2 border-border group-hover:border-erciyes-red transition-colors"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-erciyes-red/20 flex items-center justify-center border-2 border-border group-hover:border-erciyes-red transition-colors">
                <span className="font-bold text-erciyes-red">
                  {(article.author?.display_name ?? 'A')[0].toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold group-hover:text-erciyes-red transition-colors">
                {article.author?.display_name ?? 'Anonim Yazar'}
              </p>
              <p className="text-xs text-muted-foreground">
                @{article.author?.username}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(article.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {readingTime}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {article.views_count.toLocaleString('tr-TR')} okuma
            </span>
            {/* Makale Kaydet Butonu */}
            <MakaleKaydetButonu makaleId={article.id} />
            {/* Koleksiyona Ekle Butonu */}
            <KoleksiyonaEkleButonu itemId={article.id} itemType="article" />
          </div>
        </div>

        {/* Kapak Görseli */}
        {article.cover_image && (
          <div className="relative w-full h-72 sm:h-96 rounded-2xl overflow-hidden mb-10 shadow-card-hover">
            <Image
              src={article.cover_image}
              alt={article.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Makale İçeriği */}
        <div
          className="article-body"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

      </article>
    </>
  );
}
