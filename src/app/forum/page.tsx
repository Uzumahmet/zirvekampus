import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase/server';
import Link from 'next/link';
import { MessageSquare, Plus } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Forum | Erciyes Kampüs',
  description: 'Erciyes Üniversitesi öğrencilerinin kampüs tartışma platformu. Merak ettiklerini sor, deneyimlerini paylaş, başkalarının sorularına cevap ver.',
};

export const revalidate = 60;

export default async function ForumPage() {
  const { data: topics } = await supabaseAdmin
    .from('forum_basliklari')
    .select(`
      *,
      entry_count:forum_entryleri(count),
      creator:kullanicilar!forum_basliklari_created_by_fkey(username, display_name)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div>
      {/* ─── Hero Başlık (referans tasarım gibi) ─────────────── */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between">
            {/* Sol: Büyük başlık */}
            <div>
              <h1
                className="text-5xl sm:text-6xl font-black leading-none mb-3"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Forum<span className="text-erciyes-red">.</span>
              </h1>
              <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                Merak ettiklerini sor, deneyimlerini paylaş, başkalarının sorularına cevap ver.
              </p>
            </div>

            {/* Sağ: CTA butonu */}
            <Link
              href="/forum/yeni"
              className="hidden sm:flex items-center gap-2 px-5 py-3 rounded-full bg-erciyes-red text-white text-sm font-semibold hover:bg-red-700 transition-colors shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Yeni Konu Aç
            </Link>
          </div>
        </div>
      </div>

      {/* ─── İçerik ───────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[1fr_280px] gap-8">

          {/* Forum Listesi */}
          <div>
            {/* Mobil CTA */}
            <div className="flex sm:hidden mb-5">
              <Link
                href="/forum/yeni"
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-erciyes-red text-white text-sm font-semibold hover:bg-red-700 transition-colors w-full justify-center"
              >
                <Plus className="w-4 h-4" />
                Yeni Konu Aç
              </Link>
            </div>

            {!topics || topics.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground bg-card border border-border rounded-2xl">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-medium">Henüz hiç konu bulunmuyor. İlk konuyu sen aç!</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {topics.map((topic, index) => {
                  const entryCount = Array.isArray(topic.entry_count)
                    ? topic.entry_count[0]?.count ?? 0
                    : topic.entry_count ?? 0;

                  return (
                    <Link
                      key={topic.id}
                      href={`/forum/${topic.slug}`}
                      className={`flex items-center justify-between px-5 py-4 transition-colors hover:bg-secondary/40 group ${
                        index !== 0 ? 'border-t border-border/50' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-medium text-foreground group-hover:text-erciyes-red transition-colors truncate leading-relaxed">
                          {topic.title}
                        </h2>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {(topic.creator as any)?.username && (
                            <span>@{(topic.creator as any).username}</span>
                          )}
                          <span>{formatRelativeTime(topic.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 ml-4 text-xs text-muted-foreground flex-shrink-0">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{entryCount}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── Sağ Sidebar ────────────────────────────────── */}
          <aside className="hidden lg:flex flex-col gap-5">

            {/* Trend Konular */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3
                className="font-bold text-base mb-4 flex items-center gap-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                🔥 Trend Konular
              </h3>
              {!topics || topics.length === 0 ? (
                <p className="text-xs text-muted-foreground">Yükleniyor...</p>
              ) : (
                <div className="space-y-3">
                  {topics.slice(0, 4).map((topic) => (
                    <Link
                      key={topic.id}
                      href={`/forum/${topic.slug}`}
                      className="block text-xs text-muted-foreground hover:text-erciyes-red transition-colors leading-relaxed line-clamp-2"
                    >
                      {topic.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Forum Kuralları */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3
                className="font-bold text-base mb-4"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                📋 Forum Kuralları
              </h3>
              <ol className="space-y-3">
                {[
                  'Saygılı ve yapıcı ol. Kişisel saldırı yok.',
                  'Konuyla alakalı içerik paylaş.',
                  'Spam ve reklam yasak.',
                  'Kişisel bilgi paylaşımında dikkatli ol.',
                  'Anonim paylaşım serbesttir.',
                ].map((rule, i) => (
                  <li key={i} className="flex gap-3 text-xs text-muted-foreground leading-relaxed">
                    <span className="text-erciyes-red font-bold flex-shrink-0 w-4">{i + 1}</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
