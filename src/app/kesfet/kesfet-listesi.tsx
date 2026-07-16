'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, GraduationCap, X, FolderCode, BookOpen, Heart, Eye, Repeat, Trash2, MessageSquare, Users } from 'lucide-react';
import YazarKart from '@/components/author/yazar-kart';
import type { YazarProfile, ProjeWithAuthor, MakaleWithAuthor } from '@/types';
import { useAuth } from '@/app/providers';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const ERU_FAKULTELERI = [
  'Mühendislik Fakültesi',
  'Tıp Fakültesi',
  'Eczacılık Fakültesi',
  'Diş Hekimliği Fakültesi',
  'Mimarlık Fakültesi',
  'Fen Fakültesi',
  'Edebiyat Fakültesi',
  'İktisadi ve İdari Bilimler Fakültesi',
  'İlahiyat Fakültesi',
  'İletişim Fakültesi',
  'Hukuk Fakültesi',
  'Eğitim Fakültesi',
  'Sağlık Bilimleri Fakültesi',
  'Spor Bilimleri Fakültesi',
  'Turizm Fakültesi',
  'Veteriner Fakültesi',
  'Ziraat Fakültesi',
  'Havacılık ve Uzay Bilimleri Fakültesi'
];

interface Props {
  kullanicilar: YazarProfile[];
  projeler: any[];
  makaleler: any[];
  gonderiler?: any[];
  clubs?: any[];
}

export default function KesfetListesi({ kullanicilar, projeler, makaleler, gonderiler = [], clubs = [] }: Props) {
  const { firebaseUser, isAuthenticated, dbUser } = useAuth();
  const { t } = useTranslation();
  
  // Tablar: 'posts' (Gönderiler), 'grid' (Görsel Keşfet), 'people' (Öğrencileri Ara), 'clubs' (Kulüpler)
  const [activeTab, setActiveTab] = useState<'posts' | 'grid' | 'people' | 'clubs'>('posts');
  
  const [query, setQuery] = useState('');
  const [seciliFakulte, setSeciliFakulte] = useState('');
  const [myFollowingIds, setMyFollowingIds] = useState<string[]>([]);
  const [loadingFollows, setLoadingFollows] = useState(false);
  
  // Client-side kullanıcı listesi (server props veya API'den)
  const [kullanicilarList, setKullanicilarList] = useState<YazarProfile[]>(kullanicilar);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // 'people' tabuna geçilince kullanıcıları API'den de çek (ISR cache boş gelirse)
  useEffect(() => {
    if (activeTab === 'people') {
      // Eğer server'dan veri geldiyse tekrar çekme
      if (kullanicilar.length > 0 && kullanicilarList.length > 0) return;
      setLoadingUsers(true);
      fetch('/api/users/kesfet')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && Array.isArray(data)) {
            setKullanicilarList(data);
          }
        })
        .catch(e => console.error('[Keşfet] API kullanıcı fetch hatası:', e))
        .finally(() => setLoadingUsers(false));
    }
  }, [activeTab]);

  // Server'dan gelen kullanıcılar değişirse güncelle
  useEffect(() => {
    if (kullanicilar.length > 0) {
      setKullanicilarList(kullanicilar);
    }
  }, [kullanicilar]);

  // Giriş yapmış kullanıcının kendi takip ettiği kişileri çek
  useEffect(() => {
    if (isAuthenticated && dbUser) {
      const fetchFollowings = async () => {
        setLoadingFollows(true);
        try {
          const headers: Record<string, string> = { Authorization: `Bearer ${firebaseUser?.idToken}` };
          const res = await fetch(`/api/user/connections?username=${dbUser.username}`, { headers });
          if (res.ok) {
            const data = await res.json();
            const ids = (data.following ?? []).map((u: any) => u.id);
            setMyFollowingIds(ids);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingFollows(false);
        }
      };
      fetchFollowings();
    }
  }, [isAuthenticated, dbUser, firebaseUser]);

  // Gönderi Eyaletleri ve İşleyicileri
  const [postsList, setPostsList] = useState<any[]>(gonderiler);
  const [repostStatusMap, setRepostStatusMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setPostsList(gonderiler);
  }, [gonderiler]);

  const handleLikePost = async (postId: string) => {
    if (!firebaseUser) return;
    try {
      const res = await fetch('/api/projects/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseUser.idToken}`
        },
        body: JSON.stringify({ projectId: postId })
      });

      if (res.ok) {
        const data = await res.json();
        setPostsList((prev) =>
          prev.map((p) => {
            if (p.id === postId) {
              return {
                ...p,
                likes_count: data.liked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1),
                liked_by_me: data.liked
              };
            }
            return p;
          })
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRepostItem = async (ogeId: string, ogeTipi: 'article' | 'forum' | 'project') => {
    if (!firebaseUser) {
      alert('Yeniden paylaşmak için giriş yapmalısınız.');
      return;
    }

    try {
      const res = await fetch('/api/user/repost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseUser.idToken}`
        },
        body: JSON.stringify({ ogeId, ogeTipi })
      });

      if (res.ok) {
        const data = await res.json();
        const key = `${ogeTipi}-${ogeId}`;
        setRepostStatusMap((prev) => ({
          ...prev,
          [key]: data.reposted
        }));
        alert(data.reposted ? 'Yeniden paylaşıldı!' : 'Yeniden paylaşım kaldırıldı.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Bu gönderiyi silmek istediğinizden emin misiniz?')) return;
    if (!firebaseUser) return;

    try {
      const res = await fetch(`/api/projects?id=${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${firebaseUser.idToken}` }
      });

      if (res.ok) {
        setPostsList((prev) => prev.filter((p) => p.id !== postId));
      } else {
        alert('Gönderi silinemedi.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ─── 1. KİŞİSELLEŞTİRİLMİŞ GÖRSEL KEŞFET ALGORİTMASI ────────────────
  const personalizedGrid = useMemo(() => {
    // Projeleri ve makaleleri tek bir listede topla
    const allItems = [
      ...projeler.map(p => ({ ...p, itemType: 'project' as const })),
      ...makaleler.map(m => ({ ...m, itemType: 'article' as const }))
    ];

    // Algoritma: Giriş yapan kullanıcının fakültesine uyan içerikler önce,
    // sonra görüntülenme sayısı yüksek olan trendler.
    return allItems.sort((a, b) => {
      const userFaculty = dbUser?.fakulte;

      if (userFaculty) {
        const aMatches = a.fakulte === userFaculty || a.author?.fakulte === userFaculty;
        const bMatches = b.fakulte === userFaculty || b.author?.fakulte === userFaculty;

        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
      }

      // İkincil kriter: Popülerlik (Views)
      return (b.views_count || 0) - (a.views_count || 0);
    });
  }, [projeler, makaleler, dbUser]);

  // ─── 2. KULLANICI ARAMA FİLTRESİ ──────────────────────────────────
  const filteredUsers = useMemo(() => {
    // Sadece kendini hariç tut - takip ettiklerini de göster (badge ile ayrışır)
    let list = kullanicilarList.filter((u) => u.id !== dbUser?.id);

    if (seciliFakulte) {
      list = list.filter(u => u.fakulte === seciliFakulte);
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.username?.toLowerCase().includes(q) ||
          (u.display_name ?? '').toLowerCase().includes(q) ||
          (u.bio ?? '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [kullanicilarList, query, seciliFakulte, dbUser]);

  return (
    <div className="space-y-8">
      {/* Keşfet Alt Sekmeleri (Tab Switcher) */}
      <div className="flex border-b border-border/60 max-w-xl mx-auto justify-center mb-8 bg-secondary/20 p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'posts'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-erciyes-red" />
          Gönderiler
        </button>
        <button
          onClick={() => setActiveTab('grid')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'grid'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FolderCode className="w-4 h-4 text-emerald-500" />
          Proje & Makale
        </button>
        <button
          onClick={() => setActiveTab('people')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'people'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Search className="w-4 h-4 text-cyan-500" />
          {t('explore.tabUsers')}
        </button>
        <button
          onClick={() => setActiveTab('clubs')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'clubs'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4 text-purple-500" />
          Kulüpler
        </button>
      </div>

      {/* ─── TAB: GÖNDERİLER ────────────────────────────────────────────── */}
      {activeTab === 'posts' && (
        <div className="space-y-6 max-w-2xl mx-auto">
          {postsList.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground bg-card border border-border rounded-2xl">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30 animate-pulse text-erciyes-red" />
              <p className="font-semibold">Kampüste henüz paylaşılmış bir gönderi yok.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {postsList.map((post) => {
                const authorName = post.author?.display_name ?? post.author?.username ?? 'Öğrenci';
                const initials = authorName.slice(0, 2).toUpperCase();
                const isPostLiked = post.liked_by_me;
                const shownFaculty = post.author?.fakulte;

                return (
                  <article
                    key={post.id}
                    className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm hover:border-border/80 transition-all duration-300"
                  >
                    {/* Üst Yazar Bilgisi */}
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/${post.author?.username}`} className="flex items-center gap-2.5 group">
                        {post.author?.avatar_url ? (
                          <Image
                            src={post.author.avatar_url}
                            alt={authorName}
                            width={38}
                            height={38}
                            className="rounded-full border border-border object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground uppercase text-xs border border-border">
                            {initials}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-xs text-foreground group-hover:text-erciyes-red transition-colors leading-tight">
                            {authorName}
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            @{post.author?.username} • {shownFaculty || 'Zirve Kampüs'}
                          </p>
                        </div>
                      </Link>

                      {(dbUser?.id === post.author?.id || dbUser?.role === 'admin' || dbUser?.role === 'editor') && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1.5 rounded-lg border border-border/60 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          title="Gönderiyi Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Gönderi İçeriği */}
                    <p className="text-xs text-muted-foreground leading-relaxed break-words font-sans">
                      {post.description}
                    </p>

                    {/* Ekli Görseller */}
                    {post.image_urls && post.image_urls.length > 0 && (
                      <div className={cn(
                        "w-full overflow-hidden bg-black rounded-xl border border-border/50",
                        post.image_urls.length === 1 ? "" : "grid grid-cols-2 gap-0.5"
                      )}>
                        {post.image_urls.map((img: string, idx: number) => (
                          <div
                            key={idx}
                            className={cn(
                              "relative bg-secondary/30 w-full overflow-hidden",
                              post.image_urls.length === 1
                                ? (post.aspect_ratio === '4:5'
                                    ? "aspect-[4/5] max-h-[500px]"
                                    : post.aspect_ratio === '9:16'
                                      ? "aspect-[9/16] max-h-[600px]"
                                      : "aspect-square")
                                : "aspect-square"
                            )}
                          >
                            <img src={img} alt="Gönderi Resmi" className="w-full h-full object-cover absolute inset-0" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Alt Etkileşimler */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-2 px-1">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleLikePost(post.id)}
                          className={cn(
                            'flex items-center gap-1 font-bold transition-colors',
                            isPostLiked ? 'text-destructive' : 'hover:text-destructive'
                          )}
                        >
                          <Heart className={cn('w-4 h-4', isPostLiked && 'fill-current')} />
                          <span>{post.likes_count}</span>
                        </button>

                        <button
                          onClick={() => handleRepostItem(post.id, 'project')}
                          className={cn(
                            'flex items-center gap-1 font-bold transition-colors hover:text-erciyes-gold',
                            repostStatusMap[`project-${post.id}`] && 'text-erciyes-gold'
                          )}
                        >
                          <Repeat className="w-4 h-4" />
                          <span>Repost</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 1: INSTAGRAM STİLİ GÖRSEL KEŞFET GRID'İ ────────────────── */}
      {activeTab === 'grid' && (
        <div className="space-y-6 max-w-6xl mx-auto">
          {personalizedGrid.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p>{t('explore.noResults')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[180px] md:auto-rows-[220px]">
              {personalizedGrid.map((item, idx) => {
                const isProject = item.itemType === 'project';
                const href = isProject ? `/projeler/${item.id}` : `/makale/${item.slug}`;
                const title = item.title;
                const image = isProject ? item.image_urls?.[0] : item.cover_image;
                const authorName = item.author?.display_name ?? item.author?.username ?? 'Öğrenci';
                
                // Instagram Explore stili: her 5. veya 9. öğe büyük (2 satır kaplasın)
                const isLarge = idx % 7 === 1 || idx % 7 === 5;

                return (
                  <Link
                    key={`${item.itemType}-${item.id}`}
                    href={href}
                    className={`group relative rounded-2xl overflow-hidden bg-secondary border border-border/40 hover:border-erciyes-red/35 transition-all duration-300 shadow-sm ${
                      isLarge ? 'row-span-2 col-span-1 md:col-span-2 md:row-span-2' : ''
                    }`}
                  >
                    {image ? (
                      <Image
                        src={image}
                        alt={title}
                        fill
                        className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-secondary/50">
                        {isProject ? <FolderCode className="w-8 h-8 text-muted-foreground/75 mb-2" /> : <BookOpen className="w-8 h-8 text-muted-foreground/75 mb-2" />}
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">{isProject ? t('nav.projects') : t('nav.articles')}</p>
                      </div>
                    )}

                    {/* Dark gradient overlay on hover */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-10 text-white">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-erciyes-red mb-1 flex items-center gap-1">
                        {isProject ? <FolderCode className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                        {isProject ? t('nav.projects') : t('nav.articles')}
                      </span>
                      <h4 className="font-bold text-xs md:text-sm line-clamp-2 leading-snug mb-2">
                        {title}
                      </h4>
                      
                      <div className="flex items-center justify-between border-t border-white/20 pt-2 text-[10px] text-white/80">
                        <span className="truncate">@{item.author?.username}</span>
                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          {isProject ? (
                            <span className="flex items-center gap-0.5"><Heart className="w-3 h-3 text-red-500 fill-current" />{item.likes_count}</span>
                          ) : (
                            <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{item.views_count}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: ÖĞRENCİ ARAMA VE TAKİPLEŞME ─────────────────────────── */}
      {activeTab === 'people' && (
        <div className="space-y-6">
          {/* Arama & Filtreleme Arayüzü */}
          <div className="flex flex-col md:flex-row items-center gap-4 justify-between max-w-4xl mx-auto mb-12">
            {/* Arama Çubuğu */}
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="search"
                placeholder="Kullanıcı adıyla veya isimle öğrencileri ara..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-erciyes-red/40 focus:border-erciyes-red/40 shadow-sm transition-all duration-300 text-sm"
              />
              {loadingFollows && (
                <div className="absolute inset-y-0 right-3 flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin text-erciyes-red" />
                </div>
              )}
            </div>

            {/* Fakülte Filtreleyici Dropdown */}
            <div className="relative w-full md:w-72 flex-shrink-0">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
              </div>
              <select
                value={seciliFakulte}
                onChange={(e) => setSeciliFakulte(e.target.value)}
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-erciyes-red/40 focus:border-erciyes-red/40 shadow-sm transition-all duration-300 text-sm appearance-none cursor-pointer"
              >
                <option value="">{t('explore.allFaculties')}</option>
                {ERU_FAKULTELERI.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              {seciliFakulte && (
                <button
                  onClick={() => setSeciliFakulte('')}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {loadingUsers ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
              <p className="text-sm text-muted-foreground font-medium">Öğrenciler yükleniyor...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 text-muted-foreground"
            >
              <p className="text-lg font-medium">{t('explore.noResults')}</p>
              <p className="text-sm mt-1">Farklı bir arama terimi veya fakülte seçmeyi deneyin.</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredUsers.map((user, index) => {
                const isMe = user.id === dbUser?.id;
                const shownFaculty = (user.fakulte_gizli && !isMe) ? null : user.fakulte;

                const maskedUser = {
                  ...user,
                  fakulte: shownFaculty
                };

                return (
                  <YazarKart
                    key={user.id}
                    yazar={maskedUser}
                    index={index}
                    baslangicTakip={myFollowingIds.includes(user.id)}
                    hideRoleBadge={true}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: KULÜPLER ────────────────────────────────────────────── */}
      {activeTab === 'clubs' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {clubs.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground bg-card border border-border rounded-2xl">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30 text-purple-500" />
              <p className="font-semibold">Aktif bir öğrenci kulübü bulunamadı.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clubs.map((club: any) => (
                <div key={club.id} className="p-5 bg-card border border-border hover:border-border/80 rounded-2xl shadow-xs flex flex-col justify-between h-48 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {club.logo_url ? (
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-border flex-shrink-0">
                          <Image src={club.logo_url} alt={club.name} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center font-bold text-sm text-purple-500 border border-purple-500/20 flex-shrink-0">
                          {club.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-black text-sm text-foreground truncate">{club.name}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">👥 {club.member_count} Üye</p>
                      </div>
                    </div>
                    {club.vision && (
                      <p className="text-[11px] text-foreground italic line-clamp-2">
                        "{club.vision}"
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-3">
                    <span className="text-[9px] text-muted-foreground">Başkan: @{club.president?.username || 'Mevcut Değil'}</span>
                    <Link
                      href={`/kulup/${club.slug}`}
                      className="px-4 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-[10px] font-bold transition-all shadow-xs"
                    >
                      İncele →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
