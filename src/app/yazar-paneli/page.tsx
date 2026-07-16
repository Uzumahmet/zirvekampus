'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import {
  LayoutDashboard,
  FileText,
  PenTool,
  Loader2,
  TrendingUp,
  Eye,
  Heart,
  BookOpen,
  Edit2,
  Trash2,
  Sparkles,
  ArrowRight,
  FolderDot
} from 'lucide-react';
import type { Konu } from '@/types';
import EditorTipTap from '@/components/article/editor-tiptap';

export default function YazarPaneliPage() {
  const router = useRouter();
  const { firebaseUser, dbUser, isLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'genel-bakis' | 'yazilarim' | 'yeni-yazi'>('genel-bakis');

  // Stats
  const [stats, setStats] = useState({
    totalArticles: 0,
    totalViews: 0,
    totalLikes: 0,
    drafts: 0
  });

  // Articles
  const [articles, setArticles] = useState<any[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);

  // Topics
  const [topics, setTopics] = useState<Konu[]>([]);
  
  // Form state
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [topicId, setTopicId] = useState<string>('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Access Control
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !dbUser) {
      router.replace('/giris-yap');
      return;
    }
    const isYazar = ['yazar', 'editor', 'admin'].includes(dbUser.role);
    if (!isYazar) {
      router.replace('/');
      return;
    }
  }, [dbUser, isAuthenticated, isLoading, router]);

  // Fetch Author Articles
  const fetchArticles = async () => {
    if (!firebaseUser) return;
    setArticlesLoading(true);
    try {
      const res = await fetch(`/api/article?authorId=${firebaseUser.uid}&status=`, {
        headers: { Authorization: `Bearer ${firebaseUser.idToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Since we want both published and drafts, let's process
        setArticles(data);
        
        // Calculate Stats
        const published = data.filter((a: any) => a.status === 'published');
        const drafts = data.filter((a: any) => a.status === 'draft');
        const views = published.reduce((acc: number, curr: any) => acc + (curr.views_count || 0), 0);
        
        setStats({
          totalArticles: published.length,
          totalViews: views,
          totalLikes: published.length * 3, // Dummy like calculation or fetch actual if database supports
          drafts: drafts.length
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setArticlesLoading(false);
    }
  };

  // Fetch Topics
  useEffect(() => {
    fetch('/api/topics')
      .then((res) => res.json())
      .then((data) => setTopics(data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (firebaseUser) {
      fetchArticles();
    }
  }, [firebaseUser, activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Başlık ve içerik doldurulması zorunludur.');
      return;
    }
    if (!topicId) {
      setError('Lütfen yazınız için bir konu seçin.');
      return;
    }

    setError('');
    setSuccess('');
    
    startTransition(async () => {
      try {
        const payload = {
          id: editingArticleId || undefined,
          title,
          content,
          excerpt,
          coverImage,
          topicId: Number(topicId),
          status
        };

        const res = await fetch('/api/article', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${firebaseUser?.idToken}`
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
          setSuccess(editingArticleId ? 'Yazınız başarıyla güncellendi!' : 'Yazınız başarıyla kaydedildi!');
          
          // Reset form
          setEditingArticleId(null);
          setTitle('');
          setContent('');
          setExcerpt('');
          setCoverImage('');
          setTopicId('');
          setStatus('draft');
          
          // Switch to articles list
          setTimeout(() => {
            setActiveTab('yazilarim');
          }, 1500);
        } else {
          setError(data.error || 'İşlem başarısız oldu.');
        }
      } catch (err) {
        setError('Bağlantı hatası oluştu.');
      }
    });
  };

  const handleEdit = (article: any) => {
    setEditingArticleId(article.id);
    setTitle(article.title);
    setContent(article.content);
    setExcerpt(article.excerpt || '');
    setCoverImage(article.cover_image || '');
    // Get topic from association
    const associatedTopic = article.makale_konulari?.[0]?.konu_id || '';
    setTopicId(associatedTopic.toString());
    setStatus(article.status);
    
    setActiveTab('yeni-yazi');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu makaleyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    try {
      const res = await fetch(`/api/article?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${firebaseUser?.idToken}` }
      });
      if (res.ok) {
        setArticles(articles.filter((a) => a.id !== id));
        fetchArticles();
      } else {
        alert('Silme işlemi başarısız oldu.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading || !dbUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Üst Kısım */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-border/80 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Yazar Paneli <span className="text-erciyes-red">✍️</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kampüs için bilgi üretin, taslaklarınızı düzenleyin ve istatistiklerinizi inceleyin.
          </p>
        </div>
        
        {/* Sekmeler */}
        <div className="flex gap-1.5 p-1 bg-secondary rounded-xl w-fit border border-border/60">
          <button
            onClick={() => { setActiveTab('genel-bakis'); setEditingArticleId(null); }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'genel-bakis'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Genel Bakış
          </button>
          <button
            onClick={() => { setActiveTab('yazilarim'); setEditingArticleId(null); }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'yazilarim'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Yazılarım
          </button>
          <button
            onClick={() => {
              setActiveTab('yeni-yazi');
              if (!editingArticleId) {
                // Clear form
                setTitle('');
                setContent('');
                setExcerpt('');
                setCoverImage('');
                setTopicId('');
                setStatus('draft');
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'yeni-yazi'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            {editingArticleId ? 'Yazıyı Düzenle' : 'Yeni Yazı'}
          </button>
        </div>
      </div>

      {/* İçerik */}
      <div>
        
        {/* ─── GENEL BAKIŞ TAB ──────────────────────────────── */}
        {activeTab === 'genel-bakis' && (
          <div className="space-y-8">
            {/* İstatistik Kartları */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-card border border-border rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-erciyes-red/10 to-transparent rounded-full -mr-5 -mt-5 transition-transform duration-500 group-hover:scale-110" />
                <BookOpen className="w-5 h-5 text-erciyes-red mb-3" />
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Yayınlanan Yazı</p>
                <h3 className="text-3xl font-black mt-1">{stats.totalArticles}</h3>
              </div>

              <div className="p-5 bg-card border border-border rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full -mr-5 -mt-5 transition-transform duration-500 group-hover:scale-110" />
                <Eye className="w-5 h-5 text-purple-400 mb-3" />
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Toplam Okunma</p>
                <h3 className="text-3xl font-black mt-1">{stats.totalViews}</h3>
              </div>

              <div className="p-5 bg-card border border-border rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full -mr-5 -mt-5 transition-transform duration-500 group-hover:scale-110" />
                <Heart className="w-5 h-5 text-emerald-400 mb-3" />
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Toplam Beğeni</p>
                <h3 className="text-3xl font-black mt-1">{stats.totalLikes}</h3>
              </div>

              <div className="p-5 bg-card border border-border rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full -mr-5 -mt-5 transition-transform duration-500 group-hover:scale-110" />
                <FileText className="w-5 h-5 text-amber-400 mb-3" />
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Taslaklar</p>
                <h3 className="text-3xl font-black mt-1">{stats.drafts}</h3>
              </div>
            </div>

            {/* Bilgilendirme ve Hızlı Link */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-8 p-6 bg-gradient-to-br from-secondary/50 via-secondary/20 to-card border border-border rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-erciyes-red/5 to-transparent rounded-full -mr-10 -mt-10" />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4.5 h-4.5 text-erciyes-red" />
                    <span className="text-xs font-bold uppercase tracking-widest text-erciyes-red">Yazarlık İpuçları</span>
                  </div>
                  <h3 className="text-xl font-bold max-w-lg mb-2">
                    Kampüsün sesi olun, fikirlerinizi özgürce aktarın.
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                    Erciyes Üniversitesi'ndeki arkadaşlarınızın okuması için akademik araştırmalar, projelerinizin detaylarını veya kampüs tecrübelerinizi yazabilirsiniz. TipTap editörü sayesinde görseller ekleyerek yazılarınızı zenginleştirin.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('yeni-yazi')}
                  className="flex items-center gap-2 text-xs font-bold text-erciyes-red hover:underline mt-6 group"
                >
                  Yeni Bir Yazı Kaleme Al →
                </button>
              </div>

              <div className="md:col-span-4 p-6 bg-card border border-border rounded-3xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4.5 h-4.5 text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Etki Oranı</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2">Okunma Kitlesi</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Yazılarınız ne kadar çok kişi tarafından okunursa, yazar profiliniz "Keşfet" sekmesinde o kadar üst sıralarda listelenir.
                  </p>
                </div>
                <div className="pt-4 border-t border-border mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Profil Sıralamanız</span>
                  <span className="font-bold text-foreground">Aktif Yazar</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── YAZILARIM TAB ────────────────────────────────── */}
        {activeTab === 'yazilarim' && (
          <div className="space-y-4">
            {articlesLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border rounded-3xl">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Henüz bir yazı kaleme almadınız.</p>
                <button
                  onClick={() => setActiveTab('yeni-yazi')}
                  className="mt-4 px-4 py-2 bg-secondary border border-border rounded-xl text-xs font-bold hover:bg-secondary/80 transition-all"
                >
                  İlk Yazını Yaz
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {articles.map((art) => (
                  <div
                    key={art.id}
                    className="p-5 bg-card border border-border rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-border/80 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-foreground leading-snug">
                          {art.title}
                        </h3>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          art.status === 'published'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {art.status === 'published' ? 'Yayınlandı' : 'Taslak'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 max-w-xl">
                        {art.excerpt || 'Özet girilmedi.'}
                      </p>
                      <div className="flex items-center gap-3 pt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {art.views_count || 0} okuma
                        </span>
                        <span>•</span>
                        <span>Oluşturulma: {new Date(art.created_at).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => handleEdit(art)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-secondary border border-border text-xs font-semibold hover:bg-secondary/85 text-foreground transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Düzenle
                      </button>
                      <button
                        onClick={() => handleDelete(art.id)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs font-semibold hover:bg-destructive/15 text-destructive transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── YENİ YAZI TAB ────────────────────────────────── */}
        {activeTab === 'yeni-yazi' && (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-3xl p-6 md:p-8 space-y-6 max-w-3xl">
            
            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-semibold">
                {success}
              </div>
            )}

            {/* Başlık */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                Yazı Başlığı
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="İlgi çekici ve özgün bir başlık yazın..."
                required
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-erciyes-red transition-all"
              />
            </div>

            {/* Konu ve Görsel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                  Kategori / Konu
                </label>
                <select
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm text-foreground focus:outline-none focus:border-erciyes-red transition-all"
                >
                  <option value="">Kategori Seçin...</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                  Kapak Görseli (URL)
                </label>
                <input
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://gorsel-adresi.com/kapak.jpg"
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-erciyes-red transition-all"
                />
              </div>
            </div>

            {/* Özet */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                Kısa Özet (Excerpt)
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Yazınız hakkında akışta görüntülenecek 1-2 cümlelik kısa özet (Boş bırakırsanız içerikten otomatik alınır)..."
                rows={2}
                maxLength={200}
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-erciyes-red resize-none transition-all"
              />
              <div className="text-right text-[10px] text-muted-foreground">{excerpt.length}/200</div>
            </div>

            {/* İçerik */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                Yazı İçeriği (Zengin Metin Editörü)
              </label>
              <EditorTipTap
                value={content}
                onChange={setContent}
                placeholder="Makalenizi buraya yazmaya başlayın..."
              />
            </div>

            {/* Durum (Taslak / Yayında) */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                Yayın Durumu
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={status === 'draft'}
                    onChange={() => setStatus('draft')}
                    className="accent-erciyes-red w-4 h-4"
                  />
                  Taslak olarak kaydet (Sadece siz görebilirsiniz)
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="published"
                    checked={status === 'published'}
                    onChange={() => setStatus('published')}
                    className="accent-erciyes-red w-4 h-4"
                  />
                  Yayınla (Herkes okuyabilir)
                </label>
              </div>
            </div>

            {/* Butonlar */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border/80">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('yazilarim');
                  setEditingArticleId(null);
                }}
                className="px-6 py-3 rounded-full border border-border bg-secondary hover:bg-secondary/80 text-xs font-bold transition-all"
              >
                İptal Et
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-erciyes-red text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-60 shadow-md"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {editingArticleId ? 'Yazıyı Güncelle' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
