'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/app/providers';
import { Loader2, Check, PenSquare, BookOpen, User, ArrowRight } from 'lucide-react';
import type { Konu } from '@/types';

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

export default function OnboardingPage() {
  const router = useRouter();
  const { firebaseUser, dbUser, isLoading, isAuthenticated } = useAuth();
  
  // Adımlar: 1. Profil Bilgileri, 2. Konular, 3. İlk Yazı (Taslak)
  const [step, setStep] = useState(1);
  
  // Form Eyaletleri
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [fakulte, setFakulte] = useState('');
  const [seciliKonular, setSeciliKonular] = useState<number[]>([]);
  const [makaleBasligi, setMakaleBasligi] = useState('');
  const [makaleIcerigi, setMakaleIcerigi] = useState('');
  const [makaleKonuId, setMakaleKonuId] = useState<number | null>(null);

  // Konu listesi
  const [konular, setKonular] = useState<Konu[]>([]);
  const [konularLoading, setKonularLoading] = useState(true);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  // Güvenlik: Giriş yapmamış veya yazar olmayan biriyse anasayfaya at
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !dbUser) {
      router.replace('/giris-yap');
      return;
    }
    const isYazar = dbUser.role === 'yazar';
    if (!isYazar) {
      router.replace('/');
      return;
    }
    if (dbUser.onboarded) {
      router.replace('/');
      return;
    }
    // Başlangıç değerleri
    setDisplayName(dbUser.display_name ?? dbUser.username);
    setBio(dbUser.bio ?? '');
    setFakulte(dbUser.fakulte ?? '');
  }, [dbUser, isAuthenticated, isLoading, router]);

  // Konuları veritabanından çek
  useEffect(() => {
    fetch('/api/topics')
      .then((res) => res.json())
      .then((data) => {
        setKonular(data);
        setKonularLoading(false);
      })
      .catch(() => setKonularLoading(false));
  }, []);

  if (isLoading || onboardingChecking()) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
      </div>
    );
  }

  function onboardingChecking() {
    if (!dbUser) return true;
    return dbUser.onboarded;
  }

  const handleNextStep = () => {
    if (step === 1) {
      if (!displayName.trim()) {
        setError('Lütfen görünen adınızı girin.');
        return;
      }
      if (!fakulte) {
        setError('Lütfen kayıtlı olduğunuz fakülteyi seçin.');
        return;
      }
      setError('');
      setStep(2);
    } else if (step === 2) {
      if (seciliKonular.length === 0) {
        setError('Lütfen en az 1 konu seçin.');
        return;
      }
      setError('');
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setError('');
    setStep((prev) => prev - 1);
  };

  const toggleKonu = (id: number) => {
    setSeciliKonular((prev) =>
      prev.includes(id) ? prev.filter((kId) => kId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!makaleBasligi.trim() || !makaleIcerigi.trim()) {
      setError('İlk yazınız için başlık ve içerik girmeniz zorunludur.');
      return;
    }
    if (!makaleKonuId) {
      setError('Yazınız için bir konu seçmelisiniz.');
      return;
    }

    setError('');
    startTransition(async () => {
      try {
        const idToken = await firebaseUser!.idToken;
        const res = await fetch('/api/user/onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            displayName,
            bio,
            konular: seciliKonular,
            makaleBasligi,
            makaleIcerigi,
            makaleKonuId,
            fakulte,
          }),
        });

        if (res.ok) {
          // Sayfayı yenileyerek auth state'in güncellenmesini sağla ve yönlendir
          window.location.href = '/';
        } else {
          const data = await res.json();
          setError(data.error || 'Kurulum tamamlanamadı.');
        }
      } catch {
        setError('Bağlantı hatası oluştu.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden transition-colors duration-200">
      {/* Dekoratif çizgiler */}
      <div className="absolute top-0 left-1/4 w-px h-full bg-border/40 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-px h-full bg-border/40 pointer-events-none" />

      {/* Üst Kısım */}
      <div className="flex items-center justify-between border-b border-border/40 pb-6 relative z-10">
        <span className="text-2xl font-black" style={{ fontFamily: 'var(--font-display)' }}>
          Erciyes<span className="text-erciyes-red">.</span>
        </span>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest bg-secondary/50 px-3 py-1.5 rounded-full border border-border/60">
          Yazar Kurulumu — Adım {step} / 3
        </span>
      </div>

      {/* Ana Form Alanı */}
      <div className="max-w-2xl mx-auto w-full my-auto py-12 relative z-10">
        {error && (
          <div className="p-4 mb-6 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-erciyes-red/10 border border-erciyes-red/20 flex items-center justify-center mb-2">
                  <User className="w-6 h-6 text-erciyes-red" />
                </div>
                <h2 className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                  Profilini <em className="text-erciyes-red not-italic" style={{ fontStyle: 'italic' }}>güncelle</em>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Okuyucuların seni daha iyi tanıması için yazar profilini yapılandır.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Görünen İsim (Display Name)
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Adınız Soyadınız"
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/40 text-sm focus:outline-none focus:border-erciyes-red transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Kısa Biyografi (Bio)
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Yazarlık alanlarınız, ilgi alanlarınız veya kendiniz hakkında kısa bir açıklama..."
                    rows={4}
                    maxLength={300}
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/40 text-sm focus:outline-none focus:border-erciyes-red resize-none transition-all"
                  />
                  <div className="text-right text-[10px] text-muted-foreground mt-1">
                    {bio.length}/300 karakter
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Kayıtlı Olduğunuz Fakülte (Zorunlu)
                  </label>
                  <select
                    value={fakulte}
                    onChange={(e) => setFakulte(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/40 text-sm text-foreground focus:outline-none focus:border-erciyes-red transition-all"
                  >
                    <option value="">Fakülte Seçin...</option>
                    {ERU_FAKULTELERI.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleNextStep}
                className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-erciyes-red text-white text-sm font-bold hover:bg-red-700 transition-colors ml-auto shadow-lg"
              >
                Konu Seçimine Geç <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-erciyes-red/10 border border-erciyes-red/20 flex items-center justify-center mb-2">
                  <BookOpen className="w-6 h-6 text-erciyes-red" />
                </div>
                <h2 className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                  Yazacağın <em className="text-erciyes-red not-italic" style={{ fontStyle: 'italic' }}>konuları</em> seç
                </h2>
                <p className="text-sm text-muted-foreground">
                  Hangi alanlarda makaleler yazacaksın? En az bir konu seçmelisin.
                </p>
              </div>

              {konularLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-erciyes-red" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {konular.map((konu) => {
                    const isSelected = seciliKonular.includes(konu.id);
                    return (
                      <button
                        key={konu.id}
                        type="button"
                        onClick={() => toggleKonu(konu.id)}
                        className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-erciyes-red/10 border-erciyes-red text-foreground'
                            : 'bg-secondary/40 border-border/40 text-muted-foreground hover:border-border'
                        }`}
                      >
                        <span className="text-sm font-semibold">{konu.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-erciyes-red" />}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between items-center pt-4">
                <button
                  onClick={handlePrevStep}
                  className="px-6 py-3 rounded-full border border-border/40 text-sm font-semibold hover:bg-secondary/40 transition-colors"
                >
                  Geri Git
                </button>
                <button
                  onClick={handleNextStep}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-erciyes-red text-white text-sm font-bold hover:bg-red-700 transition-colors shadow-lg"
                >
                  İlk Yazını Yaz <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-erciyes-red/10 border border-erciyes-red/20 flex items-center justify-center mb-2">
                  <PenSquare className="w-6 h-6 text-erciyes-red" />
                </div>
                <h2 className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                  İlk taslak <em className="text-erciyes-red not-italic" style={{ fontStyle: 'italic' }}>yazını</em> oluştur
                </h2>
                <p className="text-sm text-muted-foreground">
                  Profilinizi tamamlamak için ilk taslak yazınızı girmelisiniz. Bu yazı taslak olarak kaydedilecektir.
                </p>
              </div>

              <div className="space-y-4">
                {/* Makale Konusu Seçimi */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Bu Yazının Ana Konusu
                  </label>
                  <select
                    value={makaleKonuId || ''}
                    onChange={(e) => setMakaleKonuId(Number(e.target.value) || null)}
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/40 text-sm text-foreground focus:outline-none focus:border-erciyes-red transition-all"
                  >
                    <option value="">Konu Seçin...</option>
                    {konular
                      .filter((k) => seciliKonular.includes(k.id))
                      .map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Başlık */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Yazı Başlığı
                  </label>
                  <input
                    type="text"
                    value={makaleBasligi}
                    onChange={(e) => setMakaleBasligi(e.target.value)}
                    placeholder="Makalenizin ilgi çekici başlığı..."
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/40 text-sm focus:outline-none focus:border-erciyes-red transition-all"
                  />
                </div>

                {/* İçerik */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Yazı İçeriği
                  </label>
                  <textarea
                    value={makaleIcerigi}
                    onChange={(e) => setMakaleIcerigi(e.target.value)}
                    placeholder="İçeriğinizi yazmaya başlayın..."
                    rows={8}
                    className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/40 text-sm focus:outline-none focus:border-erciyes-red transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <button
                  onClick={handlePrevStep}
                  className="px-6 py-3 rounded-full border border-border/40 text-sm font-semibold hover:bg-secondary/40 transition-colors"
                >
                  Geri Git
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-erciyes-red text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60 shadow-lg"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Kurulumu Tamamla ve Başla →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Alt Kısım */}
      <div className="text-center text-xs text-muted-foreground relative z-10 pt-6 border-t border-border/10">
        Erciyes Kampüs yazar ilk kurulum rehberi. Herhangi bir sorunda editörlerimizle iletişime geçin.
      </div>
    </div>
  );
}
