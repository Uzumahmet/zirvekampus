import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Yazar Kurulumu | Erciyes Kampüs',
  description: 'Erciyes Kampüs yazarları için ilk kurulum ve profil yapılandırma adımları.',
};

/**
 * Onboarding sayfası, kullanıcının dikkatinin dağılmaması ve kurulumu
 * tamamlamadan sitede gezinmemesi için navbar ve footer'ı gizler.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased transition-colors duration-200">
      {children}
    </div>
  );
}
