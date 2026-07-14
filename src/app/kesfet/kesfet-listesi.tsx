'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, GraduationCap, X, FolderCode, BookOpen, Heart, Eye } from 'lucide-react';
import YazarKart from '@/components/author/yazar-kart';
import type { YazarProfile, ProjeWithAuthor, MakaleWithAuthor } from '@/types';
import { useAuth } from '@/app/providers';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import Image from 'next/image';
import Link from 'next/link';

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
}

export default function KesfetListesi({ kullanicilar, projeler, makaleler }: Props) {
  const { firebaseUser, isAuthenticated, dbUser } = useAuth();
  const { t } = useTranslation();
  
  // Tablar: 'grid' (Görsel Keşfet), 'people' (Öğrencileri Ara)
  const [activeTab, setActiveTab] = useState<'grid' | 'people'>('grid');
  
  const [query, setQuery] = useState('');
  const [seciliFakulte, setSeciliFakulte] = useState('');
  const [myFollowingIds, setMyFollowingIds] = useState<string[]>([]);
  const [loadingFollows, setLoadingFollows] = useState(false);

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
    let list = kullanicilar;

    if (seciliFakulte) {
      list = list.filter(u => u.fakulte === seciliFakulte);
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          (u.display_name ?? '').toLowerCase().includes(q) ||
          (u.bio ?? '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [kullanicilar, query, seciliFakulte]);

  return (
    <div className="space-y-8">
      {/* Keşfet Alt Sekmeleri (Tab Switcher) */}
      <div className="flex border-b border-border/60 max-w-md mx-auto justify-center mb-8 bg-secondary/20 p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveTab('grid')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'grid'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FolderCode className="w-4 h-4" />
          {t('explore.tabProjects')} & {t('nav.articles')}
        </button>
        <button
          onClick={() => setActiveTab('people')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'people'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Search className="w-4 h-4" />
          {t('explore.tabUsers')}
        </button>
      </div>

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

          {filteredUsers.length === 0 ? (
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
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
