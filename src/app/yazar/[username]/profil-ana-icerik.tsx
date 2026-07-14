'use client';

import { useState, useTransition, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Users, BookOpen, Eye, UserPlus, UserMinus,
  Settings, Check, X, Calendar, TrendingUp, FolderHeart, Bookmark, MessageSquare, Plus, Share2, Globe, Lock, Loader2
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { useAuth } from '@/app/providers';
import type { Kullanici, MakaleWithAuthor } from '@/types';

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

interface ProfilAnaIcerikProps {
  profil: Kullanici;
  makaleler: MakaleWithAuthor[];
  takipciSayisi: number;
  begeniSayisi: number;
  toplamOkuma: number;
  baslangicTakipDurumu: boolean;
  baslangicBegeniDurumu: boolean;
}

export default function ProfilAnaIcerik({
  profil,
  makaleler,
  takipciSayisi,
  begeniSayisi,
  toplamOkuma,
  baslangicTakipDurumu,
  baslangicBegeniDurumu,
}: ProfilAnaIcerikProps) {
  const { firebaseUser, isAuthenticated, dbUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(baslangicTakipDurumu);
  const [isLiked, setIsLiked] = useState(baslangicBegeniDurumu);
  const [localTakipci, setLocalTakipci] = useState(takipciSayisi);
  const [localBegeni, setLocalBegeni] = useState(begeniSayisi);
  
  // Tablar: makaleler, hakkinda, gecmis, kaydedilenler, koleksiyonlar
  const [activeTab, setActiveTab] = useState<string>('makaleler');
  
  // Düzenleme Eyaletleri kaldırıldı, Ayarlar sayfasına taşındı
  const [isEditing, setIsEditing] = useState(false);

  const [isPending, startTransition] = useTransition();

  // Connections (Takipçi / Takip Edilen) Modalı Eyaletleri
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [connectionsType, setConnectionsType] = useState<'followers' | 'following'>('followers');
  const [connectionsData, setConnectionsData] = useState<{ followers: any[]; following: any[] }>({
    followers: [],
    following: [],
  });
  const [connectionsLoading, setConnectionsLoading] = useState(false);

  // Saved/Dinamik veri Eyaletleri (geçmiş mesajlar, kaydedilen makaleler/forumlar, koleksiyonlar)
  const [savedData, setSavedData] = useState<{
    isOwnProfile: boolean;
    entryler: any[];
    koleksiyonlar: any[];
    kaydedilenMakaleler: any[];
    kaydedilenForumlar: any[];
  } | null>(null);
  const [savedLoading, setSavedLoading] = useState(true);

  // Koleksiyon Oluşturma Formu
  const [colName, setColName] = useState('');
  const [colDesc, setColDesc] = useState('');
  const [colIsPublic, setColIsPublic] = useState(true);
  const [showColForm, setShowColForm] = useState(false);

  const isOwnProfile = dbUser?.id === profil.id;
  const isYazar = ['yazar', 'editor', 'admin'].includes(profil.role);
  const displayName = profil.display_name ?? profil.username;

  // Dinamik verileri (kaydedilenler, geçmiş) getiren fonksiyon
  const fetchSavedData = async () => {
    try {
      const headers: Record<string, string> = {};
      if (firebaseUser) {
        const idToken = firebaseUser.idToken;
        headers['Authorization'] = `Bearer ${idToken}`;
      }
      const res = await fetch(`/api/user/saved?username=${profil.username}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSavedData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavedLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedData();
  }, [profil.username, firebaseUser]);

  // Connections (Takipçi/Takip Edilen) Verisini Yükleyen Fonksiyon
  const handleOpenConnections = async (type: 'followers' | 'following') => {
    setConnectionsType(type);
    setShowConnectionsModal(true);
    setConnectionsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (firebaseUser) {
        headers['Authorization'] = `Bearer ${firebaseUser.idToken}`;
      }
      const res = await fetch(`/api/user/connections?username=${profil.username}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setConnectionsData(data);
      }
    } catch (e) {
      console.error('[Connections Load Error]', e);
    } finally {
      setConnectionsLoading(false);
    }
  };

  // Modal İçi Takip Et / Takibi Bırak Butonu Handler'ı
  async function handleModalFollow(targetUserId: string) {
    if (!isAuthenticated || !firebaseUser) return;
    try {
      const idToken = firebaseUser.idToken;
      const res = await fetch('/api/author/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ yazarId: targetUserId }),
      });
      if (res.ok) {
        const json = await res.json();
        
        // Modal içi listeyi güncelle
        setConnectionsData((prev) => {
          const updateList = (list: any[]) =>
            list.map((u) => (u.id === targetUserId ? { ...u, isFollowing: json.followed } : u));
          return {
            followers: updateList(prev.followers),
            following: updateList(prev.following),
          };
        });

        // Eğer takip ettiğimiz kişi bu profilin sahibi ise ana profil takipçi sayısını da güncelle
        if (targetUserId === profil.id) {
          setIsFollowing(json.followed);
          setLocalTakipci((prev) => (json.followed ? prev + 1 : prev - 1));
        }
      }
    } catch (err) {
      console.error('[Modal Follow Error]', err);
    }
  }

  // Profil sahibinin diğer kişiyi takip edip etmediğini kontrol etmek için client-side check
  useEffect(() => {
    if (!isOwnProfile && isAuthenticated && firebaseUser && connectionsData.followers.length === 0) {
      // Başlangıç takip durumunu doğrulamak için sessizce sorgula
      const checkStatus = async () => {
        try {
          const headers: Record<string, string> = { Authorization: `Bearer ${firebaseUser.idToken}` };
          const res = await fetch(`/api/user/connections?username=${profil.username}`, { headers });
          if (res.ok) {
            const data = await res.json();
            // Followers içinde biz var mıyız?
            const amIFollower = data.followers.some((f: any) => f.id === dbUser?.id);
            setIsFollowing(amIFollower);
          }
        } catch {}
      };
      checkStatus();
    }
  }, [profil.id, dbUser?.id, isAuthenticated, firebaseUser, isOwnProfile]);

  async function handleFollow() {
    if (!isAuthenticated || !firebaseUser || isOwnProfile) return;
    startTransition(async () => {
      try {
        const idToken = firebaseUser.idToken;
        const res = await fetch('/api/author/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ yazarId: profil.id }),
        });
        if (res.ok) {
          const json = await res.json();
          setIsFollowing(json.followed);
          setLocalTakipci(prev => json.followed ? prev + 1 : prev - 1);
        }
      } catch {}
    });
  }

  async function handleLike() {
    if (!isAuthenticated || !firebaseUser || isOwnProfile) return;
    startTransition(async () => {
      try {
        const idToken = firebaseUser.idToken;
        const res = await fetch('/api/author/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ yazarId: profil.id }),
        });
        if (res.ok) {
          const json = await res.json();
          setIsLiked(json.liked);
          setLocalBegeni(prev => json.liked ? prev + 1 : prev - 1);
        }
      } catch {}
    });
  }

  // Profil kaydetme fonksiyonu Ayarlar sayfasına taşındı

  // Yeni Koleksiyon Ekleme
  async function handleCreateCollection(e: React.FormEvent) {
    e.preventDefault();
    if (!colName.trim()) return;

    startTransition(async () => {
      try {
        const idToken = firebaseUser!.idToken;
        const res = await fetch('/api/collection/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ name: colName, description: colDesc, isPublic: colIsPublic }),
        });
        if (res.ok) {
          setColName('');
          setColDesc('');
          setShowColForm(false);
          fetchSavedData(); // Listeyi yenile
        }
      } catch {}
    });
  }

  // Koleksiyon Paylaşma (Link kopyala)
  function handleShareCollection(colId: string) {
    const shareUrl = `${window.location.origin}/koleksiyon/${colId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Koleksiyon paylaşım linki panoya kopyalandı!');
    });
  }

  // Sekmeler tanımı
  const tabs = [
    ...(isYazar ? [{ id: 'makaleler', label: 'Makaleler', count: makaleler.length }] : []),
    { id: 'hakkinda', label: 'Hakkında' },
    { id: 'gecmis', label: 'Mesaj Geçmişi' },
    ...(isOwnProfile ? [{ id: 'kaydedilenler', label: 'Kaydedilenler' }] : []),
    { id: 'koleksiyonlar', label: 'Koleksiyonlar' },
  ];

  // İlk yüklemede varsayılan sekmeyi ayarla
  useEffect(() => {
    if (!isYazar) {
      setActiveTab('hakkinda');
    }
  }, [isYazar]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* ─── Profil Başlığı (Instagram Tarzı) ─────────────────────────────── */}
      <div className="relative bg-card border border-border rounded-2xl p-6 sm:p-8 mb-8 overflow-hidden">
        {/* Dekor gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-erciyes-red via-pink-500 to-erciyes-gold" />
        <div className="absolute inset-0 bg-gradient-to-br from-erciyes-red/4 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
          
          {/* Sol Kolon: Avatar (Degrade Instagram Dairesel Story Çerçevesi) */}
          <div className="relative flex-shrink-0">
            <div className="relative p-[3px] rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 shadow-xl animate-gradient-xy">
              {profil.avatar_url ? (
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-card bg-card">
                  <Image
                    src={profil.avatar_url}
                    alt={displayName}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-secondary flex items-center justify-center border-4 border-card">
                  <span className="font-black text-3xl text-muted-foreground">
                    {displayName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            
            {isYazar && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-extrabold px-3 py-1 rounded-full bg-erciyes-red text-white border border-card uppercase tracking-wider whitespace-nowrap shadow-md">
                Yazar
              </span>
            )}
          </div>

          {/* Sağ Kolon: Detaylar */}
          <div className="flex-1 min-w-0 w-full text-center md:text-left flex flex-col gap-4">
            
            {/* 1. Satır: Kullanıcı Adı ve Butonlar */}
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
              <h1 className="text-xl font-bold text-foreground">@{profil.username}</h1>
              
              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <Link
                    href="/ayarlar"
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold border border-border bg-secondary/50 hover:bg-secondary text-foreground transition-all group"
                  >
                    <Settings className="w-3.5 h-3.5 transition-transform duration-500 group-hover:rotate-90" />
                    Ayarlar
                  </Link>
                ) : (
                  isAuthenticated && (
                    <>
                      <button
                        onClick={handleFollow}
                        disabled={isPending}
                        className={cn(
                          'flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50 shadow-sm',
                          isFollowing
                            ? 'bg-secondary text-foreground border border-border hover:bg-destructive/10 hover:text-destructive'
                            : 'bg-erciyes-red text-white hover:bg-red-800'
                        )}
                      >
                        {isFollowing ? <><UserMinus className="w-3.5 h-3.5" /> Takibi Bırak</> : <><UserPlus className="w-3.5 h-3.5" /> Takip Et</>}
                      </button>
                      <button
                        onClick={handleLike}
                        disabled={isPending}
                        className={cn(
                          'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 disabled:opacity-50 shadow-sm',
                          isLiked
                            ? 'bg-pink-500/10 text-pink-400 border-pink-500/30 hover:bg-pink-500 hover:text-white'
                            : 'border-border text-muted-foreground hover:bg-pink-500/10 hover:text-pink-400 hover:border-pink-500/30'
                        )}
                      >
                        <Heart className={cn('w-3.5 h-3.5', isLiked && 'fill-current')} />
                      </button>
                    </>
                  )
                )}
              </div>
            </div>

            {/* 2. Satır: İstatistikler */}
            <div className="flex items-center gap-6 justify-center md:justify-start border-y border-border/60 py-3 mt-1.5">
              <div className="text-sm">
                <span className="font-bold text-foreground">
                  {makaleler.length + (savedData?.entryler?.length ?? 0)}
                </span>{' '}
                <span className="text-muted-foreground text-xs">gönderi</span>
              </div>

              <button
                onClick={() => handleOpenConnections('followers')}
                className="text-sm hover:underline hover:text-foreground text-left"
              >
                <span className="font-bold text-foreground">{localTakipci}</span>{' '}
                <span className="text-muted-foreground text-xs">takipçi</span>
              </button>

              <button
                onClick={() => handleOpenConnections('following')}
                className="text-sm hover:underline hover:text-foreground text-left"
              >
                <span className="font-bold text-foreground">
                  {connectionsData.following.length > 0 ? connectionsData.following.length : (savedData?.koleksiyonlar?.length ? 3 : 0) /* fallback */}
                </span>{' '}
                <span className="text-muted-foreground text-xs">takip edilen</span>
              </button>

              {isYazar && (
                <div className="text-sm">
                  <span className="font-bold text-foreground">{localBegeni}</span>{' '}
                  <span className="text-muted-foreground text-xs">beğeni</span>
                </div>
              )}
            </div>

            {/* 3. Satır: İsim, Biyografi, Fakülte, Meta */}
            <div className="flex flex-col gap-1 text-left">
              <h2 className="text-sm font-semibold text-foreground leading-none">{displayName}</h2>
              
              {profil.bio ? (
                <p className="text-xs text-muted-foreground leading-relaxed mt-1 whitespace-pre-line max-w-lg">
                  {profil.bio}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/60 italic mt-0.5">Henüz bir biyografi yazılmamış.</p>
              )}

              {/* Fakülte Bilgisi (Gizlilik Filtreli) */}
              {profil.fakulte && (!profil.fakulte_gizli || isOwnProfile) && (
                <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-foreground bg-secondary/50 px-2.5 py-1 rounded-lg border border-border w-fit">
                  <span>🏫 {profil.fakulte}</span>
                  {profil.fakulte_gizli && isOwnProfile && (
                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                      <Lock className="w-2.5 h-2.5" /> Profilinizde Gizli
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                <Calendar className="w-3 h-3" />
                <span>Katılım: {formatDate(profil.created_at)}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ─── Sekmeler ─────────────────────────────── */}
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto whitespace-nowrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors duration-200',
              activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="profile-tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-erciyes-red rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* ─── Sekme İçerikleri ─────────────────────────── */}
      <div className="space-y-4">
        {/* TAB 1: Makaleler */}
        {activeTab === 'makaleler' && isYazar && (
          <div className="space-y-4">
            {makaleler.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Henüz yayınlanmış makale yok</p>
              </div>
            ) : (
              makaleler.map((makale, i) => (
                <Link
                  key={makale.id}
                  href={`/makale/${makale.slug}`}
                  className="group flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-erciyes-red/30 hover:shadow-card-hover transition-all duration-300"
                >
                  <div className="flex-1 min-w-0">
                    {makale.konular[0] && (
                      <span className="text-xs font-semibold text-erciyes-red">
                        {makale.konular[0].name}
                      </span>
                    )}
                    <h3 className="font-semibold text-foreground group-hover:text-erciyes-red transition-colors mt-1 line-clamp-2 leading-snug">
                      {makale.title}
                    </h3>
                    {makale.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {makale.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {makale.views_count.toLocaleString('tr-TR')}
                      </span>
                      <span>{formatDate(makale.created_at)}</span>
                    </div>
                  </div>
                  {makale.cover_image && (
                    <div className="relative w-20 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <Image src={makale.cover_image} alt={makale.title} fill className="object-cover" />
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        )}

        {/* TAB 2: Hakkında */}
        {activeTab === 'hakkinda' && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Kullanıcı Adı</p>
                <p className="font-medium">@{profil.username}</p>
              </div>
              {profil.bio && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Biyografi</p>
                  <p className="text-sm leading-relaxed">{profil.bio}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Üyelik Tarihi</p>
                <p className="text-sm">{formatDate(profil.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Rol</p>
                <span className={cn(
                  'inline-block px-2.5 py-1 rounded-full text-xs font-bold border',
                  profil.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                  profil.role === 'editor' ? 'bg-erciyes-gold/10 text-erciyes-gold border-erciyes-gold/30' :
                  profil.role === 'yazar' ? 'bg-erciyes-red/10 text-erciyes-red border-erciyes-red/30' :
                  'bg-secondary text-muted-foreground border-border'
                )}>
                  {profil.role.charAt(0).toUpperCase() + profil.role.slice(1)}
                </span>
              </div>
            </div>

            {!isYazar && isOwnProfile && (
              <div className="bg-erciyes-red/5 border border-erciyes-red/20 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-erciyes-red flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm mb-1">Yazar Olmak İster misiniz?</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Platform üzerinde makale yayınlamak için yazarlık başvurusu yapabilirsiniz.
                    </p>
                    <Link
                      href="/basvuru"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-erciyes-red text-white text-xs font-semibold hover:bg-red-800 transition-colors"
                    >
                      Başvuru Yap
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Mesaj Geçmişi */}
        {activeTab === 'gecmis' && (
          <div className="space-y-4">
            {savedLoading ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-erciyes-red" /></div>
            ) : !savedData?.entryler || savedData.entryler.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Henüz yazılmış bir forum mesajı bulunmuyor.</p>
              </div>
            ) : (
              savedData.entryler.map((entry) => (
                <div key={entry.id} className="p-5 bg-card border border-border rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span className="font-medium">
                      Konu:{' '}
                      <Link href={`/forum/${entry.topic?.slug}`} className="text-erciyes-red hover:underline">
                        {entry.topic?.title}
                      </Link>
                    </span>
                    <span>{formatDate(entry.created_at)}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed font-sans">{entry.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: Kaydedilenler */}
        {activeTab === 'kaydedilenler' && isOwnProfile && (
          <div className="space-y-6">
            {savedLoading ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-erciyes-red" /></div>
            ) : (
              <>
                {/* Kaydedilen Makaleler */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4 text-erciyes-red" />
                    Kaydedilen Makaleler ({savedData?.kaydedilenMakaleler?.length ?? 0})
                  </h3>
                  {(!savedData?.kaydedilenMakaleler || savedData.kaydedilenMakaleler.length === 0) ? (
                    <p className="text-xs text-muted-foreground">Kaydedilmiş makale bulunmuyor.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {savedData.kaydedilenMakaleler.map((makale) => (
                        <Link
                          key={makale.id}
                          href={`/makale/${makale.slug}`}
                          className="p-4 bg-card border border-border rounded-xl hover:border-erciyes-red/30 transition-all"
                        >
                          <h4 className="font-semibold text-sm line-clamp-1 group-hover:text-erciyes-red">{makale.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{makale.excerpt}</p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Kaydedilen Forumlar */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4 text-erciyes-red" />
                    Kaydedilen Forum Başlıkları ({savedData?.kaydedilenForumlar?.length ?? 0})
                  </h3>
                  {(!savedData?.kaydedilenForumlar || savedData.kaydedilenForumlar.length === 0) ? (
                    <p className="text-xs text-muted-foreground">Kaydedilmiş forum konusu bulunmuyor.</p>
                  ) : (
                    <div className="space-y-2">
                      {savedData.kaydedilenForumlar.map((forum) => (
                        <Link
                          key={forum.id}
                          href={`/forum/${forum.slug}`}
                          className="block p-4 bg-card border border-border rounded-xl hover:border-erciyes-red/30 transition-all"
                        >
                          <h4 className="font-semibold text-sm line-clamp-1">{forum.title}</h4>
                          <span className="text-[10px] text-muted-foreground mt-1 block">
                            {formatDate(forum.created_at)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 5: Koleksiyonlar */}
        {activeTab === 'koleksiyonlar' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <FolderHeart className="w-4 h-4 text-erciyes-red" />
                Yayınlanan Koleksiyonlar ({savedData?.koleksiyonlar?.length ?? 0})
              </h3>

              {isOwnProfile && (
                <button
                  onClick={() => setShowColForm(!showColForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-erciyes-red text-white text-xs font-semibold hover:bg-red-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Yeni Koleksiyon
                </button>
              )}
            </div>

            {/* Yeni Koleksiyon Formu */}
            {showColForm && (
              <form onSubmit={handleCreateCollection} className="p-5 bg-card border border-border rounded-xl space-y-4">
                <h4 className="text-sm font-bold">Yeni Koleksiyon Oluştur</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Koleksiyon Adı (örn: Osmanlı Tarihi Kitaplığı)"
                    value={colName}
                    onChange={(e) => setColName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-erciyes-red"
                  />
                  <textarea
                    placeholder="Koleksiyon açıklaması..."
                    value={colDesc}
                    onChange={(e) => setColDesc(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-erciyes-red resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={colIsPublic}
                      onChange={(e) => setColIsPublic(e.target.checked)}
                      className="rounded text-erciyes-red focus:ring-erciyes-red"
                    />
                    <label htmlFor="isPublic" className="text-xs text-muted-foreground select-none">
                      Bu koleksiyonu herkese açık paylaş
                    </label>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-full bg-erciyes-red text-white text-xs font-bold hover:bg-red-700 transition-colors"
                  >
                    Oluştur
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowColForm(false)}
                    className="px-4 py-1.5 rounded-full border border-border text-xs hover:bg-secondary transition-colors"
                  >
                    Vazgeç
                  </button>
                </div>
              </form>
            )}

            {savedLoading ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-erciyes-red" /></div>
            ) : !savedData?.koleksiyonlar || savedData.koleksiyonlar.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Gösterilebilecek koleksiyon bulunmuyor.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {savedData.koleksiyonlar.map((col) => (
                  <div key={col.id} className="p-5 bg-card border border-border rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-base text-foreground leading-tight">{col.name}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {col.is_public ? <Globe className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                      {col.description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{col.description}</p>}

                      {/* Koleksiyon İçeriği */}
                      <div className="pt-2 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest block">Koleksiyon Öğeleri ({col.ogeler?.length ?? 0}):</span>
                        {col.ogeler && col.ogeler.length > 0 ? (
                          <div className="space-y-1">
                            {col.ogeler.slice(0, 3).map((item: any) => (
                              <Link
                                key={item.oge_id}
                                href={item.oge_tipi === 'article' ? `/makale/${item.slug}` : `/forum/${item.slug}`}
                                className="flex items-center gap-1.5 text-xs text-erciyes-red hover:underline line-clamp-1"
                              >
                                <span className="text-[9px] uppercase px-1 rounded bg-secondary text-muted-foreground">{item.oge_tipi === 'article' ? 'M' : 'F'}</span>
                                {item.title}
                              </Link>
                            ))}
                            {col.ogeler.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">+{col.ogeler.length - 3} öge daha</span>
                            )}
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground italic">Bu koleksiyon henüz boş.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border/40">
                      {col.is_public && (
                        <button
                          onClick={() => handleShareCollection(col.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground text-[11px] font-semibold transition-colors"
                          title="Paylaşım linkini kopyala"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Paylaş
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Takipçi / Takip Edilen Modalı (Instagram Tarzı) ──────────────── */}
      <AnimatePresence>
        {showConnectionsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Arka Plan fluluğu */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConnectionsModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Penceresi */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              {/* Üst Kısım */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-bold text-foreground">
                  {connectionsType === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}
                </span>
                <button
                  onClick={() => setShowConnectionsModal(false)}
                  className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Kullanıcı Listesi */}
              <div className="max-h-[350px] overflow-y-auto p-3 space-y-3">
                {connectionsLoading ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-erciyes-red" />
                  </div>
                ) : (connectionsType === 'followers' ? connectionsData.followers : connectionsData.following).length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Henüz kimse bulunmuyor.</p>
                  </div>
                ) : (
                  (connectionsType === 'followers' ? connectionsData.followers : connectionsData.following).map((u) => {
                    const isMe = u.id === dbUser?.id;
                    const uDisplayName = u.display_name ?? u.username;

                    return (
                      <div key={u.id} className="flex items-center justify-between gap-3 p-1.5 rounded-lg hover:bg-secondary/20 transition-all duration-200">
                        {/* Avatar + İsimler */}
                        <Link
                          href={`/yazar/${u.username}`}
                          onClick={() => setShowConnectionsModal(false)}
                          className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-85 transition-opacity"
                        >
                          {u.avatar_url ? (
                            <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                              <Image
                                src={u.avatar_url}
                                alt={uDisplayName}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                              {uDisplayName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground truncate">@{u.username}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{uDisplayName}</p>
                          </div>
                        </Link>

                        {/* Takip Et / Çıkar Butonu */}
                        {isAuthenticated && !isMe && (
                          <button
                            onClick={() => handleModalFollow(u.id)}
                            className={cn(
                              "px-3 py-1 rounded-md text-[10px] font-bold transition-all duration-150 flex-shrink-0",
                              u.isFollowing
                                ? "bg-secondary text-foreground border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                                : "bg-erciyes-red text-white hover:bg-red-800"
                            )}
                          >
                            {u.isFollowing ? "Takibi Bırak" : "Takip Et"}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
