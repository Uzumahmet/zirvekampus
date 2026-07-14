'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Menu, X, PenLine, Moon, Sun, LogIn, User, Globe } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/providers';
import OmniSearch from '@/components/shared/omni-search';
import { useTranslation } from '@/lib/i18n/LanguageContext';

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, dbUser, firebaseUser } = useAuth();
  const { language, setLanguage, t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/projeler', label: t('nav.projects') },
    { href: '/makale', label: t('nav.articles') },
    { href: '/kesfet', label: t('nav.explore') },
    { href: '/forum', label: t('nav.forum') },
  ];

  // Bağlı hesapları getir
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

  // Scroll'da navbar arka planını değiştir
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mobil menü açıkken scroll'u kilitle
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 w-full transition-all duration-300',
          isScrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border shadow-sm'
            : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center group">
              <span
                className="text-2xl font-black tracking-tight leading-none select-none"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Erüatical
                <span className="text-erciyes-red">.</span>
              </span>
            </Link>

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

            {/* Masaüstü Sağ Araçlar */}
            <div className="hidden md:flex items-center gap-2">
              {/* Arama Butonu */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground border border-border/50 hover:border-border hover:text-foreground hover:bg-secondary transition-all duration-200 group"
                aria-label="Ara"
              >
                <Search className="w-4 h-4" />
                <span className="text-xs hidden lg:block pr-4">{t('nav.search')}</span>
                <kbd className="hidden lg:block text-xs bg-secondary px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">
                  ⌘K
                </kbd>
              </button>

              {/* Tema Değiştirici */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
                aria-label="Temayı değiştir"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Dil Seçici */}
              <div className="relative group/lang">
                <button
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 flex items-center gap-1"
                  aria-label="Dil Değiştir"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase">{language}</span>
                </button>
                <div className="absolute right-0 mt-1 w-32 rounded-xl bg-card border border-border p-1 shadow-xl opacity-0 invisible group-hover/lang:opacity-100 group-hover/lang:visible transition-all duration-200 z-50">
                  {[
                    { code: 'tr', name: 'Türkçe' },
                    { code: 'en', name: 'English' },
                    { code: 'fr', name: 'Français' },
                    { code: 'ru', name: 'Русский' },
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code as any)}
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
              </div>

              {/* Auth Butonları */}
              {isAuthenticated && dbUser ? (
                <div className="relative group">
                  <button
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

                  {/* Dropdown Menü */}
                  <div className="absolute right-0 mt-1 w-48 rounded-xl bg-card border border-border p-1.5 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <Link
                      href={`/yazar/${dbUser.username}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-secondary text-foreground transition-colors"
                    >
                      <User className="w-3.5 h-3.5" />
                      {t('nav.profile')}
                    </Link>

                    {(dbUser.role === 'yazar' || dbUser.role === 'editor' || dbUser.role === 'admin') && (
                      <Link
                        href="/yazar-paneli"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-secondary text-foreground transition-colors"
                      >
                        <PenLine className="w-3.5 h-3.5" />
                        {t('nav.authorPanel')}
                      </Link>
                    )}

                    {(dbUser.role === 'editor' || dbUser.role === 'admin') && (
                      <Link
                        href="/admin-paneli"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-secondary text-foreground transition-colors"
                      >
                        <PenLine className="w-3.5 h-3.5 text-purple-400" />
                        {t('nav.adminPanel')}
                      </Link>
                    )}

                    <Link
                      href="/ayarlar"
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
                            onClick={() => handleSwitch(acc.id)}
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
                </div>
              ) : (
                <Link
                  href="/giris-yap"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-erciyes-red text-white hover:bg-red-800 transition-colors duration-200"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  {t('nav.login')}
                </Link>
              )}
            </div>

            {/* Mobil: Arama + Hamburger */}
            <div className="flex md:hidden items-center gap-2">
              {/* Mobil Dil Seçici */}
              <div className="relative group/mob-lang mr-1">
                <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground">
                  <Globe className="w-5 h-5" />
                </button>
                <div className="absolute right-0 mt-1 w-32 rounded-xl bg-card border border-border p-1 shadow-xl opacity-0 invisible group-hover/mob-lang:opacity-100 group-hover/mob-lang:visible transition-all duration-200 z-50">
                  {[
                    { code: 'tr', name: 'TR' },
                    { code: 'en', name: 'EN' },
                    { code: 'fr', name: 'FR' },
                    { code: 'ru', name: 'RU' },
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code as any)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium hover:bg-secondary text-left',
                        language === lang.code ? 'text-primary bg-secondary/50 font-bold' : 'text-muted-foreground'
                      )}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                aria-label="Ara"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                aria-label="Menüyü aç"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobil Menü (Full-Screen Slide-In) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mobile-menu-overlay"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menü Paneli */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-card border-l border-border z-50 flex flex-col p-6"
            >
              {/* Menü Başlık */}
              <div className="flex items-center justify-between mb-8">
                <span className="font-bold text-lg">
                  Erüatical<span className="text-erciyes-red">.</span>
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  aria-label="Menüyü kapat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav Linkleri */}
              <nav className="flex flex-col gap-1 flex-1">
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center px-4 py-3 rounded-lg font-medium transition-colors',
                        pathname === link.href
                          ? 'bg-erciyes-red/10 text-erciyes-red border border-erciyes-red/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      )}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}

                {/* Yazar Paneli (Rol bazlı) */}
                {(dbUser?.role === 'yazar' || dbUser?.role === 'editor' || dbUser?.role === 'admin') && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <Link
                      href="/yazar-paneli"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <PenLine className="w-4 h-4" />
                      {t('nav.authorPanel')}
                    </Link>
                  </motion.div>
                )}
              </nav>

              {/* Alt: Tema + Auth */}
              <div className="border-t border-border pt-4 flex flex-col gap-3">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span className="text-sm font-medium">
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </span>
                </button>

                {isAuthenticated ? (
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/yazar/${dbUser?.username}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-erciyes-red text-white font-medium justify-center"
                    >
                      <User className="w-4 h-4" />
                      {t('nav.profile')}
                    </Link>
                    <Link
                      href="/ayarlar"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-secondary font-medium justify-center"
                    >
                      <User className="w-4 h-4" />
                      {t('nav.settings')}
                    </Link>
                  </div>
                ) : (
                  <Link
                    href="/giris-yap"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-erciyes-red text-white font-medium justify-center"
                  >
                    <LogIn className="w-4 h-4" />
                    {t('nav.login')}
                  </Link>
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
