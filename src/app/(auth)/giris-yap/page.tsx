'use client';

import { useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase/clientApp';
import { Eye, EyeOff, Chrome, AlertCircle, Loader2, ArrowLeft, UserPlus, LogIn, ShieldCheck, Mail, ArrowRight } from 'lucide-react';

function GirisYapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  
  const [activeTab, setActiveTab] = useState<'giris' | 'kayit' | 'sifremi-unuttum'>('giris');
  
  // Giriş Formu Eyaletleri
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Şifre Sıfırlama Eyaletleri
  const [resetEmailOrUsername, setResetEmailOrUsername] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Kayıt Formu Eyaletleri
  const [displayName, setDisplayName] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [kvkkApproved, setKvkkApproved] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      router.push(redirectUrl);
    } catch (err: unknown) {
      setError('Google ile giriş başarısız. Lütfen tekrar deneyin.');
      console.error(err);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    let targetEmail = emailOrUsername.trim();

    try {
      // Eğer e-posta adresi değilse (kullanıcı adıysa) e-posta karşılığını çözümle
      if (!targetEmail.includes('@')) {
        const resolveRes = await fetch(`/api/auth/resolve?username=${encodeURIComponent(targetEmail.toLowerCase())}`);
        if (!resolveRes.ok) {
          const json = await resolveRes.json();
          setError(json.error || 'Bu kullanıcı adına ait bir hesap bulunamadı.');
          setIsLoading(false);
          return;
        }
        const resolveData = await resolveRes.json();
        targetEmail = resolveData.email;
      }

      await signInWithEmailAndPassword(auth, targetEmail, password);
      router.push(redirectUrl);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        setError('Kullanıcı adı/E-posta veya şifre hatalı.');
      } else if (code === 'auth/user-not-found') {
        setError('Bu kullanıcı adı veya e-posta ile kayıtlı hesap bulunamadı.');
      } else if (code === 'auth/too-many-requests') {
        setError('Çok fazla deneme. Lütfen bir süre bekleyin.');
      } else {
        setError('Giriş yapılamadı. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!kvkkApproved) {
      setError('Lütfen KVKK Aydınlatma Metnini ve Kullanıcı Sözleşmesini onaylayın.');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    const cleanUsername = registerUsername.trim().toLowerCase();
    if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
      setError('Kullanıcı adı sadece küçük harf, rakam, alt çizgi (_), nokta (.) ve tire (-) içerebilir.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Çoklu hesap sınırını ve kullanıcı adı benzersizliğini backend'de kontrol et
      const checkRes = await fetch('/api/auth/register-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registerEmail, username: cleanUsername }),
      });

      const checkData = await checkRes.json();
      if (!checkRes.ok) {
        setError(checkData.error || 'Kayıt doğrulaması başarısız.');
        setIsLoading(false);
        return;
      }

      const { registerEmail: firebaseRegisterEmail, baseEmail } = checkData;

      // 2. Firebase Authentication'a Kayıt Et
      const { user } = await createUserWithEmailAndPassword(auth, firebaseRegisterEmail, password);
      await updateProfile(user, { displayName: displayName.trim() });

      // 3. Supabase'e Kullanıcı Bilgilerini Kaydet
      const idToken = await user.getIdToken();
      const saveProfileRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          username: cleanUsername,
          displayName: displayName.trim(),
          email: firebaseRegisterEmail,
          baseEmail: baseEmail,
        }),
      });

      if (!saveProfileRes.ok) {
        const saveProfileData = await saveProfileRes.json();
        // Eğer veritabanı kaydı başarısızsa Firebase kaydını silebilir veya uyarı verebiliriz
        setError(saveProfileData.error || 'Profil veritabanına kaydedilemedi.');
        setIsLoading(false);
        return;
      }

      // Başarılı yönlendirme
      router.push(redirectUrl);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/email-already-in-use') {
        setError('Bu e-posta ile zaten bir hesap mevcut.');
      } else if (code === 'auth/invalid-email') {
        setError('Geçersiz e-posta adresi.');
      } else if (code === 'auth/weak-password') {
        setError('Şifre çok zayıf. Daha güçlü bir şifre seç.');
      } else {
        setError('Kayıt olunamadı. Lütfen tekrar deneyin.');
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setError('');
    setResetSuccess(false);

    let targetEmail = resetEmailOrUsername.trim();

    try {
      // Eğer e-posta adresi değilse (kullanıcı adıysa) e-posta karşılığını çözümle
      if (!targetEmail.includes('@')) {
        const resolveRes = await fetch(`/api/auth/resolve?username=${encodeURIComponent(targetEmail.toLowerCase())}`);
        if (!resolveRes.ok) {
          const json = await resolveRes.json();
          setError(json.error || 'Bu kullanıcı adına ait bir hesap bulunamadı.');
          setResetLoading(false);
          return;
        }
        const resolveData = await resolveRes.json();
        targetEmail = resolveData.email;
      }

      await sendPasswordResetEmail(auth, targetEmail);
      setResetSuccess(true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/user-not-found') {
        setError('Bu kullanıcı adı veya e-posta adresi ile kayıtlı hesap bulunamadı.');
      } else if (code === 'auth/invalid-email') {
        setError('Geçersiz e-posta adresi.');
      } else if (code === 'auth/too-many-requests') {
        setError('Çok fazla istek. Lütfen bir süre bekleyin.');
      } else {
        setError('Şifre sıfırlama e-postası gönderilemedi. Lütfen tekrar deneyin.');
        console.error(err);
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ─── SOL: Editorial Hero Panel (Tema Duyarlı) ────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-card/60 dark:bg-[#0a0a0a] border-r border-border p-10 transition-colors duration-200">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1">
          <span
            className="text-3xl font-black text-foreground leading-none"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            ZirveKampüs<span className="text-erciyes-red">.</span>
          </span>
        </Link>

        {/* Büyük Başlık */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-erciyes-red mb-6">
            — Kampüs Topluluk Platformu
          </p>
          <h2
            className="text-5xl font-black text-foreground leading-tight mb-6"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Fikirlerini{' '}
            <em className="text-erciyes-red animate-pulse" style={{ fontStyle: 'italic' }}>
              kampüsle
            </em>
            <br />
            paylaş.
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
            ZirveKampüs&apos;te fikirlerini paylaş, diğer öğrencileri keşfet ve topluluk forumunda sesini duyur.
          </p>

          {/* Özellikler */}
          <div className="mt-8 space-y-3">
            {[
              { icon: '✍️', text: 'Zengin metin editörüyle kolayca makale yaz' },
              { icon: '👥', text: 'Instagram tarzı takip sistemi ve hızlı hesaplar arası geçiş' },
              { icon: '🏫', text: 'Fakültendeki diğer öğrencileri ve yazarları keşfet' },
              { icon: '💬', text: 'Kampüs forumunda tartışmalara katıl' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alt linkler */}
        <div className="flex flex-col gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-5">
            <Link href="/" className="flex items-center gap-1 hover:text-foreground transition-colors">
              <ArrowLeft className="w-3 h-3" />
              Siteye Dön
            </Link>
            <Link href="/sozlesmeler/kvkk" className="hover:text-foreground transition-colors underline">KVKK & Gizlilik</Link>
            <Link href="/sozlesmeler/kullanici-sozlesmesi" className="hover:text-foreground transition-colors underline">Kullanıcı Sözleşmesi</Link>
          </div>
          <p className="text-[10px] text-muted-foreground/60 border-t border-border/50 pt-3">
            ⚠️ Bu bağımsız bir öğrenci projesidir. Üniversite rektörlüğüyle resmi bir bağı yoktur.
          </p>
        </div>
      </div>

      {/* ─── SAĞ: Form Alanı ─────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobil Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/">
              <span
                className="text-3xl font-black leading-none"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                ZirveKampüs<span className="text-erciyes-red">.</span>
              </span>
            </Link>
          </div>

          {/* Sekmeler: Giriş Yap / Kayıt Ol */}
          {activeTab !== 'sifremi-unuttum' && (
            <div className="flex border-b border-border mb-8">
              {[
                { id: 'giris', label: 'Giriş Yap' },
                { id: 'kayit', label: 'Kayıt Ol' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as typeof activeTab);
                    setError('');
                  }}
                  className={`px-1 pb-3 mr-6 text-sm font-semibold border-b-2 transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'text-foreground border-erciyes-red'
                      : 'text-muted-foreground border-transparent hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Hata Mesajı */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-2 p-3 mb-5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'giris' && (
              <motion.div
                key="giris"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Başlık */}
                <div className="mb-8">
                  <h1
                    className="text-3xl font-bold mb-2"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Tekrar hoş geldin 👋
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    ZirveKampüs panelinize erişmek için giriş yapın.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleEmailLogin} className="flex flex-col gap-5">
                  {/* E-posta veya Kullanıcı Adı */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Kullanıcı Adı veya E-Posta
                    </label>
                    <input
                      type="text"
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      placeholder="kullanıcı adı veya e-posta"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-erciyes-red focus:ring-1 focus:ring-erciyes-red/30 transition-all"
                    />
                  </div>

                  {/* Şifre */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Şifre
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('sifremi-unuttum');
                          setError('');
                          setResetSuccess(false);
                          setResetEmailOrUsername('');
                        }}
                        className="text-xs text-erciyes-red hover:text-erciyes-red/80 font-medium"
                      >
                        Şifremi Unuttum
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="şifreniz"
                        required
                        className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-erciyes-red focus:ring-1 focus:ring-erciyes-red/30 transition-all pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Giriş Butonu */}
                  <button
                    type="submit"
                    disabled={isLoading || googleLoading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-erciyes-red text-white text-sm font-bold hover:bg-red-700 transition-colors duration-200 disabled:opacity-60 tracking-wide shadow-lg"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                    GİRİŞ YAP →
                  </button>
                </form>
              </motion.div>
            )}

            {activeTab === 'kayit' && (
              <motion.div
                key="kayit"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Başlık */}
                <div className="mb-8">
                  <h1
                    className="text-3xl font-bold mb-2"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Yeni hesap oluştur 🌱
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    ZirveKampüs topluluğunun bir parçası olun. (Aynı e-posta ile en fazla 3 hesap açılabilir)
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleEmailRegister} className="flex flex-col gap-5">
                  {/* Ad Soyad */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Adınız Soyadınız
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ad Soyad"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-erciyes-red focus:ring-1 focus:ring-erciyes-red/30 transition-all"
                    />
                  </div>

                  {/* Kullanıcı Adı */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Benzersiz Kullanıcı Adı
                    </label>
                    <input
                      type="text"
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      placeholder="kullanici_adi"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-erciyes-red focus:ring-1 focus:ring-erciyes-red/30 transition-all"
                    />
                  </div>

                  {/* E-posta */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      E-Posta Adresi
                    </label>
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="e-posta adresiniz"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-erciyes-red focus:ring-1 focus:ring-erciyes-red/30 transition-all"
                    />
                  </div>

                  {/* Şifre */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Şifre
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="şifreniz (min. 6 karakter)"
                        required
                        className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-erciyes-red focus:ring-1 focus:ring-erciyes-red/30 transition-all pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* KVKK ve Kullanıcı Sözleşmesi Onay Kutusu */}
                  <div className="flex items-start gap-2.5 p-1">
                    <input
                      type="checkbox"
                      id="kvkkApproved"
                      checked={kvkkApproved}
                      onChange={(e) => setKvkkApproved(e.target.checked)}
                      className="mt-1 rounded text-erciyes-red focus:ring-erciyes-red h-4 w-4"
                    />
                    <label htmlFor="kvkkApproved" className="text-xs text-muted-foreground leading-normal select-none">
                      <Link href="/sozlesmeler/kullanici-sozlesmesi" target="_blank" className="text-erciyes-red hover:underline font-bold">Kullanıcı Sözleşmesini</Link> ve{' '}
                      <Link href="/sozlesmeler/kvkk" target="_blank" className="text-erciyes-red hover:underline font-bold">KVKK / Gizlilik Aydınlatma Metnini</Link> okudum, kabul ediyorum. Hiçbir sorumluluk beyanını kabul etmediğimi beyan ederim.
                    </label>
                  </div>

                  {/* Kayıt Butonu */}
                  <button
                    type="submit"
                    disabled={isLoading || googleLoading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-erciyes-red text-white text-sm font-bold hover:bg-red-700 transition-colors duration-200 disabled:opacity-60 tracking-wide shadow-lg"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    KAYIT OL →
                  </button>
                </form>
              </motion.div>
            )}

            {activeTab === 'sifremi-unuttum' && (
              <motion.div
                key="sifremi-unuttum"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Başlık */}
                <div className="mb-8">
                  <h1
                    className="text-3xl font-bold mb-2"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Şifrenizi mi unuttunuz? 🔑
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Kullanıcı adınızı veya e-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
                  </p>
                </div>

                {resetSuccess ? (
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm leading-relaxed animate-pulse">
                      <ShieldCheck className="w-5 h-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                      <div>
                        <strong className="font-semibold text-green-700 dark:text-green-300">Sıfırlama bağlantısı gönderildi!</strong>
                        <p className="mt-1 text-xs text-green-600/80 dark:text-green-400/80">
                          E-posta kutunuzu (gereksiz/spam klasörü dahil) kontrol ederek şifrenizi sıfırlayabilirsiniz.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('giris');
                        setError('');
                        setResetSuccess(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full border border-border bg-secondary hover:bg-secondary/80 text-sm font-bold transition-all duration-200"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      GİRİŞ EKRANINA DÖN
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordReset} className="flex flex-col gap-5">
                    {/* E-posta veya Kullanıcı Adı */}
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                        Kullanıcı Adı veya E-Posta
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={resetEmailOrUsername}
                          onChange={(e) => setResetEmailOrUsername(e.target.value)}
                          placeholder="kullanıcı adı veya e-posta"
                          required
                          disabled={resetLoading}
                          className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:border-erciyes-red focus:ring-1 focus:ring-erciyes-red/30 transition-all pr-10"
                        />
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Gönder Butonu */}
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-erciyes-red text-white text-sm font-bold hover:bg-red-700 transition-colors duration-200 disabled:opacity-60 tracking-wide shadow-lg"
                    >
                      {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      SIFIRLAMA BAĞLANTISI GÖNDER →
                    </button>

                    <button
                      type="button"
                      disabled={resetLoading}
                      onClick={() => {
                        setActiveTab('giris');
                        setError('');
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full border border-border bg-secondary hover:bg-secondary/80 text-sm font-bold transition-all duration-200"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      İptal Et ve Geri Dön
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ortak Google Giriş & Ayırıcı */}
          {activeTab !== 'sifremi-unuttum' && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">veya</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading || isLoading}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-full border border-border bg-secondary hover:bg-secondary/80 text-sm font-semibold transition-all duration-200 disabled:opacity-60"
              >
                {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Chrome className="w-4 h-4" />}
                Google ile Giriş Yap / Kayıt Ol
              </button>
            </>
          )}

          {/* Mobil sorumluluk reddi ve sözleşmeler */}
          <div className="lg:hidden text-center mt-10 space-y-2">
            <p className="text-[10px] text-muted-foreground/60 leading-normal">
              ⚠️ Bu bağımsız bir öğrenci projesidir. Üniversite rektörlüğüyle resmi bir bağı yoktur.
            </p>
            <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
              <Link href="/sozlesmeler/kvkk" className="underline hover:text-foreground">KVKK & Gizlilik</Link>
              <Link href="/sozlesmeler/kullanici-sozlesmesi" className="underline hover:text-foreground">Kullanıcı Sözleşmesi</Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function GirisYapPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
      </div>
    }>
      <GirisYapContent />
    </Suspense>
  );
}
