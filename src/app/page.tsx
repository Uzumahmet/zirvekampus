'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/app/providers';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import AiSummaryCard from '@/components/shared/ai-summary-card';
import ForumSidebar from '@/components/layout/sidebar-forum';
import FollowSuggestions from '@/components/shared/follow-suggestions';
import {
  Flame, BookOpen, Heart, MessageSquare, Eye, Clock, FolderCode, Sparkles, Loader2, ArrowRight
} from 'lucide-react';
import { cn, formatRelativeTime, calculateReadingTime } from '@/lib/utils';
import type { MakaleWithAuthor, ProjeWithAuthor } from '@/types';

type FeedItem =
  | { type: 'article'; data: MakaleWithAuthor }
  | { type: 'project'; data: ProjeWithAuthor };

export default function HomePage() {
  const { firebaseUser, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [forumTopics, setForumTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHomeData = async () => {
    try {
      const headers: Record<string, string> = {};
      if (firebaseUser) {
        headers['Authorization'] = `Bearer ${firebaseUser.idToken}`;
      }

      // Projeler, Makaleler ve Forum başlıklarını eşzamanlı çek
      const [projectsRes, articlesRes, forumRes] = await Promise.all([
        fetch('/api/projects?limit=6', { headers }),
        fetch('/api/article?limit=6', { headers }), // Var olan makale API'ı
        fetch('/api/forum?limit=8', { headers }), // Var olan forum API'ı
      ]);

      let projectsData: ProjeWithAuthor[] = [];
      let articlesData: MakaleWithAuthor[] = [];
      let forumData: any[] = [];

      if (projectsRes.ok) projectsData = await projectsRes.json();
      if (articlesRes.ok) {
        const artJson = await articlesRes.json();
        // API formatına göre veriyi normalize et
        articlesData = Array.isArray(artJson) ? artJson : (artJson.articles ?? []);
      }
      if (forumRes.ok) {
        const forumJson = await forumRes.json();
        forumData = Array.isArray(forumJson) ? forumJson : (forumJson.topics ?? []);
      }

      // Feed öğelerini birleştir ve tarihe göre azalan sırala
      const combined: FeedItem[] = [
        ...projectsData.map((p) => ({ type: 'project' as const, data: p })),
        ...articlesData.map((a) => ({ type: 'article' as const, data: a })),
      ];

      combined.sort((a, b) => {
        return new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime();
      });

      setFeedItems(combined);
      setForumTopics(forumData);
    } catch (e) {
      console.error('Anasayfa verileri çekilemedi:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, [firebaseUser]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* ─── EDİTÖRYAL HERO BAŞLIK ─────────────────────── */}
      <section className="pt-6 pb-8 border-b border-border mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="block w-8 h-px bg-erciyes-red" />
          <span className="text-xs font-semibold uppercase tracking-widest text-erciyes-red">
            Erüatical Portal
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground max-w-3xl leading-tight">
            Kampüste üretilen{' '}
            <span className="text-erciyes-red italic font-normal" style={{ fontFamily: 'Playfair Display' }}>
              bilgi
            </span>
            <br />
            ve projeler burada.
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
            Öğrencilerin projelerini görsellerle paylaştığı, makaleler yazdığı ve kampüs gündemini özgürce tartıştığı ortak alan.
          </p>
        </div>
      </section>

      {/* ─── İKİLİ SÜTUN DÜZENİ ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* SOL: ANA AKIŞ (Feed) - 8 Sütun */}
        <div className="lg:col-span-8 space-y-8">
          {/* AI Özeti */}
          <AiSummaryCard />

          {/* Akış Başlığı */}
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <Flame className="w-5 h-5 text-erciyes-red animate-pulse" />
            <h2 className="font-bold text-lg text-foreground">
              Kampüs Zaman Tüneli
            </h2>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
              <p className="text-xs text-muted-foreground font-medium">Akış yükleniyor...</p>
            </div>
          ) : feedItems.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-3xl">
              <p className="text-sm text-muted-foreground">Henüz paylaşılan içerik yok.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {feedItems.map((item, index) => {
                if (item.type === 'project') {
                  const project = item.data;
                  const authorName = project.author?.display_name ?? project.author?.username ?? 'Öğrenci';
                  const projectImage = project.image_urls?.[0];

                  return (
                    <article
                      key={`proj-${project.id}`}
                      className="bg-card border border-border rounded-2xl overflow-hidden hover:border-border/80 transition-all duration-300"
                    >
                      {/* Üst Yazar Bilgisi (LinkedIn tarzı) */}
                      <div className="p-4 flex items-center justify-between">
                        <Link href={`/yazar/${project.author?.username}`} className="flex items-center gap-2.5 group">
                          {project.author?.avatar_url ? (
                            <div className="relative w-9 h-9 rounded-full overflow-hidden border border-border">
                              <Image src={project.author.avatar_url} alt={authorName} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground text-xs uppercase border border-border">
                              {authorName.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-sm text-foreground group-hover:text-erciyes-red transition-colors leading-tight">
                              {authorName}
                            </p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <span>{project.fakulte}</span>
                              <span>•</span>
                              <span>{formatRelativeTime(project.created_at)}</span>
                            </p>
                          </div>
                        </Link>
                        <span className="text-[10px] font-bold uppercase bg-erciyes-red/10 text-erciyes-red border border-erciyes-red/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <FolderCode className="w-3 h-3" /> {t('nav.projects')}
                        </span>
                      </div>

                      {/* Başlık ve Kısa Açıklama */}
                      <div className="px-4 pb-3">
                        <Link href={`/projeler/${project.id}`}>
                          <h3 className="font-bold text-base text-foreground hover:text-erciyes-red transition-colors mb-1.5 leading-snug">
                            {project.title}
                          </h3>
                        </Link>
                        <p className="text-xs text-muted-foreground leading-normal line-clamp-3">
                          {project.description}
                        </p>
                      </div>

                      {/* Görsel Kapak (Instagram tarzı) */}
                      {projectImage && (
                        <Link href={`/projeler/${project.id}`} className="block relative aspect-[16/9] w-full bg-secondary overflow-hidden border-y border-border/50">
                          <Image src={projectImage} alt={project.title} fill className="object-cover hover:scale-[1.02] transition-transform duration-500" />
                        </Link>
                      )}

                      {/* Alt Beğeni ve Yorumlar */}
                      <div className="p-3.5 px-4 flex items-center justify-between text-xs text-muted-foreground bg-secondary/5">
                        <div className="flex items-center gap-4">
                          <Link
                            href={`/projeler/${project.id}`}
                            className="flex items-center gap-1.5 hover:text-destructive transition-colors font-medium"
                          >
                            <Heart className="w-4.5 h-4.5" />
                            <span>{project.likes_count} {t('home.likes')}</span>
                          </Link>
                          <Link
                            href={`/projeler/${project.id}`}
                            className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
                          >
                            <MessageSquare className="w-4.5 h-4.5" />
                            <span>{project.comment_count ?? 0} {t('home.comments')}</span>
                          </Link>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>{project.views_count} {t('projects.views')}</span>
                        </div>
                      </div>
                    </article>
                  );
                } else {
                  // Makale Kartı
                  const article = item.data;
                  const authorName = article.author?.display_name ?? article.author?.username ?? 'Yazar';
                  const readingTime = calculateReadingTime(article.content);

                  return (
                    <article
                      key={`art-${article.id}`}
                      className="bg-card border border-border rounded-2xl overflow-hidden hover:border-border/80 transition-all duration-300"
                    >
                      {/* Üst Bilgi */}
                      <div className="p-4 flex items-center justify-between">
                        <Link href={`/yazar/${article.author?.username}`} className="flex items-center gap-2.5 group">
                          {article.author?.avatar_url ? (
                            <div className="relative w-9 h-9 rounded-full overflow-hidden border border-border">
                              <Image src={article.author.avatar_url} alt={authorName} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground text-xs uppercase border border-border">
                              {authorName.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-sm text-foreground group-hover:text-erciyes-red transition-colors leading-tight">
                              {authorName}
                            </p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <span>{formatRelativeTime(article.created_at)}</span>
                            </p>
                          </div>
                        </Link>
                        <span className="text-[10px] font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> {t('nav.articles')}
                        </span>
                      </div>

                      {/* Başlık ve Görsel */}
                      <div className="px-4 pb-4 flex flex-col md:flex-row gap-4">
                        <div className="flex-1 min-w-0">
                          <Link href={`/makale/${article.slug}`}>
                            <h3 className="font-bold text-base text-foreground hover:text-erciyes-red transition-colors mb-1.5 leading-snug">
                              {article.title}
                            </h3>
                          </Link>
                          <p className="text-xs text-muted-foreground leading-normal line-clamp-3">
                            {article.excerpt || 'Makalenin devamını okumak için tıklayın.'}
                          </p>
                        </div>
                        {article.cover_image && (
                          <Link href={`/makale/${article.slug}`} className="relative w-full md:w-36 aspect-[16/10] md:h-24 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                            <Image src={article.cover_image} alt={article.title} fill className="object-cover hover:scale-105 transition-transform duration-500" />
                          </Link>
                        )}
                      </div>

                      {/* Alt Detaylar */}
                      <div className="p-3.5 px-4 flex items-center justify-between text-xs text-muted-foreground bg-secondary/5 border-t border-border/30">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {readingTime} {t('home.readTime')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            {article.views_count} {t('projects.views')}
                          </span>
                        </div>
                        <Link href={`/makale/${article.slug}`} className="flex items-center gap-1 text-xs text-erciyes-red font-semibold hover:underline">
                          Daha fazla oku <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </article>
                  );
                }
              })}
            </div>
          )}
        </div>

        {/* SAĞ: ÖNERİLER VE FORUM sidebar - 4 Sütun */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Giriş Yapmış Kullanıcı İçin Takip Önerileri */}
          {isAuthenticated && <FollowSuggestions />}

          {/* Forum Gündemi */}
          <div className="sticky top-20">
            <div className="p-6 bg-card border border-border rounded-2xl">
              <div className="flex items-center gap-2 mb-4 border-b border-border/60 pb-3">
                <BookOpen className="w-4.5 h-4.5 text-erciyes-red" />
                <h3 className="font-bold text-base text-foreground">
                  {t('home.forumTitle')}
                </h3>
              </div>
              <ForumSidebar topics={forumTopics} compact />
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
