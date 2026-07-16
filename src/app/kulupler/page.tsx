'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/providers';
import { 
  Users, Search, PlusCircle, Compass, Shield, ArrowRight, Loader2, Info, Check, AlertCircle, Camera, Trash2 
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/clientApp';

interface Club {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  vision: string | null;
  member_count: number;
  president: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function KuluplerPage() {
  const { firebaseUser, isAuthenticated } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Yeni Kulüp Modal Eyaletleri
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubVision, setNewClubVision] = useState('');
  const [newClubDesc, setNewClubDesc] = useState('');
  const [newClubLogo, setNewClubLogo] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // Logo Yükleme Eyaletleri
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    if (file.size > 2 * 1024 * 1024) { setModalError('Logo dosyası 2MB\'dan küçük olmalıdır.'); return; }
    if (!file.type.startsWith('image/')) { setModalError('Lütfen geçerli bir resim dosyası seçin.'); return; }

    setIsUploading(true);
    setUploadProgress(0);
    setModalError('');

    const ext = file.name.split('.').pop() || 'png';
    const filePath = `uploads/clubs/logo_${Date.now()}.${ext}`;
    const storageRef = ref(storage, filePath);
    const metadata = { contentType: file.type };
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      'state_changed',
      (snap) => {
        const progress = (snap.bytesTransferred / snap.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (err) => {
        console.error('Logo yükleme hatası:', err);
        setModalError('Görsel yüklenemedi: ' + err.message);
        setIsUploading(false);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setNewClubLogo(url);
        } catch (err) {
          setModalError('Görsel adresi alınamadı.');
        } finally {
          setIsUploading(false);
          setUploadProgress(null);
        }
      }
    );
  };

  useEffect(() => {
    fetchClubs();
  }, [searchQuery]);

  const fetchClubs = async () => {
    try {
      const res = await fetch(`/api/clubs?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setClubs(data.clubs || []);
      }
    } catch (e) {
      console.error('Kulüpler yüklenemedi:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    if (!newClubName.trim()) {
      setModalError('Kulüp ismi zorunludur.');
      return;
    }

    startTransition(async () => {
      try {
        const idToken = firebaseUser?.idToken;
        const res = await fetch('/api/clubs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            name: newClubName,
            vision: newClubVision,
            description: newClubDesc,
            logoUrl: newClubLogo,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setModalSuccess('Kulübünüz başarıyla kuruldu! Yönlendiriliyorsunuz...');
          setTimeout(() => {
            window.location.href = `/kulup/${data.club.slug}`;
          }, 1500);
        } else {
          setModalError(data.error || 'Kulüp kurulamadı.');
        }
      } catch (err) {
        setModalError('Sunucu bağlantı hatası oluştu.');
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">
      {/* Üst Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/60 pb-8 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Öğrenci Kulüpleri
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Erciyes Üniversitesi'ndeki aktif öğrenci topluluklarını keşfedin, projelere katılın ve ilanlara başvurun.
          </p>
        </div>

        {isAuthenticated && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-erciyes-red text-white hover:bg-red-800 text-xs font-bold transition-all shadow-lg shadow-erciyes-red/10"
          >
            <PlusCircle className="w-4 h-4" />
            Yeni Kulüp Kur
          </button>
        )}
      </div>

      {/* Arama Arayüzü */}
      <div className="relative max-w-md mb-8">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Kulüp adı ile ara..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-xs focus:outline-none focus:border-erciyes-red transition-all"
        />
      </div>

      {/* Kulüpler Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
          <p className="text-xs text-muted-foreground font-medium">Kulüpler yükleniyor...</p>
        </div>
      ) : clubs.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-3xl">
          <Compass className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aradığınız kriterlere uygun bir kulüp bulunamadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.map((club) => {
            const hasLogo = !!club.logo_url;
            return (
              <Link
                key={club.id}
                href={`/kulup/${club.slug}`}
                className="group flex flex-col justify-between p-6 bg-card border border-border rounded-3xl hover:border-border/80 hover:shadow-md transition-all duration-300 relative overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Logo ve İsim */}
                  <div className="flex items-center gap-4">
                    {hasLogo ? (
                      <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-border flex-shrink-0">
                        <Image src={club.logo_url!} alt={club.name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-secondary border border-border flex items-center justify-center text-base font-bold text-muted-foreground flex-shrink-0">
                        {club.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-extrabold text-sm text-foreground group-hover:text-erciyes-red transition-colors line-clamp-1">
                        {club.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Users className="w-3.5 h-3.5 text-erciyes-red" /> {club.member_count} Üye
                      </p>
                    </div>
                  </div>

                  {/* Kulüp Vizyonu */}
                  {club.vision && (
                    <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed bg-secondary/20 p-3 rounded-2xl">
                      "{club.vision}"
                    </p>
                  )}

                  {/* Açıklama */}
                  {club.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {club.description}
                    </p>
                  )}
                </div>

                {/* Alt Kısım - Başkan ve İleri Butonu */}
                <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-6">
                  {club.president ? (
                    <div className="flex items-center gap-2">
                      {club.president.avatar_url ? (
                        <div className="relative w-6 h-6 rounded-full overflow-hidden border border-border">
                          <Image src={club.president.avatar_url} alt="Başkan" fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground border border-border">
                          {club.president.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider leading-none">Kulüp Başkanı</p>
                        <p className="text-[10px] font-semibold text-foreground truncate mt-0.5">
                          @{club.president.username}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      <Shield className="w-3 h-3" /> Başkan Aranıyor
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-[11px] font-bold text-erciyes-red opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Kulübe Git</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* KULÜP KURMA MODALI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <PlusCircle className="w-4.5 h-4.5 text-erciyes-red" /> Yeni Kulüp Kurun
              </h2>
              <button
                onClick={() => { setShowCreateModal(false); setModalError(''); setModalSuccess(''); }}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {modalError}
              </div>
            )}

            {modalSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4" /> {modalSuccess}
              </div>
            )}

            <form onSubmit={handleCreateClub} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Kulüp İsmi
                </label>
                <input
                  type="text"
                  required
                  value={newClubName}
                  onChange={(e) => setNewClubName(e.target.value)}
                  placeholder="Örn: Yapay Zeka ve Robotik Kulübü"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Kulüp Vizyonu (Slogan)
                </label>
                <input
                  type="text"
                  value={newClubVision}
                  onChange={(e) => setNewClubVision(e.target.value)}
                  placeholder="Örn: Geleceğin teknolojilerini kampüste inşa ediyoruz."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Kulüp Açıklaması
                </label>
                <textarea
                  value={newClubDesc}
                  onChange={(e) => setNewClubDesc(e.target.value)}
                  placeholder="Kulübün amaçları, vizyonu ve hedefleri..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Kulüp Logosu
                </label>
                {newClubLogo ? (
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-border group bg-secondary">
                    <Image src={newClubLogo} alt="Logo Önizleme" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewClubLogo('')}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white hover:text-red-500 transition-all font-bold text-xs gap-1"
                    >
                      <Trash2 className="w-4 h-4" /> Kaldır
                    </button>
                  </div>
                ) : isUploading ? (
                  <div className="w-24 h-24 rounded-2xl border border-dashed border-border/80 bg-secondary/20 flex flex-col items-center justify-center gap-1.5">
                    <Loader2 className="w-5 h-5 animate-spin text-erciyes-red" />
                    <span className="text-[9px] font-bold text-muted-foreground">
                      {uploadProgress ? `${Math.round(uploadProgress)}%` : 'Yükleniyor'}
                    </span>
                  </div>
                ) : (
                  <label className="w-24 h-24 rounded-2xl border border-dashed border-border hover:border-erciyes-red cursor-pointer flex flex-col items-center justify-center gap-1 hover:bg-secondary/35 transition-all">
                    <Camera className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] font-bold text-muted-foreground">Logo Yükle</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadLogo}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setModalError(''); setModalSuccess(''); }}
                  className="px-4 py-2.5 rounded-xl hover:bg-secondary text-xs font-bold transition-all"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-erciyes-red text-white hover:bg-red-800 text-xs font-bold transition-all shadow-md shadow-erciyes-red/10"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Kulübü Kur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
