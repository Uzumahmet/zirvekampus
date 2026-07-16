'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Menu, 
  X, 
  PenLine, 
  Moon, 
  Sun, 
  LogIn, 
  LogOut, 
  User, 
  Globe, 
  Plus, 
  FolderDot, 
  MessageSquare, 
  Bell,
  Flame,
  Compass,
  ArrowRight,
  Settings,
  PlusCircle,
  Camera,
  Trash2,
  Loader2,
  Users
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/providers';
import OmniSearch from '@/components/shared/omni-search';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/clientApp';

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, dbUser, firebaseUser, isLoading } = useAuth();
  const { language, setLanguage, t } = useTranslation();
  
  // Modals & Menu States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);
  
  // Click-based dropdown states for mobile/iOS touch compatibility
  const [activeDropdown, setActiveDropdown] = useState<'plus' | 'lang' | 'user' | 'mob-plus' | 'mob-lang' | null>(null);
  const [showMobileAddMenu, setShowMobileAddMenu] = useState(false);

  // Mobil Post Ekleme States
  const [activeAddTab, setActiveAddTab] = useState<'menu' | 'post'>('menu');
  const [postContent, setPostContent] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleDropdown = (name: 'plus' | 'lang' | 'user' | 'mob-plus' | 'mob-lang') => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  const getPageTitle = (path: string) => {
    if (path === '/') return 'Anasayfa';
    if (path.startsWith('/projeler')) return 'Projeler';
    if (path.startsWith('/makale')) return 'Makaleler';
    if (path.startsWith('/kesfet')) return 'Keşfet';
    if (path.startsWith('/forum')) return 'Forum';
    if (path.startsWith('/kulupler') || path.startsWith('/kulup')) return 'Kulüpler';
    if (path.startsWith('/bildirimler')) return 'Bildirimler';
    if (path.startsWith('/ayarlar')) return 'Ayarlar';
    if (path.startsWith('/yazar-paneli')) return 'Yazar Paneli';
    if (path.startsWith('/admin-paneli')) return 'Yönetici Paneli';
    return 'Zirve Kampüs';
  };

  // Close dropdowns on outside click (iOS/Android compatible)
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-trigger') && !target.closest('.dropdown-menu')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Fetch linked accounts
  useEffect(() => {
    if (isAuthenticated && firebaseUser) {
      fetch('/api/auth/switch', {
        headers: { Authorization: `Bearer ${firebaseUser.idToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setLinkedAccounts(data.accounts ?? []);
        })
        .catch((e) => console.error(e));
    }
  }, [isAuthenticated, firebaseUser]);

  const handleSwitch = async (targetUid: string) => {
    try {
      const res = await fetch('/api/auth/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseUser?.idToken}`,
        },
        body: JSON.stringify({ targetUid }),
      });
      if (res.ok) {
        const json = await res.json();
        const { signInWithCustomToken } = await import('firebase/auth');
        const { auth } = await import('@/lib/firebase/clientApp');
        await signInWithCustomToken(auth, json.customToken);
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Scroll event
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  // Reset add sheet state on close
  useEffect(() => {
    if (!showMobileAddMenu) {
      setActiveAddTab('menu');
      setPostContent('');
      setPostImages([]);
      setSubmitError(null);
    }
  }, [showMobileAddMenu]);

  // Mobil Görsel Yükleme
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    setIsUploading(true);
    setSubmitError(null);

    const storageRef = ref(storage, `uploads/${firebaseUser.uid}/posts_${Date.now()}_${file.name}`);
    const metadata = { contentType: file.type };
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Görsel yükleme hatası:', error);
        setSubmitError('Resim yüklenemedi: ' + error.message);
        setIsUploading(false);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setPostImages((prev) => [...prev, downloadUrl]);
        } catch (err: any) {
          setSubmitError('Bağlantı adresi alınamadı.');
        } finally {
          setIsUploading(false);
          setUploadProgress(null);
        }
      }
    );
  };

  // Mobil Gönderi Kaydetme/Paylaşma
  const handlePostSubmit = async () => {
    if (!postContent.trim() || !firebaseUser) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/user/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseUser.idToken}`
        },
        body: JSON.stringify({
          content: postContent,
          imageUrls: postImages
        })
      });

      if (res.ok) {
        setPostContent('');
        setPostImages([]);
        setShowMobileAddMenu(false);
        setActiveAddTab('menu');
        
        // Refresh or redirect
        if (window.location.pathname === '/') {
          window.location.reload();
        } else {
          window.location.href = '/';
        }
      } else {
        const json = await res.json();
        setSubmitError(json.error || 'Gönderi paylaşılamadı.');
      }
    } catch (err) {
      setSubmitError('Bağlantı hatası.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/projeler', label: t('nav.projects') },
    { href: '/makale', label: t('nav.articles') },
    { href: '/kesfet', label: t('nav.explore') },
    { href: '/kulupler', label: t('nav.clubs') },
    { href: '/forum', label: t('nav.forum') },
  ];

  return (
    <>
      {/* ÜST TOP BAR NAVBAR */}
      <header
        className={cn(
          'sticky top-0 z-40 w-full transition-all duration-300',
          isScrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border shadow-sm'
            : 'bg-transparent border-b border-border/20'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo / Sol Bölüm */}
            <div className="flex items-center gap-3">
              {/* PC Logo */}
              <Link href="/" className="hidden md:flex items-center group">
                <Image
                  src="/logo_flat.svg"
                  alt="Zirve Kampüs"
                  width={140}
                  height={36}
                  priority
                  className="object-contain h-9 w-auto group-hover:opacity-90 transition-opacity"
                />
              </Link>
              
              {/* Mobil Logo */}
              <Link href="/" className="md:hidden flex items-center">
                <Image
                  src="/logo_flat.svg"
                  alt="Zirve Kampüs"
                  width={120}
                  height={30}
                  priority
                  className="object-contain h-8 w-auto"
                />
              </Link>
            </div>

            {/* Masaüstü Nav Linkleri */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                    pathname === link.href
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  {link.label}
                  {pathname === link.href && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-erciyes-red rounded-full"
                    />
                  )}
                </Link>
              ))}
            </nav>

            {/* Sağ Araçlar (PC ve Mobil Ortak/Özelleştirilmiş) */}
            <div className="flex items-center gap-2">
              
              {/* Masaüstü Hızlı Ekleme (+) Butonu */}
              {isAuthenticated && (
                <div className="hidden md:block relative dropdown-trigger mr-1">
                  <button
                    onClick={() => toggleDropdown('plus')}
                    className="px-3 py-1.5 rounded-full text-white bg-gradient-to-r from-erciyes-red to-red-650 hover:from-red-600 hover:to-red-800 transition-all duration-300 flex items-center gap-1 shadow-lg shadow-erciyes-red/20 border border-erciyes-red/30 hover:scale-[1.03]"
                    aria-label="Hızlı Ekle"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider select-none pr-0.5">Ekle</span>
                  </button>
                  
                  {activeDropdown === 'plus' && (
                    <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-card border border-border p-1.5 shadow-2xl z-50 dropdown-menu animate-in fade-in slide-in-from-top-1 duration-150">
                      <button
                        onClick={() => {
                          setActiveDropdown(null);
                          if (pathname === '/') {
                            window.dispatchEvent(new CustomEvent('open-post-modal'));
                          } else {
                            window.location.href = '/?yeni_post=true';
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-secondary text-foreground transition-colors text-left"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-erciyes-red" />
                        Gönderi Paylaş
                      </button>
                      <button
                        onClick={() => {
                          setActiveDropdown(null);
                          if (pathname === '/') {
                            window.dispatchEvent(new CustomEvent('open-project-modal'));
                          } else {
                            window.location.href = '/?yeni_proje=true';
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-secondary text-foreground transition-colors text-left"
                      >
                        <FolderDot className="w-3.5 h-3.5 text-emerald-500" />
                        Proje Ekle
                      </button>
                      <Link
                        href="/yazar-paneli?tab=yeni-yazi"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-secondary text-foreground transition-colors"
                      >
                        <PenLine className="w-3.5 h-3.5 text-amber-500" />
                        Makale Yaz
                      </Link>
                      <Link
                        href="/forum/yeni"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-secondary text-foreground transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
                        Tartışma Başlat
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Arama Butonu */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground border border-border/50 hover:border-border hover:text-foreground hover:bg-secondary/60 transition-all duration-200"
                aria-label="Ara"
              >
                <Search className="w-4.5 h-4.5" />
                <span className="text-xs hidden lg:block pr-4">{t('nav.search')}</span>
                <kbd className="hidden lg:block text-[10px] bg-secondary px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">
                  ⌘K
                </kbd>
              </button>

              {/* Tema Değiştirici */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-250"
                aria-label="Temayı değiştir"
              >
                {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
              </button>

              {/* Dil Seçici (PC) */}
              <div className="hidden md:block relative dropdown-trigger">
                <button
                  onClick={() => toggleDropdown('lang')}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-200 flex items-center gap-1"
                  aria-label="Dil Değiştir"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase">{language}</span>
                </button>
                {activeDropdown === 'lang' && (
                  <div className="absolute right-0 mt-1.5 w-32 rounded-xl bg-card border border-border p-1 shadow-2xl z-50 dropdown-menu animate-in fade-in duration-100">
                    {[
                      { code: 'tr', name: 'Türkçe' },
                      { code: 'en', name: 'English' },
                      { code: 'fr', name: 'Français' },
                      { code: 'ru', name: 'Русский' },
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => { setLanguage(lang.code as any); setActiveDropdown(null); }}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium hover:bg-secondary transition-colors text-left',
                          language === lang.code ? 'text-primary bg-secondary/50 font-bold' : 'text-muted-foreground'
                        )}
                      >
                        {lang.name}
                        {language === lang.code && <span className="text-[10px]">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Masaüstü Auth / Profil Dropdown */}
              <div className="hidden md:flex items-center">
                {isLoading ? (
                  <div className="w-24 h-9 rounded-lg bg-secondary/50 animate-pulse mr-1" />
                ) : isAuthenticated && dbUser ? (
                  <>
                    <Link
                      href="/bildirimler"
                      className="p-2 rounded-xl border border-border/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all relative flex items-center justify-center mr-2"
                      title="Bildirimler"
                    >
                      <Bell className="w-4 h-4" />
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-erciyes-red animate-pulse" />
                    </Link>
                    
                    <div className="relative dropdown-trigger">
                      <button
                        onClick={() => toggleDropdown('user')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors duration-200"
                        aria-label="Kullanıcı Menüsü"
                      >
                        {dbUser.avatar_url ? (
                          <div className="w-6 h-6 rounded-full overflow-hidden relative">
                            <Image
                              src={dbUser.avatar_url}
                              alt={dbUser.display_name ?? dbUser.username}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <User className="w-4 h-4 text-erciyes-red" />
                        )}
                        <span className="max-w-[100px] truncate">
                          {dbUser.display_name ?? dbUser.username}
                        </span>
                        <span className="text-[10px] text-muted-foreground">▼</span>
                      </button>

                      {activeDropdown === 'user' && (
                        <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-card border border-border p-1.5 shadow-2xl z-50 dropdown-menu animate-in fade-in duration-150">
                          <Link
                            href={`/${dbUser.username}`}
                            onClick={() => setActiveDropdown(null)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-secondary text-foreground transition-colors"
                          >
                            <User className="w-3.5 h-3.5" />
                            {t('nav.profile')}
                          </Link>

                          {(dbUser.role === 'yazar' || dbUser.role === 'editor' || dbUser.role === 'admin') && (
                            <Link
                              href="/yazar-paneli"
                              onClick={() => setActiveDropdown(null)}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-secondary text-foreground transition-colors"
                            >
                              <PenLine className="w-3.5 h-3.5" />
                              {t('nav.authorPanel')}
                            </Link>
                          )}

                          {(dbUser.role === 'editor' || dbUser.role === 'admin') && (
                            <Link
                              href="/admin-paneli"
                              onClick={() => setActiveDropdown(null)}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-secondary text-foreground transition-colors"
                            >
                              <PenLine className="w-3.5 h-3.5 text-purple-400" />
                              {t('nav.adminPanel')}
                            </Link>
                          )}

                          <Link
                            href="/ayarlar"
                            onClick={() => setActiveDropdown(null)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-secondary text-foreground transition-colors"
                          >
                            <User className="w-3.5 h-3.5 text-emerald-500" />
                            {t('nav.settings')}
                          </Link>

                          {linkedAccounts.length > 0 && (
                            <>
                              <hr className="border-border my-1" />
                              <div className="px-3 py-1 text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Hesap Değiştir</div>
                              {linkedAccounts.map((acc) => (
                                <button
                                  key={acc.id}
                                  onClick={() => { handleSwitch(acc.id); setActiveDropdown(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs hover:bg-secondary text-foreground transition-colors text-left"
                                >
                                  <span className="truncate">@{acc.username}</span>
                                </button>
                              ))}
                            </>
                          )}

                          <hr className="border-border my-1" />

                          <button
                            onClick={async () => {
                              const { signOut } = await import('firebase/auth');
                              const { auth } = await import('@/lib/firebase/clientApp');
                              await signOut(auth);
                              window.location.href = '/';
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-destructive/10 text-destructive transition-colors text-left"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            {t('nav.logout')}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <Link
                    href="/giris-yap"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-erciyes-red text-white hover:bg-red-800 transition-colors duration-200"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    {t('nav.login')}
                  </Link>
                )}
              </div>
              
              {/* Mobil: Sağ Üst Hızlı Çıkış/Ayarlar Menüsü (Hamburger Yerine Doğrudan İkonlar) */}
              <div className="md:hidden flex items-center gap-1">
                {isAuthenticated && (
                  <Link
                    href="/bildirimler"
                    className={cn(
                      "p-1.5 rounded-lg text-muted-foreground relative touch-manipulation",
                      pathname === '/bildirimler' && "text-erciyes-red"
                    )}
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-erciyes-red" />
                  </Link>
                )}

                <Link
                  href="/ayarlar"
                  className={cn(
                    "p-1.5 rounded-lg text-muted-foreground active:bg-secondary/60 transition-colors touch-manipulation",
                    pathname === '/ayarlar' && "text-erciyes-red"
                  )}
                  aria-label="Ayarlar"
                >
                  <Settings className="w-5 h-5" />
                </Link>

                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-1.5 rounded-lg text-muted-foreground active:bg-secondary/60 transition-colors touch-manipulation"
                  aria-label="Temayı değiştir"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                {isAuthenticated && (
                  <button
                    onClick={async () => {
                      if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
                        const { signOut } = await import('firebase/auth');
                        const { auth } = await import('@/lib/firebase/clientApp');
                        await signOut(auth);
                        window.location.href = '/';
                      }
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground active:bg-secondary/60 hover:text-destructive transition-colors touch-manipulation"
                    aria-label="Çıkış Yap"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      </header>

      {/* MOBİL BOTTOM NAVIGATION BAR (Instagram / LinkedIn tarzı) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/80 flex justify-around items-center h-14 md:hidden pb-safe">
        {/* Anasayfa */}
        <Link 
          href="/" 
          className={cn(
            "flex flex-col items-center justify-center w-10 h-full text-muted-foreground transition-all active:scale-95 touch-manipulation", 
            pathname === '/' && "text-erciyes-red"
          )}
        >
          <Flame className="w-5.5 h-5.5" />
        </Link>

        {/* Projeler */}
        <Link 
          href="/projeler" 
          className={cn(
            "flex flex-col items-center justify-center w-10 h-full text-muted-foreground transition-all active:scale-95 touch-manipulation", 
            pathname.startsWith('/projeler') && "text-erciyes-red"
          )}
        >
          <FolderDot className="w-5.5 h-5.5" />
        </Link>

        {/* Makaleler */}
        <Link 
          href="/makale" 
          className={cn(
            "flex flex-col items-center justify-center w-10 h-full text-muted-foreground transition-all active:scale-95 touch-manipulation", 
            pathname.startsWith('/makale') && "text-erciyes-red"
          )}
        >
          <PenLine className="w-5.5 h-5.5" />
        </Link>

        {/* Artı (+) Ekleme Butonu (Ortada) */}
        {isAuthenticated ? (
          <button 
            onClick={() => setShowMobileAddMenu(true)} 
            className="flex items-center justify-center w-10 h-10 rounded-full bg-erciyes-red text-white shadow-lg shadow-erciyes-red/20 active:scale-90 transition-all touch-manipulation flex-shrink-0"
          >
            <Plus className="w-5.5 h-5.5" />
          </button>
        ) : (
          <Link
            href="/giris-yap"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-erciyes-red text-white shadow-lg shadow-erciyes-red/20 active:scale-90 transition-all touch-manipulation flex-shrink-0"
          >
            <LogIn className="w-5 h-5" />
          </Link>
        )}

        {/* Forum */}
        <Link 
          href="/forum" 
          className={cn(
            "flex flex-col items-center justify-center w-10 h-full text-muted-foreground transition-all active:scale-95 touch-manipulation", 
            pathname.startsWith('/forum') && "text-erciyes-red"
          )}
        >
          <MessageSquare className="w-5.5 h-5.5" />
        </Link>

        {/* Keşfet */}
        <Link 
          href="/kesfet" 
          className={cn(
            "flex flex-col items-center justify-center w-10 h-full text-muted-foreground transition-all active:scale-95 touch-manipulation", 
            pathname.startsWith('/kesfet') && "text-erciyes-red"
          )}
        >
          <Compass className="w-5.5 h-5.5" />
        </Link>

        {/* Profil veya Giriş */}
        {isAuthenticated && dbUser ? (
          <Link 
            href={`/${dbUser.username}`}
            className={cn(
              "flex flex-col items-center justify-center w-10 h-full text-muted-foreground transition-all active:scale-95 touch-manipulation", 
              pathname.startsWith(`/${dbUser.username}`) && "text-erciyes-red"
            )}
          >
            {dbUser.avatar_url ? (
              <div className={cn(
                "relative w-6 h-6 rounded-full overflow-hidden border",
                pathname.startsWith(`/${dbUser.username}`) ? "border-erciyes-red" : "border-border"
              )}>
                <Image src={dbUser.avatar_url} alt={dbUser.username} fill className="object-cover" />
              </div>
            ) : (
              <User className="w-5.5 h-5.5" />
            )}
          </Link>
        ) : (
          <Link 
            href="/giris-yap"
            className={cn(
              "flex flex-col items-center justify-center w-10 h-full text-muted-foreground transition-all active:scale-95 touch-manipulation", 
              pathname === '/giris-yap' && "text-erciyes-red"
            )}
          >
            <User className="w-5.5 h-5.5" />
          </Link>
        )}
      </div>

      {/* MOBİL HIZLI EKLEME DRAWER / BOTTOM SHEET */}
      <AnimatePresence>
        {showMobileAddMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 md:hidden"
              onClick={() => setShowMobileAddMenu(false)}
            />
            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl border-t border-border z-50 p-6 space-y-4 md:hidden pb-safe max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-erciyes-red" />
                  {activeAddTab === 'menu' ? 'Hızlı Ekle / Paylaş' : 'Yeni Gönderi Paylaş'}
                </h3>
                <button 
                  onClick={() => setShowMobileAddMenu(false)}
                  className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {activeAddTab === 'menu' ? (
                <div className="grid grid-cols-1 gap-2 pt-2">
                  <button
                    onClick={() => {
                      if (pathname === '/') {
                        setShowMobileAddMenu(false);
                        setTimeout(() => window.dispatchEvent(new CustomEvent('open-post-modal')), 300);
                      } else {
                        setActiveAddTab('post');
                      }
                    }}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/80 hover:bg-secondary text-sm font-semibold transition-all active:scale-[0.99] touch-manipulation w-full text-left"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-erciyes-red" />
                      <span>Gönderi Paylaş</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </button>

                  <button
                    onClick={() => {
                      setShowMobileAddMenu(false);
                      if (pathname === '/') {
                        setTimeout(() => window.dispatchEvent(new CustomEvent('open-project-modal')), 300);
                      } else {
                        window.location.href = '/?yeni_proje=true';
                      }
                    }}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/80 hover:bg-secondary text-sm font-semibold transition-all active:scale-[0.99] touch-manipulation w-full text-left"
                  >
                    <div className="flex items-center gap-3">
                      <FolderDot className="w-4 h-4 text-emerald-500" />
                      <span>Proje Paylaş</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </button>

                  <Link
                    href="/yazar-paneli?tab=yeni-yazi"
                    onClick={() => setShowMobileAddMenu(false)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/80 hover:bg-secondary text-sm font-semibold transition-all active:scale-[0.99] touch-manipulation"
                  >
                    <div className="flex items-center gap-3">
                      <PenLine className="w-4 h-4 text-amber-500" />
                      <span>Makale Yaz</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </Link>

                  <Link
                    href="/forum/yeni"
                    onClick={() => setShowMobileAddMenu(false)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/80 hover:bg-secondary text-sm font-semibold transition-all active:scale-[0.99] touch-manipulation"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-cyan-500" />
                      <span>Tartışma Başlat</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </Link>

                  <Link
                    href="/kulupler"
                    onClick={() => setShowMobileAddMenu(false)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/80 hover:bg-secondary text-sm font-semibold transition-all active:scale-[0.99] touch-manipulation"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-rose-500" />
                      <span>Kulüpleri Keşfet / Kur</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                </div>
              ) : (
                // GÖNDERİ PAYLAŞMA FORMU
                <div className="space-y-4 pt-2">
                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Kampüste neler oluyor?"
                    className="w-full min-h-[100px] p-3 rounded-xl border border-border bg-secondary/20 focus:outline-none focus:ring-1 focus:ring-erciyes-red text-sm resize-none"
                  />

                  {/* Resim Yükleme ve Önizleme */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {postImages.map((img, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                        <Image src={img} alt="Post image" fill className="object-cover" />
                        <button
                          type="button"
                          onClick={() => setPostImages((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {isUploading ? (
                      <div className="w-16 h-16 rounded-lg border border-dashed border-border flex flex-col items-center justify-center bg-secondary/10">
                        <Loader2 className="w-4 h-4 animate-spin text-erciyes-red" />
                        <span className="text-[8px] text-muted-foreground mt-1">
                          {uploadProgress ? `${Math.round(uploadProgress)}%` : 'Yükleniyor'}
                        </span>
                      </div>
                    ) : (
                      postImages.length < 4 && (
                        <label className="w-16 h-16 rounded-lg border border-dashed border-border/80 hover:border-erciyes-red flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/30 transition-all">
                          <Camera className="w-4.5 h-4.5 text-muted-foreground" />
                          <span className="text-[8px] text-muted-foreground mt-1">Fotoğraf</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                      )
                    )}
                  </div>

                  {submitError && (
                    <p className="text-xs text-red-500 font-semibold">{submitError}</p>
                  )}

                  {/* Eylemler */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setActiveAddTab('menu'); setSubmitError(null); }}
                      className="flex-1 py-2.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-xs font-semibold text-foreground transition-all"
                    >
                      Geri
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting || !postContent.trim()}
                      onClick={handlePostSubmit}
                      className="flex-1 py-2.5 rounded-xl bg-erciyes-red text-white hover:bg-red-800 text-xs font-semibold disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Paylaş
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MOBİL YAN MENÜ / SETTINGS SLIDE-IN */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menü Paneli */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-card border-l border-border z-50 flex flex-col p-6 shadow-2xl md:hidden"
            >
              {/* Menü Başlık */}
              <div className="flex items-center justify-between mb-8 border-b border-border/60 pb-3">
                <span className="font-extrabold text-sm uppercase tracking-wider text-muted-foreground">
                  Hesap & Ayarlar
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                  aria-label="Menüyü kapat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Arayüz / Profil Linkleri */}
              <div className="flex flex-col gap-2 flex-1">
                {isAuthenticated && dbUser ? (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-2xl border border-border/80 mb-4">
                      {dbUser.avatar_url ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden relative border border-border flex-shrink-0">
                          <Image src={dbUser.avatar_url} alt={dbUser.username} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground border border-border flex-shrink-0">
                          {dbUser.username.slice(0,2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-foreground truncate">{dbUser.display_name ?? dbUser.username}</p>
                        <p className="text-[10px] text-muted-foreground truncate">@{dbUser.username}</p>
                      </div>
                    </div>

                    <Link
                      href={`/${dbUser.username}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary text-sm font-semibold transition-colors touch-manipulation"
                    >
                      <User className="w-4 h-4 text-erciyes-red" />
                      <span>{t('nav.profile')}</span>
                    </Link>

                    {(dbUser.role === 'yazar' || dbUser.role === 'editor' || dbUser.role === 'admin') && (
                      <Link
                        href="/yazar-paneli"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3.5 rounded-xl hover:bg-secondary text-sm font-semibold transition-colors touch-manipulation"
                      >
                        <PenLine className="w-4 h-4 text-amber-550" />
                        <span>{t('nav.authorPanel')}</span>
                      </Link>
                    )}

                    {(dbUser.role === 'editor' || dbUser.role === 'admin') && (
                      <Link
                        href="/admin-paneli"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3.5 rounded-xl hover:bg-secondary text-sm font-semibold transition-colors touch-manipulation"
                      >
                        <Settings className="w-4 h-4 text-purple-400" />
                        <span>{t('nav.adminPanel')}</span>
                      </Link>
                    )}

                    <Link
                      href="/ayarlar"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary text-sm font-semibold transition-colors touch-manipulation"
                    >
                      <Settings className="w-4 h-4 text-emerald-500" />
                      <span>{t('nav.settings')}</span>
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/giris-yap"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-erciyes-red text-white font-bold justify-center shadow-lg shadow-erciyes-red/20 touch-manipulation"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{t('nav.login')}</span>
                  </Link>
                )}
              </div>

              {/* Alt: Hesap Değiştirici, Tema & Çıkış */}
              <div className="border-t border-border pt-4 flex flex-col gap-2">
                {isAuthenticated && linkedAccounts.length > 0 && (
                  <div className="p-3 bg-secondary/20 rounded-xl border border-border/60 mb-2">
                    <span className="block text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground mb-2">Hesap Değiştir</span>
                    <div className="flex flex-col gap-1.5">
                      {linkedAccounts.map((acc) => (
                        <button
                          key={acc.id}
                          onClick={() => { handleSwitch(acc.id); setIsMobileMenuOpen(false); }}
                          className="w-full flex items-center justify-between p-2 rounded-lg bg-card hover:bg-secondary border border-border/80 text-xs font-semibold text-foreground transition-all text-left touch-manipulation"
                        >
                          <span>@{acc.username}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary text-sm font-semibold transition-colors touch-manipulation"
                >
                  {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
                  <span>{theme === 'dark' ? 'Açık Tema' : 'Karanlık Tema'}</span>
                </button>

                {isAuthenticated && (
                  <button
                    onClick={async () => {
                      const { signOut } = await import('firebase/auth');
                      const { auth } = await import('@/lib/firebase/clientApp');
                      await signOut(auth);
                      window.location.href = '/';
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 text-destructive text-sm font-bold transition-colors text-left touch-manipulation"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Çıkış Yap</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* OmniSearch Modal */}
      <OmniSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
