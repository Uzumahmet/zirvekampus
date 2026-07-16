'use client';

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/app/providers';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useRouter } from 'next/navigation';
import { User, ShieldCheck, Loader2, Save, Sparkles, Check, AlertCircle, KeyRound, Chrome, Phone, Mail, Trash2 } from 'lucide-react';
import HesaplarMerkezi from './hesaplar/hesaplar-merkezi';
import { cn } from '@/lib/utils';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '@/lib/firebase/clientApp';
import type { Konu } from '@/types';
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

export default function AyarlarPage() {
  const router = useRouter();
  const { firebaseUser, dbUser, isLoading, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();

  // Tab: 'profile' (Profil Ayarları), 'security' (Hesaplar & Güvenlik), 'login_methods' (Giriş Yöntemleri)
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'login_methods'>('profile');

  // Giriş Yöntemleri Eyaletleri
  const [schoolEmailPrefix, setSchoolEmailPrefix] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  
  const [phoneInput, setPhoneInput] = useState('');
  // (Telefon doğrulama state'leri kaldırıldı - telefon profil bilgisi olarak kaydedilir)

  // Kulüp Üyelikleri Eyaleti
  const [memberships, setMemberships] = useState<any[]>([]);
  const [allClubs, setAllClubs] = useState<any[]>([]);
  const [selectedClubSlug, setSelectedClubSlug] = useState('');
  const [selectedClubRole, setSelectedClubRole] = useState('member');
  const [clubTeamName, setClubTeamName] = useState('');
  const [isAddingClub, setIsAddingClub] = useState(false);

  // Form Eyaletleri
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [username, setUsername] = useState('');
  const [fakulte, setFakulte] = useState('');
  const [fakulteGizli, setFakulteGizli] = useState(false);
  const [allowMentions, setAllowMentions] = useState(true);

  // Firebase Storage Upload Eyaletleri
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  // İlgi Alanları Eyaletleri
  const [allTopics, setAllTopics] = useState<Konu[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);

  // Bildirim Eyaletleri
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Tüm kategorileri/konuları çek
    fetch('/api/topics')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAllTopics(data))
      .catch((e) => console.error('Kategoriler yüklenemedi:', e));

    // Tüm kulüpleri çek
    fetch('/api/clubs')
      .then((res) => (res.ok ? res.json() : { clubs: [] }))
      .then((data) => setAllClubs(data.clubs || []))
      .catch((e) => console.error('Kulüpler yüklenemedi:', e));
  }, []);

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
      setSelectedTopics(dbUser.topics ?? []);
      setAllowMentions(dbUser.allow_mentions !== false);
      setPersonalEmail(dbUser.email ?? '');
      setPhoneInput(dbUser.phone_number ?? '');
      if (dbUser.school_email) {
        const parts = dbUser.school_email.split('@');
        setSchoolEmailPrefix(parts[0]);
      }

      // Fetch club memberships
      fetch('/api/user/clubs', {
        headers: { Authorization: `Bearer ${firebaseUser?.idToken}` }
      })
      .then((res) => (res.ok ? res.json() : { memberships: [] }))
      .then((data) => setMemberships(data.memberships || []))
      .catch((err) => console.error('Kulüpler yüklenemedi:', err));
    }
  }, [dbUser, isLoading, isAuthenticated, firebaseUser, router]);

  // Profil resmi yükleme fonksiyonu (Firebase Storage)
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !dbUser) return;

    if (file.size > 5 * 1024 * 1024) {
      setStatusMsg({ type: 'error', text: 'Dosya boyutu 5MB\'dan küçük olmalıdır.' });
      return;
    }

    if (!file.type.startsWith('image/')) {
      setStatusMsg({ type: 'error', text: 'Lütfen geçerli bir resim dosyası seçin.' });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setStatusMsg(null);

    const fileExtension = file.name.split('.').pop() || 'png';
    const filePath = `users/${dbUser.id}/avatar_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, filePath);
    const metadata = { contentType: file.type };
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Yükleme hatası:', error);
        setStatusMsg({ type: 'error', text: 'Görsel yüklenemedi: ' + error.message });
        setUploading(false);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setAvatarUrl(downloadUrl);
          setStatusMsg({ type: 'success', text: 'Profil resmi başarıyla yüklendi.' });
        } catch (err: any) {
          setStatusMsg({ type: 'error', text: 'Bağlantı adresi alınamadı.' });
        } finally {
          setUploading(false);
          setUploadProgress(null);
        }
      }
    );
  };

  const toggleTopic = (id: number) => {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
  };

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
            topics: selectedTopics,
            allowMentions,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          setStatusMsg({ type: 'success', text: t('settings.success') });
          // Eğer kullanıcı adı değiştiyse yeni kullanıcı adı sayfasına yönlendir, aksi takdirde sayfayı yenile
          const cleanUser = username.trim().toLowerCase();
          if (dbUser && cleanUser !== dbUser.username) {
            setTimeout(() => {
              window.location.href = `/${cleanUser}`;
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

  const handleSaveClubTeam = async (clubSlug: string, teamName: string) => {
    if (!dbUser) return;
    try {
      const res = await fetch(`/api/clubs/${clubSlug}/members`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseUser?.idToken}`,
        },
        body: JSON.stringify({
          userId: dbUser.id,
          teamName: teamName.trim() || null,
        }),
      });
      if (res.ok) {
        alert('Kulüp departmanınız başarıyla güncellendi!');
      } else {
        const data = await res.json();
        alert(data.error || 'Kulüp departmanı güncellenemedi.');
      }
    } catch (e) {
      alert('Bağlantı hatası.');
    }
  };

  const handleAddClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClubSlug) {
      alert('Lütfen bir kulüp seçin.');
      return;
    }
    setIsAddingClub(true);
    try {
      const res = await fetch(`/api/clubs/${selectedClubSlug}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseUser?.idToken}`,
        },
        body: JSON.stringify({
          role: selectedClubRole,
          status: 'approved',
          teamName: clubTeamName,
        }),
      });

      if (res.ok) {
        alert('Kulüp başarıyla profilinize eklendi!');
        // Refresh memberships list
        const resClubs = await fetch('/api/user/clubs', {
          headers: { Authorization: `Bearer ${firebaseUser?.idToken}` }
        });
        if (resClubs.ok) {
          const data = await resClubs.json();
          setMemberships(data.memberships || []);
        }
        // Reset form
        setSelectedClubSlug('');
        setClubTeamName('');
      } else {
        const data = await res.json();
        alert(data.error || 'Kulüp eklenemedi.');
      }
    } catch (err) {
      alert('Bağlantı hatası.');
    } finally {
      setIsAddingClub(false);
    }
  };

  const handleRemoveClub = async (clubSlug: string) => {
    if (!confirm('Bu kulüp üyeliğini profilinizden kaldırmak istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/clubs/${clubSlug}/members?userId=${dbUser?.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${firebaseUser?.idToken}`,
        },
      });

      if (res.ok) {
        alert('Kulüp üyeliği başarıyla kaldırıldı.');
        setMemberships((prev) => prev.filter((m) => m.club.slug !== clubSlug));
      } else {
        const data = await res.json();
        alert(data.error || 'Üyelik kaldırılamadı.');
      }
    } catch (err) {
      alert('Bağlantı hatası.');
    }
  };

  const handleSaveEmails = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const schoolEmail = schoolEmailPrefix.trim() ? `${schoolEmailPrefix.trim().toLowerCase()}@erciyes.edu.tr` : null;
    const phoneNumber = phoneInput.trim() || null;

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
            schoolEmail,
            personalEmail,
            phoneNumber,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setStatusMsg({ type: 'success', text: 'E-posta ve iletişim bilgileriniz başarıyla güncellendi!' });
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setStatusMsg({ type: 'error', text: data.error || 'Bilgiler kaydedilemedi.' });
        }
      } catch (err) {
        setStatusMsg({ type: 'error', text: 'Bağlantı hatası oluştu.' });
      }
    });
  };

  const handleLinkGoogle = async () => {
    if (!firebaseUser) return;
    setStatusMsg(null);
    try {
      const { GoogleAuthProvider, linkWithPopup, unlink } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      const { auth: clientAuth } = await import('@/lib/firebase/clientApp');
      if (!clientAuth.currentUser) return;
      const credential = await linkWithPopup(clientAuth.currentUser, provider);
      
      const googleEmail = credential.user.email;
      const expectedEmails = [
        dbUser?.email?.toLowerCase(),
        dbUser?.school_email?.toLowerCase()
      ].filter(Boolean);

      if (googleEmail && expectedEmails.length > 0 && !expectedEmails.includes(googleEmail.toLowerCase())) {
        setStatusMsg({ 
          type: 'error', 
          text: `Google e-postası (${googleEmail}) hesabınızdaki kayıtlı e-postalarla eşleşmiyor. Lütfen eşleşen bir Google hesabı bağlayın.` 
        });
        await unlink(clientAuth.currentUser, GoogleAuthProvider.PROVIDER_ID);
        return;
      }

      setStatusMsg({ type: 'success', text: 'Google hesabı başarıyla bağlandı!' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      console.error('Google link error:', err);
      setStatusMsg({ type: 'error', text: 'Google hesabı bağlanamadı: ' + (err.message || err) });
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!firebaseUser) return;
    setStatusMsg(null);
    try {
      const { GoogleAuthProvider, unlink } = await import('firebase/auth');
      const { auth: clientAuth } = await import('@/lib/firebase/clientApp');
      if (!clientAuth.currentUser) return;
      await unlink(clientAuth.currentUser, GoogleAuthProvider.PROVIDER_ID);
      setStatusMsg({ type: 'success', text: 'Google hesabı bağlantısı başarıyla kesildi.' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      console.error('Google unlink error:', err);
      setStatusMsg({ type: 'error', text: 'Google bağlantısı kesilemedi: ' + (err.message || err) });
    }
  };

  // Telefon sadece veritabanına kaydediliyor (SMS doğrulaması kaldırıldı)
  // Doğrudan handleSaveEmails içinde kaydedilir.


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

          <button
            onClick={() => setActiveTab('login_methods')}
            className={cn(
              'w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left',
              activeTab === 'login_methods'
                ? 'bg-erciyes-red/10 text-erciyes-red border border-erciyes-red/10 shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            )}
          >
            <KeyRound className="w-4.5 h-4.5" />
            Giriş Yöntemleri
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

                {/* Profil Resmi Yükleme Alanı */}
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-secondary/10 rounded-2xl border border-border/80">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border border-border bg-secondary flex-shrink-0 flex items-center justify-center font-bold text-muted-foreground uppercase text-lg">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      username.slice(0, 2)
                    )}
                  </div>
                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <p className="text-xs font-bold text-foreground">Profil Resmi</p>
                    <p className="text-[10px] text-muted-foreground">Maksimum 5MB boyutunda PNG, JPG veya WEBP görseli yükleyin.</p>
                    {uploading && (
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-2">
                        <div className="bg-erciyes-red h-full transition-all duration-300" style={{ width: `${uploadProgress ?? 0}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                    <label
                      htmlFor="avatar-upload"
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-[11px] font-bold text-foreground hover:bg-secondary cursor-pointer transition-colors",
                        uploading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {uploading ? `Yükleniyor... %${Math.round(uploadProgress ?? 0)}` : 'Fotoğraf Yükle'}
                    </label>
                  </div>
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

                  <div className="flex flex-col gap-3 pt-5">
                    <div className="flex items-center gap-2">
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

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="allowMentions"
                        checked={allowMentions}
                        onChange={(e) => setAllowMentions(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-erciyes-red focus:ring-erciyes-red/40 bg-secondary cursor-pointer"
                      />
                      <label htmlFor="allowMentions" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                        Diğer kullanıcılar beni etiketleyebilsin (@mention)
                      </label>
                    </div>
                  </div>
                </div>

                {/* İlgi Alanları / Etiketler */}
                <div className="border-t border-border/50 pt-5 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      İlgi Alanlarınız / Takip Etmek İstediğiniz Etiketler
                    </label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Sitedeki paylaşımları ve makaleleri filtrelemek için ilgi alanlarınızı seçin.</p>
                  </div>
                  {allTopics.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Etiketler yükleniyor...</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {allTopics.map((topic) => {
                        const isSelected = selectedTopics.includes(topic.id);
                        return (
                          <button
                            type="button"
                            key={topic.id}
                            onClick={() => toggleTopic(topic.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                              isSelected
                                ? "bg-erciyes-red/10 border-erciyes-red text-erciyes-red shadow-sm"
                                : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                            )}
                          >
                            #{topic.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Kulüp Üyelikleri ve Takım Girişi */}
                <div className="border-t border-border/50 pt-5 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Kulüp Bilgileriniz
                    </label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Üye olduğunuz kulüplerde yer aldığınız takımı (örn: Yazılım, Tasarım, Sponsorluk) güncelleyebilirsiniz.
                    </p>
                  </div>

                  {memberships.length === 0 ? (
                    <div className="p-4 border border-dashed border-border rounded-2xl bg-secondary/10 text-center">
                      <p className="text-xs text-muted-foreground">Henüz onaylanmış veya kayıtlı bir kulüp üyeliğiniz bulunmuyor.</p>
                      <Link href="/kulupler" className="inline-block mt-2 text-xs text-erciyes-red hover:underline font-bold">
                        Öğrenci Kulüplerini Keşfedin & Katılın →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {memberships.map((membership) => {
                        const clubLogo = membership.club?.logo_url;
                        const clubName = membership.club?.name ?? 'Kulüp';
                        return (
                          <div key={membership.id} className="p-4 border border-border rounded-2xl bg-secondary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              {clubLogo ? (
                                <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-border">
                                  <Image src={clubLogo} alt={clubName} fill className="object-cover" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground border border-border">
                                  {clubName.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-bold text-foreground">{clubName}</p>
                                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  Rolünüz: {membership.role === 'president' ? 'Başkan' : membership.role === 'leader' ? 'Takım Lideri' : membership.role === 'alumni' ? 'Mezun' : 'Üye'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Kulüp içi takımınız..."
                                defaultValue={membership.team_name || ''}
                                id={`team-name-${membership.club.slug}`}
                                className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs focus:outline-none focus:border-erciyes-red w-full sm:w-40"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const inputEl = document.getElementById(`team-name-${membership.club.slug}`) as HTMLInputElement;
                                  if (inputEl) {
                                    handleSaveClubTeam(membership.club.slug, inputEl.value);
                                  }
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold transition-all shadow-xs"
                              >
                                Kaydet
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveClub(membership.club.slug)}
                                className="p-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all flex items-center justify-center"
                                title="Kulüpten Çık"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Yeni Kulüp Ekleme Formu */}
                  <div className="mt-6 p-4 border border-border rounded-2xl bg-secondary/15 space-y-4">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Profilinize Kulüp Ekle</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Kulüp Seçin</label>
                        <select
                          value={selectedClubSlug}
                          onChange={(e) => setSelectedClubSlug(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs focus:outline-none focus:border-erciyes-red cursor-pointer"
                        >
                          <option value="">Kulüp Seçin...</option>
                          {allClubs
                            .filter(club => !memberships.some(m => m.club?.id === club.id))
                            .map((club) => (
                              <option key={club.id} value={club.slug}>
                                {club.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Rolünüz</label>
                        <select
                          value={selectedClubRole}
                          onChange={(e) => setSelectedClubRole(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs focus:outline-none focus:border-erciyes-red cursor-pointer"
                        >
                          <option value="member">Üye</option>
                          <option value="alumni">Mezun</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Takım / Departman (İsteğe Bağlı)</label>
                        <input
                          type="text"
                          value={clubTeamName}
                          onChange={(e) => setClubTeamName(e.target.value)}
                          placeholder="Örn: Yazılım, Tasarım"
                          className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs focus:outline-none focus:border-erciyes-red"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddClub}
                        disabled={isAddingClub}
                        className="px-4 py-2 rounded-xl bg-erciyes-red text-white hover:bg-red-800 text-xs font-bold transition-all disabled:opacity-60 flex items-center gap-1.5 shadow-sm"
                      >
                        {isAddingClub && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Üyelik Ekle
                      </button>
                    </div>
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

          {/* TAB 3: GİRİŞ YÖNTEMLERİ & E-POSTALAR */}
          {activeTab === 'login_methods' && (
            <div className="p-6 bg-card border border-border rounded-3xl space-y-6 shadow-sm animate-in fade-in duration-200">
              <div>
                <h2 className="text-base font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <KeyRound className="w-4.5 h-4.5 text-erciyes-red" /> Giriş Yöntemleri & E-postalar
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Hesabınıza giriş yaparken kullanacağınız e-posta adreslerini ve sosyal giriş yöntemlerini buradan yönetebilirsiniz.
                </p>
              </div>

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

              {/* 1. E-POSTALAR VE İLETİŞİM BİLGİLERİ */}
              <div className="space-y-4 border-b border-border/60 pb-6">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">E-posta ve İletişim Bilgileri</h3>

                <form onSubmit={handleSaveEmails} className="space-y-4">
                  <div className="pt-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      E-posta Adresleri
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Normal E-posta */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Kişisel E-posta
                      </label>
                      <input
                        type="email"
                        value={personalEmail}
                        onChange={(e) => setPersonalEmail(e.target.value)}
                        placeholder="ornek@gmail.com"
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red transition-all"
                      />
                    </div>

                    {/* Okul E-postası */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Okul E-postası (@erciyes.edu.tr)
                      </label>
                      <div className="flex items-center rounded-xl bg-secondary border border-border overflow-hidden focus-within:border-erciyes-red transition-all">
                        <input
                          type="text"
                          value={schoolEmailPrefix}
                          onChange={(e) => setSchoolEmailPrefix(e.target.value)}
                          placeholder="ogrenci.no"
                          className="w-full px-3.5 py-2.5 bg-transparent border-0 text-xs focus:outline-none text-right"
                        />
                        <span className="px-3 py-2.5 text-xs text-muted-foreground bg-secondary/50 border-l border-border select-none font-medium">
                          @erciyes.edu.tr
                        </span>
                      </div>
                    </div>

                    {/* Telefon Numarası */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Telefon Numarası
                      </label>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="+90 555 123 45 67"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-xs focus:outline-none focus:border-erciyes-red transition-all"
                      />
                      <p className="text-[9px] text-muted-foreground mt-1">İletişim bilgisi olarak saklanır, giriş için kullanılmaz.</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-erciyes-red text-white hover:bg-red-800 text-xs font-bold transition-all shadow-md shadow-erciyes-red/10"
                    >
                      {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      E-posta ve İletişim Bilgilerini Kaydet
                    </button>
                  </div>
                </form>
              </div>

              {/* 2. GİRİŞ YÖNTEMİ KARTLARI (GOOGLE + ŞİFRE) */}
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Giriş Yöntemleri</h3>
                <p className="text-[10px] text-muted-foreground -mt-2">Hesabınıza aşağıdaki yöntemlerle giriş yapabilirsiniz.</p>

                <div className="space-y-3">
                  {/* Şifre (E-posta) ile Giriş */}
                  <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl border border-border/80">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-card rounded-xl border border-border">
                        <Mail className="w-5 h-5 text-erciyes-red" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Şifre ile Giriş (E-posta)</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {auth.currentUser?.providerData.some(p => p.providerId === 'password')
                            ? `Aktif · ${auth.currentUser.email ?? personalEmail}`
                            : 'E-posta ve şifre ile giriş yöntemi.'
                          }
                        </p>
                      </div>
                    </div>
                    <div>
                      {auth.currentUser?.providerData.some(p => p.providerId === 'password') ? (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-bold">Aktif</span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl bg-secondary border border-border text-muted-foreground text-[10px] font-bold">Pasif</span>
                      )}
                    </div>
                  </div>

                  {/* Google ile Giriş */}
                  <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-2xl border border-border/80">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-card rounded-xl border border-border">
                        <Chrome className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Google Hesabı</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {auth.currentUser?.providerData.some(p => p.providerId === 'google.com')
                            ? `Bağlı · ${auth.currentUser.providerData.find(p => p.providerId === 'google.com')?.email ?? ''}`
                            : 'Google hesabınızı bağlayın.'}
                        </p>
                      </div>
                    </div>
                    <div>
                      {auth.currentUser?.providerData.some(p => p.providerId === 'google.com') ? (
                        <button
                          type="button"
                          onClick={handleUnlinkGoogle}
                          className="px-3.5 py-2 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-[11px] font-bold hover:bg-destructive/20 transition-colors"
                        >
                          Bağlantıyı Kes
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleLinkGoogle}
                          className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-colors"
                        >
                          Google Bağla
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
