'use client';

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/app/providers';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useRouter } from 'next/navigation';
import { User, ShieldCheck, Loader2, Save, Sparkles, Check, AlertCircle } from 'lucide-react';
import HesaplarMerkezi from './hesaplar/hesaplar-merkezi';
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

export default function AyarlarPage() {
  const router = useRouter();
  const { firebaseUser, dbUser, isLoading, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();

  // Tab: 'profile' (Profil Ayarları), 'security' (Hesaplar & Güvenlik)
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Form Eyaletleri
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [username, setUsername] = useState('');
  const [fakulte, setFakulte] = useState('');
  const [fakulteGizli, setFakulteGizli] = useState(false);

  // Bildirim Eyaletleri
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/giris-yap');
      return;
    }

    if (dbUser) {
      setDisplayName(dbUser.display_name ?? '');
      setBio(dbUser.bio ?? '');
      setAvatarUrl(dbUser.avatar_url ?? '');
      setUsername(dbUser.username ?? '');
      setFakulte(dbUser.fakulte ?? '');
      setFakulteGizli(dbUser.fakulte_gizli ?? false);
    }
  }, [dbUser, isLoading, isAuthenticated, router]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!displayName.trim()) {
      setStatusMsg({ type: 'error', text: 'Görünen ad boş olamaz.' });
      return;
    }

    if (!username.trim()) {
      setStatusMsg({ type: 'error', text: 'Kullanıcı adı boş olamaz.' });
      return;
    }

    if (!fakulte) {
      setStatusMsg({ type: 'error', text: 'Lütfen bir fakülte seçin.' });
      return;
    }

    startTransition(async () => {
      try {
        const idToken = firebaseUser!.idToken;
        const res = await fetch('/api/user/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            displayName,
            bio,
            avatarUrl,
            username,
            fakulte,
            fakulteGizli,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          setStatusMsg({ type: 'success', text: t('settings.success') });
          // Eğer kullanıcı adı değiştiyse yeni kullanıcı adı sayfasına yönlendir, aksi takdirde sayfayı yenile
          const cleanUser = username.trim().toLowerCase();
          if (dbUser && cleanUser !== dbUser.username) {
            setTimeout(() => {
              window.location.href = `/yazar/${cleanUser}`;
            }, 1000);
          } else {
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        } else {
          setStatusMsg({ type: 'error', text: data.error || t('settings.error') });
        }
      } catch (err) {
        setStatusMsg({ type: 'error', text: 'Bağlantı hatası oluştu.' });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Üst Başlık */}
      <div className="border-b border-border pb-6 mb-8">
        <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          {t('settings.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* SOL: Sol Navigasyon Menüsü - 3 Sütun */}
        <div className="md:col-span-3 flex flex-col gap-1.5 bg-card border border-border p-2 rounded-2xl">
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              'w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left',
              activeTab === 'profile'
                ? 'bg-erciyes-red/10 text-erciyes-red border border-erciyes-red/10 shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            )}
          >
            <User className="w-4.5 h-4.5" />
            {t('settings.profileTab')}
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={cn(
              'w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left',
              activeTab === 'security'
                ? 'bg-erciyes-red/10 text-erciyes-red border border-erciyes-red/10 shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            )}
          >
            <ShieldCheck className="w-4.5 h-4.5" />
            {t('settings.securityTab')}
          </button>
        </div>

        {/* SAĞ: Form ve İçerik Alanı - 9 Sütun */}
        <div className="md:col-span-9">
          
          {/* TAB 1: PROFİL AYARLARI */}
          {activeTab === 'profile' && (
            <div className="p-6 bg-card border border-border rounded-3xl space-y-6 shadow-sm">
              <h2 className="text-base font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-erciyes-red" /> Profil Detayları
              </h2>

              {statusMsg && (
                <div
                  className={cn(
                    'p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 border',
                    statusMsg.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                      : 'bg-destructive/10 border-destructive/20 text-destructive'
                  )}
                >
                  {statusMsg.type === 'success' ? (
                    <Check className="w-4.5 h-4.5" />
                  ) : (
                    <AlertCircle className="w-4.5 h-4.5" />
                  )}
                  {statusMsg.text}
                </div>
              )}

              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {t('settings.displayName')}
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Görünen Adınız"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {t('settings.username')}
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="kullanici_adi"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    {t('settings.avatarUrl')}
                  </label>
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://gorsel-linki.com/avatar.png"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    {t('settings.bio')}
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Kendiniz hakkında kısa bilgi..."
                    maxLength={300}
                    rows={4}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red resize-none transition-all"
                  />
                  <div className="text-right text-[9px] text-muted-foreground mt-1">
                    {bio.length}/300
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {t('settings.faculty')}
                    </label>
                    <select
                      value={fakulte}
                      onChange={(e) => setFakulte(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red cursor-pointer"
                    >
                      <option value="">Fakülte Seçin...</option>
                      {ERU_FAKULTELERI.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="fakulteGizli"
                      checked={fakulteGizli}
                      onChange={(e) => setFakulteGizli(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-erciyes-red focus:ring-erciyes-red/40 bg-secondary cursor-pointer"
                    />
                    <label htmlFor="fakulteGizli" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                      {t('settings.hideFaculty')}
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-erciyes-red text-white hover:bg-red-800 transition-colors font-bold text-xs shadow-lg shadow-erciyes-red/10 disabled:opacity-60"
                  >
                    {isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {t('settings.save')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: HESAP GÜVENLİĞİ & SWITCHER */}
          {activeTab === 'security' && (
            <div className="p-6 bg-card border border-border rounded-3xl shadow-sm">
              <HesaplarMerkezi />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
