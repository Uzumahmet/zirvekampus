import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import EntryList from '@/components/forum/entry-list';
import EntryForm from '@/components/forum/entry-form';
import ForumKaydetButonu from '@/components/forum/forum-kaydet-butonu';
import KoleksiyonaEkleButonu from '@/components/shared/koleksiyona-ekle-butonu';
import { formatDate } from '@/lib/utils';
import { MessageSquare, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Props {
  params: { 'topic-slug': string };
}

export const revalidate = 60; // 1 dakikada bir ISR

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await supabaseAdmin
    .from('forum_basliklari')
    .select('title')
    .eq('slug', params['topic-slug'])
    .single();

  return { title: data?.title ?? 'Forum Başlığı' };
}

export default async function ForumBaslikPage({ params }: Props) {
  const slug = params['topic-slug'];

  const { data: topic } = await supabaseAdmin
    .from('forum_basliklari')
    .select(`
      *,
      creator:kullanicilar!forum_basliklari_created_by_fkey(username, display_name)
    `)
    .eq('slug', slug)
    .single();

  if (!topic) notFound();

  const { data: entries } = await supabaseAdmin
    .from('forum_entryleri')
    .select(`
      *,
      author:kullanicilar!forum_entryleri_author_id_fkey(username, display_name, avatar_url)
    `)
    .eq('topic_id', topic.id)
    .order('created_at', { ascending: true });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Geri */}
      <Link
        href="/forum"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-erciyes-red transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Forum'a Dön
      </Link>

      {/* Başlık Bilgisi */}
      <div className="mb-8 pl-4 border-l-2 border-erciyes-red flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-2 lowercase">{topic.title}</h1>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(topic.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              {entries?.length ?? 0} entry
            </span>
            {(topic.creator as any)?.username && (
              <span>
                açan:{' '}
                <Link
                  href={`/yazar/${(topic.creator as any).username}`}
                  className="text-erciyes-red hover:underline"
                >
                  @{(topic.creator as any).username}
                </Link>
              </span>
            )}
          </div>
        </div>

        {/* Aksiyonlar */}
        <div className="flex items-center gap-2">
          <ForumKaydetButonu forumId={topic.id} />
          <KoleksiyonaEkleButonu itemId={topic.id} itemType="forum" />
        </div>
      </div>

      {/* Entry Listesi */}
      <EntryList entries={(entries ?? []) as any} />

      {/* Entry Yazma Formu */}
      <div className="mt-10 pt-8 border-t border-border">
        <EntryForm topicId={topic.id} />
      </div>
    </div>
  );
}
