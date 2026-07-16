'use client';

import { ThemeProvider } from 'next-themes';
import { type ReactNode, createContext, useContext, useEffect, useState } from 'react';
import type { AuthState, AuthUser } from '@/types';
import { auth } from '@/lib/firebase/clientApp';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';

// ─── Auth Context ────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState>({
  firebaseUser: null,
  dbUser: null,
  isLoading: true,
  isAuthenticated: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

// ─── Auth Provider ───────────────────────────────────────────────────────────

// ─── Token + dbUser önbelleği (sekme değişiminde tekrar istek atmaz) ──────────
const CACHE_KEY = 'zk_dbuser_cache';
const SPLASH_KEY = 'zk_splash_shown';

function saveCache(dbUser: unknown, uid: string) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ uid, dbUser, ts: Date.now() }));
  } catch {}
}

function loadCache(uid: string) {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Aynı kullanıcı ve 10 dakikadan taze ise kullan
    if (parsed.uid === uid && Date.now() - parsed.ts < 10 * 60 * 1000) {
      return parsed.dbUser;
    }
  } catch {}
  return null;
}

// Splash ekranı sadece session'ın ilk açılışında göster
function isSplashAlreadyShown(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_KEY) === '1';
  } catch {
    return false;
  }
}

function markSplashShown() {
  try {
    sessionStorage.setItem(SPLASH_KEY, '1');
  } catch {}
}

function AuthProvider({ children }: { children: ReactNode }) {
  // İlk açılışta splash gösterilmediyse isLoading=true, gösterildiyse false (anında geç)
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    dbUser: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        markSplashShown();
        setState({ firebaseUser: null, dbUser: null, isLoading: false, isAuthenticated: false });
        return;
      }

      try {
        // false → token süresi dolmadıkça ağ isteği atmaz (cache'den okur)
        const idToken = await firebaseUser.getIdToken(false);

        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          idToken,
        };

        // Önce sessionStorage'dan bak
        const cached = loadCache(firebaseUser.uid);
        if (cached) {
          markSplashShown();
          setState({ firebaseUser: authUser, dbUser: cached, isLoading: false, isAuthenticated: true });
          return;
        }

        // Cache yoksa veya eskiyse API'dan çek
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const dbUser = res.ok ? await res.json() : null;
        if (dbUser) saveCache(dbUser, firebaseUser.uid);
        markSplashShown();

        setState({
          firebaseUser: authUser,
          dbUser,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch (error) {
        console.error('[AuthProvider] Kullanıcı bilgileri alınamadı:', error);
        markSplashShown();
        setState({ firebaseUser: null, dbUser: null, isLoading: false, isAuthenticated: false });
      }
    });

    return () => unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}


import Image from 'next/image';

// ─── Onboarding Zorunluluk Kontrolü (Onboarding Guard) ───────────────────────
import { useRouter, usePathname } from 'next/navigation';

function OnboardingGuard({ children }: { children: ReactNode }) {
  const { dbUser, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && dbUser) {
      const isYazar = dbUser.role === 'yazar';
      // Yazar ama onboarding tamamlanmamışsa ve onboarding sayfasında değilse zorla yönlendir
      if (isYazar && !dbUser.onboarded && pathname !== '/onboarding') {
        router.replace('/onboarding');
      }
    }
  }, [dbUser, isAuthenticated, isLoading, pathname, router]);

  // Instagram tarzı yükleme ekranı (Splash Screen) - sadece ilk ziyarette
  if (isLoading && !isSplashAlreadyShown()) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
        <div className="relative w-44 h-44 animate-pulse duration-1000 flex items-center justify-center">
          <Image
            src="/logo_flat.svg"
            alt="Zirve Kampüs Logo"
            width={160}
            height={160}
            priority
            className="object-contain"
          />
        </div>
        <div className="absolute bottom-10 flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-erciyes-red/80" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Zirve Kampüs</p>
        </div>
      </div>
    );
  }

  // Eğer onboarding tamamlanmamış bir yazarsa ve başka sayfadaysa ekranı göstermeyebiliriz (veya loader gösterebiliriz)
  if (!isLoading && isAuthenticated && dbUser) {
    const isYazar = dbUser.role === 'yazar';
    if (isYazar && !dbUser.onboarded && pathname !== '/onboarding') {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-erciyes-red" />
            <p className="text-sm text-muted-foreground font-semibold">Kurulum sayfasına yönlendiriliyorsunuz...</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// ─── Ana Providers Sarmalayıcı ───────────────────────────────────────────────

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <LanguageProvider>
        <AuthProvider>
          <OnboardingGuard>{children}</OnboardingGuard>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export { AuthContext };
