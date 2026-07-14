import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import ArticleCard from '@/components/article/article-card';
import TopicChips from '@/components/article/topic-chips';
import type { Konu, MakaleWithAuthor } from '@/types';

export const metadata: Metadata = {
  title: 'Makaleler',
  description: 'Erciyes Üniversitesi öğrencileri tarafından yazılan makaleler',
};

// 10 dakikada bir ISR
export const revalidate = 600;

async function getArticlesData() {
  const [articlesResult, konularResult] = await Promise.all([
    supabaseAdmin
      .from('makaleler')
      .select(`
        *,
        author:kullanicilar!makaleler_author_id_fkey(username, display_name, avatar_url),
        konular:makale_konulari(konular(*))
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(30),

    supabaseAdmin
      .from('konular')
      .select('*')
      .order('name'),
  ]);

  const articles = (articlesResult.data ?? []).map((article) => ({
    ...article,
    konular: (article.konular as any[]).map((mk) => mk.konular).filter(Boolean),
  })) as MakaleWithAuthor[];

  return {
    articles,
    konular: konularResult.data as Konu[] ?? [],
  };
}

export default async function MakalelerPage() {
  const { articles, konular } = await getArticlesData();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Başlık */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Makaleler</h1>
        <p className="text-muted-foreground">
          Erciyes Üniversitesi öğrencilerinin kaleminden{' '}
          <span className="text-erciyes-red font-medium">{articles.length} makale</span>
        </p>
      </div>

      {/* Konu Filtreleme Çipleri */}
      <TopicChips konular={konular} articles={articles} />
    </div>
  );
}
