'use client';

import { useState, useEffect, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/app/providers';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useRouter } from 'next/navigation';
import {
  Heart, MessageSquare, Eye, ChevronLeft, ChevronRight, Send, Trash2, Calendar, Loader2, ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjeWithAuthor, ProjeYorumWithAuthor } from '@/types';

interface ProjectDetail extends ProjeWithAuthor {
  comments: ProjeYorumWithAuthor[];
}

export default function ProjeDetayPage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const router = useRouter();
  const { firebaseUser, isAuthenticated, dbUser } = useAuth();
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [commentContent, setCommentContent] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);

  const fetchProjectDetail = async () => {
    try {
      const headers: Record<string, string> = {};
      if (firebaseUser) {
        headers['Authorization'] = `Bearer ${firebaseUser.idToken}`;
      }
      const res = await fetch(`/api/projects/${projectId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      } else {
        router.push('/projeler');
      }
    } catch (e) {
      console.error(e);
      router.push('/projeler');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetail();
  }, [projectId, firebaseUser]);

  // Proje Beğenme
  const handleLike = async () => {
    if (!isAuthenticated || !firebaseUser || !project) {
      window.location.href = '/giris-yap';
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseUser.idToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setProject((prev) =>
          prev
            ? {
                ...prev,
                liked_by_me: data.liked,
                likes_count: data.likes_count,
              }
            : null
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Yorum Yapma
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentError(null);

    if (!commentContent.trim()) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseUser!.idToken}`,
        },
        body: JSON.stringify({ content: commentContent }),
      });

      if (res.ok) {
        const data = await res.json();
        setProject((prev) =>
          prev
            ? {
                ...prev,
                comments: [...prev.comments, data.comment],
              }
            : null
        );
        setCommentContent('');
      } else {
        const data = await res.json();
        setCommentError(data.error || 'Yorum gönderilemedi.');
      }
    } catch (err) {
      setCommentError('Bağlantı hatası.');
    }
  };

  // Proje Silme
  const handleDeleteProject = async () => {
    if (!confirm('Bu projeyi kalıcı olarak silmek istediğinizden emin misiniz?')) return;

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${firebaseUser!.idToken}`,
        },
      });

      if (res.ok) {
        router.push('/projeler');
      } else {
        const data = await res.json();
        alert(data.error || 'Proje silinemedi.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
      </div>
    );
  }

  if (!project) return null;

  const images = project.image_urls || [];
  const authorName = project.author?.display_name ?? project.author?.username ?? 'Öğrenci';
  const isOwner = dbUser && dbUser.id === project.author_id;
  const isAdminOrEditor = dbUser && ['admin', 'editor'].includes(dbUser.role);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Geri Git butonu */}
      <div className="mb-6">
        <Link
          href="/projeler"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          {t('projects.title')}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-card border border-border rounded-3xl overflow-hidden shadow-xl max-w-5xl mx-auto">
        
        {/* SOL: GÖRSEL CAROUSEL (Instagram stili) */}
        <div className="lg:col-span-7 bg-black relative aspect-[4/3] flex items-center justify-center">
          {images.length > 0 ? (
            <>
              <Image
                src={images[activeImageIndex]}
                alt={project.title}
                fill
                className="object-contain"
                priority
              />

              {/* Sol-Sağ Kontrolleri */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Görsel İndikatör Noktaları */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/35 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
                  {images.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-2 h-2 rounded-full transition-all duration-200',
                        i === activeImageIndex ? 'bg-erciyes-red w-4' : 'bg-white/60'
                      )}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground text-xs">Görsel bulunamadı</div>
          )}
        </div>

        {/* SAĞ: DETAYLAR VE YORUMLAR (Split pane) */}
        <div className="lg:col-span-5 flex flex-col h-[600px] border-t lg:border-t-0 lg:border-l border-border bg-card">
          
          {/* Yazar Bilgisi Başlık */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <Link href={`/yazar/${project.author?.username}`} className="flex items-center gap-3 group">
              {project.author?.avatar_url ? (
                <div className="relative w-9 h-9 rounded-full overflow-hidden border border-border">
                  <Image src={project.author.avatar_url} alt={authorName} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground uppercase text-sm border border-border">
                  {authorName.slice(0, 2)}
                </div>
              )}
              <div>
                <p className="font-bold text-sm text-foreground group-hover:text-erciyes-red transition-colors">
                  {authorName}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {project.fakulte}
                </p>
              </div>
            </Link>

            {/* Silme Seçeneği */}
            {(isOwner || isAdminOrEditor) && (
              <button
                onClick={handleDeleteProject}
                className="p-1.5 rounded-lg border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Projeyi Sil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Açıklama & İstatistikler */}
          <div className="p-5 border-b border-border space-y-4">
            <div>
              <h1 className="font-bold text-xl text-foreground mb-1 leading-snug">
                {project.title}
              </h1>
              <p className="text-xs text-muted-foreground leading-normal max-h-36 overflow-y-auto pr-1">
                {project.description}
              </p>
            </div>

            {/* İstatistikler */}
            <div className="flex items-center gap-5 text-muted-foreground border-t border-border/40 pt-3">
              <button
                onClick={handleLike}
                className={cn(
                  'flex items-center gap-1.5 text-xs hover:text-destructive transition-colors font-semibold',
                  project.liked_by_me && 'text-destructive'
                )}
              >
                <Heart className={cn('w-4 h-4', project.liked_by_me && 'fill-current')} />
                <span>{project.likes_count} {t('home.likes')}</span>
              </button>
              <div className="flex items-center gap-1.5 text-xs">
                <Eye className="w-4 h-4" />
                <span>{project.views_count} {t('projects.views')}</span>
              </div>
            </div>
          </div>

          {/* Yorum Akışı */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-secondary/15">
            <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-wider mb-2">
              {t('projects.commentsHeader')} ({project.comments.length})
            </h3>

            {project.comments.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground leading-normal">{t('projects.noComments')}</p>
              </div>
            ) : (
              <div className="space-y-4.5">
                {project.comments.map((comment) => {
                  const commAuthorName = comment.author?.display_name ?? comment.author?.username ?? 'Öğrenci';
                  return (
                    <div key={comment.id} className="flex gap-2.5 text-xs items-start">
                      <Link href={`/yazar/${comment.author?.username}`}>
                        {comment.author?.avatar_url ? (
                          <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-border">
                            <Image src={comment.author.avatar_url} alt={commAuthorName} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground uppercase text-[10px] flex-shrink-0 border border-border">
                            {commAuthorName.slice(0, 2)}
                          </div>
                        )}
                      </Link>
                      <div className="bg-card border border-border/50 rounded-2xl p-3 flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2 mb-1">
                          <Link href={`/yazar/${comment.author?.username}`} className="font-bold text-foreground hover:underline">
                            @{comment.author?.username}
                          </Link>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-normal break-words">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Yorum Ekleme Formu */}
          <div className="p-4 border-t border-border bg-card">
            {isAuthenticated ? (
              <form onSubmit={handleCommentSubmit} className="relative">
                {commentError && (
                  <div className="text-[10px] text-destructive mb-1 font-semibold">{commentError}</div>
                )}
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder={t('projects.writeComment')}
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 rounded-2xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 p-2 rounded-xl text-erciyes-red hover:bg-secondary/80 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-2 bg-secondary/30 border border-border rounded-xl">
                <Link href="/giris-yap" className="text-xs text-erciyes-red hover:underline font-bold">
                  Yorum yapmak için giriş yapın.
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
