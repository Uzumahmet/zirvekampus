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

function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    dbUser: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({ firebaseUser: null, dbUser: null, isLoading: false, isAuthenticated: false });
        return;
      }

      try {
        // Firebase ID Token'ı al
        const idToken = await firebaseUser.getIdToken();

        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          idToken,
        };

        // Veritabanındaki kullanıcı profilini çek
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        const dbUser = res.ok ? await res.json() : null;

        setState({
          firebaseUser: authUser,
          dbUser,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch (error) {
        console.error('[AuthProvider] Kullanıcı bilgileri alınamadı:', error);
        setState({ firebaseUser: null, dbUser: null, isLoading: false, isAuthenticated: false });
      }
    });

    return () => unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

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
