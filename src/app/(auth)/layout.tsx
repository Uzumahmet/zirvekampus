import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Giriş Yap | Erciyes Kampüs',
};

/**
 * Auth sayfaları kendi layout'larını taşır (Navbar/Footer olmadan tam ekran).
 * Referans tasarımdaki gibi sol editorial panel + sağ form düzeni için
 * min-h-screen ve navbar'ı bypass eden yapı.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
